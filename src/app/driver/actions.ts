"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toISODate } from "@/lib/utils";

async function isDailyRateEnabled(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("daily_rate_enabled")
    .eq("id", userId)
    .single();
  return !!data?.daily_rate_enabled;
}

export async function clockIn() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (!(await isDailyRateEnabled(supabase, user.id))) return;

  const today = toISODate(new Date());
  await supabase
    .from("clockins")
    .insert({ user_id: user.id, work_date: today, half_day: false });

  revalidatePath("/driver");
}

export async function clockInHalf() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (!(await isDailyRateEnabled(supabase, user.id))) return;

  const today = toISODate(new Date());
  await supabase
    .from("clockins")
    .insert({ user_id: user.id, work_date: today, half_day: true });

  revalidatePath("/driver");
}

export async function undoClockIn() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (!(await isDailyRateEnabled(supabase, user.id))) return;

  const today = toISODate(new Date());
  await supabase
    .from("clockins")
    .delete()
    .eq("user_id", user.id)
    .eq("work_date", today);

  revalidatePath("/driver");
}
