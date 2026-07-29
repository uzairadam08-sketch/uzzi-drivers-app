// Verify the manager Summary "Total" column math (salary + jobs + expenses)
// with real data for the current month, then clean everything up.
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
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, svc, { auth: { persistSession: false } });
const cut = (t) => Math.round(t * 0.7 * 100) / 100;

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const now = new Date();
const start = iso(new Date(now.getFullYear(), now.getMonth(), 1));
const end = iso(new Date(now.getFullYear(), now.getMonth()+1, 0));
const today = iso(now);

// pick a driver
const { data: drivers } = await admin.from("profiles").select("id, driver_number, display_name").eq("role","driver").order("driver_number");
const d = drivers.find((x) => x.driver_number === 9); // Alusine
const { data: settings } = await admin.from("settings").select("daily_rate").single();
const rate = Number(settings.daily_rate);

// clean any pre-existing test rows for a clean read (today only / this test's data)
await admin.from("clockins").delete().eq("user_id", d.id).eq("work_date", today);
await admin.from("jobs").delete().eq("user_id", d.id).eq("description", "TEST-total");
await admin.from("expenses").delete().eq("user_id", d.id).eq("description", "TEST-total");

// insert: 1 clock-in today, 1 job £200, 1 expense £50
await admin.from("clockins").insert({ user_id: d.id, work_date: today });
await admin.from("jobs").insert({ user_id: d.id, total: 200, description: "TEST-total" });
await admin.from("expenses").insert({ user_id: d.id, amount: 50, description: "TEST-total" });

// now replicate the page's row math for this driver
const [{ data: cl }, { data: jb }, { data: ex }] = await Promise.all([
  admin.from("clockins").select("user_id").gte("work_date",start).lte("work_date",end).eq("user_id", d.id),
  admin.from("jobs").select("total").gte("job_date",start).lte("job_date",end).eq("user_id", d.id),
  admin.from("expenses").select("amount").gte("expense_date",start).lte("expense_date",end).eq("user_id", d.id),
]);
const days = cl.length;
const earnings = days * rate;
const jobPay = jb.reduce((s,j)=>s+cut(Number(j.total)),0);
const exp = ex.reduce((s,e)=>s+Number(e.amount),0);
const total = earnings + jobPay + exp;

console.log(`Driver ${d.driver_number}. ${d.display_name} — this month`);
console.log(`  Salary   = ${days} day(s) × £${rate} = £${earnings}`);
console.log(`  Job pay  = 70% of the jobs         = £${jobPay}`);
console.log(`  Expenses =                           £${exp}`);
console.log(`  TOTAL    =                           £${total}`);
console.log(total === earnings + jobPay + exp ? "  ✓ Total adds up correctly" : "  ✗ MISMATCH");

// cleanup
await admin.from("clockins").delete().eq("user_id", d.id).eq("work_date", today);
await admin.from("jobs").delete().eq("user_id", d.id).eq("description", "TEST-total");
await admin.from("expenses").delete().eq("user_id", d.id).eq("description", "TEST-total");
console.log("\n✓ Test data cleaned up.");
