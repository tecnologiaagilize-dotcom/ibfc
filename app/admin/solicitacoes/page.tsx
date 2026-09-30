import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export const dynamic="force-dynamic";
export default async function Page(){const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect('/admin/login');return <AdminShell email={user.email}><div className="admin-heading"><div><span className="badge">FLUXO EDITORIAL</span><h1>Solicitações</h1><p>Área reservada para futuras indicações e pedidos de análise. A publicação continuará dependendo de revisão administrativa.</p></div></div><section className="admin-panel"><div className="empty-cell">Nenhuma solicitação pendente. Este módulo está preparado para a próxima etapa de workflow.</div></section></AdminShell>}
