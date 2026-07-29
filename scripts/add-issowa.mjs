// One-off: add driver Issowa Mboula (#12).
// Safe to re-run: existing user is found and updated, not duplicated.
//   node scripts/add-issowa.mjs
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

async function ensureUser(email, password, displayName) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (!error) return data.user;

  if (String(error.message).toLowerCase().includes("already")) {
    let page = 1;
    while (true) {
      const { data: list, error: listErr } =
        await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr) throw listErr;
      const found = list.users.find(
        (u) => (u.email ?? "").toLowerCase() === email.toLowerCase()
      );
      if (found) {
        await admin.auth.admin.updateUserById(found.id, {
          password,
          email_confirm: true,
        });
        return found;
      }
      if (list.users.length < 200) break;
      page += 1;
    }
  }
  throw error;
}

const DRIVER = {
  number: 12,
  email: "issowa@milescraft.uk",
  password: "Issowa@Mboula12",
  name: "Issowa Mboula",
};

console.log("Adding driver…");
const user = await ensureUser(DRIVER.email, DRIVER.password, DRIVER.name);
const { error } = await admin
  .from("profiles")
  .update({ driver_number: DRIVER.number, display_name: DRIVER.name, role: "driver" })
  .eq("id", user.id);
if (error) {
  console.error(`✗ ${DRIVER.email} — ${error.message}`);
  process.exit(1);
}
console.log(`  ✓ Driver #${DRIVER.number}  ${DRIVER.name}  ${DRIVER.email}  /  ${DRIVER.password}`);
console.log("\nDone.");
