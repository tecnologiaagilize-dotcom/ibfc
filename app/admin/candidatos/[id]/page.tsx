import Link from "next/link";
import { notFound } from "next/navigation";

import CandidateForm from "@/components/admin/CandidateForm";
import CandidateInviteManager from "@/components/admin/CandidateInviteManager";
import CandidateOffices from "@/components/admin/CandidateOffices";
import CandidatePublicActivity from "@/components/admin/CandidatePublicActivity";
import CandidateSources from "@/components/admin/CandidateSources";
import CandidatePublicData from "@/components/admin/CandidatePublicData";
import CandidatePublicDataQueue from "@/components/admin/CandidatePublicDataQueue";
import CandidateCompletenessPanel from "@/components/admin/CandidateCompletenessPanel";
import CandidateReviewPanel from "@/components/admin/CandidateReviewPanel";
import CandidateDangerZone from "@/components/admin/CandidateDangerZone";

import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const reviewLabels: Record<string, string> = {
  draft: "Rascunho",
  awaiting_completion: "Aguardando preenchimento",
  in_review: "Em revisão",
  approved: "Aprovado",
};

function ReviewBadge({
  status,
}: {
  status?: string | null;
}) {
  const value = status || "draft";

  const classes: Record<string, string> = {
    draft:
      "border-slate-200 bg-slate-100 text-slate-700",

    awaiting_completion:
      "border-amber-200 bg-amber-50 text-amber-700",

    in_review:
      "border-blue-200 bg-blue-50 text-blue-700",

    approved:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        classes[value] ||
        "border-slate-200 bg-slate-100 text-slate-700"
      }`}
    >
      {reviewLabels[value] || value}
    </span>
  );
}

function PublicationBadge({
  status,
}: {
  status?: string | null;
}) {
  const published =
    status === "published";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        published
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {published
        ? "Publicado"
        : "Não publicado"}
    </span>
  );
}

function SectionHeader({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
          {number}
        </span>

        <h2 className="text-xl font-bold text-slate-900">
          {title}
        </h2>
      </div>

      <p className="ml-11 mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default async function CandidateEditPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const {
    data: candidate,
    error,
  } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !candidate) {
    notFound();
  }

  const publicHref =
    candidate.slug
      ? `/candidato/${candidate.slug}`
      : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ==========================================
            CABEÇALHO
        ========================================== */}

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

            <div className="min-w-0">
              <Link
                href="/admin/candidatos"
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                ← Voltar para candidatos
              </Link>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Administração do candidato
                </p>

                <h1 className="mt-1 break-words text-2xl font-bold text-slate-950 sm:text-3xl">
                  {candidate.ballot_name ||
                    candidate.name ||
                    "Candidato"}
                </h1>

                {candidate.name &&
                  candidate.ballot_name &&
                  candidate.name !==
                    candidate.ballot_name && (
                    <p className="mt-1 text-sm text-slate-500">
                      {candidate.name}
                    </p>
                  )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ReviewBadge
                  status={
                    candidate.review_status
                  }
                />

                <PublicationBadge
                  status={candidate.status}
                />

                {candidate.cargo && (
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {candidate.cargo}
                  </span>
                )}

                {candidate.party && (
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {candidate.party}

                    {candidate.number
                      ? ` • ${candidate.number}`
                      : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {publicHref && (
                <Link
                  href={publicHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver página pública ↗
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ==========================================
            SEÇÕES
        ========================================== */}

        <div className="space-y-10">

          {/* 1 */}

          <section>
            <SectionHeader
              number={1}
              title="Ficha do candidato"
              description="Dados de identificação, perfil, mídia, contatos e informações gerais."
            />

            <CandidateForm
              initial={candidate}
            />
          </section>

          {/* 2 */}

          <section>
            <SectionHeader
              number={2}
              title="Preenchimento externo"
              description="Envie um acesso temporário para que o candidato ou sua equipe complemente as informações do cadastro."
            />

            <CandidateInviteManager
              candidateId={
                candidate.id
              }
            />
          </section>

          {/* 3 */}

          <section>
            <SectionHeader
              number={3}
              title="Atuação Pública"
              description="Histórico factual e documentado de cargos, mandatos, proposições, votações, comissões, funções e entregas."
            />

            <CandidatePublicActivity
              candidateId={
                candidate.id
              }
            />
          </section>

          {/* 4 */}

          <section>
            <SectionHeader
              number={4}
              title="Presença territorial"
              description="Cadastre comitês, escritórios, pontos de apoio e outras estruturas territoriais vinculadas ao candidato."
            />

            <CandidateOffices
              candidateId={
                candidate.id
              }
            />
          </section>

          {/* 5 */}

          <section>
            <SectionHeader
              number={5}
              title="Verificação"
              description="Organize as fontes utilizadas para conferência e documentação das informações apresentadas no perfil."
            />

            <CandidateSources
              candidateId={
                candidate.id
              }
            />
          </section>

          {/* 6 */}

          <section>
            <SectionHeader
              number={6}
              title="Dados Públicos"
              description="Vincule o candidato às fontes públicas e acompanhe os registros recebidos antes de qualquer incorporação à Atuação Pública."
            />

            <div className="space-y-8">
              <CandidatePublicData
                candidateId={
                  candidate.id
                }
              />

              <div className="border-t border-slate-200 pt-8">
                <CandidatePublicDataQueue
                  candidateId={
                    candidate.id
                  }
                />
              </div>
            </div>
          </section>

          {/* 7 */}

          <section>
            <SectionHeader
              number={7}
              title="Completude documental"
              description="Checklist operacional do preenchimento e da documentação disponível no cadastro."
            />

            <CandidateCompletenessPanel
              candidateId={
                candidate.id
              }
            />
          </section>

          {/* 8 */}

          <section>
            <SectionHeader
              number={8}
              title="Revisão e publicação"
              description="Controle separadamente o estágio de revisão editorial e a visibilidade pública deste cadastro."
            />

            <CandidateReviewPanel
              candidateId={
                candidate.id
              }
              initialReviewStatus={
                candidate.review_status ||
                "draft"
              }
              initialPublicationStatus={
                candidate.status ||
                "draft"
              }
            />
          </section>

          {/* 9 */}

          <section>
            <SectionHeader
              number={9}
              title="Administração"
              description="Operações administrativas relacionadas ao registro deste candidato."
            />

            <CandidateDangerZone
              candidateId={
                candidate.id
              }
              candidateName={
                candidate.ballot_name ||
                candidate.name ||
                "Candidato"
              }
            />
          </section>
        </div>
      </div>
    </main>
  );
}
