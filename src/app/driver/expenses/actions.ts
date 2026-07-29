"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toISODate } from "@/lib/utils";

export async function addExpense(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  if (!description || !Number.isFinite(amount) || amount < 0) return;

  await supabase.from("expenses").insert({
    user_id: user.id,
    description,
    amount,
    expense_date: toISODate(new Date()),
  });

  revalidatePath("/driver/expenses");
}

export async function deleteExpense(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // RLS guarantees a driver can only delete their own rows.
  await supabase.from("expenses").delete().eq("id", id);

  revalidatePath("/driver/expenses");
}
