"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  FileCheck2,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/browser";

type Props = {
  candidateId: string;
};

type CandidateData = {
  name?: string | null;
  ballot_name?: string | null;
  cargo?: string | null;
  state_uf?: string | null;
  city_name?: string | null;
  party?: string | null;
  number?: string | null;
  photo_url?: string | null;
  mini_cv?: string | null;
  biography?: string | null;
  political_project?: string | null;
  proposals?: string | null;
  public_experience?: string | null;
  priority_areas?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  video_url?: string | null;
  source_url?: string | null;
  source_notes?: string | null;
  verified_at?: string | null;
};

type ChecklistItem = {
  id: string;
  label: string;
  group: string;
  complete: boolean;
  destination: string;
  description?: string;
};

function hasValue(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

export default function CandidateCompletenessPanel({
  candidateId,
}: Props) {
  const [candidate, setCandidate] =
    useState<CandidateData | null>(null);

  const [sourceCount, setSourceCount] =
    useState(0);

  const [activityCount, setActivityCount] =
    useState(0);

  const [verifiedActivityCount, setVerifiedActivityCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [warning, setWarning] =
    useState("");

  const [reloadKey, setReloadKey] =
    useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setWarning("");

      try {
        const supabase = createClient();

        const [
          candidateResult,
          sourcesResult,
          positionsResult,
          propositionsResult,
          votesResult,
          committeesResult,
          deliveriesResult,
        ] = await Promise.all([
          supabase
            .from("candidates")
            .select(
              `
                name,
                ballot_name,
                cargo,
                state_uf,
                city_name,
                party,
                number,
                photo_url,
                mini_cv,
                biography,
                political_project,
                proposals,
                public_experience,
                priority_areas,
                website_url,
                instagram_url,
                facebook_url,
                youtube_url,
                video_url,
                source_url,
                source_notes,
                verified_at
              `
            )
            .eq("id", candidateId)
            .single(),

          supabase
            .from("candidate_sources")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("candidate_id", candidateId),

          supabase
            .from("candidate_public_positions")
            .select("id, verification_status")
            .eq("candidate_id", candidateId),

          supabase
            .from("candidate_public_propositions")
            .select("id, verification_status")
            .eq("candidate_id", candidateId),

          supabase
            .from("candidate_public_votes")
            .select("id, verification_status")
            .eq("candidate_id", candidateId),

          supabase
            .from("candidate_public_committees")
            .select("id, verification_status")
            .eq("candidate_id", candidateId),

          supabase
            .from("candidate_public_deliveries")
            .select("id, verification_status")
            .eq("candidate_id", candidateId),
        ]);

        if (cancelled) return;

        if (candidateResult.error) {
          throw candidateResult.error;
        }

        const activityResults = [
          positionsResult,
          propositionsResult,
          votesResult,
          committeesResult,
          deliveriesResult,
        ];

        const optionalErrors = [sourcesResult, ...activityResults]
          .map((result) => result.error)
          .filter(Boolean);

        if (optionalErrors.length > 0) {
          setWarning(
            "Parte dos dados documentais está indisponível. O perfil foi calculado, mas fontes e atuação podem aparecer como pendentes até a atualização do banco."
          );
        }

        const activities = activityResults.flatMap(
          (result) => result.error ? [] : (result.data || [])
        );

        const verifiedActivities =
          activities.filter(
            (item: any) =>
              item.verification_status === "verified"
          );

        setCandidate(candidateResult.data);
        setSourceCount(sourcesResult.count || 0);
        setActivityCount(activities.length);
        setVerifiedActivityCount(
          verifiedActivities.length
        );
      } catch (err) {
        console.error(
          "Erro ao calcular completude:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível calcular a completude documental."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [candidateId, reloadKey]);

  const checklist = useMemo<ChecklistItem[]>(() => {
    if (!candidate) return [];

    const isMunicipal =
      candidate.cargo === "Prefeito(a)" ||
      candidate.cargo === "Vice-Prefeito(a)" ||
      candidate.cargo === "Vereador(a)";

    const hasPublicChannel =
      hasValue(candidate.website_url) ||
      hasValue(candidate.instagram_url) ||
      hasValue(candidate.facebook_url) ||
      hasValue(candidate.youtube_url);

    return [
      {
        id: "name",
        label: "Nome completo",
        group: "Identificação",
        complete: hasValue(candidate.name),
        destination: "Ficha → Identificação",
      },
      {
        id: "ballot_name",
        label: "Nome na urna",
        group: "Identificação",
        complete: hasValue(
          candidate.ballot_name
        ),
        destination: "Ficha → Identificação",
      },
      {
        id: "cargo",
        label: "Cargo",
        group: "Identificação",
        complete: hasValue(candidate.cargo),
        destination: "Ficha → Identificação",
      },
      {
        id: "territory",
        label: isMunicipal
          ? "Estado e município"
          : "Estado / abrangência",
        group: "Identificação",
        complete:
          hasValue(candidate.state_uf) &&
          (!isMunicipal ||
            hasValue(candidate.city_name)),
        destination: "Ficha → Identificação",
      },
      {
        id: "party",
        label: "Partido",
        group: "Identificação",
        complete: hasValue(candidate.party),
        destination: "Ficha → Identificação",
      },
      {
        id: "number",
        label: "Número eleitoral",
        group: "Identificação",
        complete: hasValue(candidate.number),
        destination: "Ficha → Identificação",
      },

      {
        id: "photo",
        label: "Foto principal",
        group: "Perfil e mídia",
        complete: hasValue(
          candidate.photo_url
        ),
        destination: "Ficha → Foto e mídia",
      },
      {
        id: "mini_cv",
        label: "Mini-CV",
        group: "Perfil e mídia",
        complete: hasValue(candidate.mini_cv),
        destination: "Ficha → Perfil",
      },
      {
        id: "biography",
        label: "Biografia",
        group: "Perfil e mídia",
        complete: hasValue(
          candidate.biography
        ),
        destination: "Ficha → Perfil",
      },
      {
        id: "political_project",
        label: "Projeto político informado",
        group: "Perfil e mídia",
        complete: hasValue(
          candidate.political_project
        ),
        destination: "Ficha → Perfil",
      },
      {
        id: "proposals",
        label: "Propostas informadas",
        group: "Perfil e mídia",
        complete: hasValue(
          candidate.proposals
        ),
        destination: "Ficha → Perfil",
      },
      {
        id: "priority_areas",
        label: "Áreas prioritárias informadas",
        group: "Perfil e mídia",
        complete: hasValue(
          candidate.priority_areas
        ),
        destination: "Ficha → Perfil",
      },
      {
        id: "public_channel",
        label: "Canal público",
        group: "Perfil e mídia",
        complete: hasPublicChannel,
        destination: "Ficha → Contatos",
        description:
          "Site ou ao menos uma rede social pública.",
      },

      {
        id: "activity",
        label: "Atuação pública documentada",
        group: "Atuação Pública",
        complete: activityCount > 0,
        destination: "Atuação Pública",
        description:
          activityCount > 0
            ? `${activityCount} registro(s) cadastrado(s).`
            : "Nenhum registro cadastrado.",
      },
      {
        id: "verified_activity",
        label:
          "Registro de atuação verificado",
        group: "Atuação Pública",
        complete:
          verifiedActivityCount > 0,
        destination: "Atuação Pública",
        description:
          verifiedActivityCount > 0
            ? `${verifiedActivityCount} registro(s) marcado(s) como verificado(s).`
            : "Nenhum registro de atuação está marcado como verificado.",
      },

      {
        id: "source",
        label: "Fonte documental cadastrada",
        group: "Fontes e verificação",
        complete:
          sourceCount > 0 ||
          hasValue(candidate.source_url),
        destination: "Verificação",
        description:
          sourceCount > 0
            ? `${sourceCount} fonte(s) cadastrada(s) no módulo de verificação.`
            : undefined,
      },
      {
        id: "verified_at",
        label: "Data de verificação",
        group: "Fontes e verificação",
        complete: hasValue(
          candidate.verified_at
        ),
        destination: "Ficha → Fontes",
      },
    ];
  }, [
    candidate,
    sourceCount,
    activityCount,
    verifiedActivityCount,
  ]);

  const completed =
    checklist.filter(
      (item) => item.complete
    ).length;

  const total = checklist.length;

  const percentage =
    total > 0
      ? Math.round((completed / total) * 100)
      : 0;

  const groups = [
    "Identificação",
    "Perfil e mídia",
    "Atuação Pública",
    "Fontes e verificação",
  ];

  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Calculando completude documental...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

          <div>
            <p className="font-bold text-red-800">
              Não foi possível calcular a completude
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                setReloadKey(
                  (current) => current + 1
                )
              }
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {warning && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {warning}
        </p>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-emerald-700" />

              <h3 className="font-bold text-slate-900">
                Completude documental
              </h3>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Este indicador considera apenas o
              preenchimento e a documentação disponíveis
              no cadastro. Não representa avaliação,
              classificação ou qualidade política.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setReloadKey(
                (current) => current + 1
              )
            }
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Recalcular
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[180px_1fr] md:items-center">
          <div className="text-center md:text-left">
            <div className="text-4xl font-black text-slate-950">
              {percentage}%
            </div>

            <div className="mt-1 text-sm font-semibold text-slate-500">
              {completed} de {total} itens
            </div>
          </div>

          <div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>
                Cadastro documental
              </span>

              <span>
                {total - completed} pendência(s)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => {
          const items =
            checklist.filter(
              (item) =>
                item.group === group
            );

          const groupCompleted =
            items.filter(
              (item) => item.complete
            ).length;

          return (
            <div
              key={group}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h4 className="font-bold text-slate-900">
                  {group}
                </h4>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {groupCompleted}/{items.length}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 p-4"
                  >
                    {item.complete ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    )}

                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          item.complete
                            ? "text-slate-700"
                            : "text-slate-900"
                        }`}
                      >
                        {item.label}
                      </p>

                      {item.description && (
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {item.description}
                        </p>
                      )}

                      {!item.complete && (
                        <p className="mt-1 text-xs font-semibold text-amber-700">
                          Resolver em:{" "}
                          {item.destination}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {completed === total && total > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />

            <div>
              <p className="font-bold text-emerald-900">
                Checklist documental concluído
              </p>

              <p className="mt-1 text-sm leading-6 text-emerald-700">
                Todos os itens considerados por este
                checklist estão preenchidos ou
                documentados. Isso não representa
                avaliação ou recomendação política.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
