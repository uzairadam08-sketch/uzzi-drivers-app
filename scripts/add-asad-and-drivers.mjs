// One-off: add 3 drivers (Naeem #8, Alusine #9, Salat #10) + 1 manager (Asad).
// Safe to re-run: existing users are found and updated, not duplicated.
//   node scripts/add-asad-and-drivers.mjs
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
        // make sure the password matches what we print
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

const DRIVERS = [
  { number: 8,  email: "naeem@milescraft.uk",   password: "Naeem@Driver8",    name: "Naeem" },
  { number: 9,  email: "alusine@milescraft.uk", password: "Alusine@Driver9",  name: "Alusine" },
  { number: 10, email: "salat@milescraft.uk",   password: "Salat@Driver10",   name: "Salat" },
];

const MANAGER = { email: "asad@milescraft.uk", password: "@12Asad3", name: "Asad" };

console.log("Adding drivers…");
for (const d of DRIVERS) {
  const user = await ensureUser(d.email, d.password, d.name);
  const { error } = await admin
    .from("profiles")
    .update({ driver_number: d.number, display_name: d.name, role: "driver" })
    .eq("id", user.id);
  if (error) {
    console.error(`✗ ${d.email} — ${error.message}`);
    continue;
  }
  console.log(`  ✓ Driver #${d.number}  ${d.name.padEnd(10)}  ${d.email}  /  ${d.password}`);
}

console.log("\nAdding manager…");
{
  const user = await ensureUser(MANAGER.email, MANAGER.password, MANAGER.name);
  const { error } = await admin
    .from("profiles")
    .update({ role: "manager", display_name: MANAGER.name, driver_number: null })
    .eq("id", user.id);
  if (error) {
    console.error(`✗ ${MANAGER.email} — ${error.message}`);
    process.exit(1);
  }
  console.log(`  ✓ Manager   ${MANAGER.name.padEnd(10)}  ${MANAGER.email}  /  ${MANAGER.password}`);
}

console.log("\nDone.");
