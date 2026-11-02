# Deleting a user's data

Internal runbook. Follow it when someone asks us to delete their account or their data. They write to the contact address on the privacy page, which promises a reply within 30 days. You should not need to read the code to follow it.

Written 2 November 2026 against `src/lib/db/schema.sql`, Better Auth 1.5.5 and the app code of that day. The SQL and the Step 4 script were run against throwaway local servers (PostgreSQL 16 and Redis 7) holding two seeded users, and only the target user's data went. The Blob calls were tested against a local fake of the Blob API. Nothing here has been run against Neon, Upstash, Vercel Blob or Dodo.

## Read this first

- **There is no delete-account feature.** No route, button, script or Better Auth hook removes an account. The app deletes one video at a time (Delete on the dashboard or the video page): that removes the video's usage events, comments, approval, database row, queue entry, Redis snapshots, local files and Blob objects, and leaves the account alone. So "deleted with your account" on the privacy page is only true when somebody runs this.
- **Everything is live.** Dev and prod share one Neon database, and your Blob store and Redis may be shared too. There is no copy to practise on.
- **A mistyped id deletes nothing rather than someone else's data.** Every SQL statement matches on this one user's id, the ids of their videos, or their email, and the Step 4 script reads the video ids from the database by owner. (The one thing taken on trust is an id you pass to that script with `--ids` after the database no longer lists it: see Step 4.) The real risk is picking the wrong person, so Step 1 shows the email next to the id. Copy the id from that result.
- **Old anonymous-era videos can't be found.** Early rows with `video_jobs.owner_type = 'anon'` belong to an anonymous session id that no code ever linked to an account. The app only creates videos for signed-in users today.
- Allow about 30 minutes. Keep a scratch text file open **outside the repo** and paste each result into it.

## Two decisions (make them before you start)

**1. `render_events` rows: keep them de-identified (the default in this runbook) or delete them.**
This table holds job ids, stage names, error codes, timings and, for failed provider calls, the provider's raw error text. Only the job-level rows (started, completed, failed) carry a user id. The per-stage and provider-error rows carry none, so they are tied to a person only through the job id. The default in Step 5a clears `user_id` and `provider_error` on every row that belongs to this user (by user id or by video id) and keeps the rest, so your funnel numbers survive (`scripts/funnel.ts` will count those jobs as anonymous). If you would rather delete the rows, use the DELETE that is written out in the comment under it. The privacy page says job records are "deleted with your account", and nothing in the app deletes `render_events` on any trigger, so this is the one place the default leaves rows behind.

**2. Billing records: keep them or delete them (Step 5b).**
The privacy page says that after deletion we keep what is needed for legal, tax, fraud-prevention or accounting purposes. Whether `processed_webhook_events` is that is your call, not the code's. (`payments` is a leftover from before Dodo: nothing in the app reads or writes it, so it is probably empty.) Dodo, as the payment processor, keeps its own transaction records either way. Records you keep still carry the user id, which stops pointing at a person once Step 5a has run.

## Every place a user's data lives

