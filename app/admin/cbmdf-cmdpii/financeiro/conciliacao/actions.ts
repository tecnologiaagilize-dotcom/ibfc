"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
const route = "/admin/cbmdf-cmdpii/financeiro/conciliacao";

async function authorized() {
 const db = await createClient();
 const { data: { user } } = await db.auth.getUser();
 if (!user) redirect("/admin/login");
 const { data: profile } = await db.from("admin_profiles").select("role").eq("id", user.id).maybeSingle();
 if (!profile || !["admin", "editor"].includes(profile.role)) redirect("/admin");
 return { db, user };
}
function parseCsv(text: string, delimiter: string): string[][] {
 const out: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
 for (let i=0; i<text.length; i++) {
  const c = text[i];
  if (c === '"') { if (quoted && text[i+1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
  else if (c === delimiter && !quoted) { row.push(cell); cell=""; }
  else if ((c === "\n" || c === "\r") && !quoted) { if (c === "\r" && text[i+1] === "\n") i++; row.push(cell); if (row.some(v=>v.trim())) out.push(row); row=[]; cell=""; }
  else cell += c;
 }
 if (quoted) throw new Error("CSV com aspas não fechadas");
 row.push(cell); if (row.some(v=>v.trim())) out.push(row);
 return out;
}
function parseAmount(raw: string): number {
 const s=raw.trim().replace(/\s/g, "");
 // Aceita 1234.56, -1234.56 e 1.234,56 (não interpreta separadores ambíguos).
 const normalized = /^-?\d{1,3}(\.\d{3})+,\d{2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s;
 if (!/^-?\d{1,12}\.\d{2}$/.test(normalized)) throw new Error("Valor deve ter duas casas decimais");
 const n=Number(normalized); if (!Number.isFinite(n) || n===0) throw new Error("Valor inválido"); return n;
}
export async function importBankCsv(formData: FormData) {
 const {db,user}=await authorized();
 const file=formData.get("file"); const account=String(formData.get("account_label")??"").trim();
 if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv") || file.size<1 || file.size>1024*1024 || account.length<2 || account.length>120) redirect(`${route}?erro=arquivo`);
 let rows: string[][];
 try {
  const content=(await file.text()).replace(/^\uFEFF/, "");
  const first=content.split(/\r?\n/,1)[0];
  rows=parseCsv(content, (first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length ? ";" : ",");
  if (rows.length<2 || rows.length>501) throw new Error("Limite de 500 linhas");
  if (rows[0].map(s=>s.trim().toLowerCase()).join("|")!=="data|descricao|valor") throw new Error("Cabeçalho incorreto");
 } catch { redirect(`${route}?erro=formato`); }
 const items: {transaction_date:string;description:string;amount:number;account_label:string;source_filename:string;source_row:number;fingerprint:string;created_by:string}[]=[];
 try {
  for(let i=1;i<rows.length;i++) {
   const r=rows[i]; if(r.length!==3) throw new Error("Colunas inválidas");
   const date=r[0].trim(); const description=r[1].trim(); const amount=parseAmount(r[2]);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date+"T00:00:00Z")) || description.length<1 || description.length>1000) throw new Error("Linha inválida");
   const fingerprint=createHash("sha256").update(JSON.stringify([account,date,description,amount,file.name,i+1])).digest("hex");
   items.push({transaction_date:date,description,amount,account_label:account,source_filename:file.name.slice(0,250),source_row:i+1,fingerprint,created_by:user.id});
  }
 } catch { redirect(`${route}?erro=linhas`); }
 const {error}=await db.from("ibfc_cmdpii_bank_transactions").upsert(items,{onConflict:"fingerprint",ignoreDuplicates:true});
 if(error) redirect(`${route}?erro=banco`);
 revalidatePath(route); redirect(`${route}?sucesso=importacao`);
}
export async function reviewBankTransaction(formData: FormData) {
 const {db,user}=await authorized();
 const id=String(formData.get("id")??""); const status=String(formData.get("status")??"");
 const entry=String(formData.get("financial_entry_id")??""); const notes=String(formData.get("review_notes")??"").trim();
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(id) || !["pendente","conciliado","divergente"].includes(status) || notes.length>2000 || (entry&&!uuid.test(entry)) || (status==="conciliado"&&!entry)) redirect(`${route}?erro=validacao`);
 if(entry) {
  const {data: bank}=await db.from("ibfc_cmdpii_bank_transactions").select("amount,transaction_date").eq("id",id).maybeSingle();
  const {data: financial}=await db.from("ibfc_cmdpii_financial_entries").select("amount,entry_type,transaction_date").eq("id",entry).maybeSingle();
  if(!bank||!financial) redirect(`${route}?erro=referencia`);
  const signed=Number(financial.amount)*(financial.entry_type==="despesa"?-1:1);
  if(status==="conciliado" && (Math.round(Number(bank.amount)*100)!==Math.round(signed*100) || bank.transaction_date!==financial.transaction_date)) redirect(`${route}?erro=incompatibilidade`);
 }
 const {error}=await db.from("ibfc_cmdpii_bank_transactions").update({financial_entry_id:entry||null,review_status:status,review_notes:notes,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",id);
 if(error) redirect(`${route}?erro=banco`);
 revalidatePath(route);redirect(`${route}?sucesso=revisao`);
}
