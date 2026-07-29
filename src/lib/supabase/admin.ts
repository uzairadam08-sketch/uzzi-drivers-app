import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only admin client using the service role key. This BYPASSES
// Row Level Security, so only ever import it in server code (route
// handlers / server actions) and never return raw data to a user
// without checking that the caller is a manager first.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
