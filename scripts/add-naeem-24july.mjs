// One-off: Naeem forgot to clock in on 24 July 2026 — add that day for him.
// The £100 is automatic (daily rate), so only the clock-in is needed.
// Safe to re-run: duplicate days are ignored.
//   node scripts/add-naeem-24july.mjs
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = "naeem@milescraft.uk";
const DATE = "2026-07-24";

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase()
    );
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

const user = await findUserByEmail(EMAIL);
if (!user) {
  console.error(`${EMAIL}: NOT FOUND`);
  process.exit(1);
}

const { data: before } = await admin
  .from("clockins")
  .select("work_date")
  .eq("user_id", user.id)
  .eq("work_date", DATE);
if (before?.length) {
  console.log(`Already clocked in on ${DATE} — nothing to add.`);
}

const { error } = await admin
  .from("clockins")
  .upsert([{ user_id: user.id, work_date: DATE }], {
    onConflict: "user_id,work_date",
    ignoreDuplicates: true,
  });
if (error) {
  console.error(`ERROR — ${error.message}`);
  process.exit(1);
}

const { data: rate } = await admin
  .from("settings")
  .select("daily_rate")
  .eq("id", 1)
  .single();
const dailyRate = Number(rate?.daily_rate ?? 100);

const { data: july } = await admin
  .from("clockins")
  .select("work_date")
  .eq("user_id", user.id)
  .gte("work_date", "2026-07-01")
  .lte("work_date", "2026-07-31")
  .order("work_date");

console.log(`\n✓ Naeem clocked in for ${DATE}`);
console.log(`\nHis July days (${july.length}):`);
for (const d of july) console.log(`  ${d.work_date}${d.work_date === DATE ? "   <- added" : ""}`);
console.log(`\nJuly pay so far: ${july.length} x £${dailyRate} = £${july.length * dailyRate}`);
