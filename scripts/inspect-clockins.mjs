// Read-only: show current clock-in days for a set of drivers.
//   node scripts/inspect-clockins.mjs
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

const EMAILS = [
  "ali@milescraft.uk",
  "salat@milescraft.uk",
  "fahad@milescraft.uk",
  "imran.qaasim@milescraft.uk",
];

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

for (const email of EMAILS) {
  const user = await findUserByEmail(email);
  if (!user) {
    console.log(`\n${email}: NOT FOUND`);
    continue;
  }
  const { data: prof } = await admin
    .from("profiles")
    .select("display_name, driver_number")
    .eq("id", user.id)
    .single();
  const { data: rows } = await admin
    .from("clockins")
    .select("work_date")
    .eq("user_id", user.id)
    .order("work_date", { ascending: true });
  const dates = (rows ?? []).map((r) => r.work_date);
  console.log(
    `\n${prof?.display_name ?? "?"} (#${prof?.driver_number ?? "?"}, ${email})`
  );
  console.log(`  total days: ${dates.length}  → £${dates.length * 100}`);
  console.log(`  first: ${dates[0] ?? "—"}   last: ${dates[dates.length - 1] ?? "—"}`);
  console.log(`  all dates: ${dates.join(", ") || "(none)"}`);
}
