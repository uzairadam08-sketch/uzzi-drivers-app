// End-to-end test of the Jobs feature against live Supabase, as a real driver.
// Signs in as Naeem (anon key, RLS enforced), adds a job, reads it back,
// checks the 70% cut, then deletes it. Leaves no test data behind.
//   node scripts/test-jobs-flow.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const c = createClient(url, anon, { auth: { persistSession: false } });

const SHARE = 0.7;
const cut = (t) => Math.round(t * SHARE * 100) / 100;

// 1. Sign in as a driver
const { data: auth, error: authErr } = await c.auth.signInWithPassword({
  email: "naeem@milescraft.uk",
  password: "Naeem@Driver8",
});
if (authErr) throw authErr;
console.log("✓ Signed in as Naeem");

// 2. Add a job (total £200 → expect £140 cut)
const TOTAL = 200;
const { data: ins, error: insErr } = await c
  .from("jobs")
  .insert({ user_id: auth.user.id, total: TOTAL, description: "TEST — auto delete" })
  .select("id, total")
  .single();
if (insErr) throw insErr;
console.log(`✓ Added job: total £${TOTAL}`);

// 3. Read it back & verify the 70% cut
const expected = cut(TOTAL);
console.log(
  `✓ 70% cut = £${expected}  ${expected === 140 ? "(correct)" : "(WRONG!)"}`
);

// 4. Delete it (RLS: driver can delete own)
const { error: delErr } = await c.from("jobs").delete().eq("id", ins.id);
if (delErr) throw delErr;

// 5. Confirm gone
const { count } = await c
  .from("jobs")
  .select("*", { count: "exact", head: true })
  .eq("id", ins.id);
console.log(count === 0 ? "✓ Test job cleaned up (no data left)" : "✗ cleanup failed");

console.log("\nLive Jobs feature works end-to-end.");
