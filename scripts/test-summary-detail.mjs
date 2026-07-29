// Simulate the manager Summary's per-car-job breakdown with real data.
// Adds 2 jobs as 2 drivers, then reads them back the way the manager page
// does (service role), prints the itemized list, and deletes them.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const t = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const l of t.split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cut = (t) => Math.round(t * 0.7 * 100) / 100;

async function addAs(email, password, total, desc) {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { data: auth, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const { data, error: e2 } = await c
    .from("jobs")
    .insert({ user_id: auth.user.id, total, description: desc })
    .select("id")
    .single();
  if (e2) throw e2;
  return data.id;
}

const id1 = await addAs("naeem@milescraft.uk", "Naeem@Driver8", 300, "Audi A4 — reg AB12 CDE");
const id2 = await addAs("salat@milescraft.uk", "Salat@Driver10", 150, "BMW pickup");
console.log("Added 2 test car jobs.\n");

// Manager view (service role sees all)
const admin = createClient(url, svc, { auth: { persistSession: false } });
const { data: drivers } = await admin
  .from("profiles").select("id, driver_number, display_name").eq("role", "driver");
const nameById = new Map(drivers.map((d) => [d.id, `${d.driver_number}. ${d.display_name}`]));
const { data: jobs } = await admin
  .from("jobs").select("id, user_id, job_date, description, total")
  .in("id", [id1, id2]).order("job_date", { ascending: false });

console.log("MANAGER — Car jobs (one row per job):");
let tot = 0;
for (const j of jobs) {
  const pay = cut(Number(j.total));
  tot += pay;
  console.log(`  • ${j.description}  |  ${nameById.get(j.user_id)}  |  total £${j.total}  →  70% = £${pay}`);
}
console.log(`  Total car-job pay: £${tot}`);

// cleanup
await admin.from("jobs").delete().in("id", [id1, id2]);
console.log("\n✓ Test jobs cleaned up.");
