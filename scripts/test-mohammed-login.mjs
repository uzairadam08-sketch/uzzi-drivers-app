// One-off: verify Mohammed can actually sign in (uses the public anon key, like the app).
//   node scripts/test-mohammed-login.mjs
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
const supabase = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = "mohammed@milescraft.uk";
const PASSWORD = "Mohammed@Jahangeer11";

const { data, error } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});

if (error) {
  console.error(`✗ LOGIN FAILED — ${error.message}`);
  process.exit(1);
}

// read his own profile as the logged-in user (proves RLS lets him in)
const { data: profile, error: profErr } = await supabase
  .from("profiles")
  .select("driver_number, display_name, role")
  .eq("id", data.user.id)
  .single();

console.log(`✓ LOGIN OK — ${data.user.email}`);
if (profErr) {
  console.error(`  but profile read failed — ${profErr.message}`);
  process.exit(1);
}
console.log(`  profile: #${profile.driver_number}  ${profile.display_name}  (${profile.role})`);
