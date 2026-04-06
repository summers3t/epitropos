"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function markOrderPaid(orderId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const paymentReference = String(
    formData.get("payment_reference") ?? "",
  ).trim();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!order) {
    redirect("/admin/orders");
  }

  if (order.payment_status !== "pending") {
    redirect(`/admin/orders/${orderId}`);
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      payment_provider: "manual_admin_confirmation",
      payment_reference: paymentReference || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("payment_status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!updatedOrder) {
    throw new Error("Order could not be marked as paid.");
  }

  const { data: linkedCase, error: linkedCaseError } = await supabase
    .from("cases")
    .select("id")
    .eq("order_id", updatedOrder.id)
    .maybeSingle();

  if (linkedCaseError) {
    throw new Error(linkedCaseError.message);
  }

  if (!linkedCase) {
    throw new Error(
      "Order was marked as paid, but no case was created. Check the paid-order case trigger.",
    );
  }

  redirect(`/admin/orders/${orderId}`);
}
