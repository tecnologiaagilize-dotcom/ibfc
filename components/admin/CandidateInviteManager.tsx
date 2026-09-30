"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type InviteInfo = {
  id: string;
  candidate_id?: string;
  expires_at: string;
  revoked_at?: string | null;
  submitted_at?: string | null;
  last_accessed_at?: string | null;
  access_count?: number;
  created_at: string;
};

export default function CandidateInviteManager({
  candidateId,
}: {
  candidateId: string;
}) {
  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [revoking, setRevoking] =
    useState(false);

  const [active, setActive] =
    useState(false);

  const [expired, setExpired] =
    useState(false);

  const [invite, setInvite] =
    useState<InviteInfo | null>(null);

  const [generatedUrl, setGeneratedUrl] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const loadInvite =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            `/api/admin/candidates/${candidateId}/invite`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Não foi possível consultar o convite."
          );
        }

        setActive(
          Boolean(result.active)
        );

        setExpired(
          Boolean(result.expired)
        );

        setInvite(
          result.invite ?? null
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao consultar convite."
        );
      } finally {
        setLoading(false);
      }
    }, [candidateId]);

  useEffect(() => {
    loadInvite();
  }, [loadInvite]);

  async function generateInvite() {
    setGenerating(true);
    setError("");
    setMessage("");
    setGeneratedUrl("");

    try {
      const response =
        await fetch(
          `/api/admin/candidates/${candidateId}/invite`,
          {
            method: "POST",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Não foi possível gerar o link."
        );
      }

      setGeneratedUrl(
        result.url
      );

      setInvite(
        result.invite
      );

      setActive(true);
      setExpired(false);

      setMessage(
        "Novo link gerado. Ele ficará válido por 48 horas."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao gerar link."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function revokeInvite() {
    const confirmed =
      window.confirm(
        "Deseja realmente revogar o link de preenchimento?"
      );

    if (!confirmed) {
      return;
    }

    setRevoking(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/candidates/${candidateId}/invite`,
          {
            method: "DELETE",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Não foi possível revogar o link."
        );
      }

      setActive(false);
      setGeneratedUrl("");

      setMessage(
        "Link revogado com sucesso."
      );

      await loadInvite();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao revogar link."
      );
    } finally {
      setRevoking(false);
    }
  }

  async function copyLink() {
    if (!generatedUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        generatedUrl
      );

      setMessage(
        "Link copiado para a área de transferência."
      );
    } catch {
      setError(
        "Não foi possível copiar automaticamente. Selecione o link e copie manualmente."
      );
    }
  }

  function formatDate(
    value?: string | null
  ) {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    ).format(
      new Date(value)
    );
  }

  return (
    <section
      style={{
        marginTop: 28,
        marginBottom: 28,
        padding: 24,
        border:
          "1px solid #d0d5dd",
        borderRadius: 16,
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 1,
              color: "#157347",
              marginBottom: 5,
            }}
          >
            PREENCHIMENTO COLABORATIVO
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 26,
            }}
          >
            Link temporário
          </h2>

          <p
            style={{
              color: "#667085",
              margin:
                "8px 0 0",
              maxWidth: 650,
              lineHeight: 1.6,
            }}
          >
            Gere um link para que o
            candidato ou sua assessoria
            complete as informações do
            cadastro. O link expira
            automaticamente após 48
            horas e não concede acesso
            à Central Administrativa.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={generateInvite}
          disabled={generating}
        >
          {generating
            ? "Gerando..."
            : active
            ? "🔄 Gerar novo link"
            : "🔗 Gerar link — 48h"}
        </button>
      </div>

      {loading ? (
        <div
          style={{
            marginTop: 20,
            color: "#667085",
          }}
        >
          Consultando convite...
        </div>
      ) : (
        <div
          style={{
            marginTop: 22,
            padding: 18,
            background: "#f9fafb",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            <div>
              <strong>
                Situação:
              </strong>{" "}
              {active
                ? "Link ativo"
                : expired
                ? "Link expirado"
                : invite?.submitted_at
                ? "Preenchimento enviado"
                : "Nenhum link ativo"}
            </div>

            {invite && (
              <>
                <div>
                  <strong>
                    Criado:
                  </strong>{" "}
                  {formatDate(
                    invite.created_at
                  )}
                </div>

                <div>
                  <strong>
                    Expira:
                  </strong>{" "}
                  {formatDate(
                    invite.expires_at
                  )}
                </div>

                {invite.last_accessed_at && (
                  <div>
                    <strong>
                      Último acesso:
                    </strong>{" "}
                    {formatDate(
                      invite.last_accessed_at
                    )}
                  </div>
                )}

                {typeof invite.access_count ===
                  "number" && (
                  <div>
                    <strong>
                      Acessos:
                    </strong>{" "}
                    {invite.access_count}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {generatedUrl && (
        <div
          style={{
            marginTop: 20,
            padding: 18,
            borderRadius: 12,
            background: "#ecfdf3",
            border:
              "1px solid #abefc6",
          }}
        >
          <div
            style={{
              fontWeight: 900,
              marginBottom: 8,
              color: "#027a48",
            }}
          >
            Link gerado
          </div>

          <p
            style={{
              margin:
                "0 0 12px",
              color: "#475467",
              fontSize: 14,
            }}
          >
            Copie este endereço agora.
            Por segurança, o token
            original não fica armazenado
            no banco e não poderá ser
            recuperado posteriormente.
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              readOnly
              value={generatedUrl}
              onFocus={(event) =>
                event.currentTarget.select()
              }
              style={{
                flex:
                  "1 1 500px",
                minWidth: 0,
                padding:
                  "11px 12px",
                border:
                  "1px solid #d0d5dd",
                borderRadius: 8,
                background: "#fff",
              }}
            />

            <button
              type="button"
              className="btn btn-primary"
              onClick={copyLink}
            >
              📋 Copiar link
            </button>
          </div>
        </div>
      )}

      {active && (
        <div
          style={{
            marginTop: 16,
          }}
        >
          <button
            type="button"
            onClick={revokeInvite}
            disabled={revoking}
            style={{
              border:
                "1px solid #fda29b",
              background: "#fff",
              color: "#b42318",
              padding:
                "10px 14px",
              borderRadius: 8,
              fontWeight: 800,
              cursor:
                revoking
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {revoking
              ? "Revogando..."
              : "Revogar link"}
          </button>
        </div>
      )}

      {message && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 9,
            background: "#ecfdf3",
            color: "#027a48",
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 9,
            background: "#fef3f2",
            color: "#b42318",
          }}
        >
          {error}
        </div>
      )}
    </section>
  );
}