| Where | What it holds | Keyed by | Removed in |
|---|---|---|---|
| Neon `"user"` | email, name, Google profile image | `id` | 5a |
| Neon `account` | Google account id and the OAuth access, refresh and ID tokens | `"userId"` | 5a |
| Neon `session` | session token plus the **IP address and browser user-agent** from each sign-in | `"userId"` | 2, 5a |
| Neon `passkey` | only if passkeys were ever switched on (the app does not do so today) | `"userId"` | 5a |
| Neon `api_keys` | key prefix, hash, label | `user_id` | 2, 5a |
| Neon `video_jobs` | the prompt, job data (script, options, asset ids), result, video URLs, errors | `owner_id` | 5a |
| Neon `job_comments`, `job_approvals`, `video_usage_events` | comments, approval state, download/share/play events | the video's id, and the user column | 5a |
| Neon `render_events` | stage timings, error codes, raw provider error text | `job_id`; `user_id` on job-level rows only | 5a (decision 1) |
| Neon `brand_kits` | brand name, logo URL, colours, phrase lists | `user_id` | 5a |
| Neon `user_plan_overrides`, `billing_customers` | plan; Dodo customer id | `user_id` | 5a |
| Neon `payments`, `processed_webhook_events` | amounts, plan, Dodo ids and event keys | `user_id` | 5b (decision 2) |
| Neon `contact_submissions` | name, email, phone, company, message and the **IP address** | `email` | 5b |
| Vercel Blob `videos/` | the rendered MP4s: `<job id>.mp4`, `<job id>-v1.mp4`, `<job id>-preview.mp4` | the job id in the file name | 4 |
| Vercel Blob `uploads/` | logos, photos, reference files, under random names | the owner is only in the Redis record `cutline:asset:<uuid>` | 4 (they also expire after 24 hours) |
| Redis, BullMQ queue `video-generation` | each job's prompt, options, user id and result. Kept by count (the last 100 completed and 500 failed), not by age | job id | 4 |
| Redis counters | `cutline:usage:<user id>:<month>` and `...:videos`, `cutline:spend:<user id>:<month>`, `cutline:cine:<user id>:<month>` (all expire after 70 days) and `cutline:cinetopup:<user id>` (never expires: it is the seconds they bought) | user id | 4 |
| Redis snapshots | `cutline:regen:<job id>` (7 days), `cutline:preview:<job id>` (1 day) | job id | 4 |
| Dodo Payments | customer, subscription, transactions | customer id, email | 2 |

**Not keyed to a user, so not touched here:** Neon `verification` (short-lived sign-in state) and `anon_sessions` (no user link); Redis rate-limit counters `cutline:rl:*` (keyed by IP address, API key id, or `user:<id>` for asset analysis; the default windows run from one minute to one day), `cutline:heygen:photo-cache` (keyed by image hash), the `cutline:*release:*` guards and `cutline:job:cancelled` (job ids only), and BullMQ's rolling event stream (the last ~10,000 events, job ids and result URLs; it can't be edited per job and ages out).

## Placeholders

| Placeholder | Where it comes from |
|---|---|
| `<EMAIL>` | the request; it must be the address on the account |
| `<USER_ID>` | Step 1a |
| `<JOB_IDS>` | Step 3a: one cell, ids separated by spaces. Only needed if you run Step 4 after Step 5a |
| `<DODO_CUSTOMER_ID>` | Step 3c (there may be none) |

Replace each one everywhere before you run anything (find and replace in a text editor, then paste the result into the Neon SQL editor). Leave the quotes in place. If an email contains a single quote (`o'brien@example.com`), write it twice inside the SQL (`o''brien@example.com`); the other three values never contain one.

## Step 0. Check the request

It must come from the email address on the account (the privacy page tells people to write from it). If it doesn't, reply asking them to resend from that address and stop. Tell them, when you reply in Step 7, what is kept.

## Step 1. Find the account (Neon SQL editor)

**1a. Find the user.** Exactly one row. Zero rows means a different email (they may have signed in with another Google account): stop. Copy `id`; this is `<USER_ID>`.

```sql
-- Step 1a
SELECT id, email, name, "createdAt" FROM "user" WHERE lower(email) = lower('<EMAIL>');
```

**1b. Check where Better Auth's tables are.** Expect `account`, `session`, `user` and `verification`, all in `public`, and no `passkey`. If they show up in another schema (`docs/BETTER_AUTH_SETUP.md` suggests one called `auth`, but the app's code doesn't set it), write `auth."user"` and so on in 1a and in Step 6; Step 5a already looks in `auth` as well.

```sql
-- Step 1b
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN ('user', 'session', 'account', 'verification', 'passkey')
ORDER BY table_name, table_schema;
```

**1c. Check the foreign keys.** Expect exactly two rows: `account -> "user" CASCADE` and `session -> "user" CASCADE` (plus `passkey -> "user"` if that table exists). None of the app's own tables declares a foreign key, so the only order the database can enforce is Better Auth's: `session`, `account` (and `passkey`) before `"user"`. Step 5a deletes them in that order, so it also works if your database has these keys without the cascade (the `on_delete` column would then say `NO ACTION`). If this query lists any other pair, a table was added since this was written: delete the child before its parent.

