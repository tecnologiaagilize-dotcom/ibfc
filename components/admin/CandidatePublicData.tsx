"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  ExternalLink,
  Link2,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Provider = {
  id: string;
  code: string;
  name: string;
  institution: string | null;
  provider_type: string;
  base_url: string | null;
  documentation_url: string | null;
  active: boolean;
};

type ExternalIdentity = {
  id: string;
  candidate_id: string;
  provider_id: string;
  external_id: string;
  external_name: string | null;
  external_url: string | null;
  metadata: Record<string, unknown> | null;
  verification_status:
    | "pending"
    | "verified"
    | "needs_review"
    | "rejected";
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

type IdentityWithProvider = ExternalIdentity & {
  provider?: Provider;
};

type SyncRun = {
  id: string;
  provider_id?: string | null;
  candidate_id?: string | null;
  status?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
  records_found?: number | null;
  records_collected?: number | null;
  records_imported?: number | null;
  records_inserted?: number | null;
  records_updated?: number | null;
  records_skipped?: number | null;
  records_errors?: number | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type SyncResponse = {
  ok?: boolean;
  error?: string;
  detail?: string;
  message?: string;
  result?: Record<string, unknown>;
};

function formatSyncDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function readMetric(
  source: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  if (!source) return 0;

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim() &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }

  return 0;
}

function syncMetric(run: SyncRun | null, keys: string[]) {
  if (!run) return 0;

  const direct = readMetric(run, keys);
  if (direct !== 0) return direct;

  if (
    run.metadata &&
    typeof run.metadata === "object" &&
    !Array.isArray(run.metadata)
  ) {
    return readMetric(run.metadata, keys);
  }

  return 0;
}

type Props = {
  candidateId: string;
};

type FormState = {
  provider_id: string;
  external_id: string;
  external_name: string;
  external_url: string;
  verification_status:
    | "pending"
    | "verified"
    | "needs_review"
    | "rejected";
};

const EMPTY_FORM: FormState = {
  provider_id: "",
  external_id: "",
  external_name: "",
  external_url: "",
  verification_status: "pending",
};

const STATUS_LABELS: Record<
  ExternalIdentity["verification_status"],
  string
> = {
  pending: "Pendente",
  verified: "Verificado",
  needs_review: "Requer revisão",
  rejected: "Rejeitado",
};

function statusStyle(
  status: ExternalIdentity["verification_status"]
) {
  switch (status) {
    case "verified":
      return {
        background: "#ecfdf3",
        border: "#abefc6",
        color: "#027a48",
      };

    case "needs_review":
      return {
        background: "#fffaeb",
        border: "#fedf89",
        color: "#b54708",
      };

    case "rejected":
      return {
        background: "#fef3f2",
        border: "#fecdca",
        color: "#b42318",
      };

    default:
      return {
        background: "#f2f4f7",
        border: "#d0d5dd",
        color: "#475467",
      };
  }
}

export default function CandidatePublicData({
  candidateId,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [identities, setIdentities] = useState<
    IdentityWithProvider[]
  >([]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [lastCamaraRun, setLastCamaraRun] =
    useState<SyncRun | null>(null);
  const [syncingCamara, setSyncingCamara] = useState(false);
  const [lastCamaraSyncResult, setLastCamaraSyncResult] =
    useState<Record<string, unknown> | null>(null);

  const [lastSenadoRun, setLastSenadoRun] =
    useState<SyncRun | null>(null);
  const [syncingSenado, setSyncingSenado] = useState(false);
  const [lastSenadoSyncResult, setLastSenadoSyncResult] =
    useState<Record<string, unknown> | null>(null);

  const [lastTseRun, setLastTseRun] =
    useState<SyncRun | null>(null);
  const [syncingTse, setSyncingTse] = useState(false);
  const [lastTseSyncResult, setLastTseSyncResult] =
    useState<Record<string, unknown> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [providersResult, identitiesResult] =
        await Promise.all([
          supabase
            .from("mfb_public_data_providers")
            .select(
              `
                id,
                code,
                name,
                institution,
                provider_type,
                base_url,
                documentation_url,
                active
              `
            )
            .eq("active", true)
            .order("name", {
              ascending: true,
            }),

          supabase
            .from("candidate_external_identities")
            .select(
              `
                id,
                candidate_id,
                provider_id,
                external_id,
                external_name,
                external_url,
                metadata,
                verification_status,
                verified_at,
                created_at,
                updated_at
              `
            )
            .eq("candidate_id", candidateId)
            .order("created_at", {
              ascending: true,
            }),
        ]);

      if (providersResult.error) {
        throw providersResult.error;
      }

      if (identitiesResult.error) {
        throw identitiesResult.error;
      }

      const providerList =
        (providersResult.data || []) as Provider[];

      const identityList =
        (identitiesResult.data || []) as ExternalIdentity[];

      const joined: IdentityWithProvider[] =
        identityList.map((identity) => ({
          ...identity,
          provider: providerList.find(
            (provider) =>
              provider.id === identity.provider_id
          ),
        }));

      setProviders(providerList);
      setIdentities(joined);

      const camaraProvider =
        providerList.find(
          (provider) =>
            provider.code === "camara_dados_abertos"
        ) || null;

      if (camaraProvider) {
        const { data: runData, error: runError } =
          await supabase
            .from("mfb_public_data_sync_runs")
            .select("*")
            .eq("candidate_id", candidateId)
            .eq("provider_id", camaraProvider.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (runError) {
          console.error(
            "Erro ao carregar última sincronização da Câmara:",
            runError
          );
          setLastCamaraRun(null);
        } else {
          setLastCamaraRun(
            (runData || null) as SyncRun | null
          );
        }
      } else {
        setLastCamaraRun(null);
      }

      const senadoProvider =
        providerList.find(
          (provider) => provider.code === "senado"
        ) || null;

      if (senadoProvider) {
        const { data: runData, error: runError } =
          await supabase
            .from("mfb_public_data_sync_runs")
            .select("*")
            .eq("candidate_id", candidateId)
            .eq("provider_id", senadoProvider.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (runError) {
          console.error(
            "Erro ao carregar última sincronização do Senado:",
            runError
          );
          setLastSenadoRun(null);
        } else {
          setLastSenadoRun(
            (runData || null) as SyncRun | null
          );
        }
      } else {
        setLastSenadoRun(null);
      }

      const tseProvider =
        providerList.find(
          (provider) => provider.code === "tse"
        ) || null;

      if (tseProvider) {
        const { data: runData, error: runError } =
          await supabase
            .from("mfb_public_data_sync_runs")
            .select("*")
            .eq("candidate_id", candidateId)
            .eq("provider_id", tseProvider.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (runError) {
          console.error(
            "Erro ao carregar última sincronização do TSE:",
            runError
          );
          setLastTseRun(null);
        } else {
          setLastTseRun(
            (runData || null) as SyncRun | null
          );
        }
      } else {
        setLastTseRun(null);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Não foi possível carregar os dados públicos."
      );
    } finally {
      setLoading(false);
    }
  }, [candidateId, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
  }

  function startEdit(identity: IdentityWithProvider) {
    setEditingId(identity.id);

    setForm({
      provider_id: identity.provider_id,
      external_id: identity.external_id,
      external_name: identity.external_name || "",
      external_url: identity.external_url || "",
      verification_status: identity.verification_status,
    });

    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!form.provider_id) {
      setError("Selecione a fonte de dados.");
      return;
    }

    if (!form.external_id.trim()) {
      setError("Informe o identificador externo.");
      return;
    }

    setSaving(true);

    try {
      const verifiedAt =
        form.verification_status === "verified"
          ? new Date().toISOString()
          : null;

      const payload = {
        candidate_id: candidateId,
        provider_id: form.provider_id,
        external_id: form.external_id.trim(),
        external_name:
          form.external_name.trim() || null,
        external_url:
          form.external_url.trim() || null,
        verification_status:
          form.verification_status,
        verified_at: verifiedAt,
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("candidate_external_identities")
          .update(payload)
          .eq("id", editingId);

        if (updateError) {
          throw updateError;
        }

        setSuccess("Identidade externa atualizada.");
      } else {
        const { error: insertError } = await supabase
          .from("candidate_external_identities")
          .insert(payload);

        if (insertError) {
          throw insertError;
        }

        setSuccess("Identidade externa vinculada.");
      }

      setEditingId(null);
      setForm(EMPTY_FORM);

      await loadData();
    } catch (err: any) {
      if (
        err?.code === "23505" ||
        String(err?.message || "").includes(
          "duplicate key"
        )
      ) {
        setError(
          "Este identificador já está vinculado a este candidato nessa fonte."
        );
      } else {
        setError(
          err?.message ||
            "Não foi possível salvar a identidade externa."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(identityId: string) {
    const confirmed = window.confirm(
      "Deseja remover este vínculo com a fonte externa?"
    );

    if (!confirmed) return;

    setDeletingId(identityId);
    setError(null);
    setSuccess(null);

    try {
      const { error: deleteError } = await supabase
        .from("candidate_external_identities")
        .delete()
        .eq("id", identityId);

      if (deleteError) {
        throw deleteError;
      }

      if (editingId === identityId) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }

      setSuccess("Vínculo removido.");

      await loadData();
    } catch (err: any) {
      setError(
        err?.message ||
          "Não foi possível remover o vínculo."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const camaraProvider =
    providers.find(
      (provider) =>
        provider.code === "camara_dados_abertos"
    ) || null;

  const camaraIdentity =
    identities.find(
      (identity) =>
        identity.provider?.code ===
        "camara_dados_abertos"
    ) || null;

  async function handleCamaraSync() {
    const confirmed = window.confirm(
      "Executar a sincronização manual com a Câmara dos Deputados? Os registros coletados irão para a fila administrativa e não serão publicados automaticamente."
    );

    if (!confirmed) return;

    setSyncingCamara(true);
    setError(null);
    setSuccess(null);
    setLastCamaraSyncResult(null);

    try {
      const response = await fetch(
        `/api/admin/public-data/camara/sync/${candidateId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            externalIdentityId: camaraIdentity?.id || null,
            deputadoId: camaraIdentity?.external_id || null,
          }),
        }
      );

      const raw = await response.text();
      let payload: SyncResponse = {};

      if (raw) {
        try {
          payload = JSON.parse(raw) as SyncResponse;
        } catch {
          payload = { error: raw };
        }
      }

      if (!response.ok || payload.ok === false) {
        throw new Error(
          payload.error ||
            payload.detail ||
            "Não foi possível sincronizar os dados da Câmara."
        );
      }

      setLastCamaraSyncResult(payload.result || null);
      setSuccess(
        payload.message ||
          "Sincronização da Câmara concluída. Os dados permanecem sujeitos à revisão administrativa."
      );
      const camaraErrors = payload.result?.errorMessages;
      if (Array.isArray(camaraErrors) && camaraErrors.length > 0) {
        setError(`Coleta parcial da Câmara: ${camaraErrors.slice(0, 3).join(" | ")}`);
      }

      await loadData();
    } catch (err: any) {
      setError(
        err?.message ||
          "Não foi possível sincronizar os dados da Câmara."
      );
    } finally {
      setSyncingCamara(false);
    }
  }

  const senadoProvider =
    providers.find(
      (provider) => provider.code === "senado"
    ) || null;

  const senadoIdentity =
    identities.find(
      (identity) => identity.provider?.code === "senado"
    ) || null;

  async function handleSenadoSync() {
    const confirmed = window.confirm(
      "Executar a sincronização manual com o Senado Federal? Os registros coletados irão para a fila administrativa e não serão publicados automaticamente."
    );

    if (!confirmed) return;

    setSyncingSenado(true);
    setError(null);
    setSuccess(null);
    setLastSenadoSyncResult(null);

    try {
      const response = await fetch(
        `/api/admin/public-data/senado/sync/${candidateId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            externalIdentityId: senadoIdentity?.id || null,
            senadorId: senadoIdentity?.external_id || null,
          }),
        }
      );

      const raw = await response.text();
      let payload: SyncResponse = {};

      if (raw) {
        try {
          payload = JSON.parse(raw) as SyncResponse;
        } catch {
          payload = { error: raw };
        }
      }

      if (!response.ok || payload.ok === false) {
        throw new Error(
          payload.error ||
            payload.detail ||
            "Não foi possível sincronizar os dados do Senado."
        );
      }

      setLastSenadoSyncResult(payload.result || null);
      setSuccess(
        payload.message ||
          "Sincronização do Senado concluída. Os dados permanecem sujeitos à revisão administrativa."
      );
      const senadoErrors = payload.result?.errorMessages;
      if (Array.isArray(senadoErrors) && senadoErrors.length > 0) {
        setError(`Coleta parcial do Senado: ${senadoErrors.slice(0, 3).join(" | ")}`);
      }

      await loadData();
    } catch (err: any) {
      setError(
        err?.message ||
          "Não foi possível sincronizar os dados do Senado."
      );
    } finally {
      setSyncingSenado(false);
    }
  }

  const tseProvider =
    providers.find(
      (provider) => provider.code === "tse"
    ) || null;

  const tseIdentity =
    identities.find(
      (identity) => identity.provider?.code === "tse"
    ) || null;

  async function handleTseSync() {
    const confirmed = window.confirm(
      "Executar a sincronização manual com o TSE? Os dados eleitorais coletados irão para a fila administrativa e não serão publicados automaticamente."
    );

    if (!confirmed) return;

    setSyncingTse(true);
    setError(null);
    setSuccess(null);
    setLastTseSyncResult(null);

    try {
      const response = await fetch(
        `/api/admin/public-data/tse/sync/${candidateId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            externalIdentityId: tseIdentity?.id || null,
            sqCandidato: tseIdentity?.external_id || null,
          }),
        }
      );

      const raw = await response.text();
      let payload: SyncResponse = {};

      if (raw) {
        try {
          payload = JSON.parse(raw) as SyncResponse;
        } catch {
          payload = { error: raw };
        }
      }

      if (!response.ok || payload.ok === false) {
        throw new Error(
          payload.error ||
            payload.detail ||
            "Não foi possível sincronizar os dados do TSE."
        );
      }

      setLastTseSyncResult(payload.result || null);
      setSuccess(
        payload.message ||
          "Sincronização do TSE concluída. Os dados permanecem sujeitos à revisão administrativa."
      );

      await loadData();
    } catch (err: any) {
      setError(
        err?.message ||
          "Não foi possível sincronizar os dados do TSE."
      );
    } finally {
      setSyncingTse(false);
    }
  }

  const collected = lastCamaraSyncResult
    ? readMetric(lastCamaraSyncResult, [
        "collected",
        "recordsFound",
        "records_found",
        "recordsCollected",
        "records_collected",
      ])
    : syncMetric(lastCamaraRun, [
        "records_found",
        "records_collected",
        "collected",
      ]);

  const inserted = lastCamaraSyncResult
    ? readMetric(lastCamaraSyncResult, [
        "inserted",
        "recordsInserted",
        "records_inserted",
        "recordsImported",
        "records_imported",
      ])
    : syncMetric(lastCamaraRun, [
        "records_inserted",
        "records_imported",
        "inserted",
      ]);

  const updated = lastCamaraSyncResult
    ? readMetric(lastCamaraSyncResult, [
        "updated",
        "recordsUpdated",
        "records_updated",
      ])
    : syncMetric(lastCamaraRun, [
        "records_updated",
        "updated",
      ]);

  const skipped = lastCamaraSyncResult
    ? readMetric(lastCamaraSyncResult, [
        "skipped",
        "recordsSkipped",
        "records_skipped",
      ])
    : syncMetric(lastCamaraRun, [
        "records_skipped",
        "skipped",
      ]);

  const errors = lastCamaraSyncResult
    ? readMetric(lastCamaraSyncResult, [
        "errors",
        "recordsErrors",
        "records_errors",
      ])
    : syncMetric(lastCamaraRun, [
        "records_errors",
        "errors",
      ]);

  const senadoCollected = lastSenadoSyncResult
    ? readMetric(lastSenadoSyncResult, [
        "collected",
        "recordsFound",
        "records_found",
        "recordsCollected",
        "records_collected",
      ])
    : syncMetric(lastSenadoRun, [
        "records_found",
        "records_collected",
        "collected",
      ]);

  const senadoInserted = lastSenadoSyncResult
    ? readMetric(lastSenadoSyncResult, [
        "inserted",
        "recordsInserted",
        "records_inserted",
        "recordsImported",
        "records_imported",
      ])
    : syncMetric(lastSenadoRun, [
        "records_inserted",
        "records_imported",
        "inserted",
      ]);

  const senadoUpdated = lastSenadoSyncResult
    ? readMetric(lastSenadoSyncResult, [
        "updated",
        "recordsUpdated",
        "records_updated",
      ])
    : syncMetric(lastSenadoRun, [
        "records_updated",
        "updated",
      ]);

  const senadoSkipped = lastSenadoSyncResult
    ? readMetric(lastSenadoSyncResult, [
        "skipped",
        "recordsSkipped",
        "records_skipped",
      ])
    : syncMetric(lastSenadoRun, [
        "records_skipped",
        "skipped",
      ]);

  const senadoErrors = lastSenadoSyncResult
    ? readMetric(lastSenadoSyncResult, [
        "errors",
        "recordsErrors",
        "records_errors",
      ])
    : syncMetric(lastSenadoRun, [
        "records_errors",
        "errors",
      ]);

  const tseCollected = lastTseSyncResult
    ? readMetric(lastTseSyncResult, [
        "collected",
        "recordsFound",
        "records_found",
        "recordsCollected",
        "records_collected",
      ])
    : syncMetric(lastTseRun, [
        "records_found",
        "records_collected",
        "collected",
      ]);

  const tseInserted = lastTseSyncResult
    ? readMetric(lastTseSyncResult, [
        "inserted",
        "recordsInserted",
        "records_inserted",
        "recordsImported",
        "records_imported",
      ])
    : syncMetric(lastTseRun, [
        "records_inserted",
        "records_imported",
        "inserted",
      ]);

  const tseUpdated = lastTseSyncResult
    ? readMetric(lastTseSyncResult, [
        "updated",
        "recordsUpdated",
        "records_updated",
      ])
    : syncMetric(lastTseRun, [
        "records_updated",
        "updated",
      ]);

  const tseSkipped = lastTseSyncResult
    ? readMetric(lastTseSyncResult, [
        "skipped",
        "recordsSkipped",
        "records_skipped",
      ])
    : syncMetric(lastTseRun, [
        "records_skipped",
        "skipped",
      ]);

  const tseErrors = lastTseSyncResult
    ? readMetric(lastTseSyncResult, [
        "errors",
        "recordsErrors",
        "records_errors",
      ])
    : syncMetric(lastTseRun, [
        "records_errors",
        "errors",
      ]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 22,
          color: "#667085",
        }}
      >
        <Loader2
          size={20}
          style={{
            animation: "spin 1s linear infinite",
          }}
        />

        Carregando dados públicos...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 22,
      }}
    >
      <div
        style={{
          padding: 18,
          border: "1px solid #d1e9ff",
          borderRadius: 12,
          background: "#f5fbff",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <Database
            size={22}
            style={{
              color: "#175cd3",
              flexShrink: 0,
              marginTop: 2,
            }}
          />

          <div>
            <strong
              style={{
                color: "#1849a9",
              }}
            >
              Central de Dados Públicos
            </strong>

            <p
              style={{
                margin: "5px 0 0",
                color: "#475467",
                lineHeight: 1.6,
                fontSize: 14,
              }}
            >
              Vincule o cadastro do candidato aos
              identificadores utilizados por fontes
              públicas. Nesta etapa nenhum dado é
              importado ou publicado automaticamente.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            gap: 9,
            alignItems: "flex-start",
            padding: 13,
            borderRadius: 10,
            background: "#fef3f2",
            border: "1px solid #fecdca",
            color: "#b42318",
          }}
        >
          <AlertCircle
            size={18}
            style={{
              flexShrink: 0,
              marginTop: 1,
            }}
          />

          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          style={{
            display: "flex",
            gap: 9,
            alignItems: "center",
            padding: 13,
            borderRadius: 10,
            background: "#ecfdf3",
            border: "1px solid #abefc6",
            color: "#027a48",
          }}
        >
          <CheckCircle2 size={18} />

          <span>{success}</span>
        </div>
      )}

      <section
        style={{
          padding: 20,
          border: "1px solid #e4e7ec",
          borderRadius: 14,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>
              Câmara dos Deputados
            </h3>
            <p
              style={{
                margin: "5px 0 0",
                color: "#667085",
                fontSize: 13,
                lineHeight: 1.6,
                maxWidth: 720,
              }}
            >
              Busca uma amostra recente na fonte oficial da Câmara.
              Os registros recebidos permanecem na fila de
              conferência antes de eventual incorporação à
              Atuação Pública.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            disabled={
              syncingCamara ||
              !camaraProvider
            }
            onClick={() => void handleCamaraSync()}
            title={
              camaraIdentity
                ? "Executar sincronização manual da Câmara"
                : "Localizar pelo nome e UF e sincronizar"
            }
          >
            {syncingCamara ? (
              <>
                <Loader2 size={16} />
                Sincronizando...
              </>
            ) : (
              <>
                <Play size={16} />
                Sincronizar Câmara
              </>
            )}
          </button>
        </div>

        {!camaraProvider ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 10,
              border: "1px solid #fedf89",
              background: "#fffaeb",
              color: "#b54708",
              fontSize: 13,
            }}
          >
            O provedor da Câmara não está ativo na Central
            de Dados Públicos.
          </div>
        ) : !camaraIdentity ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 10,
              border: "1px dashed #d0d5dd",
              background: "#fcfcfd",
              color: "#475467",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Ao sincronizar, o MFB tentará identificar o deputado pelo nome e UF.
            Se não houver correspondência única, informe o código oficial no vínculo abaixo.
          </div>
        ) : (
          <>
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <div style={{ padding: 13, border: "1px solid #e4e7ec", borderRadius: 10, background: "#f9fafb" }}>
                <div style={{ color: "#667085", fontSize: 12, fontWeight: 700 }}>
                  ID na Câmara
                </div>
                <div style={{ marginTop: 4, color: "#101828", fontWeight: 800 }}>
                  {camaraIdentity.external_id}
                </div>
              </div>

              <div style={{ padding: 13, border: "1px solid #e4e7ec", borderRadius: 10, background: "#f9fafb" }}>
                <div style={{ color: "#667085", fontSize: 12, fontWeight: 700 }}>
                  Última execução
                </div>
                <div style={{ marginTop: 4, color: "#101828", fontWeight: 800 }}>
                  {formatSyncDate(
                    lastCamaraRun?.finished_at ||
                      lastCamaraRun?.started_at ||
                      lastCamaraRun?.created_at
                  )}
                </div>
              </div>

              <div style={{ padding: 13, border: "1px solid #e4e7ec", borderRadius: 10, background: "#f9fafb" }}>
                <div style={{ color: "#667085", fontSize: 12, fontWeight: 700 }}>
                  Situação
                </div>
                <div style={{ marginTop: 4, color: "#101828", fontWeight: 800 }}>
                  {lastCamaraRun?.status || "Ainda não executada"}
                </div>
              </div>
            </div>

            {(lastCamaraRun || lastCamaraSyncResult) && (
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  ["Coletados", collected],
                  ["Inseridos", inserted],
                  ["Atualizados", updated],
                  ["Ignorados", skipped],
                  ["Erros", errors],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    style={{
                      padding: 12,
                      border: "1px solid #e4e7ec",
                      borderRadius: 10,
                      background: "#fff",
                    }}
                  >
                    <div style={{ color: "#667085", fontSize: 12 }}>
                      {label}
                    </div>
                    <div style={{ marginTop: 3, color: "#101828", fontSize: 20, fontWeight: 900 }}>
                      {String(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {lastCamaraRun?.error_message && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #fecdca",
                  background: "#fef3f2",
                  color: "#b42318",
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                <strong>Última ocorrência:</strong>{" "}
                {lastCamaraRun.error_message}
              </div>
            )}
          </>
        )}
      </section>

      <section
        style={{
          padding: 20,
          border: "1px solid #e4e7ec",
          borderRadius: 14,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>
              Senado Federal
            </h3>
            <p
              style={{
                margin: "5px 0 0",
                color: "#667085",
                fontSize: 13,
                lineHeight: 1.6,
                maxWidth: 720,
              }}
            >
              Busca dados na fonte oficial do Senado.
              Os registros recebidos permanecem na fila de
              conferência antes de eventual incorporação à
              Atuação Pública.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            disabled={
              syncingSenado ||
              !senadoProvider
            }
            onClick={() => void handleSenadoSync()}
            title={
              senadoIdentity
                ? "Executar sincronização manual do Senado"
                : "Localizar pelo nome e UF e sincronizar"
            }
          >
            {syncingSenado ? (
              <>
                <Loader2 size={16} />
                Sincronizando...
              </>
            ) : (
              <>
                <Play size={16} />
                Sincronizar Senado
              </>
            )}
          </button>
        </div>

        {!senadoProvider ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 10,
              border: "1px solid #fedf89",
              background: "#fffaeb",
              color: "#b54708",
              fontSize: 13,
            }}
          >
            O provedor do Senado não está ativo na Central
            de Dados Públicos. Execute primeiro o SQL de
            cadastro do provedor <strong>senado</strong>.
          </div>
        ) : !senadoIdentity ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 10,
              border: "1px dashed #d0d5dd",
              background: "#fcfcfd",
              color: "#475467",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Ao sincronizar, o MFB tentará identificar o senador em exercício pelo nome e UF.
            Se não houver correspondência única, informe o código parlamentar oficial no vínculo abaixo.
          </div>
        ) : (
          <>
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <div style={{ padding: 13, border: "1px solid #e4e7ec", borderRadius: 10, background: "#f9fafb" }}>
                <div style={{ color: "#667085", fontSize: 12, fontWeight: 700 }}>
                  ID no Senado
                </div>
                <div style={{ marginTop: 4, color: "#101828", fontWeight: 800 }}>
                  {senadoIdentity.external_id}
                </div>
              </div>

              <div style={{ padding: 13, border: "1px solid #e4e7ec", borderRadius: 10, background: "#f9fafb" }}>
                <div style={{ color: "#667085", fontSize: 12, fontWeight: 700 }}>
                  Última execução
                </div>
                <div style={{ marginTop: 4, color: "#101828", fontWeight: 800 }}>
                  {formatSyncDate(
                    lastSenadoRun?.finished_at ||
                      lastSenadoRun?.started_at ||
                      lastSenadoRun?.created_at
                  )}
                </div>
              </div>

              <div style={{ padding: 13, border: "1px solid #e4e7ec", borderRadius: 10, background: "#f9fafb" }}>
                <div style={{ color: "#667085", fontSize: 12, fontWeight: 700 }}>
                  Situação
                </div>
                <div style={{ marginTop: 4, color: "#101828", fontWeight: 800 }}>
                  {lastSenadoRun?.status || "Ainda não executada"}
                </div>
              </div>
            </div>

            {(lastSenadoRun || lastSenadoSyncResult) && (
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  ["Coletados", senadoCollected],
                  ["Inseridos", senadoInserted],
                  ["Atualizados", senadoUpdated],
                  ["Ignorados", senadoSkipped],
                  ["Erros", senadoErrors],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    style={{
                      padding: 12,
                      border: "1px solid #e4e7ec",
                      borderRadius: 10,
                      background: "#fff",
                    }}
                  >
                    <div style={{ color: "#667085", fontSize: 12 }}>
                      {label}
                    </div>
                    <div style={{ marginTop: 3, color: "#101828", fontSize: 20, fontWeight: 900 }}>
                      {String(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {lastSenadoRun?.error_message && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #fecdca",
                  background: "#fef3f2",
                  color: "#b42318",
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                <strong>Última ocorrência:</strong>{" "}
                {lastSenadoRun.error_message}
              </div>
            )}
          </>
        )}
      </section>

      <section
        style={{
          padding: 20,
          border: "1px solid #e4e7ec",
          borderRadius: 14,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>
              Tribunal Superior Eleitoral — TSE
            </h3>
            <p
              style={{
                margin: "5px 0 0",
                color: "#667085",
                fontSize: 13,
                lineHeight: 1.6,
                maxWidth: 720,
              }}
            >
              Sincronização manual dos dados eleitorais oficiais
              por UF, cargo, número e nome. O SQ_CANDIDATO é
              vinculado automaticamente quando localizado. Os dados coletados
              permanecem na fila administrativa para conferência e
              não são publicados automaticamente.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            disabled={
              syncingTse ||
              !tseProvider
            }
            onClick={() => void handleTseSync()}
            title={
              "Executar sincronização manual do TSE"
            }
          >
            {syncingTse ? (
              <>
                <Loader2 size={16} />
                Sincronizando...
              </>
            ) : (
              <>
                <Play size={16} />
                Sincronizar TSE
              </>
            )}
          </button>
        </div>

        {!tseProvider ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 10,
              border: "1px solid #fedf89",
              background: "#fffaeb",
              color: "#b54708",
              fontSize: 13,
            }}
          >
            O provedor do TSE não está ativo na Central de Dados
            Públicos. Execute primeiro o SQL de cadastro do provedor{" "}
            <strong>tse</strong>.
          </div>
        ) : !tseIdentity ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 10,
              border: "1px dashed #d0d5dd",
              background: "#fcfcfd",
              color: "#475467",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            O sistema localizará o candidato automaticamente pelos
            dados do cadastro e salvará o vínculo com o {" "}
            <strong>SQ_CANDIDATO</strong>. Confira antes a UF, o cargo,
            o número e o nome do candidato.
          </div>
        ) : (
          <>
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <div style={{ padding: 13, border: "1px solid #e4e7ec", borderRadius: 10, background: "#f9fafb" }}>
                <div style={{ color: "#667085", fontSize: 12, fontWeight: 700 }}>
                  SQ_CANDIDATO
                </div>
                <div style={{ marginTop: 4, color: "#101828", fontWeight: 800 }}>
                  {tseIdentity.external_id}
                </div>
              </div>

              <div style={{ padding: 13, border: "1px solid #e4e7ec", borderRadius: 10, background: "#f9fafb" }}>
                <div style={{ color: "#667085", fontSize: 12, fontWeight: 700 }}>
                  Última execução
                </div>
                <div style={{ marginTop: 4, color: "#101828", fontWeight: 800 }}>
                  {formatSyncDate(
                    lastTseRun?.finished_at ||
                      lastTseRun?.started_at ||
                      lastTseRun?.created_at
                  )}
                </div>
              </div>

              <div style={{ padding: 13, border: "1px solid #e4e7ec", borderRadius: 10, background: "#f9fafb" }}>
                <div style={{ color: "#667085", fontSize: 12, fontWeight: 700 }}>
                  Situação
                </div>
                <div style={{ marginTop: 4, color: "#101828", fontWeight: 800 }}>
                  {lastTseRun?.status || "Ainda não executada"}
                </div>
              </div>
            </div>

            {(lastTseRun || lastTseSyncResult) && (
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  ["Coletados", tseCollected],
                  ["Inseridos", tseInserted],
                  ["Atualizados", tseUpdated],
                  ["Ignorados", tseSkipped],
                  ["Erros", tseErrors],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    style={{
                      padding: 12,
                      border: "1px solid #e4e7ec",
                      borderRadius: 10,
                      background: "#fff",
                    }}
                  >
                    <div style={{ color: "#667085", fontSize: 12 }}>
                      {label}
                    </div>
                    <div style={{ marginTop: 3, color: "#101828", fontSize: 20, fontWeight: 900 }}>
                      {String(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {lastTseRun?.error_message && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #fecdca",
                  background: "#fef3f2",
                  color: "#b42318",
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                <strong>Última ocorrência:</strong>{" "}
                {lastTseRun.error_message}
              </div>
            )}
          </>
        )}
      </section>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 18,
              }}
            >
              Identidades externas
            </h3>

            <p
              style={{
                margin: "4px 0 0",
                color: "#667085",
                fontSize: 13,
              }}
            >
              {identities.length} vínculo
              {identities.length === 1 ? "" : "s"} cadastrado
              {identities.length === 1 ? "" : "s"}.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void loadData()}
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>

        {identities.length === 0 ? (
          <div
            style={{
              padding: 24,
              border: "1px dashed #d0d5dd",
              borderRadius: 12,
              textAlign: "center",
              color: "#667085",
              background: "#fcfcfd",
            }}
          >
            <Link2
              size={28}
              style={{
                marginBottom: 8,
              }}
            />

            <div
              style={{
                fontWeight: 800,
                color: "#344054",
              }}
            >
              Nenhuma identidade externa vinculada
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 14,
              }}
            >
              Utilize o formulário abaixo para criar o
              primeiro vínculo.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {identities.map((identity) => {
              const status = statusStyle(
                identity.verification_status
              );

              return (
                <div
                  key={identity.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 14,
                    alignItems: "center",
                    padding: 16,
                    border: "1px solid #e4e7ec",
                    borderRadius: 12,
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <strong
                        style={{
                          color: "#101828",
                        }}
                      >
                        {identity.provider?.name ||
                          "Fonte externa"}
                      </strong>

                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 8px",
                          borderRadius: 999,
                          background: status.background,
                          border: `1px solid ${status.border}`,
                          color: status.color,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {
                          STATUS_LABELS[
                            identity.verification_status
                          ]
                        }
                      </span>
                    </div>

                    {identity.provider?.institution && (
                      <div
                        style={{
                          marginTop: 3,
                          color: "#667085",
                          fontSize: 13,
                        }}
                      >
                        {identity.provider.institution}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 9,
                        fontSize: 14,
                        color: "#344054",
                      }}
                    >
                      <strong>ID externo:</strong>{" "}
                      {identity.external_id}
                    </div>

                    {identity.external_name && (
                      <div
                        style={{
                          marginTop: 4,
                          color: "#475467",
                          fontSize: 14,
                        }}
                      >
                        <strong>Nome na fonte:</strong>{" "}
                        {identity.external_name}
                      </div>
                    )}

                    {identity.external_url && (
                      <a
                        href={identity.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          marginTop: 8,
                          color: "#157347",
                          fontSize: 13,
                          fontWeight: 800,
                          textDecoration: "none",
                        }}
                      >
                        Abrir registro externo
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => startEdit(identity)}
                      title="Editar vínculo"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        void handleDelete(identity.id)
                      }
                      disabled={deletingId === identity.id}
                      title="Remover vínculo"
                    >
                      {deletingId === identity.id ? (
                        <Loader2 size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          padding: 20,
          border: "1px solid #e4e7ec",
          borderRadius: 14,
          background: "#f9fafb",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 18,
              }}
            >
              {editingId
                ? "Editar identidade externa"
                : "Vincular fonte pública"}
            </h3>

            <p
              style={{
                margin: "4px 0 0",
                color: "#667085",
                fontSize: 13,
              }}
            >
              O vínculo identifica o mesmo candidato em uma
              fonte externa.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetForm}
            >
              <X size={16} />
              Cancelar
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
          }}
        >
          <label>
            <div
              style={{
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Fonte de dados *
            </div>

            <select
              value={form.provider_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  provider_id: event.target.value,
                }))
              }
              required
              style={{
                width: "100%",
                minHeight: 42,
              }}
            >
              <option value="">
                Selecione...
              </option>

              {providers.map((provider) => (
                <option
                  key={provider.id}
                  value={provider.id}
                >
                  {provider.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div
              style={{
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Identificador externo *
            </div>

            <input
              value={form.external_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  external_id: event.target.value,
                }))
              }
              placeholder="ID utilizado pela fonte"
              required
              style={{
                width: "100%",
              }}
            />
          </label>

          <label>
            <div
              style={{
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Nome na fonte
            </div>

            <input
              value={form.external_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  external_name: event.target.value,
                }))
              }
              placeholder="Nome exibido pela fonte"
              style={{
                width: "100%",
              }}
            />
          </label>

          <label>
            <div
              style={{
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Situação da conferência
            </div>

            <select
              value={form.verification_status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  verification_status:
                    event.target
                      .value as FormState["verification_status"],
                }))
              }
              style={{
                width: "100%",
                minHeight: 42,
              }}
            >
              <option value="pending">
                Pendente
              </option>

              <option value="verified">
                Verificado
              </option>

              <option value="needs_review">
                Requer revisão
              </option>

              <option value="rejected">
                Rejeitado
              </option>
            </select>
          </label>
        </div>

        <label
          style={{
            display: "block",
            marginTop: 14,
          }}
        >
          <div
            style={{
              marginBottom: 6,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            URL do registro na fonte
          </div>

          <input
            type="url"
            value={form.external_url}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                external_url: event.target.value,
              }))
            }
            placeholder="https://..."
            style={{
              width: "100%",
            }}
          />
        </label>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 18,
          }}
        >
          {editingId && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetForm}
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={16} />
                Salvando...
              </>
            ) : editingId ? (
              <>
                <CheckCircle2 size={16} />
                Salvar alterações
              </>
            ) : (
              <>
                <Plus size={16} />
                Vincular fonte
              </>
            )}
          </button>
        </div>
      </form>

      <div
        style={{
          padding: 16,
          borderRadius: 12,
          border: "1px solid #e4e7ec",
          background: "#fff",
          color: "#667085",
          fontSize: 13,
          lineHeight: 1.65,
        }}
      >
        <strong
          style={{
            color: "#344054",
          }}
        >
          Fluxo de segurança editorial:
        </strong>{" "}
        sincronizar uma fonte não publica dados. Os registros
        recebidos entram primeiro na fila de conferência
        administrativa. A incorporação à Atuação Pública é uma
        etapa separada e a exibição pública continua dependente
        das regras de revisão e verificação.
      </div>
    </div>
  );
}
