"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toISODate } from "@/lib/utils";

export async function clockIn() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = toISODate(new Date());
  // The unique (user_id, work_date) constraint makes a second clock-in
  // a no-op error, which we can safely ignore.
  await supabase
    .from("clockins")
    .insert({ user_id: user.id, work_date: today, half_day: false });

  revalidatePath("/driver");
}

export async function clockInHalf() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = toISODate(new Date());
  // Same once-per-day rule as a full day; this one is paid half rate.
  await supabase
    .from("clockins")
    .insert({ user_id: user.id, work_date: today, half_day: true });

  revalidatePath("/driver");
}

export async function undoClockIn() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = toISODate(new Date());
  await supabase
    .from("clockins")
    .delete()
    .eq("user_id", user.id)
    .eq("work_date", today);

  revalidatePath("/driver");
}
