"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toISODate } from "@/lib/utils";

export async function addJob(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const description = String(formData.get("description") ?? "").trim();
  const total = Number(formData.get("total"));
  const expenses = Number(formData.get("expenses") ?? 0);
  if (!Number.isFinite(total) || total <= 0) return;

  await supabase.from("jobs").insert({
    user_id: user.id,
    total,
    expenses: Number.isFinite(expenses) && expenses > 0 ? expenses : 0,
    description: description || null,
    job_date: toISODate(new Date()),
  });

  revalidatePath("/driver/jobs");
}

export async function deleteJob(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // RLS guarantees a driver can only delete their own rows.
  await supabase.from("jobs").delete().eq("id", id);

  revalidatePath("/driver/jobs");
}
