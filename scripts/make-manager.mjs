// One-off: create the manager account and promote it to role = 'manager'.
//   node scripts/make-manager.mjs
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

const EMAIL = "uzairadam08@gmail.com";
const PASSWORD = "051101";
const DISPLAY = "Manager";

async function ensureUser(email, password) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: DISPLAY },
  });
  if (!error) return data.user;
  if (String(error.message).toLowerCase().includes("already")) {
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

const user = await ensureUser(EMAIL, PASSWORD);
const { error } = await admin
  .from("profiles")
  .update({ role: "manager", display_name: DISPLAY })
  .eq("id", user.id);
if (error) {
  console.error("Failed to promote to manager:", error.message);
  process.exit(1);
}
console.log(`✓ Manager account ready:  ${EMAIL}  /  ${PASSWORD}`);
