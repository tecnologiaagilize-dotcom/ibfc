"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function joinQueue(form: FormData) {
  const db = await createClient();
  const {data:{user}} = await db.auth.getUser();
  if (!user) redirect("/cadastro");
  const title = String(form.get("electoral_title") || "").replace(/\D/g, "");
  const {error} = await db.rpc("ibfc_sapf_join", {
    p_title: title, p_unaffiliated: form.get("unaffiliated") === "on", p_consent: form.get("consent") === "on"
  });
  if (error) redirect("/membro/apoiamento?erro=cadastro");
  revalidatePath("/membro/apoiamento");
  redirect("/membro/apoiamento");
}
export async function sendCode(form: FormData) {
  const db = await createClient();
  const {data:{user}} = await db.auth.getUser();
  if (!user) redirect("/entrar");
  const code = String(form.get("code") || "").replace(/\D/g, "");
  const {error} = await db.rpc("ibfc_sapf_send_code", {p_code:code});
  if (error) redirect("/membro/apoiamento?erro=codigo");
  revalidatePath("/admin/apoiamento");
  revalidatePath("/membro/apoiamento");
  redirect("/membro/apoiamento");
}
export async function cancelQueue() {
  const db = await createClient();
  const {data:{user}} = await db.auth.getUser();
  if (!user) redirect("/entrar");
  await db.rpc("ibfc_sapf_cancel");
  revalidatePath("/membro/apoiamento");
  redirect("/membro/apoiamento");
}
