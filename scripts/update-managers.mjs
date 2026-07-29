// One-off:
//   - change the existing manager (uzairadam08@gmail.com) to a new email + password
//   - add a second manager (Haroon)
//   node scripts/update-managers.mjs
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

async function promoteProfile(id, displayName) {
  const { error } = await admin
    .from("profiles")
    .update({ role: "manager", display_name: displayName })
    .eq("id", id);
  if (error) throw error;
}

// 1. Change existing manager email + password ------------------------------
const OLD_EMAIL = "uzairadam08@gmail.com";
const NEW_EMAIL = "uzair@milescraft.uk";
const NEW_PASSWORD = "@12uzair3";

let uzair = await findUserByEmail(OLD_EMAIL);
if (!uzair) uzair = await findUserByEmail(NEW_EMAIL); // maybe already changed
if (!uzair) {
  console.error(`Could not find existing manager (${OLD_EMAIL} or ${NEW_EMAIL}).`);
  process.exit(1);
}
{
  const { error } = await admin.auth.admin.updateUserById(uzair.id, {
    email: NEW_EMAIL,
    password: NEW_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  await promoteProfile(uzair.id, "Uzair");
  console.log(`✓ Manager updated:  ${NEW_EMAIL}  /  ${NEW_PASSWORD}`);
}

// 2. Add Haroon as a second manager ----------------------------------------
const HAROON_EMAIL = "Haroon@milescraft.uk";
const HAROON_PASSWORD = "@12Haroon3";

let haroon = await findUserByEmail(HAROON_EMAIL);
if (!haroon) {
  const { data, error } = await admin.auth.admin.createUser({
    email: HAROON_EMAIL,
    password: HAROON_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: "Haroon" },
  });
  if (error) throw error;
  haroon = data.user;
} else {
  const { error } = await admin.auth.admin.updateUserById(haroon.id, {
    password: HAROON_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
}
await promoteProfile(haroon.id, "Haroon");
console.log(`✓ Manager added:    ${HAROON_EMAIL}  /  ${HAROON_PASSWORD}`);
