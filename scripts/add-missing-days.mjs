// One-off: add clock-in days for drivers who worked but didn't use the app.
// Adds them as real clocked-in days so day-count AND pay both go up.
//   node scripts/add-missing-days.mjs
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

// email -> dates to add (YYYY-MM-DD). Sundays deliberately excluded.
const PLAN = {
  "ali@milescraft.uk": [
    "2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02",
    "2026-07-03", "2026-07-04", "2026-07-06",
  ],
  "salat@milescraft.uk": ["2026-07-09"],
  "fahad@milescraft.uk": ["2026-07-11"],
  "imran.qaasim@milescraft.uk": [
    "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-06", "2026-07-07",
  ],
};

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

for (const [email, dates] of Object.entries(PLAN)) {
  const user = await findUserByEmail(email);
  if (!user) {
    console.log(`${email}: NOT FOUND — skipped`);
    continue;
  }
  const rows = dates.map((d) => ({ user_id: user.id, work_date: d }));
  const { error } = await admin
    .from("clockins")
    .upsert(rows, { onConflict: "user_id,work_date", ignoreDuplicates: true });
  if (error) {
    console.log(`${email}: ERROR ${error.message}`);
    continue;
  }
  const { count } = await admin
    .from("clockins")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  console.log(
    `${email}: +${dates.length} days → now ${count} total days (£${count * 100})`
  );
}