```sql
-- Step 1c
SELECT conrelid::regclass AS child, confrelid::regclass AS parent,
       CASE confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
                        WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS on_delete
FROM pg_constraint
WHERE contype = 'f'
ORDER BY 1;
```

**1d. Check nothing new has appeared.** This lists every column that looks like it holds a user id. Expect exactly the tables in the map above: `account.userId`, `api_keys.user_id`, `billing_customers.user_id`, `brand_kits.user_id`, `job_approvals.actor_user_id`, `job_comments.user_id`, `payments.user_id`, `processed_webhook_events.user_id`, `render_events.user_id`, `session.userId`, `user_plan_overrides.user_id`, `video_jobs.owner_id`, `video_usage_events.user_id` (once its SQL has been run) and `passkey.userId` (only if that table exists). Anything else is a table added after this was written: work out what it holds and add a DELETE for it to Step 5a.

```sql
-- Step 1d
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND (column_name ILIKE '%user%id%' OR column_name = 'owner_id')
ORDER BY table_name, column_name;
```

## Step 2. Stop billing and cut off access

**2a. Dodo.** In the Dodo Payments dashboard find the customer by email and cancel any active subscription. Do this first: while a subscription is live, Dodo keeps sending webhooks that write `processed_webhook_events`, the plan and the top-up balance for this user id, which would put back data you have just deleted.

**2b. Sign them out and revoke API keys.** They can still sign in again with Google until Step 5a deletes the user row, so do Steps 3 to 5 in one sitting.

```sql
-- Step 2b
DELETE FROM "session" WHERE "userId" = '<USER_ID>';
DELETE FROM api_keys WHERE user_id = '<USER_ID>';
```

**2c. Make sure nothing is rendering.** Expect zero rows. If a video is `queued` or `processing`, wait for it to finish or fail and run this again: when a job ends it writes `render_events` and Redis counters for the user, which would put back rows you have deleted. If a job has been stuck for hours (the worker died), carry on: Step 6 will catch anything it leaves.

```sql
-- Step 2c
SELECT id, queue_job_id, status, created_at
FROM video_jobs
WHERE owner_id = '<USER_ID>' AND status IN ('queued', 'processing');
```

## Step 3. Write down what you will need (read-only)

Paste the results into your scratch file. Step 5a deletes the rows that hold these, so this is your only record afterwards.

**3a. The video ids.** Each video has two ids (the row id and the queue id), and files, queue entries and event rows are stored under one or the other. This gives you both, in one cell. That cell is `<JOB_IDS>`. Step 4 reads the same ids from the database itself; this copy is for the case where you have to run Step 4 after Step 5a.

```sql
-- Step 3a
SELECT string_agg(x, ' ') AS job_ids, count(*) AS how_many
FROM (
  SELECT queue_job_id AS x FROM video_jobs WHERE owner_id = '<USER_ID>' AND queue_job_id IS NOT NULL
  UNION
  SELECT id::text FROM video_jobs WHERE owner_id = '<USER_ID>'
) ids;
```

**3b. Optional: the list of videos**, to see what you are about to remove. The number of rows here should match what the Step 4 dry run reports.

```sql
-- Step 3b
SELECT id, queue_job_id, status, created_at, final_url
FROM video_jobs
WHERE owner_id = '<USER_ID>'
ORDER BY created_at;
```

**3c. The Dodo customer id**, for the Dodo dashboard and for Step 5b. No rows is fine.

```sql
-- Step 3c
SELECT dodo_customer_id FROM billing_customers WHERE user_id = '<USER_ID>'
UNION
SELECT dodo_customer_id FROM processed_webhook_events
WHERE user_id = '<USER_ID>' AND dodo_customer_id IS NOT NULL;
```

**3d. Count what exists.** Save this result. You run the same query again in Step 6, where every line should be 0 (except the records you decided to keep). If a line is not 0 now and you do not understand why, stop and look.

