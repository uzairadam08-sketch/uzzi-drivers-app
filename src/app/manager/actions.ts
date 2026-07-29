"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateRate(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rate = Number(formData.get("daily_rate"));
  if (!Number.isFinite(rate) || rate < 0) return;

  // RLS only lets a manager update settings.
  await supabase.from("settings").update({ daily_rate: rate, updated_at: new Date().toISOString() }).eq("id", 1);

  revalidatePath("/manager");
  revalidatePath("/manager/summary");
}
