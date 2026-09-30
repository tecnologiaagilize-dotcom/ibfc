"use client";

import { useState } from "react";
import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  Eye,
  EyeOff,
  FileCheck2,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type ReviewStatus =
  | "draft"
  | "awaiting_completion"
  | "in_review"
  | "approved";

type PublicationStatus = "draft" | "published";

type Props = {
  candidateId: string;
  initialReviewStatus?: ReviewStatus | null;
  initialPublicationStatus?: PublicationStatus | null;
};

const reviewSteps: {
  value: ReviewStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "draft",
    label: "Rascunho",
    description:
      "Cadastro ainda em preparação pela equipe administrativa.",
  },
  {
    value: "awaiting_completion",
    label: "Aguardando preenchimento",
    description:
      "Informações complementares foram solicitadas ao candidato ou à equipe responsável.",
  },
  {
    value: "in_review",
    label: "Em revisão",
    description:
      "O conteúdo recebido está sendo conferido e documentado.",
  },
  {
    value: "approved",
    label: "Aprovado",
    description:
      "O cadastro passou pelo fluxo interno de revisão.",
  },
];

function ReviewIcon({
  status,
}: {
  status: ReviewStatus;
}) {
  if (status === "approved") {
    return <CheckCircle2 className="h-5 w-5" />;
  }

  if (status === "in_review") {
    return <FileCheck2 className="h-5 w-5" />;
  }

  if (status === "awaiting_completion") {
    return <Clock3 className="h-5 w-5" />;
  }

  return <CircleDashed className="h-5 w-5" />;
}

export default function CandidateReviewPanel({
  candidateId,
  initialReviewStatus,
  initialPublicationStatus,
}: Props) {
  const supabase = createClient();

  const [reviewStatus, setReviewStatus] =
    useState<ReviewStatus>(
      initialReviewStatus || "draft"
    );

  const [publicationStatus, setPublicationStatus] =
    useState<PublicationStatus>(
      initialPublicationStatus === "published"
        ? "published"
        : "draft"
    );

  const [savingReview, setSavingReview] =
    useState(false);

  const [savingPublication, setSavingPublication] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function updateReviewStatus(
    nextStatus: ReviewStatus
  ) {
    if (nextStatus === reviewStatus) return;

    setSavingReview(true);
    setMessage("");
    setError("");

    const previousStatus = reviewStatus;

    setReviewStatus(nextStatus);

    const { error: updateError } = await supabase
      .from("candidates")
      .update({
        review_status: nextStatus,
      })
      .eq("id", candidateId);

    if (updateError) {
      setReviewStatus(previousStatus);
      setError(
        `Não foi possível alterar a revisão: ${updateError.message}`
      );
      setSavingReview(false);
      return;
    }

    setMessage(
      `Situação de revisão alterada para "${
        reviewSteps.find(
          (item) => item.value === nextStatus
        )?.label || nextStatus
      }".`
    );

    setSavingReview(false);
  }

  async function updatePublicationStatus(
    nextStatus: PublicationStatus
  ) {
    if (nextStatus === publicationStatus) return;

    setSavingPublication(true);
    setMessage("");
    setError("");

    const previousStatus = publicationStatus;

    setPublicationStatus(nextStatus);

    const { error: updateError } = await supabase
      .from("candidates")
      .update({
        status: nextStatus,
      })
      .eq("id", candidateId);

    if (updateError) {
      setPublicationStatus(previousStatus);
      setError(
        `Não foi possível alterar a publicação: ${updateError.message}`
      );
      setSavingPublication(false);
      return;
    }

    setMessage(
      nextStatus === "published"
        ? "Candidato marcado como publicado."
        : "Candidato retirado da publicação."
    );

    setSavingPublication(false);
  }

  const approved = reviewStatus === "approved";
  const published =
    publicationStatus === "published";

  return (
    <div className="space-y-5">
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  Fluxo de revisão
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Controle interno de preparação,
                  preenchimento e conferência do cadastro.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-5">
            {reviewSteps.map((step, index) => {
              const selected =
                reviewStatus === step.value;

              return (
                <button
                  key={step.value}
                  type="button"
                  disabled={savingReview}
                  onClick={() =>
                    updateReviewStatus(step.value)
                  }
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        selected
                          ? "bg-blue-700 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {savingReview && selected ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ReviewIcon
                          status={step.value}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Etapa {index + 1}
                        </span>

                        {selected && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            Atual
                          </span>
                        )}
                      </div>

                      <h4 className="mt-1 font-bold text-slate-900">
                        {step.label}
                      </h4>

                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-start gap-3">
              <div
                className={`rounded-xl p-2.5 ${
                  published
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {published ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  Publicação
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Define separadamente a visibilidade
                  pública do cadastro.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div
              className={`rounded-2xl border p-4 ${
                published
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Situação atual
              </p>

              <div className="mt-2 flex items-center gap-2">
                {published ? (
                  <Eye className="h-5 w-5 text-emerald-700" />
                ) : (
                  <EyeOff className="h-5 w-5 text-slate-500" />
                )}

                <span
                  className={`text-lg font-bold ${
                    published
                      ? "text-emerald-800"
                      : "text-slate-700"
                  }`}
                >
                  {published
                    ? "Publicado"
                    : "Não publicado"}
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {published
                  ? "O cadastro está marcado para exibição nas áreas públicas que utilizam candidatos publicados."
                  : "O cadastro permanece disponível no ambiente administrativo, mas não está marcado para publicação."}
              </p>
            </div>

            {!approved && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">
                  Revisão ainda não aprovada
                </p>

                <p className="mt-1 text-sm leading-5 text-amber-700">
                  A publicação é independente da
                  aprovação. O sistema não altera uma
                  situação automaticamente.
                </p>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {!published ? (
                <button
                  type="button"
                  disabled={savingPublication}
                  onClick={() =>
                    updatePublicationStatus("published")
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPublication ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}

                  Publicar
                </button>
              ) : (
                <button
                  type="button"
                  disabled={savingPublication}
                  onClick={() =>
                    updatePublicationStatus("draft")
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPublication ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}

                  Retirar da publicação
                </button>
              )}

              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <RefreshCw className="h-3.5 w-3.5" />
                Revisão e publicação são controles
                independentes
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Situação editorial
            </p>

            <p className="mt-1 text-lg font-bold">
              {reviewSteps.find(
                (item) => item.value === reviewStatus
              )?.label}
              {" • "}
              {published
                ? "Publicado"
                : "Não publicado"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                approved
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/10 text-slate-300"
              }`}
            >
              {approved
                ? "Revisão aprovada"
                : "Revisão não aprovada"}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                published
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/10 text-slate-300"
              }`}
            >
              {published
                ? "Visível publicamente"
                : "Fora da publicação"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