```sql
-- Step 3d
WITH me AS (SELECT '<USER_ID>'::text AS uid, '<EMAIL>'::text AS email)
SELECT 'user' AS what, count(*) AS rows FROM "user", me WHERE id = uid
UNION ALL SELECT 'session', count(*) FROM "session", me WHERE "userId" = uid
UNION ALL SELECT 'account', count(*) FROM account, me WHERE "userId" = uid
UNION ALL SELECT 'api_keys', count(*) FROM api_keys, me WHERE user_id = uid
UNION ALL SELECT 'video_jobs', count(*) FROM video_jobs, me WHERE owner_id = uid
UNION ALL SELECT 'job_comments (as author)', count(*) FROM job_comments, me WHERE user_id = uid
UNION ALL SELECT 'job_approvals (as actor)', count(*) FROM job_approvals, me WHERE actor_user_id = uid
UNION ALL SELECT 'brand_kits', count(*) FROM brand_kits, me WHERE user_id = uid
UNION ALL SELECT 'user_plan_overrides', count(*) FROM user_plan_overrides, me WHERE user_id = uid
UNION ALL SELECT 'billing_customers', count(*) FROM billing_customers, me WHERE user_id = uid
UNION ALL SELECT 'render_events (with user id)', count(*) FROM render_events, me WHERE user_id = uid
UNION ALL SELECT 'payments  (decision 2)', count(*) FROM payments, me WHERE user_id = uid
UNION ALL SELECT 'processed_webhook_events  (decision 2)', count(*) FROM processed_webhook_events, me WHERE user_id = uid
UNION ALL SELECT 'contact_submissions  (decision 2)', count(*) FROM contact_submissions, me WHERE lower(contact_submissions.email) = lower(me.email);
```

Two more counts, to run one at a time. Skip one if it says the table does not exist: `video_usage_events` does not exist until its SQL has been run, and `passkey` only exists if passkeys were ever switched on.

```sql
-- Step 3d (video_usage_events)
SELECT count(*) FROM video_usage_events WHERE user_id = '<USER_ID>';
```

```sql
-- Step 3d (passkey)
SELECT count(*) FROM passkey WHERE "userId" = '<USER_ID>';
```

## Step 4. Delete the files and queue entries (Blob and Redis)

Do this **before** Step 5a: the script finds the user's videos in the database, and Step 5a deletes them.

Open a terminal in the repo root and save the script below there as `delete-user-files.mjs`. It uses the repo's installed `pg`, `ioredis`, `bullmq` and `@vercel/blob`, so there is nothing to install. **Delete the file when you are done and do not commit it.**

