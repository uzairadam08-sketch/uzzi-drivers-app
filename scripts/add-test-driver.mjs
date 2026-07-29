// One-off: create a demo driver "Test" with easy credentials.
//   node scripts/add-test-driver.mjs
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

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const EMAIL = "test@uzzi.local";
const PASSWORD = "test1234";
const NUMBER = 7;

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

let user = await findUserByEmail(EMAIL);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: "Test" },
  });
  if (error) throw error;
  user = data.user;
} else {
  await admin.auth.admin.updateUserById(user.id, { password: PASSWORD, email_confirm: true });
}

const { error } = await admin
  .from("profiles")
  .update({ driver_number: NUMBER, display_name: "Test", role: "driver" })
  .eq("id", user.id);
if (error) throw error;

console.log(`✓ Demo driver ready:  ${EMAIL}  /  ${PASSWORD}  (driver #${NUMBER}, name "Test")`);
