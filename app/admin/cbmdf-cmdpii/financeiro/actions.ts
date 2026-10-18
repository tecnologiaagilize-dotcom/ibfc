"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createFinancialEntry(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile } = await db.from("admin_profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "editor"].includes(profile.role)) throw new Error("Acesso não autorizado");
  const entry_type = String(formData.get("entry_type") ?? "");
  const transaction_date = String(formData.get("transaction_date") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const rawAmount = String(formData.get("amount") ?? "").trim();
  const amount = Number(rawAmount);
  const counterparty = String(formData.get("counterparty") ?? "").trim();
  const document_reference = String(formData.get("document_reference") ?? "").trim();
  const payment_method = String(formData.get("payment_method") ?? "").trim();
  const bank_reference = String(formData.get("bank_reference") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!["receita", "despesa"].includes(entry_type) || !/^\d{4}-\d{2}-\d{2}$/.test(transaction_date) ||
      description.length < 5 || description.length > 500 || !/^\d{1,14}(\.\d{1,2})?$/.test(rawAmount) ||
      !Number.isFinite(amount) || amount <= 0 || counterparty.length > 250 || document_reference.length > 1000 ||
      payment_method.length > 100 || bank_reference.length > 250 || notes.length > 4000) {
    redirect("/admin/cbmdf-cmdpii/financeiro?erro=validacao");
  }
  const { error } = await db.from("ibfc_cmdpii_financial_entries").insert({
    entry_type, transaction_date, description, amount, counterparty, document_reference,
    payment_method, bank_reference, notes, verification_status: "pendente", created_by: user.id
  });
  if (error) redirect("/admin/cbmdf-cmdpii/financeiro?erro=banco");
  revalidatePath("/admin/cbmdf-cmdpii/financeiro");
  redirect("/admin/cbmdf-cmdpii/financeiro?sucesso=1");
}