```js
// delete-user-files.mjs  (Step 4 of docs/account-deletion.md)
// Dry run:  node delete-user-files.mjs <USER_ID>
// Delete:   node delete-user-files.mjs <USER_ID> --delete
// It reads the user's video ids from the database, so run it BEFORE Step 5a. If you already ran 5a,
// pass the ids you saved in Step 3a:  node delete-user-files.mjs <USER_ID> --ids <JOB_ID> [<JOB_ID> ...] [--delete]
import pg from "pg";
import IORedis from "ioredis";
import { Queue } from "bullmq";
import { list, del } from "@vercel/blob";

const args = process.argv.slice(2);
const apply = args.includes("--delete");
const idsAt = args.indexOf("--ids");
const savedIds = idsAt === -1 ? [] : args.slice(idsAt + 1).filter((a) => a !== "--delete");
const userId = args[0];
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;
if (!SAFE_ID.test(userId ?? "") || !savedIds.every((j) => SAFE_ID.test(j))) {
  console.error("Usage: node delete-user-files.mjs <USER_ID> [--ids <JOB_ID> ...] [--delete]");
  process.exit(1);
}
for (const name of ["DATABASE_URL", "REDIS_URL", "BLOB_READ_WRITE_TOKEN"]) {
  if (!process.env[name]) {
    console.error(`Set ${name} to the production value first.`);
    process.exit(1);
  }
}
console.log(apply ? "MODE: DELETE" : "MODE: dry run (nothing is changed)");
console.log("Database host:", new URL(process.env.DATABASE_URL).host);
console.log("Redis host:   ", new URL(process.env.REDIS_URL).host);

// The user's videos, by owner. Both ids of each video: files and queue entries use one or the other.
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const { rows } = await db.query("SELECT id::text AS row_id, queue_job_id FROM video_jobs WHERE owner_id = $1", [userId]);
if (savedIds.length) {
  const { rows: owners } = await db.query(
    "SELECT owner_id FROM video_jobs WHERE id::text = ANY($1) OR queue_job_id = ANY($1)",
    [savedIds],
  );
  if (owners.some((r) => r.owner_id !== userId)) {
    console.error("One of the ids you passed belongs to a different user in the database. Nothing was changed.");
    process.exit(1);
  }
}
await db.end();
const jobIds = [...new Set([...rows.flatMap((r) => [r.row_id, r.queue_job_id]), ...savedIds].filter(Boolean))];
console.log(`${rows.length} video(s) in the database for this user${savedIds.length ? `, plus ${savedIds.length} id(s) you passed` : ""}.`);
if (jobIds.length === 0) console.log("No videos to look for. If Step 5a has already run, pass the ids you saved in Step 3a with --ids.");

const redis = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
const queue = new Queue(process.env.VIDEO_QUEUE_NAME || "video-generation", { connection: redis });
let found = 0;
const note = (what) => {
  found++;
  console.log(apply ? "deleting" : "would delete", what);
};

async function scan(match) {
  const keys = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, "MATCH", match, "COUNT", 500);
    cursor = next;
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}

// 1. Rendered videos: videos/<id>.mp4, videos/<id>-v1.mp4 ..., videos/<id>-preview.mp4
for (const id of jobIds) {
  const { blobs } = await list({ prefix: `videos/${id}`, limit: 100 });
  const exact = new RegExp(`^videos/${id}(-v\\d+|-preview)?\\.mp4$`);
  const mine = blobs.filter((b) => exact.test(b.pathname));
  for (const b of mine) note(`blob ${b.pathname}`);
  if (apply && mine.length) await del(mine.map((b) => b.url));
}

// 2. Uploaded files. Their names are random; the owner is only in the Redis record.
for (const key of await scan("cutline:asset:*")) {
  let meta = null;
  try {
    meta = JSON.parse((await redis.get(key)) ?? "null");
  } catch {}
  if (meta?.ownerId !== userId) continue;
  note(`upload ${meta.path ?? meta.url} (${key})`);
  if (apply) {
    if (meta.storage === "blob" && meta.url) await del(meta.url);
    await redis.del(key);
  }
}

// 3. Counters: usage, spend, cinematic seconds, and the bought top-up balance (no expiry).
const counters = [
  ...(await scan(`cutline:usage:${userId}:*`)),
  ...(await scan(`cutline:spend:${userId}:*`)),
  ...(await scan(`cutline:cine:${userId}:*`)),
];
if (await redis.exists(`cutline:cinetopup:${userId}`)) counters.push(`cutline:cinetopup:${userId}`);
for (const key of counters) {
  const value = await redis.get(key);
  note(`redis ${key} = ${value}${key.includes("cinetopup") ? "  <- seconds they bought; settle any refund first" : ""}`);
}
if (apply && counters.length) await redis.del(...counters);

// 4. Per-video snapshots (7 days and 1 day), found by exact key.
const snapshots = [];
for (const id of jobIds) {
  for (const prefix of ["cutline:regen:", "cutline:preview:"]) {
    if (await redis.exists(prefix + id)) snapshots.push(prefix + id);
  }
}
for (const key of snapshots) note(`redis ${key}`);
if (apply && snapshots.length) await redis.del(...snapshots);

// 5. Queue entries (they hold the prompt). Removing through BullMQ also takes the id out of its
//    completed and failed lists. A job that belongs to someone else is skipped.
for (const id of jobIds) {
  const job = await queue.getJob(id);
  if (!job) continue;
  const owners = [job.data?.userId, job.data?.clientId].map((o) => String(o));
  if (!owners.includes(userId)) {
    console.log(`SKIP queue job ${id}: it belongs to a different owner`);
    continue;
  }
  note(`queue job ${id} (${await job.getState()})`);
  if (apply) {
    try {
      await job.remove();
    } catch (e) {
      console.log(`could not remove ${id} (${e.message}); if it is still running, wait and run again`);
    }
  }
}

await queue.close();
redis.disconnect();
console.log(found ? `${found} item(s) ${apply ? "deleted" : "found. Run again with --delete to remove them"}.` : "Nothing found.");
```

