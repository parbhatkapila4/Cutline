import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { getSql, isDatabaseConfigured } from "@/lib/db/client";

type Row = Record<string, unknown>;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pct(n: number, d: number): string {
  if (d <= 0) return "n/a";
  return `${((n / d) * 100).toFixed(1)}%`;
}

const BAR = "=".repeat(70);

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const daysIdx = argv.indexOf("--days");
  const days = daysIdx >= 0 ? Math.max(1, Number(argv[daysIdx + 1]) || 30) : 30;

  if (!isDatabaseConfigured()) {
    console.error("\nDATABASE_URL is not set. Nothing to read.\n");
    process.exit(1);
  }
  const sql = getSql();

  try {
    await sql`SELECT 1 FROM render_events LIMIT 1`;
  } catch (e) {
    console.error(
      "\nCould not read render_events. Has the table been created?\n" +
      "Run the CREATE TABLE block at the end of src/lib/db/schema.sql.\n" +
      `Underlying error: ${e instanceof Error ? e.message : String(e)}\n`
    );
    process.exit(1);
  }

  const since = `${days} days`;

  const jobs = (await sql`
    SELECT
      job_id,
      max(user_id)                                                        AS user_id,
      bool_or(event_type = 'job_completed')                               AS completed,
      bool_or(event_type = 'job_failed')                                  AS failed
    FROM render_events
    WHERE created_at >= now() - ${since}::interval
    GROUP BY job_id
  `) as Row[];

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j) => j.completed === true).length;
  const failedJobs = jobs.filter((j) => j.failed === true && j.completed !== true).length;
  const openJobs = totalJobs - completedJobs - failedJobs;

  const byUser = new Map<string, number>();
  const allUsers = new Set<string>();
  for (const j of jobs) {
    const uid = typeof j.user_id === "string" ? j.user_id : null;
    if (!uid) continue;
    allUsers.add(uid);
    if (j.completed === true) byUser.set(uid, (byUser.get(uid) ?? 0) + 1);
  }
  const usersWith1 = [...byUser.values()].filter((n) => n >= 1).length;
  const usersWith2 = [...byUser.values()].filter((n) => n >= 2).length;

  const anonJobs = jobs.filter((j) => typeof j.user_id !== "string" || !j.user_id).length;

  const byStage = (await sql`
    SELECT stage_name, count(*) AS failures
    FROM render_events
    WHERE event_type = 'stage_failed'
      AND created_at >= now() - ${since}::interval
    GROUP BY stage_name
    ORDER BY failures DESC
  `) as Row[];

  const byCode = (await sql`
    SELECT coalesce(error_code, 'UNKNOWN') AS error_code, count(*) AS failures
    FROM render_events
    WHERE event_type IN ('job_failed', 'stage_failed')
      AND created_at >= now() - ${since}::interval
    GROUP BY 1
    ORDER BY failures DESC
  `) as Row[];

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          windowDays: days,
          totalSignedInUsers: allUsers.size,
          usersWithAtLeast1Completed: usersWith1,
          usersWithAtLeast2Completed: usersWith2,
          totalJobs,
          completedJobs,
          failedJobs,
          openJobs,
          anonJobs,
          successRate: totalJobs > 0 ? completedJobs / totalJobs : null,
          failuresByStage: byStage,
          failuresByErrorCode: byCode,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`\n${BAR}`);
  console.log(`  CUTLINE RENDER FUNNEL — last ${days} days`);
  console.log(BAR);

  console.log(`\n  USERS (signed-in only; anonymous jobs have no user_id)`);
  console.log(`    total users seen                ${String(allUsers.size).padStart(8)}`);
  console.log(`    with >= 1 completed job         ${String(usersWith1).padStart(8)}   ${pct(usersWith1, allUsers.size)}`);
  console.log(`    with >= 2 completed jobs        ${String(usersWith2).padStart(8)}   ${pct(usersWith2, allUsers.size)}`);

  console.log(`\n  JOBS`);
  console.log(`    total                           ${String(totalJobs).padStart(8)}`);
  console.log(`    completed                       ${String(completedJobs).padStart(8)}   ${pct(completedJobs, totalJobs)}`);
  console.log(`    failed                          ${String(failedJobs).padStart(8)}   ${pct(failedJobs, totalJobs)}`);
  console.log(`    still open / no terminal event  ${String(openJobs).padStart(8)}   ${pct(openJobs, totalJobs)}`);
  console.log(`    of which anonymous              ${String(anonJobs).padStart(8)}`);
  console.log(`\n    SUCCESS RATE                    ${pct(completedJobs, totalJobs).padStart(8)}`);

  console.log(`\n  FAILURES BY STAGE`);
  if (byStage.length === 0) {
    console.log("    (none recorded)");
  } else {
    for (const r of byStage) {
      const name = String(r.stage_name ?? "(null)");
      console.log(`    ${name.padEnd(30)}${String(num(r.failures)).padStart(8)}`);
    }
  }

  console.log(`\n  FAILURES BY ERROR CODE`);
  if (byCode.length === 0) {
    console.log("    (none recorded)");
  } else {
    for (const r of byCode) {
      const code = String(r.error_code ?? "UNKNOWN");
      console.log(`    ${code.padEnd(30)}${String(num(r.failures)).padStart(8)}`);
    }
  }

  if (totalJobs === 0) {
    console.log(
      `\n  No events in this window. Either nothing has run since the table was\n` +
      `  created, or the worker cannot reach the database (render_events writes\n` +
      `  are fire-and-forget and log a warning rather than failing the render).`
    );
  }
  console.log("");
}

main().catch((e) => {
  console.error("[funnel] failed:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
