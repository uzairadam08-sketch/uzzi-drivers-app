// Report what's currently in the database (no changes made).
//   node scripts/audit-data.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}
loadEnv();

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: profiles } = await admin
  .from("profiles")
  .select("id, role, display_name, driver_number");

const managerIds = new Set(profiles.filter((p) => p.role === "manager").map((p) => p.id));
const nameOf = Object.fromEntries(profiles.map((p) => [p.id, p.display_name ?? p.role]));

const { data: clockins } = await admin.from("clockins").select("user_id");
const { data: expenses } = await admin.from("expenses").select("user_id, amount");
const { data: pay } = await admin.from("manager_pay").select("user_id, amount, pay_date, note");

let driverClock = 0, managerClock = 0;
for (const c of clockins ?? []) {
  if (managerIds.has(c.user_id)) managerClock++;
  else driverClock++;
}

console.log("PROFILES:", profiles.length, "(" + [...managerIds].length + " managers, " + (profiles.length - managerIds.size) + " drivers)");
console.log("CLOCKINS:", (clockins ?? []).length, "→ manager (keep):", managerClock, "| driver (test):", driverClock);
console.log("EXPENSES:", (expenses ?? []).length);
console.log("MANAGER_PAY:", (pay ?? []).length);
for (const p of pay ?? []) {
  console.log(`   - ${nameOf[p.user_id]}: £${p.amount} on ${p.pay_date}${p.note ? " (" + p.note + ")" : ""}`);
}
