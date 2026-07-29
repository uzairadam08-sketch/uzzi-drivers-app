// =============================================================
// Seed helper — creates 10 driver accounts (numbered 1–10) and,
// optionally, your manager account.
//
// Usage (from the project root, after `npm install` and after the
// migration has been run on your Supabase project):
//
//   node scripts/seed.mjs
//
// It reads these from your .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (NEVER commit this)
//
// Drivers are created as:
//   driver1@uzzi.local … driver10@uzzi.local   password: Driver#<n>Pass
// Change EMAIL_DOMAIN / passwords below before running if you like.
// The trigger in the migration auto-creates each profile as a
// 'driver'; this script then stamps driver_number + display_name.
// =============================================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- tiny .env.local loader (no dependency needed) ---
function loadEnv() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // fall back to whatever is already in process.env
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL_DOMAIN = "uzzi.local";

async function ensureUser(email, password, meta) {
  // Try to create; if it already exists, find the existing user.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (!error) return data.user;

  if (String(error.message).toLowerCase().includes("already")) {
    // Look up the existing user by paging the user list.
    let page = 1;
    while (true) {
      const { data: list, error: listErr } =
        await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr) throw listErr;
      const found = list.users.find((u) => u.email === email);
      if (found) return found;
      if (list.users.length < 200) break;
      page += 1;
    }
  }
  throw error;
}

async function seedDriver(n) {
  const email = `driver${n}@${EMAIL_DOMAIN}`;
  const password = `Driver#${n}Pass`;
  const displayName = `Driver ${n}`;

  const user = await ensureUser(email, password, { display_name: displayName });

  // The trigger creates the profile; update it with number + name + role.
  const { error } = await admin
    .from("profiles")
    .update({ driver_number: n, display_name: displayName, role: "driver" })
    .eq("id", user.id);
  if (error) throw error;

  console.log(`  ✓ ${displayName.padEnd(9)}  ${email}  /  ${password}`);
}

async function main() {
  console.log("Seeding 10 drivers…");
  for (let n = 1; n <= 10; n++) {
    await seedDriver(n);
  }
  console.log(
    "\nDone. Log in with any of the credentials above.\n" +
      "Remember to change these passwords (Supabase Dashboard → Authentication)\n" +
      "or have each driver reset their own."
  );
}

main().catch((e) => {
  console.error("\nSeed failed:", e.message ?? e);
  process.exit(1);
});
