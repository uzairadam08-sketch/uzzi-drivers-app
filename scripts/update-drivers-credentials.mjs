// One-off: change each driver's login email + password (and fix driver 1's name).
// Safe to re-run: if a driver was already switched to the new email, it finds them by that.
//   node scripts/update-drivers-credentials.mjs
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

// old email -> new email + password (+ optional new display name)
const DRIVERS = [
  { old: "driver1@uzzi.local", email: "altamash@milescraft.uk", password: "Altamash@Khan1", name: "Altamash Khan" },
  { old: "driver2@uzzi.local", email: "fahad@milescraft.uk",    password: "Fahad@Amjad2" },
  { old: "driver3@uzzi.local", email: "ali@milescraft.uk",      password: "Ali@Hamza3" },
  { old: "driver4@uzzi.local", email: "imran@milescraft.uk",    password: "Imran@Khan4" },
  { old: "driver5@uzzi.local", email: "mariam@milescraft.uk",   password: "Mariam@Khan5" },
  { old: "driver6@uzzi.local", email: "pedro@milescraft.uk",    password: "Pedro@Fernandez6" },
];

for (const d of DRIVERS) {
  let user = await findUserByEmail(d.old);
  if (!user) user = await findUserByEmail(d.email); // maybe already changed
  if (!user) {
    console.error(`✗ SKIPPED — could not find ${d.old} (or ${d.email})`);
    continue;
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: d.email,
    password: d.password,
    email_confirm: true,
  });
  if (error) {
    console.error(`✗ ${d.email} — ${error.message}`);
    continue;
  }

  if (d.name) {
    const { error: pErr } = await admin
      .from("profiles")
      .update({ display_name: d.name })
      .eq("id", user.id);
    if (pErr) console.error(`  (name update failed: ${pErr.message})`);
  }

  console.log(`✓ ${d.email}  /  ${d.password}${d.name ? `   (name → ${d.name})` : ""}`);
}

console.log("\nDone.");
