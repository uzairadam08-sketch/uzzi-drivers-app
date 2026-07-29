// Verify each driver can actually log in — uses the SAME method the app does
// (anon key + signInWithPassword). Read-only; signs out after each check.
//   node scripts/verify-driver-logins.mjs
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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const LOGINS = [
  { name: "Altamash Khan", email: "altamash@milescraft.uk",     password: "Altamash@Khan1" },
  { name: "Fahad Amjad",   email: "fahad@milescraft.uk",        password: "Fahad@Amjad2" },
  { name: "Ali Hamza",     email: "ali@milescraft.uk",          password: "Ali@Hamza3" },
  { name: "Imran Qaasim",  email: "imran.qaasim@milescraft.uk", password: "Imran@Qaasim4" },
  { name: "Mariam Khan",   email: "mariam@milescraft.uk",       password: "Mariam@Khan5" },
  { name: "Imran Khan",    email: "imran.khan@milescraft.uk",   password: "Imran@Khan6" },
];

let allOk = true;
for (const l of LOGINS) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: l.email,
    password: l.password,
  });
  if (error || !data?.session) {
    allOk = false;
    console.log(`✗ FAIL  ${l.name.padEnd(14)} ${l.email}  — ${error?.message ?? "no session"}`);
  } else {
    // confirm the display name they'll see matches
    const { data: prof } = await client
      .from("profiles")
      .select("display_name")
      .eq("id", data.user.id)
      .single();
    console.log(`✓ OK    ${l.name.padEnd(14)} ${l.email}  — logs in, name shows: "${prof?.display_name ?? "?"}"`);
    await client.auth.signOut();
  }
}

console.log(allOk ? "\nAll 6 logins work. ✅" : "\nSome logins FAILED — see above.");
