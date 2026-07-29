// One-off: record the manager (Uzair) as having worked every Mon–Sat
// from 1 July 2026 to 31 December 2026 (Sundays skipped).
//   node scripts/seed-manager-days.mjs
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
if (!url || !serviceKey) {
  console.error("Missing env vars in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Pass an email as the first argument; defaults to Uzair.
const MANAGER_EMAIL = process.argv[2] || "uzair@milescraft.uk";
const START = "2026-07-01";
const END = "2026-12-31";
const SKIP_SUNDAYS = true;

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

const user = await findUserByEmail(MANAGER_EMAIL);
if (!user) {
  console.error(`Manager ${MANAGER_EMAIL} not found.`);
  process.exit(1);
}

// Build the list of work dates (local-time safe).
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const rows = [];
const [sy, sm, sd] = START.split("-").map(Number);
const [ey, em, ed] = END.split("-").map(Number);
const cur = new Date(sy, sm - 1, sd);
const last = new Date(ey, em - 1, ed);
while (cur <= last) {
  const dow = cur.getDay(); // 0 = Sunday
  if (!(SKIP_SUNDAYS && dow === 0)) {
    rows.push({ user_id: user.id, work_date: iso(cur) });
  }
  cur.setDate(cur.getDate() + 1);
}

console.log(`Recording ${rows.length} work days for ${MANAGER_EMAIL}…`);

// Insert, ignoring any days already recorded (unique user_id + work_date).
const { error } = await admin
  .from("clockins")
  .upsert(rows, { onConflict: "user_id,work_date", ignoreDuplicates: true });
if (error) throw error;

const { count } = await admin
  .from("clockins")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id)
  .gte("work_date", START)
  .lte("work_date", END);

console.log(`Done. ${user.email} now has ${count} recorded days in ${START}…${END}.`);
