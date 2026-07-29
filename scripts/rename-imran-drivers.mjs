// One-off (2026-07-07): slot 4 Imran Khan -> Imran Qaasim; slot 6 Pedro -> Imran Khan.
// Updates login email + password AND the displayed name for each.
//   node scripts/rename-imran-drivers.mjs
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

const CHANGES = [
  { old: "imran@milescraft.uk", email: "imran.qaasim@milescraft.uk", password: "Imran@Qaasim4", name: "Imran Qaasim" },
  { old: "pedro@milescraft.uk", email: "imran.khan@milescraft.uk",   password: "Imran@Khan6",   name: "Imran Khan" },
];

for (const c of CHANGES) {
  let user = await findUserByEmail(c.old);
  if (!user) user = await findUserByEmail(c.email); // maybe already changed
  if (!user) {
    console.error(`✗ SKIPPED — could not find ${c.old} (or ${c.email})`);
    continue;
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: c.email,
    password: c.password,
    email_confirm: true,
  });
  if (error) {
    console.error(`✗ ${c.email} — ${error.message}`);
    continue;
  }

  const { error: pErr } = await admin
    .from("profiles")
    .update({ display_name: c.name })
    .eq("id", user.id);
  if (pErr) console.error(`  (name update failed: ${pErr.message})`);

  console.log(`✓ ${c.name}  —  ${c.email}  /  ${c.password}`);
}

console.log("\nDone.");
