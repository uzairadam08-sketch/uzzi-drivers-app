// One-off: set the "set working times" schedule for managers Uzair + Haroon.
// Mon–Sat, all of 2026 (Sundays never recorded). Saturdays are shown as a
// half day by the My Record page, so we still record the Saturday date here.
// Replaces any existing 2026 clock-ins for these managers.
//   node scripts/seed-manager-schedule.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
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

const EMAILS = ["uzair@milescraft.uk", "haroon@milescraft.uk"];
const START = "2026-01-01";
const END = "2026-12-31";

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

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Build Mon–Sat dates for the whole year (skip Sundays).
const dates = [];
const [sy, sm, sd] = START.split("-").map(Number);
const [ey, em, ed] = END.split("-").map(Number);
const cur = new Date(sy, sm - 1, sd);
const last = new Date(ey, em - 1, ed);
while (cur <= last) {
  if (cur.getDay() !== 0) dates.push(iso(cur)); // 0 = Sunday
  cur.setDate(cur.getDate() + 1);
}
const saturdays = dates.filter((d) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).getDay() === 6;
}).length;
const weekdays = dates.length - saturdays;
const dayValue = weekdays + saturdays * 0.5;

for (const email of EMAILS) {
  const user = await findUserByEmail(email);
  if (!user) {
    console.log(`${email}: NOT FOUND — skipped`);
    continue;
  }
  // Clear existing 2026 clock-ins, then insert the schedule fresh.
  const { error: delErr } = await admin
    .from("clockins")
    .delete()
    .eq("user_id", user.id)
    .gte("work_date", START)
    .lte("work_date", END);
  if (delErr) {
    console.log(`${email}: DELETE ERROR ${delErr.message}`);
    continue;
  }
  const rows = dates.map((d) => ({ user_id: user.id, work_date: d }));
  const { error: insErr } = await admin
    .from("clockins")
    .upsert(rows, { onConflict: "user_id,work_date", ignoreDuplicates: true });
  if (insErr) {
    console.log(`${email}: INSERT ERROR ${insErr.message}`);
    continue;
  }
  console.log(
    `${email}: ${dates.length} recorded days ` +
      `(${weekdays} full weekdays + ${saturdays} half Saturdays) = ${dayValue} day-value`
  );
}
