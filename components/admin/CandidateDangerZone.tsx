"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CandidateDangerZone({
  candidateId,
  candidateName,
}: {
  candidateId: string;
  candidateName: string;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteCandidate() {
    if (confirmation !== "EXCLUIR") {
      setError('Digite exatamente "EXCLUIR" para confirmar.');
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      let result: any = null;

      if (contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();

        console.error(
          "A API de exclusão retornou conteúdo não JSON:",
          {
            status: response.status,
            statusText: response.statusText,
            contentType,
            body: text.substring(0, 1000),
          }
        );

        throw new Error(
          response.status === 404
            ? "A rota de exclusão não foi encontrada no servidor. Verifique /app/api/admin/candidates/[id]/route.ts."
            : `O servidor retornou uma resposta inesperada (${response.status} ${response.statusText}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            `Não foi possível excluir o candidato. Código ${response.status}.`
        );
      }

      router.replace("/admin/candidatos");
      router.refresh();
    } catch (err) {
      console.error("Erro ao excluir candidato:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir o candidato."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section
      style={{
        marginTop: 32,
        padding: 24,
        border: "1px solid #fda29b",
        borderRadius: 16,
        background: "#fff",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 1,
          color: "#b42318",
          marginBottom: 5,
        }}
      >
        ZONA DE PERIGO
      </div>

      <h2
        style={{
          margin: 0,
          fontSize: 24,
          color: "#101828",
        }}
      >
        Excluir candidato
      </h2>

      <p
        style={{
          margin: "8px 0 0",
          maxWidth: 700,
          color: "#667085",
          lineHeight: 1.6,
        }}
      >
        Exclua este cadastro somente quando ele não precisar
        mais permanecer no sistema. Para apenas retirá-lo do
        site público, altere sua situação de publicação para
        rascunho.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError("");
          }}
          style={{
            marginTop: 18,
            padding: "11px 16px",
            border: "1px solid #f04438",
            borderRadius: 9,
            background: "#fff",
            color: "#b42318",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Excluir candidato
        </button>
      ) : (
        <div
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 12,
            background: "#fef3f2",
            border: "1px solid #fecdca",
          }}
        >
          <strong
            style={{
              display: "block",
              color: "#912018",
              fontSize: 17,
            }}
          >
            Confirmar exclusão
          </strong>

          <p
            style={{
              margin: "8px 0 16px",
              color: "#7a271a",
              lineHeight: 1.55,
            }}
          >
            Você está solicitando a exclusão de{" "}
            <strong>{candidateName}</strong>. Para confirmar,
            digite <strong>EXCLUIR</strong> abaixo.
          </p>

          <input
            type="text"
            value={confirmation}
            disabled={deleting}
            onChange={(event) => {
              setConfirmation(event.target.value);
              setError("");
            }}
            placeholder="Digite EXCLUIR"
            autoComplete="off"
            style={{
              width: "100%",
              maxWidth: 400,
              boxSizing: "border-box",
              padding: "12px 13px",
              border: "1px solid #fda29b",
              borderRadius: 8,
              background: "#fff",
              fontSize: 15,
            }}
          />

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 8,
                background: "#fff",
                border: "1px solid #fda29b",
                color: "#b42318",
                fontWeight: 700,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 18,
            }}
          >
            <button
              type="button"
              disabled={
                deleting || confirmation !== "EXCLUIR"
              }
              onClick={deleteCandidate}
              style={{
                padding: "11px 16px",
                border: 0,
                borderRadius: 8,
                background: "#d92d20",
                color: "#fff",
                fontWeight: 800,
                cursor:
                  deleting || confirmation !== "EXCLUIR"
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  confirmation === "EXCLUIR" && !deleting
                    ? 1
                    : 0.55,
              }}
            >
              {deleting
                ? "Excluindo..."
                : "Excluir definitivamente"}
            </button>

            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setOpen(false);
                setConfirmation("");
                setError("");
              }}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