Set the three production values from the Vercel project's environment variables (your `.env.local` may point at something else), then run it. If the project sets `VIDEO_QUEUE_NAME`, set that too.

```powershell
$env:DATABASE_URL = "<production DATABASE_URL>"
$env:REDIS_URL = "<production REDIS_URL>"
$env:BLOB_READ_WRITE_TOKEN = "<production Blob token>"
node delete-user-files.mjs <USER_ID>             # dry run: lists what it would delete
node delete-user-files.mjs <USER_ID> --delete    # does it
```

Read the first lines of the dry run before you add `--delete`: the `Database host` and `Redis host` must be production, and the number of videos must match Step 3b. The list should contain only this user's videos, uploads, counters and queue entries. `SKIP queue job ...` means a queue entry belongs to someone else; the script leaves it alone.

If you already ran Step 5a, the database no longer knows the videos. Pass the ids you saved in Step 3a: `node delete-user-files.mjs <USER_ID> --ids <JOB_IDS> --delete`. The script refuses an id that still belongs to a different user in the database. An id that is not in the database at all is taken on trust, so copy them straight from your saved Step 3a cell.

If you prefer clicking, the Blob store's browser in the Vercel dashboard can search `videos/<job id>` for each id, but the script is less error-prone.

## Step 5. Delete the database rows (Neon SQL editor)

**5a. The account and its videos.** One statement, so it is all or nothing: if anything in it fails, nothing is deleted. Edit the one `v_uid` line. The video ids are read once at the top, so the rows that hang off the videos can be deleted in any order. The order that matters is the last part: Better Auth's child tables, then `"user"`. It is safe to run twice: if the first run stopped part-way nothing was deleted, and if it finished the second run finds nothing.

```sql
-- Step 5a
DO $$
DECLARE
  v_uid  text := '<USER_ID>';   -- the only line to edit
  v_jobs text[];                -- this user's video ids, both forms (queue id and row id)
BEGIN
  IF v_uid !~ '^[A-Za-z0-9_-]{8,64}$' THEN
    RAISE EXCEPTION 'Put the real user id on the v_uid line first (got: %)', v_uid;
  END IF;

  -- Finds Better Auth's tables if Step 1b showed them in the auth schema. Harmless otherwise.
  SET LOCAL search_path TO public, auth;

  v_jobs := ARRAY(
    SELECT queue_job_id FROM video_jobs WHERE owner_id = v_uid AND queue_job_id IS NOT NULL
    UNION
    SELECT id::text FROM video_jobs WHERE owner_id = v_uid
  );

  -- 1. Sign them out and revoke API keys (again, in case they came back since Step 2).
  DELETE FROM "session" WHERE "userId" = v_uid;
  DELETE FROM api_keys WHERE user_id = v_uid;

  -- 2. Everything that hangs off their videos (found through v_jobs, which was read above).
  DELETE FROM job_comments WHERE job_id = ANY (v_jobs) OR user_id = v_uid;
  DELETE FROM job_approvals WHERE job_id = ANY (v_jobs) OR actor_user_id = v_uid;
  IF to_regclass('video_usage_events') IS NOT NULL THEN  -- absent until its SQL has been run
    EXECUTE 'DELETE FROM video_usage_events WHERE user_id = $1 OR job_id = ANY ($2)' USING v_uid, v_jobs;
  END IF;

  -- 3. render_events. Decision 1: the default keeps the rows but cuts the link to the person.
  UPDATE render_events SET user_id = NULL, provider_error = NULL
  WHERE user_id = v_uid OR job_id = ANY (v_jobs);
  -- To delete them instead, replace the UPDATE above with this line (and put the semicolon back on the end):
  --   DELETE FROM render_events WHERE user_id = v_uid OR job_id = ANY (v_jobs)

  -- 4. The videos themselves.
  DELETE FROM video_jobs WHERE owner_id = v_uid;

  -- 5. Brand kits, plan, and the link to the Dodo customer.
  DELETE FROM brand_kits WHERE user_id = v_uid;
  DELETE FROM user_plan_overrides WHERE user_id = v_uid;
  DELETE FROM billing_customers WHERE user_id = v_uid;

  -- 6. Better Auth: child tables first, then the user row (the order matters if the keys have no cascade).
  IF to_regclass('passkey') IS NOT NULL THEN  -- only exists if passkeys were ever switched on
    EXECUTE 'DELETE FROM passkey WHERE "userId" = $1' USING v_uid;
  END IF;
  DELETE FROM account WHERE "userId" = v_uid;
  DELETE FROM "user" WHERE id = v_uid;
END
$$;
```

