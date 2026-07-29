// One-off: set real display names for drivers by their number.
//   node scripts/update-driver-names.mjs
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

const NAMES = {
  1: "Altmash Khan",
  2: "Fahad Amjad",
  3: "Ali Hamza",
  4: "Imran Khan",
  5: "Mariam Khan",
  6: "Pedro Fernandez",
};

for (const [num, name] of Object.entries(NAMES)) {
  const { error } = await admin
    .from("profiles")
    .update({ display_name: name })
    .eq("driver_number", Number(num));
  if (error) {
    console.error(`  ✗ Driver ${num}: ${error.message}`);
  } else {
    console.log(`  ✓ Driver ${num} → ${name}`);
  }
}
console.log("Done.");
