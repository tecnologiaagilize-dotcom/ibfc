import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createIntegratedStudy } from "./actions";

export const dynamic = "force-dynamic";

export default async function IntegracaoPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login");
  const { data: admin, error: roleError } = await client.rpc("is_admin");
  if (roleError || !admin) redirect("/painel");

  // Estas tabelas são introduzidas pelas migrações da integração. Os tipos
  // gerados do Supabase serão atualizados quando o banco receber a migração.
  const db = client as unknown as SupabaseClient;
  const [studies, candidates, teams, contacts] = await Promise.all([
    db.from("integration_studies")
      .select("id,code,title,state_uf,office,status,created_at")
      .order("created_at", { ascending: false }).limit(30),
    db.from("integration_candidate_catalog").select("id", { count: "exact", head: true }),
    db.from("integration_teams").select("id", { count: "exact", head: true }),
    db.from("integration_crm_contacts").select("id", { count: "exact", head: true }),
  ]);
  const missingCore = studies.error || candidates.error || teams.error;

  return <div className="mx-auto max-w-6xl space-y-8">
    <header>
      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Tr@de Tecnologia</span>
      <h1 className="mt-2 text-3xl font-bold">Instituto Brasileiro da Família Cristã</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Catálogo de candidaturas, estudos, equipes e eventos do CRM.
      </p>
    </header>

    {missingCore && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
      Instale a migração <code>20260924_integrated_political_core.sql</code> no banco de homologação.
      <span className="block text-sm">Detalhes: {missingCore.message}</span>
    </div>}
    {!missingCore && contacts.error && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
      Para ativar a recepção do CRM, instale <code>20260924_crm_integration_boundary.sql</code>.
    </div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Candidaturas", candidates.count ?? 0], ["Equipes", teams.count ?? 0],
        ["Estudos recentes", studies.data?.length ?? 0], ["Contatos do CRM", contacts.count ?? 0],
      ].map(([label, count]) => <div key={label} className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
        <div className="text-3xl font-bold">{count}</div><div className="text-sm text-slate-600">{label}</div>
      </div>)}
    </div>

    <section className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <h2 className="text-xl font-semibold">Novo estudo em rascunho</h2>
      <p className="mt-1 text-sm text-slate-600">Criar um rascunho não inicia coleta nem divulga resultados.</p>
      <form action={createIntegratedStudy} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1">Código<input required name="code" maxLength={40} placeholder="DF_2026_01" className="rounded border p-2" /></label>
        <label className="grid gap-1">Título<input required name="title" maxLength={150} placeholder="Pesquisa DF — primeira rodada" className="rounded border p-2" /></label>
        <label className="grid gap-1">Ano<select name="year" defaultValue="2026" className="rounded border p-2"><option value="2026">2026 — geral</option><option value="2028">2028 — municipal</option></select></label>
        <label className="grid gap-1">UF<select name="state_uf" defaultValue="DF" className="rounded border p-2"><option value="DF">DF</option><option value="GO">GO</option></select></label>
        <label className="grid gap-1">Cargo<select name="office" defaultValue="senador" className="rounded border p-2">
          <option value="presidente">Presidente</option><option value="governador">Governador</option>
          <option value="senador">Senador</option><option value="deputado_federal">Deputado federal</option>
          <option value="deputado_distrital">Deputado distrital (DF)</option><option value="deputado_estadual">Deputado estadual (GO)</option>
          <option value="prefeito">Prefeito (Águas Lindas, 2028)</option><option value="vereador">Vereador (Águas Lindas, 2028)</option>
        </select></label>
        <button type="submit" disabled={Boolean(missingCore)} className="self-end rounded bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Criar rascunho</button>
      </form>
    </section>

    <section className="overflow-x-auto rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <h2 className="mb-4 text-xl font-semibold">Estudos</h2>
      <table className="w-full text-left text-sm"><thead><tr><th>Código</th><th>Nome</th><th>UF</th><th>Cargo</th><th>Estado</th></tr></thead>
        <tbody>{studies.data?.map(study => <tr key={study.id} className="border-t border-slate-200 dark:border-slate-800">
          <td className="py-2">{study.code}</td><td>{study.title}</td><td>{study.state_uf}</td><td>{study.office}</td><td>{study.status}</td></tr>)}
          {!studies.data?.length && <tr><td colSpan={5} className="py-4">Nenhum estudo cadastrado.</td></tr>}
        </tbody></table>
    </section>
  </div>;
}
