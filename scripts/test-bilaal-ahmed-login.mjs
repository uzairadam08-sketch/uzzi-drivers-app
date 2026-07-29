// One-off: verify Bilaal + Ahmed Fahad can actually sign in (uses the public anon key, like the app).
//   node scripts/test-bilaal-ahmed-login.mjs
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

const ACCOUNTS = [
  { email: "bilaal@milescraft.uk", password: "Bilaal@Driver18" },
  { email: "ahmed@milescraft.uk", password: "Ahmed@Fahad19" },
];

let failed = false;
for (const acct of ACCOUNTS) {
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword(acct);
  if (error) {
    console.error(`✗ LOGIN FAILED — ${acct.email} — ${error.message}`);
    failed = true;
    continue;
  }
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("driver_number, display_name, role")
    .eq("id", data.user.id)
    .single();

  console.log(`✓ LOGIN OK — ${data.user.email}`);
  if (profErr) {
    console.error(`  but profile read failed — ${profErr.message}`);
    failed = true;
    continue;
  }
  console.log(`  profile: #${profile.driver_number}  ${profile.display_name}  (${profile.role})`);
}

process.exit(failed ? 1 : 0);
