"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileText,
  Gavel,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Vote,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type TabId =
  | "positions"
  | "propositions"
  | "votes"
  | "committees"
  | "deliveries";

type VerificationStatus =
  | "pending"
  | "verified"
  | "needs_review"
  | "rejected";

type SourceType =
  | "official"
  | "institutional"
  | "informed"
  | "other";

type CandidatePublicActivityProps = {
  candidateId: string;
};

type ActivityRecord = {
  id: string;
  [key: string]: any;
};

const tabs: {
  id: TabId;
  label: string;
  icon: any;
}[] = [
  {
    id: "positions",
    label: "Cargos e mandatos",
    icon: BriefcaseBusiness,
  },
  {
    id: "propositions",
    label: "Proposições",
    icon: FileText,
  },
  {
    id: "votes",
    label: "Votações",
    icon: Vote,
  },
  {
    id: "committees",
    label: "Comissões e funções",
    icon: Landmark,
  },
  {
    id: "deliveries",
    label: "Entregas documentadas",
    icon: CheckCircle2,
  },
];

const tableByTab: Record<TabId, string> = {
  positions: "candidate_public_positions",
  propositions: "candidate_public_propositions",
  votes: "candidate_public_votes",
  committees: "candidate_public_committees",
  deliveries: "candidate_public_deliveries",
};

const verificationLabels: Record<VerificationStatus, string> = {
  pending: "Pendente",
  verified: "Verificado",
  needs_review: "Revisar",
  rejected: "Não confirmado",
};

const sourceTypeLabels: Record<SourceType, string> = {
  official: "Fonte oficial",
  institutional: "Fonte institucional",
  informed: "Informado",
  other: "Outra fonte",
};

const emptyPosition = {
  position_type: "elected_office",
  title: "",
  institution: "",
  country_code: "BR",
  state_uf: "",
  city_name: "",
  start_date: "",
  end_date: "",
  is_current: false,
  description: "",
  source_url: "",
  source_name: "",
  source_type: "official",
  verification_status: "pending",
};

const emptyProposition = {
  proposition_type: "",
  proposition_number: "",
  title: "",
  description: "",
  institution: "",
  role: "",
  subject_areas_text: "",
  presented_at: "",
  status: "",
  official_url: "",
  external_id: "",
  source_name: "",
  source_type: "official",
  verification_status: "pending",
};

const emptyVote = {
  institution: "",
  proposition_reference: "",
  title: "",
  description: "",
  vote_date: "",
  vote_value: "",
  session_reference: "",
  official_url: "",
  external_id: "",
  source_name: "",
  source_type: "official",
  verification_status: "pending",
};

const emptyCommittee = {
  institution: "",
  committee_name: "",
  role: "",
  start_date: "",
  end_date: "",
  is_current: false,
  description: "",
  official_url: "",
  source_name: "",
  source_type: "official",
  verification_status: "pending",
};

const emptyDelivery = {
  title: "",
  description: "",
  institution: "",
  category: "",
  country_code: "BR",
  state_uf: "",
  city_name: "",
  occurred_at: "",
  official_url: "",
  source_name: "",
  source_type: "official",
  verification_status: "pending",
};

function initialForm(tab: TabId) {
  switch (tab) {
    case "positions":
      return { ...emptyPosition };

    case "propositions":
      return { ...emptyProposition };

    case "votes":
      return { ...emptyVote };

    case "committees":
      return { ...emptyCommittee };

    case "deliveries":
      return { ...emptyDelivery };
  }
}

