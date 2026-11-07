import psycopg, uuid
import os
DSN = os.environ.get("TEST_DATABASE_URL", "host=127.0.0.1 port=54329 user=postgres dbname=postgres")
admin = psycopg.connect(DSN, autocommit=True)
A, B = uuid.uuid4(), uuid.uuid4()
admin.execute("insert into auth.users(id,email) values (%s,'a@x'),(%s,'b@x')", (A, B))
admin.execute("insert into seasons(id,label) values (2099,'t') on conflict do nothing")
race = admin.execute("insert into races(season_id,round,name,race_at_utc,qualifying_at_utc) values (2099,1,'Open GP', now()+interval '2 days', now()+interval '1 day') returning id").fetchone()[0]
closed = admin.execute("insert into races(season_id,round,name,race_at_utc,qualifying_at_utc) values (2099,2,'Closed GP', now()-interval '1 day', now()-interval '2 days') returning id").fetchone()[0]
pa = admin.execute("insert into users(auth_user_id,email,display_name) values (%s,'a@x','A') returning id", (A,)).fetchone()[0]
pb = admin.execute("insert into users(auth_user_id,email,display_name) values (%s,'b@x','B') returning id", (B,)).fetchone()[0]
legacy = admin.execute("insert into users(display_name) values ('Legacy') returning id").fetchone()[0]
admin.execute("insert into predictions(user_id,race_id,type,payload) values (%s,%s,'race_podium','{\"1\":\"x\",\"2\":\"y\",\"3\":\"z\"}')", (pb, race))
admin.execute("insert into f1.stories(slug,status) values ('draft-story','draft')")
def check(label, role, sub, sql, params=(), expect_ok=True):
    c = psycopg.connect(DSN)
    try:
        c.execute(f"set role {role}")
        if sub: c.execute("select set_config('request.jwt.claim.sub', %s, false)", (str(sub),))
        cur = c.execute(sql, params)
        res = cur.fetchall() if cur.description else cur.rowcount
        c.commit(); ok = True
    except Exception as e:
        c.rollback(); ok = False; res = type(e).__name__
    finally: c.close()
    status = "PASS" if ok == expect_ok else "FAIL"
    print(f"{status}  {label}: {'ok' if ok else 'blocked'} -> {res}")
P = '{"1":"a","2":"b","3":"c"}'
check("anon reads f1.drivers", "anon", None, "select count(*) from f1.drivers")
check("anon cannot write f1.drivers", "anon", None, "insert into f1.drivers(ref,forename,surname) values ('x','x','x')", expect_ok=False)
check("anon sees no draft stories", "anon", None, "select count(*) from f1.stories")
check("anon cannot read f1.data_loads", "anon", None, "select count(*) from f1.data_loads", expect_ok=False)
check("anon cannot insert prediction", "anon", None, "insert into predictions(user_id,race_id,type,payload) values (%s,%s,'race_podium',%s)", (pa, race, P), expect_ok=False)
check("anon cannot create user row", "anon", None, "insert into users(display_name) values ('evil')", expect_ok=False)
check("A inserts own prediction (open race)", "authenticated", A, "insert into predictions(user_id,race_id,type,payload) values (%s,%s,'race_podium',%s)", (pa, race, P))
check("A cannot insert for B", "authenticated", A, "insert into predictions(user_id,race_id,type,payload) values (%s,%s,'race_top10',%s)", (pb, race, P), expect_ok=False)
check("A cannot insert after deadline", "authenticated", A, "insert into predictions(user_id,race_id,type,payload) values (%s,%s,'race_podium',%s)", (pa, closed, P), expect_ok=False)
check("A cannot insert with points", "authenticated", A, "insert into predictions(user_id,race_id,type,payload,points) values (%s,%s,'race_top10',%s,99)", (pa, race, P), expect_ok=False)
check("A upsert own prediction", "authenticated", A, "insert into predictions(user_id,race_id,type,payload) values (%s,%s,'race_podium',%s) on conflict (user_id,race_id,type) do update set payload=excluded.payload", (pa, race, P))
check("A cannot set points via update", "authenticated", A, "update predictions set points=99 where user_id=%s", (pa,), expect_ok=False)
check("A sees only own predictions (B's hidden)", "authenticated", A, "select count(*) from predictions where user_id=%s", (pb,))
check("A cannot change own auth_user_id", "authenticated", A, "update users set auth_user_id=%s where id=%s", (B, pa), expect_ok=False)
check("A can change own display_name", "authenticated", A, "update users set display_name='A2' where id=%s", (pa,))
check("A cannot rename B (0 rows)", "authenticated", A, "update users set display_name='hacked' where id=%s", (pb,))
check("A cannot read legacy user rows", "authenticated", A, "select count(*) from users where id=%s", (legacy,))
check("forged x-user-id header is ignored", "anon", None, "select set_config('request.headers', %s, false), public.request_user_id()", ('{"x-user-id":"%s"}' % pa,))
print("B display_name after attack:", admin.execute("select display_name from users where id=%s", (pb,)).fetchone())
