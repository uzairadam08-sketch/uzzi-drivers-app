// One-off: wipe all clock-in and expense records (test data), keeping
// accounts, manager logins and the rate setting intact.
//   node scripts/clear-test-data.mjs
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

async function countAndClear(table) {
  const { count: before } = await admin
    .from(table)
    .select("*", { count: "exact", head: true });
  // Delete every row (always-true filter on a non-null column).
  const { error } = await admin.from(table).delete().not("id", "is", null);
  if (error) throw error;
  const { count: after } = await admin
    .from(table)
    .select("*", { count: "exact", head: true });
  console.log(`  ${table}: removed ${before ?? "?"} rows (now ${after ?? 0})`);
}

console.log("Clearing test data…");
await countAndClear("expenses");
await countAndClear("clockins");
console.log("Done. Accounts, manager logins and the rate are untouched.");