function formatDate(value?: string | null) {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function VerificationBadge({
  status,
}: {
  status?: VerificationStatus | null;
}) {
  const value = status || "pending";

  const classes: Record<VerificationStatus, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    needs_review: "bg-blue-50 text-blue-700 border-blue-200",
    rejected: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[value]}`}
    >
      {verificationLabels[value]}
    </span>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const textareaClass =
  "min-h-[110px] w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

export default function CandidatePublicActivity({
  candidateId,
}: CandidatePublicActivityProps) {
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<TabId>("positions");
  const [records, setRecords] = useState<ActivityRecord[]>([]);

  const [form, setForm] = useState<any>(
    initialForm("positions")
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, candidateId]);

  async function loadRecords() {
    setLoading(true);
    setError("");

    const table = tableByTab[activeTab];

    const { data, error: queryError } = await supabase
      .from(table)
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setRecords([]);
    } else {
      setRecords(data || []);
    }

    setLoading(false);
  }

  function changeTab(tab: TabId) {
    setActiveTab(tab);
    setForm(initialForm(tab));
    setEditingId(null);
    setShowForm(false);
    setMessage("");
    setError("");
  }

  function startNew() {
    setForm(initialForm(activeTab));
    setEditingId(null);
    setShowForm(true);
    setMessage("");
    setError("");
  }

  function cancelForm() {
    setForm(initialForm(activeTab));
    setEditingId(null);
    setShowForm(false);
    setMessage("");
    setError("");
  }

  function updateField(name: string, value: any) {
    setForm((current: any) => ({
      ...current,
      [name]: value,
    }));
  }

  function startEdit(record: ActivityRecord) {
    let editForm: any = {
      ...record,
    };

    if (activeTab === "propositions") {
      editForm.subject_areas_text = Array.isArray(record.subject_areas)
        ? record.subject_areas.join(", ")
        : "";
    }

    setForm(editForm);
    setEditingId(record.id);
    setShowForm(true);
    setMessage("");
    setError("");

    window.setTimeout(() => {
      document
        .getElementById("candidate-public-activity-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function buildPayload() {
    const base: any = {
      candidate_id: candidateId,
    };

    if (activeTab === "positions") {
      return {
        ...base,
        position_type: form.position_type || "public_office",
        title: form.title.trim(),
        institution: form.institution?.trim() || null,
        country_code: form.country_code || "BR",
        state_uf: form.state_uf?.trim().toUpperCase() || null,
        city_name: form.city_name?.trim() || null,
        start_date: form.start_date || null,
        end_date: form.is_current ? null : form.end_date || null,
        is_current: Boolean(form.is_current),
        description: form.description?.trim() || null,
        source_url: form.source_url?.trim() || null,
        source_name: form.source_name?.trim() || null,
        source_type: form.source_type || "official",
        verification_status:
          form.verification_status || "pending",
        verified_at:
          form.verification_status === "verified"
            ? form.verified_at || new Date().toISOString()
            : null,
      };
    }

    if (activeTab === "propositions") {
      const subjectAreas = String(
        form.subject_areas_text || ""
      )
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      return {
        ...base,
        proposition_type:
          form.proposition_type?.trim() || null,
        proposition_number:
          form.proposition_number?.trim() || null,
        title: form.title.trim(),
        description: form.description?.trim() || null,
        institution: form.institution?.trim() || null,
        role: form.role || null,
        subject_areas: subjectAreas,
        presented_at: form.presented_at || null,
        status: form.status?.trim() || null,
        official_url: form.official_url?.trim() || null,
        external_id: form.external_id?.trim() || null,
        source_name: form.source_name?.trim() || null,
        source_type: form.source_type || "official",
        verification_status:
          form.verification_status || "pending",
        verified_at:
          form.verification_status === "verified"
            ? form.verified_at || new Date().toISOString()
            : null,
      };
    }

    if (activeTab === "votes") {
      return {
        ...base,
        institution: form.institution?.trim() || null,
        proposition_reference:
          form.proposition_reference?.trim() || null,
        title: form.title.trim(),
        description: form.description?.trim() || null,
        vote_date: form.vote_date || null,
        vote_value: form.vote_value?.trim() || null,
        session_reference:
          form.session_reference?.trim() || null,
        official_url: form.official_url?.trim() || null,
        external_id: form.external_id?.trim() || null,
        source_name: form.source_name?.trim() || null,
        source_type: form.source_type || "official",
        verification_status:
          form.verification_status || "pending",
        verified_at:
          form.verification_status === "verified"
            ? form.verified_at || new Date().toISOString()
            : null,
      };
    }

    if (activeTab === "committees") {
      return {
        ...base,
        institution: form.institution?.trim() || null,
        committee_name: form.committee_name.trim(),
        role: form.role?.trim() || null,
        start_date: form.start_date || null,
        end_date: form.is_current ? null : form.end_date || null,
        is_current: Boolean(form.is_current),
        description: form.description?.trim() || null,
        official_url: form.official_url?.trim() || null,
        source_name: form.source_name?.trim() || null,
        source_type: form.source_type || "official",
        verification_status:
          form.verification_status || "pending",
        verified_at:
          form.verification_status === "verified"
            ? form.verified_at || new Date().toISOString()
            : null,
      };
    }

    return {
      ...base,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      institution: form.institution?.trim() || null,
      category: form.category?.trim() || null,
      country_code: form.country_code || "BR",
      state_uf: form.state_uf?.trim().toUpperCase() || null,
      city_name: form.city_name?.trim() || null,
      occurred_at: form.occurred_at || null,
      official_url: form.official_url?.trim() || null,
      source_name: form.source_name?.trim() || null,
      source_type: form.source_type || "official",
      verification_status:
        form.verification_status || "pending",
      verified_at:
        form.verification_status === "verified"
          ? form.verified_at || new Date().toISOString()
          : null,
    };
  }

  function validate() {
    if (activeTab === "positions" && !form.title?.trim()) {
      return "Informe o cargo ou mandato.";
    }

    if (
      activeTab === "propositions" &&
      !form.title?.trim()
    ) {
      return "Informe o título da proposição.";
    }

    if (activeTab === "votes" && !form.title?.trim()) {
      return "Informe o título da votação.";
    }

    if (
      activeTab === "committees" &&
      !form.committee_name?.trim()
    ) {
      return "Informe o nome da comissão ou função.";
    }

    if (
      activeTab === "deliveries" &&
      !form.title?.trim()
    ) {
      return "Informe o título do registro.";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    const table = tableByTab[activeTab];
    const payload = buildPayload();

    let operation;

    if (editingId) {
      operation = supabase
        .from(table)
        .update(payload)
        .eq("id", editingId);
    } else {
      operation = supabase.from(table).insert(payload);
    }

    const { error: saveError } = await operation;

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    setMessage(
      editingId
        ? "Registro atualizado com sucesso."
        : "Registro adicionado com sucesso."
    );

    setForm(initialForm(activeTab));
    setEditingId(null);
    setShowForm(false);

    await loadRecords();

    setSaving(false);
  }

  async function deleteRecord(recordId: string) {
    const confirmed = window.confirm(
      "Deseja realmente excluir este registro de atuação pública?"
    );

    if (!confirmed) return;

    setDeletingId(recordId);
    setError("");
    setMessage("");

    const table = tableByTab[activeTab];

    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", recordId)
      .eq("candidate_id", candidateId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage("Registro excluído.");
      await loadRecords();
    }

    setDeletingId(null);
  }

  function recordTitle(record: ActivityRecord) {
    switch (activeTab) {
      case "positions":
        return record.title;

      case "propositions":
        return record.title;

      case "votes":
        return record.title;

      case "committees":
        return record.committee_name;

      case "deliveries":
        return record.title;
    }
  }

  function recordSubtitle(record: ActivityRecord) {
    switch (activeTab) {
      case "positions":
        return [
          record.institution,
          record.is_current
            ? "Atual"
            : record.start_date || record.end_date
            ? `${formatDate(record.start_date)}${
                record.end_date
                  ? ` — ${formatDate(record.end_date)}`
                  : ""
              }`
            : "",
        ]
          .filter(Boolean)
          .join(" • ");

      case "propositions":
        return [
          record.proposition_type,
          record.proposition_number,
          record.institution,
        ]
          .filter(Boolean)
          .join(" • ");

      case "votes":
        return [
          record.institution,
          record.vote_date
            ? formatDate(record.vote_date)
            : "",
          record.vote_value
            ? `Voto: ${record.vote_value}`
            : "",
        ]
          .filter(Boolean)
          .join(" • ");

      case "committees":
        return [
          record.institution,
          record.role,
          record.is_current ? "Atual" : "",
        ]
          .filter(Boolean)
          .join(" • ");

      case "deliveries":
        return [
          record.category,
          record.institution,
          record.occurred_at
            ? formatDate(record.occurred_at)
            : "",
        ]
          .filter(Boolean)
          .join(" • ");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-emerald-700" />

                <h3 className="text-lg font-bold text-slate-900">
                  Atuação Pública
                </h3>
              </div>

              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Registre informações factuais e documentadas sobre
                cargos, proposições, votações, funções e entregas
                relacionadas à atuação pública.
              </p>
            </div>

            <button
              type="button"
              onClick={startNew}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              Adicionar registro
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border-b border-slate-200">
          <div className="flex min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => changeTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-semibold transition ${
                    selected
                      ? "border-emerald-700 bg-emerald-50/60 text-emerald-800"
                      : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5">
          {message && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <Building2 className="mx-auto h-8 w-8 text-slate-400" />

              <h4 className="mt-3 font-semibold text-slate-800">
                Nenhum registro nesta categoria
              </h4>

              <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">
                Adicione apenas informações que possam ser descritas
                de forma factual e, sempre que possível, acompanhadas
                de fonte documental.
              </p>

              <button
                type="button"
                onClick={startNew}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
                Adicionar primeiro registro
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <article
                  key={record.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-900">
                          {recordTitle(record)}
                        </h4>

                        <VerificationBadge
                          status={record.verification_status}
                        />
                      </div>

                      {recordSubtitle(record) && (
                        <p className="mt-1 text-sm text-slate-500">
                          {recordSubtitle(record)}
                        </p>
                      )}

                      {record.description && (
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                          {record.description}
                        </p>
                      )}

                      {(record.source_name ||
                        record.source_url ||
                        record.official_url) && (
                        <div className="mt-3 text-xs text-slate-500">
                          <span className="font-semibold">
                            Fonte:
                          </span>{" "}
                          {record.source_name ||
                            record.official_url ||
                            record.source_url}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(record)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === record.id}
                        onClick={() => deleteRecord(record.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === record.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}

                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <form
          id="candidate-public-activity-form"
          onSubmit={handleSubmit}
          className="rounded-2xl border border-emerald-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h3 className="font-bold text-slate-900">
                {editingId
                  ? "Editar registro"
                  : "Novo registro"}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {
                  tabs.find((tab) => tab.id === activeTab)
                    ?.label
                }
              </p>
            </div>

            <button
              type="button"
              onClick={cancelForm}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 p-5">
            {activeTab === "positions" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Tipo">
                    <select
                      className={inputClass}
                      value={form.position_type}
                      onChange={(e) =>
                        updateField(
                          "position_type",
                          e.target.value
                        )
                      }
                    >
                      <option value="elected_office">
                        Mandato eletivo
                      </option>
                      <option value="public_office">
                        Cargo público
                      </option>
                      <option value="appointed_office">
                        Cargo por nomeação
                      </option>
                      <option value="commission">
                        Comissão
                      </option>
                      <option value="council">
                        Conselho
                      </option>
                      <option value="public_function">
                        Função pública
                      </option>
                      <option value="other">Outro</option>
                    </select>
                  </Field>

                  <Field label="Cargo ou função">
                    <input
                      className={inputClass}
                      value={form.title}
                      onChange={(e) =>
                        updateField("title", e.target.value)
                      }
                      placeholder="Ex.: Deputado Federal"
                    />
                  </Field>

                  <Field label="Órgão / instituição">
                    <input
                      className={inputClass}
                      value={form.institution}
                      onChange={(e) =>
                        updateField(
                          "institution",
                          e.target.value
                        )
                      }
                      placeholder="Ex.: Câmara dos Deputados"
                    />
                  </Field>

                  <Field label="UF">
                    <input
                      className={inputClass}
                      maxLength={2}
                      value={form.state_uf}
                      onChange={(e) =>
                        updateField(
                          "state_uf",
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="DF"
                    />
                  </Field>

                  <Field label="Cidade">
                    <input
                      className={inputClass}
                      value={form.city_name}
                      onChange={(e) =>
                        updateField(
                          "city_name",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Início">
                      <input
                        type="date"
                        className={inputClass}
                        value={form.start_date}
                        onChange={(e) =>
                          updateField(
                            "start_date",
                            e.target.value
                          )
                        }
                      />
                    </Field>

                    <Field label="Fim">
                      <input
                        type="date"
                        className={inputClass}
                        disabled={form.is_current}
                        value={form.end_date}
                        onChange={(e) =>
                          updateField(
                            "end_date",
                            e.target.value
                          )
                        }
                      />
                    </Field>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(form.is_current)}
                    onChange={(e) =>
                      updateField(
                        "is_current",
                        e.target.checked
                      )
                    }
                  />
                  Exerce atualmente
                </label>

                <Field label="Descrição factual">
                  <textarea
                    className={textareaClass}
                    value={form.description}
                    onChange={(e) =>
                      updateField(
                        "description",
                        e.target.value
                      )
                    }
                  />
                </Field>
              </>
            )}

            {activeTab === "propositions" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Tipo de proposição">
                    <input
                      className={inputClass}
                      value={form.proposition_type}
                      onChange={(e) =>
                        updateField(
                          "proposition_type",
                          e.target.value
                        )
                      }
                      placeholder="Ex.: PL, PEC, requerimento"
                    />
                  </Field>

                  <Field label="Número / referência">
                    <input
                      className={inputClass}
                      value={form.proposition_number}
                      onChange={(e) =>
                        updateField(
                          "proposition_number",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Título"
                    className="md:col-span-2"
                  >
                    <input
                      className={inputClass}
                      value={form.title}
                      onChange={(e) =>
                        updateField("title", e.target.value)
                      }
                    />
                  </Field>

                  <Field label="Órgão / instituição">
                    <input
                      className={inputClass}
                      value={form.institution}
                      onChange={(e) =>
                        updateField(
                          "institution",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Participação">
                    <select
                      className={inputClass}
                      value={form.role}
                      onChange={(e) =>
                        updateField("role", e.target.value)
                      }
                    >
                      <option value="">Não informado</option>
                      <option value="author">Autor(a)</option>
                      <option value="coauthor">
                        Coautor(a)
                      </option>
                      <option value="rapporteur">
                        Relator(a)
                      </option>
                      <option value="signatory">
                        Signatário(a)
                      </option>
                      <option value="participant">
                        Participante
                      </option>
                      <option value="other">Outra</option>
                    </select>
                  </Field>

                  <Field label="Data de apresentação">
                    <input
                      type="date"
                      className={inputClass}
                      value={form.presented_at}
                      onChange={(e) =>
                        updateField(
                          "presented_at",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Situação da matéria">
                    <input
                      className={inputClass}
                      value={form.status}
                      onChange={(e) =>
                        updateField("status", e.target.value)
                      }
                    />
                  </Field>

                  <Field
                    label="Áreas temáticas — separadas por vírgula"
                    className="md:col-span-2"
                  >
                    <input
                      className={inputClass}
                      value={form.subject_areas_text}
                      onChange={(e) =>
                        updateField(
                          "subject_areas_text",
                          e.target.value
                        )
                      }
                      placeholder="Ex.: educação, saúde, segurança"
                    />
                  </Field>
                </div>

                <Field label="Descrição">
                  <textarea
                    className={textareaClass}
                    value={form.description}
                    onChange={(e) =>
                      updateField(
                        "description",
                        e.target.value
                      )
                    }
                  />
                </Field>
              </>
            )}

            {activeTab === "votes" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Órgão / instituição">
                    <input
                      className={inputClass}
                      value={form.institution}
                      onChange={(e) =>
                        updateField(
                          "institution",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Referência da matéria">
                    <input
                      className={inputClass}
                      value={form.proposition_reference}
                      onChange={(e) =>
                        updateField(
                          "proposition_reference",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Título da votação"
                    className="md:col-span-2"
                  >
                    <input
                      className={inputClass}
                      value={form.title}
                      onChange={(e) =>
                        updateField("title", e.target.value)
                      }
                    />
                  </Field>

                  <Field label="Data da votação">
                    <input
                      type="date"
                      className={inputClass}
                      value={form.vote_date}
                      onChange={(e) =>
                        updateField(
                          "vote_date",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Voto registrado">
                    <input
                      className={inputClass}
                      value={form.vote_value}
                      onChange={(e) =>
                        updateField(
                          "vote_value",
                          e.target.value
                        )
                      }
                      placeholder="Conforme registro oficial"
                    />
                  </Field>

                  <Field label="Sessão / referência">
                    <input
                      className={inputClass}
                      value={form.session_reference}
                      onChange={(e) =>
                        updateField(
                          "session_reference",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="ID externo">
                    <input
                      className={inputClass}
                      value={form.external_id}
                      onChange={(e) =>
                        updateField(
                          "external_id",
                          e.target.value
                        )
                      }
                    />
                  </Field>
                </div>

                <Field label="Descrição">
                  <textarea
                    className={textareaClass}
                    value={form.description}
                    onChange={(e) =>
                      updateField(
                        "description",
                        e.target.value
                      )
                    }
                  />
                </Field>
              </>
            )}

            {activeTab === "committees" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Comissão / conselho / função">
                    <input
                      className={inputClass}
                      value={form.committee_name}
                      onChange={(e) =>
                        updateField(
                          "committee_name",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Órgão / instituição">
                    <input
                      className={inputClass}
                      value={form.institution}
                      onChange={(e) =>
                        updateField(
                          "institution",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Função exercida">
                    <input
                      className={inputClass}
                      value={form.role}
                      onChange={(e) =>
                        updateField("role", e.target.value)
                      }
                      placeholder="Ex.: Presidente, membro titular"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Início">
                      <input
                        type="date"
                        className={inputClass}
                        value={form.start_date}
                        onChange={(e) =>
                          updateField(
                            "start_date",
                            e.target.value
                          )
                        }
                      />
                    </Field>

                    <Field label="Fim">
                      <input
                        type="date"
                        className={inputClass}
                        disabled={form.is_current}
                        value={form.end_date}
                        onChange={(e) =>
                          updateField(
                            "end_date",
                            e.target.value
                          )
                        }
                      />
                    </Field>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(form.is_current)}
                    onChange={(e) =>
                      updateField(
                        "is_current",
                        e.target.checked
                      )
                    }
                  />
                  Participação atual
                </label>

                <Field label="Descrição">
                  <textarea
                    className={textareaClass}
                    value={form.description}
                    onChange={(e) =>
                      updateField(
                        "description",
                        e.target.value
                      )
                    }
                  />
                </Field>
              </>
            )}

            {activeTab === "deliveries" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Título"
                    className="md:col-span-2"
                  >
                    <input
                      className={inputClass}
                      value={form.title}
                      onChange={(e) =>
                        updateField("title", e.target.value)
                      }
                    />
                  </Field>

                  <Field label="Categoria">
                    <input
                      className={inputClass}
                      value={form.category}
                      onChange={(e) =>
                        updateField(
                          "category",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Órgão / instituição">
                    <input
                      className={inputClass}
                      value={form.institution}
                      onChange={(e) =>
                        updateField(
                          "institution",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="UF">
                    <input
                      className={inputClass}
                      maxLength={2}
                      value={form.state_uf}
                      onChange={(e) =>
                        updateField(
                          "state_uf",
                          e.target.value.toUpperCase()
                        )
                      }
                    />
                  </Field>

                  <Field label="Cidade">
                    <input
                      className={inputClass}
                      value={form.city_name}
                      onChange={(e) =>
                        updateField(
                          "city_name",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Data">
                    <input
                      type="date"
                      className={inputClass}
                      value={form.occurred_at}
                      onChange={(e) =>
                        updateField(
                          "occurred_at",
                          e.target.value
                        )
                      }
                    />
                  </Field>
                </div>

                <Field label="Descrição factual">
                  <textarea
                    className={textareaClass}
                    value={form.description}
                    onChange={(e) =>
                      updateField(
                        "description",
                        e.target.value
                      )
                    }
                  />
                </Field>
              </>
            )}

            <div className="border-t border-slate-200 pt-6">
              <h4 className="font-bold text-slate-900">
                Fonte e verificação
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Sempre que possível, utilize uma fonte oficial ou
                institucional que permita conferir a informação.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Nome da fonte">
                  <input
                    className={inputClass}
                    value={form.source_name || ""}
                    onChange={(e) =>
                      updateField(
                        "source_name",
                        e.target.value
                      )
                    }
                    placeholder="Ex.: Câmara dos Deputados"
                  />
                </Field>

                <Field label="Tipo da fonte">
                  <select
                    className={inputClass}
                    value={form.source_type || "official"}
                    onChange={(e) =>
                      updateField(
                        "source_type",
                        e.target.value
                      )
                    }
                  >
                    {Object.entries(sourceTypeLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field
                  label="URL da fonte"
                  className="md:col-span-2"
                >
                  <input
                    type="url"
                    className={inputClass}
                    value={
                      activeTab === "positions"
                        ? form.source_url || ""
                        : form.official_url || ""
                    }
                    onChange={(e) =>
                      updateField(
                        activeTab === "positions"
                          ? "source_url"
                          : "official_url",
                        e.target.value
                      )
                    }
                    placeholder="https://..."
                  />
                </Field>

                <Field label="Situação da verificação">
                  <select
                    className={inputClass}
                    value={
                      form.verification_status || "pending"
                    }
                    onChange={(e) =>
                      updateField(
                        "verification_status",
                        e.target.value
                      )
                    }
                  >
                    <option value="pending">
                      Pendente
                    </option>
                    <option value="verified">
                      Verificado
                    </option>
                    <option value="needs_review">
                      Precisa de revisão
                    </option>
                    <option value="rejected">
                      Não confirmado
                    </option>
                  </select>
                </Field>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cancelForm}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {editingId
                ? "Salvar alterações"
                : "Adicionar registro"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