If it stops with `relation "..." does not exist`, that table was never created in your database: remove its statement and run it again. Nothing is deleted when it fails.

**5b. Records you may keep (decision 2).** Run only the lines you have decided to run, one at a time. Leave out the `OR dodo_customer_id` part of the second line if Step 3c found no customer id. The third line is only for someone who also used the contact form; the privacy page does not say contact messages go with the account.

```sql
-- Step 5b
DELETE FROM payments WHERE user_id = '<USER_ID>';
DELETE FROM processed_webhook_events WHERE user_id = '<USER_ID>' OR dodo_customer_id = '<DODO_CUSTOMER_ID>';
DELETE FROM contact_submissions WHERE lower(email) = lower('<EMAIL>');
```

## Step 6. Check it worked

1. Run **Step 3d** again, plus its two extra counts. Every line should be 0, except the records you chose to keep in 5b.
2. Run the Step 4 script again as a dry run with the ids you saved: `node delete-user-files.mjs <USER_ID> --ids <JOB_IDS>`. It should print `Nothing found.` (The database no longer lists the videos, which is why the ids are passed.)
3. Run **Step 1a** again. It should return no rows. (If they sign in with Google again later, that creates a fresh, empty account.)

If a line is not 0, work out why before running anything again. The usual cause is a render that finished after Step 2c.

## Step 7. Finish

- Tell the person it is done and what remains (the next section). The privacy page promises a reply within 30 days.
- Delete `delete-user-files.mjs` from the repo root.
- Write down the date, the email, and which of the two decisions you took. Keep it somewhere that is not the repo.

## What stays after you finish

- **De-identified `render_events` rows** (unless you chose to delete them): job id, stage names, error codes and timings. No user id and no provider error text.
- **Billing records you kept** (`payments`, `processed_webhook_events`), and whatever Dodo keeps under its own policy.
- **Neon's history.** Deleted rows stay in Neon's point-in-time restore window until it expires. That window is set in the Neon console; I have not looked at it.
- **Platform logs** at Vercel and Railway, for as long as the platform keeps them. Nothing in the app prunes logs.
- **BullMQ's event stream** in Redis, which ages out by itself.
- **Third parties that received the person's prompts** (Anthropic, OpenRouter, ElevenLabs or PlayHT, OpenAI, Google Veo, and the image-search queries sent to Unsplash and Pexels). We cannot delete from them. The privacy page already says this.
- **HeyGen talking photos**, if they used an uploaded photo as an avatar. They live at HeyGen; our cache of them is keyed by image hash, not by user.
- **Analytics.** Google Analytics and DataFast are never sent the account id or email (the privacy page says so), so there is nothing to remove by user.

## When the schema changes

Run Step 1d again after any change to `src/lib/db/schema.sql` or to Better Auth's setup. Any new table that holds a user id needs a DELETE in Step 5a and a line in the map above.
