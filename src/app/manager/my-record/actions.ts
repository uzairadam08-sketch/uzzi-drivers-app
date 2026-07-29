"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Log a pay entry against the logged-in manager's own record.
export async function addPay(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const amount = Number(formData.get("amount"));
  const payDate = String(formData.get("pay_date") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isFinite(amount) || amount < 0) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payDate)) return;

  // RLS ensures a manager can only insert rows for themselves.
  await supabase.from("manager_pay").insert({
    user_id: user.id,
    amount,
    pay_date: payDate,
    note: note || null,
  });

  revalidatePath("/manager/my-record");
}

// Remove a pay entry.
export async function deletePay(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("manager_pay").delete().eq("id", id);

  revalidatePath("/manager/my-record");
}
