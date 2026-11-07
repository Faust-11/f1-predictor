#!/usr/bin/env python3
"""Top up the `f1` schema with races finished after the latest Jolpica dump (dumps lag ~14 days).

Usage:
    DATABASE_URL=postgresql://... python3 scripts/jolpica/topup_api.py            # all missing finished rounds
    DATABASE_URL=postgresql://... python3 scripts/jolpica/topup_api.py --round 2026:19
    ... --dry-run   (fetch + write inside a transaction, then roll back)

Runs AFTER scripts/jolpica/load_dump.py. For every finished, non-cancelled round of the latest season
it fills only what is missing: race, sprint, qualifying (Q1/Q2/Q3), laps, pit stops, standings.
Rows written here have src_id = NULL; the next dump load replaces them with the canonical dump rows.

Jolpica API: 4 req/s burst, 500 req/h — we stay at ~3 req/s and back off on HTTP 429.
Data licence: CC BY-NC-SA 4.0. Requires: pip install "psycopg[binary]"
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

import psycopg

API = "https://api.jolpi.ca/ergast/f1"
USER_AGENT = "Slipstream/0.1 (+https://the-slipstream.vercel.app)"
MIN_INTERVAL_S = 0.35
_last_call = 0.0


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def api(path: str) -> dict:
    """GET one page with rate limiting and 429/5xx back-off."""
    global _last_call
    url = f"{API}/{path}"
    for attempt in range(6):
        wait = MIN_INTERVAL_S - (time.time() - _last_call)
        if wait > 0:
            time.sleep(wait)
        _last_call = time.time()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)["MRData"]
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504):
                pause = 5 * (attempt + 1)
                log(f"HTTP {e.code} on {path} — retry in {pause}s")
                time.sleep(pause)
                continue
            raise
    sys.exit(f"Giving up on {url}")


def api_all(path: str, list_key: str) -> list[dict]:
    """Fetch every page of a round endpoint and return the merged inner list (e.g. Results, Laps)."""
    out: list[dict] = []
    offset = 0
    while True:
        sep = "&" if "?" in path else "?"
        m = api(f"{path}{sep}limit=100&offset={offset}")
        table = next(v for k, v in m.items() if k.endswith("Table"))
        items = table.get("Races") or table.get("StandingsLists") or []
        if not items:
            return out
        page = items[0].get(list_key, [])
        if list_key == "Laps" and out and page and out[-1]["number"] == page[0]["number"]:
            out[-1]["Timings"].extend(page[0]["Timings"])  # a lap split across pages
            page = page[1:]
        out.extend(page)
        offset += int(m["limit"])
        if offset >= int(m["total"]):
            return out


def to_ms(text: str | None) -> int | None:
    """'1:42:00.785' / '1:36.201' / '24.048' -> milliseconds."""
    if not text:
        return None
    parts = text.strip().split(":")
    try:
        seconds = float(parts[-1])
        minutes = int(parts[-2]) if len(parts) >= 2 else 0
        hours = int(parts[-3]) if len(parts) >= 3 else 0
    except ValueError:
        return None
    return round(((hours * 60 + minutes) * 60 + seconds) * 1000)


def status_code(status: str, position_text: str) -> tuple[int, str]:
    """Map Ergast status text to Jolpica SessionStatus (see migration 004) + a short detail."""
    s = (status or "").lower()
    if s == "finished":
        return 0, "Finished"
    if s == "lapped" or re.match(r"^\+\d+ laps?$", s):
        return 1, "Lapped"
    if "disqualif" in s or position_text == "D":
        return 20, "Disqualified"
    if "did not start" in s or "withdrew" in s or position_text == "W":
        return 30, "Did not start"
    if "did not qualify" in s:
        return 40, "Did not qualify"
    if "did not prequalify" in s:
        return 41, "Did not prequalify"
    if any(w in s for w in ("accident", "collision", "spun off")):
        return 10, "Retired"
    return 11, "Retired"


def ensure_driver(cur, d: dict) -> int:
    cur.execute(
        """insert into f1.drivers (ref, code, forename, surname, nationality, date_of_birth, permanent_number, wikipedia_en)
           values (%s, %s, %s, %s, %s, %s, %s, %s)
           on conflict (ref) do update set code = coalesce(excluded.code, f1.drivers.code)
           returning id""",
        (d["driverId"], d.get("code"), d["givenName"], d["familyName"], d.get("nationality"),
         d.get("dateOfBirth"), d.get("permanentNumber"), d.get("url")),
    )
    return cur.fetchone()[0]


def ensure_team(cur, c: dict) -> int:
    cur.execute(
        """insert into f1.teams (ref, name, nationality, wikipedia_en) values (%s, %s, %s, %s)
           on conflict (ref) do update set name = f1.teams.name returning id""",
        (c["constructorId"], c["name"], c.get("nationality"), c.get("url")),
    )
    return cur.fetchone()[0]


def ensure_session(cur, round_id: int, typ: str) -> int:
    cur.execute("select id from f1.sessions where round_id = %s and type = %s order by number nulls last limit 1",
                (round_id, typ))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("insert into f1.sessions (round_id, type, is_cancelled, has_time_data) values (%s, %s, false, true) returning id",
                (round_id, typ))
    return cur.fetchone()[0]


def has_rows(cur, sql: str, params: tuple) -> bool:
    cur.execute(f"select exists ({sql})", params)
    return cur.fetchone()[0]


def insert_classification(cur, session_id: int, rows: list[dict]) -> dict[str, int]:
    """Race / sprint results. Returns driverId -> result id."""
    ids: dict[str, int] = {}
    for r in rows:
        driver_id = ensure_driver(cur, r["Driver"])
        team_id = ensure_team(cur, r["Constructor"])
        code, detail = status_code(r.get("status", ""), r.get("positionText", ""))
        cur.execute(
            """insert into f1.results (session_id, driver_id, team_id, car_number, position, grid, points, status,
                                       detail, is_classified, laps_completed, time_ms, fastest_lap_rank)
               values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) returning id""",
            (session_id, driver_id, team_id, r.get("number"), r.get("position"), r.get("grid"), r.get("points"),
             code, detail, r.get("positionText", "").isdigit(), r.get("laps"),
             int(r["Time"]["millis"]) if r.get("Time", {}).get("millis") else None,
             (r.get("FastestLap") or {}).get("rank")),
        )
        ids[r["Driver"]["driverId"]] = cur.fetchone()[0]
    return ids


def insert_qualifying(cur, round_id: int, rows: list[dict]) -> int:
    """Split Ergast qualifying into Q1/Q2/Q3 sessions, ranked by that part's time (as in the dump)."""
    n = 0
    for part in ("Q1", "Q2", "Q3"):
        entrants = [r for r in rows if r.get(part) or part == "Q1"]
        if part != "Q1" and not entrants:
            continue
        # Drivers without a time keep their overall order behind those with a time.
        entrants.sort(key=lambda r: (to_ms(r.get(part)) is None, to_ms(r.get(part)) or 0, int(r["position"])))
        session_id = ensure_session(cur, round_id, part)
        for pos, r in enumerate(entrants, 1):
            ms = to_ms(r.get(part))
            # No time set in the part = not classified (dump: status 11 "Retired").
            status, detail, classified = (0, "Finished", True) if ms is not None else (11, "Retired", False)
            cur.execute(
                """insert into f1.results (session_id, driver_id, team_id, car_number, position, status, detail,
                                           is_classified, time_ms)
                   values (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (session_id, ensure_driver(cur, r["Driver"]), ensure_team(cur, r["Constructor"]),
                 r.get("number"), pos, status, detail, classified, ms),
            )
            n += 1
    return n


def topup_round(cur, year: int, rnd: int, round_id: int) -> dict[str, int]:
    done: dict[str, int] = {}
    base = f"{year}/{rnd}"
    in_round = "select 1 from f1.results x join f1.sessions s on s.id = x.session_id where s.round_id = %s and s.type = %s"

    if not has_rows(cur, in_round, (round_id, "R")):
        rows = api_all(f"{base}/results.json", "Results")
        if rows:
            insert_classification(cur, ensure_session(cur, round_id, "R"), rows)
            done["race"] = len(rows)

    cur.execute("select exists (select 1 from f1.sessions where round_id = %s and type = 'SR')", (round_id,))
    if cur.fetchone()[0] and not has_rows(cur, in_round, (round_id, "SR")):
        rows = api_all(f"{base}/sprint.json", "SprintResults")
        if rows:
            insert_classification(cur, ensure_session(cur, round_id, "SR"), rows)
            done["sprint"] = len(rows)

    if not has_rows(cur, in_round, (round_id, "Q1")):
        rows = api_all(f"{base}/qualifying.json", "QualifyingResults")
        if rows:
            done["qualifying"] = insert_qualifying(cur, round_id, rows)

    # Laps & pit stops attach to race results (need the race first).
    cur.execute("""select d.ref, x.id from f1.results x join f1.sessions s on s.id = x.session_id
                   join f1.drivers d on d.id = x.driver_id where s.round_id = %s and s.type = 'R'""", (round_id,))
    race_result = dict(cur.fetchall())
    if race_result:
        lap_sql = ("select 1 from f1.laps l join f1.results x on x.id = l.result_id join f1.sessions s on s.id = x.session_id "
                   "where s.round_id = %s and s.type = %s and l.number is not null")
        if not has_rows(cur, lap_sql, (round_id, "R")):
            laps = api_all(f"{base}/laps.json", "Laps")
            rows = [(race_result[t["driverId"]], int(lap["number"]), t.get("position"), to_ms(t.get("time")))
                    for lap in laps for t in lap["Timings"] if t["driverId"] in race_result]
            # Mark each driver's fastest lap like the dump does.
            best: dict[int, tuple[int, int]] = {}
            for rid, num, _, ms in rows:
                if ms is not None and (rid not in best or ms < best[rid][1]):
                    best[rid] = (num, ms)
            with cur.copy("copy f1.laps (result_id, number, position, time_ms, is_fastest) from stdin") as cp:
                for rid, num, pos, ms in rows:
                    cp.write_row((rid, num, pos, ms, rid in best and best[rid][0] == num))
            if rows:
                done["laps"] = len(rows)

        pit_sql = ("select 1 from f1.pit_stops p join f1.results x on x.id = p.result_id join f1.sessions s on s.id = x.session_id "
                   "where s.round_id = %s and s.type = %s")
        if not has_rows(cur, pit_sql, (round_id, "R")):
            stops = api_all(f"{base}/pitstops.json", "PitStops")
            for p in stops:
                if p["driverId"] in race_result:
                    cur.execute("insert into f1.pit_stops (result_id, number, lap, duration_ms, local_time) values (%s,%s,%s,%s,%s)",
                                (race_result[p["driverId"]], p.get("stop"), p.get("lap"), to_ms(p.get("duration")), p.get("time")))
            if stops:
                done["pit_stops"] = len(stops)

    # Standings after the race (session_number of the race session, as in the dump).
    cur.execute("select number from f1.sessions where round_id = %s and type = 'R' order by number nulls last limit 1", (round_id,))
    row = cur.fetchone()
    sess_no = row[0] if row and row[0] is not None else 99
    if race_result and not has_rows(cur, "select 1 from f1.driver_standings where season_year = %s and round_number = %s",
                                    (year, rnd)):
        ds = api_all(f"{base}/driverstandings.json", "DriverStandings")
        for s in ds:
            cur.execute("""insert into f1.driver_standings (season_year, round_number, session_number, driver_id, position, points, wins, is_eligible, adjustment_type)
                           values (%s,%s,%s,%s,%s,%s,%s,true,0)""",
                        (year, rnd, sess_no, ensure_driver(cur, s["Driver"]), s.get("position"), s.get("points"), s.get("wins")))
        cs = api_all(f"{base}/constructorstandings.json", "ConstructorStandings")
        for s in cs:
            cur.execute("""insert into f1.team_standings (season_year, round_number, session_number, team_id, position, points, wins, is_eligible, adjustment_type)
                           values (%s,%s,%s,%s,%s,%s,%s,true,0)""",
                        (year, rnd, sess_no, ensure_team(cur, s["Constructor"]), s.get("position"), s.get("points"), s.get("wins")))
        if ds:
            done["standings"] = len(ds) + len(cs)
    return done


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--round", help="only this round, e.g. 2026:19")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    dsn = os.environ.get("DATABASE_URL") or sys.exit("Set DATABASE_URL")

    with psycopg.connect(dsn, autocommit=False) as conn, conn.cursor() as cur:
        if args.round:
            year, rnd = (int(x) for x in args.round.split(":"))
            cur.execute("select season_year, number, id from f1.rounds where season_year = %s and number = %s", (year, rnd))
        else:
            # Finished rounds (date passed) of the latest season — dump lag is at most a few rounds.
            cur.execute("""select season_year, number, id from f1.rounds
                           where season_year = (select max(year) from f1.seasons)
                             and number is not null and not is_cancelled and date < %s
                           order by number""", (dt.datetime.now(dt.timezone.utc).date(),))
        rounds = cur.fetchall()
        total = {}
        for year, rnd, round_id in rounds:
            done = topup_round(cur, year, rnd, round_id)
            if done:
                log(f"{year} round {rnd}: {done}")
                for k, v in done.items():
                    total[k] = total.get(k, 0) + v
        if not total:
            log("nothing to top up")
        if args.dry_run:
            conn.rollback()
            log("dry run: rolled back")
        else:
            conn.commit()
            log(f"committed {total}")


if __name__ == "__main__":
    main()
