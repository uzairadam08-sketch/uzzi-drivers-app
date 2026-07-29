// Verify each login actually works, exactly like the app does (anon key sign-in).
//   node scripts/test-logins.mjs
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
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error("Missing URL or anon key in .env.local");
  process.exit(1);
}

const LOGINS = [
  { role: "driver",  email: "naeem@milescraft.uk",   password: "Naeem@Driver8" },
  { role: "driver",  email: "alusine@milescraft.uk", password: "Alusine@Driver9" },
  { role: "driver",  email: "salat@milescraft.uk",   password: "Salat@Driver10" },
  { role: "manager", email: "asad@milescraft.uk",    password: "@12Asad3" },
];

let allOk = true;
for (const l of LOGINS) {
  // fresh client per login so sessions don't collide
  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: l.email,
    password: l.password,
  });
  if (error || !data?.user) {
    allOk = false;
    console.log(`✗ FAIL   ${l.email}  —  ${error?.message ?? "no user returned"}`);
    continue;
  }
  // also read back the role the app relies on
  const { data: prof } = await client
    .from("profiles")
    .select("role, display_name, driver_number")
    .eq("id", data.user.id)
    .single();
  const roleOk = prof?.role === l.role;
  if (!roleOk) allOk = false;
  console.log(
    `${roleOk ? "✓ OK  " : "✗ ROLE"}   ${l.email.padEnd(24)}  logs in, role=${prof?.role ?? "?"} (expected ${l.role})`
  );
  await client.auth.signOut();
}

console.log(allOk ? "\nAll credentials verified working." : "\nSOME CREDENTIALS FAILED — see above.");
process.exit(allOk ? 0 : 1);
