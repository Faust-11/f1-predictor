#!/usr/bin/env python3
"""Load the Jolpica F1 CSV database dump into the `f1` schema (supabase/migrations/004_f1_history.sql).

Usage:
    DATABASE_URL=postgresql://... python3 scripts/jolpica/load_dump.py --download
    DATABASE_URL=postgresql://... python3 scripts/jolpica/load_dump.py --zip path/to/dump_csv.zip

* --download fetches the free (14-day delayed) CSV dump and verifies its SHA-256 against the API.
* Entities (seasons, circuits, drivers, teams, rounds) are upserted by natural keys, so our own
  content that references them survives reloads. Session-level data is replaced wholesale.
* Everything runs in ONE transaction: on any error the database is left unchanged.

Data licence: CC BY-NC-SA 4.0 (non-commercial, attribution required) — https://github.com/jolpica/jolpica-f1
Requires: pip install "psycopg[binary]"
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import sys
import time
import urllib.request
import zipfile

import psycopg

API = "https://api.jolpi.ca/data/dumps/download/"
USER_AGENT = "Slipstream/0.1 (+https://the-slipstream.vercel.app)"

TABLES = [
    "season", "championshipsystem", "circuit", "driver", "team", "round", "teamdriver",
    "roundentry", "session", "sessionentry", "lap", "pitstop", "driverchampionship", "teamchampionship",
]


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=300) as resp:
        return resp.read()


def download_dump() -> tuple[bytes, dict]:
    info = json.loads(http_get(API))
    meta = info["delayed_dumps"]["csv"]
    log(f"downloading delayed CSV dump uploaded {meta['uploaded_at']} ({meta['file_size']:,} bytes)")
    data = http_get(meta["download_url"])
    digest = hashlib.sha256(data).hexdigest()
    if digest != meta["file_hash"]:
        sys.exit(f"SHA-256 mismatch: got {digest}, expected {meta['file_hash']}")
    return data, meta


def stage(cur: psycopg.Cursor, zf: zipfile.ZipFile) -> dict[str, int]:
    """COPY every needed CSV into an all-text temp table stg_<name>."""
    counts: dict[str, int] = {}
    for name in TABLES:
        raw = zf.read(f"formula_one_{name}.csv")
        header = next(csv.reader(io.StringIO(raw.split(b"\n", 1)[0].decode("utf-8"))))
        cols = ", ".join(f'"{c}" text' for c in header)
        cur.execute(f"create temp table stg_{name} ({cols}) on commit drop")
        with cur.copy(f"copy stg_{name} from stdin with (format csv, header true)") as cp:
            cp.write(raw)
        cur.execute(f"select count(*) from stg_{name}")
        counts[name] = cur.fetchone()[0]
        log(f"staged {name}: {counts[name]:,} rows")
    return counts


MS = "(extract(epoch from nullif({0}, '')::interval) * 1000)::{1}"

TRANSFORM = [
    # --- entities: upsert by natural keys -------------------------------------------------------
    """
    insert into f1.seasons (year, wikipedia_en, championship_system)
    select s.year::smallint, nullif(s.wikipedia, ''), cs.name
    from stg_season s left join stg_championshipsystem cs on cs.id = s.championship_system_id
    on conflict (year) do update set
      wikipedia_en = excluded.wikipedia_en, championship_system = excluded.championship_system
    """,
    """
    insert into f1.circuits (ref, name, locality, country, country_code, latitude, longitude, altitude_m, wikipedia_en)
    select reference, name, locality, country, country_code, latitude::float8, longitude::float8,
           round(nullif(altitude, '')::numeric)::int, nullif(wikipedia, '')
    from stg_circuit
    on conflict (ref) do update set
      name = excluded.name, locality = excluded.locality, country = excluded.country,
      country_code = excluded.country_code, latitude = excluded.latitude, longitude = excluded.longitude,
      altitude_m = excluded.altitude_m, wikipedia_en = excluded.wikipedia_en
    """,
    """
    insert into f1.drivers (ref, code, forename, surname, nationality, country_code, date_of_birth, permanent_number, wikipedia_en)
    select reference, nullif(abbreviation, ''), forename, surname, nationality, country_code,
           nullif(date_of_birth, '')::date, nullif(permanent_car_number, '')::smallint, nullif(wikipedia, '')
    from stg_driver
    on conflict (ref) do update set
      code = excluded.code, forename = excluded.forename, surname = excluded.surname,
      nationality = excluded.nationality, country_code = excluded.country_code,
      date_of_birth = excluded.date_of_birth, permanent_number = excluded.permanent_number,
      wikipedia_en = excluded.wikipedia_en
    """,
    """
    insert into f1.teams (ref, name, nationality, country_code, primary_color, wikipedia_en)
    select reference, name, nationality, country_code, nullif(primary_color, ''), nullif(wikipedia, '')
    from stg_team
    on conflict (ref) do update set
      name = excluded.name, nationality = excluded.nationality, country_code = excluded.country_code,
      primary_color = coalesce(excluded.primary_color, f1.teams.primary_color), wikipedia_en = excluded.wikipedia_en
    """,
    """
    insert into f1.rounds (season_year, number, race_number, name, circuit_id, date, is_cancelled, wikipedia_en)
    select s.year::smallint, r.number::smallint, nullif(r.race_number, '')::int, r.name, c.id,
           nullif(r.date, '')::date, r.is_cancelled::boolean, nullif(r.wikipedia, '')
    from stg_round r
    join stg_season s on s.id = r.season_id
    left join stg_circuit sc on sc.id = r.circuit_id
    left join f1.circuits c on c.ref = sc.reference
    where nullif(r.number, '') is not null
    on conflict (season_year, number) do update set
      race_number = excluded.race_number, name = excluded.name, circuit_id = excluded.circuit_id,
      date = excluded.date, is_cancelled = excluded.is_cancelled, wikipedia_en = excluded.wikipedia_en
    """,
    # Cancelled rounds have no number — keyed by (season, name).
    """
    insert into f1.rounds (season_year, number, race_number, name, circuit_id, date, is_cancelled, wikipedia_en)
    select s.year::smallint, null, nullif(r.race_number, '')::int, r.name, c.id,
           nullif(r.date, '')::date, r.is_cancelled::boolean, nullif(r.wikipedia, '')
    from stg_round r
    join stg_season s on s.id = r.season_id
    left join stg_circuit sc on sc.id = r.circuit_id
    left join f1.circuits c on c.ref = sc.reference
    where nullif(r.number, '') is null
    on conflict (season_year, name) where number is null do update set
      race_number = excluded.race_number, circuit_id = excluded.circuit_id,
      date = excluded.date, is_cancelled = excluded.is_cancelled, wikipedia_en = excluded.wikipedia_en
    """,
    # --- id maps (staging id -> our id) ----------------------------------------------------------
    """
    create temp table map_driver on commit drop as
      select sd.id as src, d.id from stg_driver sd join f1.drivers d on d.ref = sd.reference
    """,
    """
    create temp table map_team on commit drop as
      select st.id as src, t.id from stg_team st join f1.teams t on t.ref = st.reference
    """,
    """
    create temp table map_round on commit drop as
      select sr.id as src, r.id from stg_round sr join stg_season s on s.id = sr.season_id
      join f1.rounds r on r.season_year = s.year::smallint
       and (r.number = nullif(sr.number, '')::smallint
            or (nullif(sr.number, '') is null and r.number is null and r.name = sr.name))
    """,
    "create index on map_driver(src); create index on map_team(src); create index on map_round(src)",
    # --- session-level data: replace wholesale ---------------------------------------------------
    "truncate f1.pit_stops, f1.laps, f1.results, f1.sessions, f1.team_drivers, f1.driver_standings, f1.team_standings",
    """
    insert into f1.team_drivers (season_year, team_id, driver_id, role)
    select s.year::smallint, mt.id, md.id, nullif(td.role, '')::smallint
    from stg_teamdriver td
    join stg_season s on s.id = td.season_id
    join map_team mt on mt.src = td.team_id
    join map_driver md on md.src = td.driver_id
    """,
    f"""
    insert into f1.sessions (src_id, round_id, type, number, starts_at, timezone, scheduled_laps, completed_laps, is_cancelled, has_time_data)
    select ss.id::int, mr.id, ss.type, nullif(ss.number, '')::smallint, nullif(ss.timestamp, '')::timestamptz,
           nullif(ss.timezone, ''), nullif(ss.scheduled_laps, '')::smallint, nullif(ss.completed_laps, '')::smallint,
           ss.is_cancelled::boolean, ss.has_time_data::boolean
    from stg_session ss join map_round mr on mr.src = ss.round_id
    """,
    f"""
    insert into f1.results (src_id, session_id, driver_id, team_id, car_number, position, grid, points, status, detail,
                            is_classified, laps_completed, time_ms, fastest_lap_rank)
    select se.id::int, s.id, md.id, mt.id, nullif(re.car_number, '')::smallint,
           nullif(se.position, '')::smallint, nullif(se.grid, '')::smallint, nullif(se.points, '')::numeric,
           nullif(se.status, '')::smallint, nullif(se.detail, ''), nullif(se.is_classified, '')::boolean,
           nullif(se.laps_completed, '')::smallint, {MS.format('se.time', 'bigint')},
           nullif(se.fastest_lap_rank, '')::smallint
    from stg_sessionentry se
    join f1.sessions s on s.src_id = se.session_id::int
    join stg_roundentry re on re.id = se.round_entry_id
    join stg_teamdriver td on td.id = re.team_driver_id
    join map_driver md on md.src = td.driver_id
    join map_team mt on mt.src = td.team_id
    """,
    f"""
    insert into f1.laps (result_id, number, position, time_ms, is_deleted, is_fastest, avg_speed_kph)
    select r.id, nullif(l.number, '')::smallint, nullif(l.position, '')::smallint, {MS.format('l.time', 'int')},
           coalesce(nullif(l.is_deleted, '')::boolean, false), coalesce(nullif(l.is_entry_fastest_lap, '')::boolean, false),
           nullif(l.average_speed, '')::real
    from stg_lap l join f1.results r on r.src_id = l.session_entry_id::int
    """,
    f"""
    insert into f1.pit_stops (result_id, number, lap, duration_ms, local_time)
    select r.id, nullif(p.number, '')::smallint, nullif(l.number, '')::smallint, {MS.format('p.duration', 'int')},
           nullif(p.local_timestamp, '')::time
    from stg_pitstop p
    join f1.results r on r.src_id = p.session_entry_id::int
    left join stg_lap l on l.id = p.lap_id
    """,
    """
    insert into f1.driver_standings (season_year, round_number, session_number, driver_id, position, points, wins,
                                     highest_finish, is_eligible, adjustment_type)
    select dc.year::smallint, dc.round_number::smallint, dc.session_number::smallint, md.id,
           nullif(dc.position, '')::smallint, nullif(dc.points, '')::numeric, nullif(dc.win_count, '')::smallint,
           nullif(dc.highest_finish, '')::smallint, nullif(dc.is_eligible, '')::boolean, nullif(dc.adjustment_type, '')::smallint
    from stg_driverchampionship dc join map_driver md on md.src = dc.driver_id
    """,
    """
    insert into f1.team_standings (season_year, round_number, session_number, team_id, position, points, wins,
                                   highest_finish, is_eligible, adjustment_type)
    select tc.year::smallint, tc.round_number::smallint, tc.session_number::smallint, mt.id,
           nullif(tc.position, '')::smallint, nullif(tc.points, '')::numeric, nullif(tc.win_count, '')::smallint,
           nullif(tc.highest_finish, '')::smallint, nullif(tc.is_eligible, '')::boolean, nullif(tc.adjustment_type, '')::smallint
    from stg_teamchampionship tc join map_team mt on mt.src = tc.team_id
    """,
]

# Staged rows that must all land in the final tables (otherwise a join silently dropped data).
COMPLETENESS = [
    ("season", "f1.seasons", None),
    ("circuit", "f1.circuits", None),
    ("driver", "f1.drivers", None),
    ("team", "f1.teams", None),
    ("round", "f1.rounds", None),
    ("teamdriver", "f1.team_drivers", None),
    ("session", "f1.sessions", None),
    ("sessionentry", "f1.results", None),
    ("lap", "f1.laps", None),
    ("pitstop", "f1.pit_stops", None),
    ("driverchampionship", "f1.driver_standings", None),
    ("teamchampionship", "f1.team_standings", None),
]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--download", action="store_true", help="download the latest free (delayed) CSV dump")
    src.add_argument("--zip", help="path to an already downloaded dump_csv.zip")
    ap.add_argument("--dry-run", action="store_true", help="load and verify, then roll back")
    ap.add_argument("--skip-if-loaded", action="store_true", help="exit early if this dump (SHA-256) is already loaded")
    args = ap.parse_args()

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("Set DATABASE_URL (Supabase → Connect → Session pooler / direct connection string).")

    if args.download:
        data, meta = download_dump()
        sha, uploaded_at = meta["file_hash"], meta["uploaded_at"]
    else:
        data = open(args.zip, "rb").read()
        sha, uploaded_at = hashlib.sha256(data).hexdigest(), None

    zf = zipfile.ZipFile(io.BytesIO(data))
    t0 = time.time()
    with psycopg.connect(dsn, autocommit=False) as conn, conn.cursor() as cur:
        if args.skip_if_loaded:
            cur.execute("select 1 from f1.data_loads where file_sha256 = %s", (sha,))
            if cur.fetchone():
                log(f"dump {sha[:12]}… already loaded — nothing to do")
                return
        cur.execute("set local statement_timeout = 0")
        staged = stage(cur, zf)
        for i, sql in enumerate(TRANSFORM, 1):
            cur.execute(sql)
            log(f"step {i}/{len(TRANSFORM)}: {cur.statusmessage}")

        problems = []
        final: dict[str, int] = {}
        for stg, table, _ in COMPLETENESS:
            cur.execute(f"select count(*) from {table}")
            final[table] = cur.fetchone()[0]
            if final[table] < staged[stg]:
                problems.append(f"{table}: {final[table]:,} < staged {staged[stg]:,}")
        if problems:
            conn.rollback()
            sys.exit("Rolled back — rows lost in transform:\n  " + "\n  ".join(problems))

        cur.execute(
            "insert into f1.data_loads (source, file_sha256, uploaded_at, row_counts) values (%s, %s, %s, %s)",
            ("jolpica-csv-dump", sha, uploaded_at, json.dumps(final)),
        )
        if args.dry_run:
            conn.rollback()
            log("dry run: verified and rolled back")
        else:
            conn.commit()
            log("committed")
    for table, n in final.items():
        log(f"  {table}: {n:,}")
    log(f"done in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
