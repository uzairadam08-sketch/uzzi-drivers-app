// One-off: delete drivers 7–10 (auth users + their profiles/data cascade).
//   node scripts/delete-drivers.mjs
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

// Which driver numbers to remove.
const REMOVE = [7, 8, 9, 10];

const { data: profiles, error } = await admin
  .from("profiles")
  .select("id, driver_number, display_name")
  .in("driver_number", REMOVE);
if (error) throw error;

if (!profiles?.length) {
  console.log("No matching drivers found — nothing to remove.");
  process.exit(0);
}

for (const p of profiles) {
  // Deleting the auth user cascades to profile, clockins and expenses.
  const { error: delErr } = await admin.auth.admin.deleteUser(p.id);
  if (delErr) {
    console.error(`  ✗ Driver ${p.driver_number}: ${delErr.message}`);
  } else {
    console.log(`  ✓ Removed Driver ${p.driver_number} (${p.display_name ?? "—"})`);
  }
}
console.log("Done.");
