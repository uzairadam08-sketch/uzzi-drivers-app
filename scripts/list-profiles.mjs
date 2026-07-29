// One-off: list all profiles (role, number, name) + their login email.
//   node scripts/list-profiles.mjs
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

// map user id -> email
const emailById = new Map();
let page = 1;
while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  for (const u of data.users) emailById.set(u.id, u.email);
  if (data.users.length < 200) break;
  page += 1;
}

const { data: profiles, error } = await admin
  .from("profiles")
  .select("id, role, driver_number, display_name")
  .order("role")
  .order("driver_number");
if (error) throw error;

for (const p of profiles) {
  const num = p.driver_number == null ? "-" : String(p.driver_number);
  console.log(
    `${p.role.padEnd(8)}  #${num.padEnd(3)}  ${String(p.display_name ?? "").padEnd(18)}  ${emailById.get(p.id) ?? "(no auth user)"}`
  );
}
