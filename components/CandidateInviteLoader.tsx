"use client";

import {
  useEffect,
  useState,
} from "react";

type Candidate = {
  id: string;

  name: string;

  ballot_name?:
    | string
    | null;

  photo_url?:
    | string
    | null;

  state_uf?:
    | string
    | null;

  city_name?:
    | string
    | null;

  cargo?:
    | string
    | null;

  party?:
    | string
    | null;

  number?:
    | string
    | null;
};

type InviteResponse = {
  valid: boolean;

  expires_at?:
    | string
    | null;

  candidate?:
    | Candidate
    | null;

  error?:
    | string
    | null;

  expired?:
    | boolean;

  submitted?:
    | boolean;
};

export default function CandidateInviteLoader({
  token,
}: {
  token: string;
}) {
  const [loading, setLoading] =
    useState(true);

  const [data, setData] =
    useState<InviteResponse | null>(
      null
    );

  useEffect(() => {
    let active = true;

    async function validate() {
      try {
        const response =
          await fetch(
            `/api/candidate-invite/${encodeURIComponent(
              token
            )}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as InviteResponse;

        if (active) {
          setData(result);
        }
      } catch {
        if (active) {
          setData({
            valid: false,
            error:
              "Não foi possível validar este link.",
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    validate();

    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <section
        style={{
          padding: 32,
          border:
            "1px solid #e4e7ec",
          borderRadius: 16,
          background: "#fff",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 32,
            marginBottom: 12,
          }}
        >
          ⏳
        </div>

        <strong>
          Validando seu link...
        </strong>

        <p
          style={{
            color: "#667085",
            marginBottom: 0,
          }}
        >
          Aguarde alguns segundos.
        </p>
      </section>
    );
  }

  if (
    !data ||
    !data.valid ||
    !data.candidate
  ) {
    return (
      <section
        style={{
          padding: 32,
          border:
            "1px solid #fecdca",
          borderRadius: 16,
          background: "#fff",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 38,
            marginBottom: 12,
          }}
        >
          ⚠️
        </div>

        <h2
          style={{
            margin:
              "0 0 10px",
          }}
        >
          Link indisponível
        </h2>

        <p
          style={{
            color: "#667085",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {data?.error ||
            "Este link não está disponível."}
        </p>
      </section>
    );
  }

  const candidate =
    data.candidate;

  return (
    <section
      style={{
        padding: 28,
        border:
          "1px solid #d0d5dd",
        borderRadius: 16,
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {candidate.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={
              candidate.photo_url
            }
            alt=""
            style={{
              width: 90,
              height: 112,
              objectFit: "cover",
              borderRadius: 12,
              border:
                "1px solid #e4e7ec",
            }}
          />
        ) : (
          <div
            style={{
              width: 90,
              height: 112,
              borderRadius: 12,
              background: "#f2f4f7",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              fontSize: 34,
              fontWeight: 900,
              color: "#157347",
            }}
          >
            {(
              candidate.ballot_name ||
              candidate.name
            )
              .charAt(0)
              .toUpperCase()}
          </div>
        )}

        <div
          style={{
            flex: "1 1 300px",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#157347",
              fontWeight: 900,
              letterSpacing: 1,
              marginBottom: 5,
            }}
          >
            CADASTRO IDENTIFICADO
          </div>

          <h2
            style={{
              margin:
                "0 0 7px",
              fontSize: 28,
            }}
          >
            {candidate.ballot_name ||
              candidate.name}
          </h2>

          <div
            style={{
              color: "#667085",
              lineHeight: 1.6,
            }}
          >
            {candidate.cargo ||
              "Cargo não informado"}

            {candidate.state_uf
              ? ` • ${candidate.state_uf}`
              : ""}

            {candidate.party
              ? ` • ${candidate.party}`
              : ""}

            {candidate.number
              ? ` • Nº ${candidate.number}`
              : ""}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 24,
          padding: 18,
          borderRadius: 12,
          background: "#ecfdf3",
          border:
            "1px solid #abefc6",
        }}
      >
        <strong
          style={{
            color: "#027a48",
          }}
        >
          ✓ Link validado
        </strong>

        <p
          style={{
            margin:
              "7px 0 0",
            color: "#475467",
            lineHeight: 1.6,
          }}
        >
          O acesso corresponde a este
          cadastro. Na próxima etapa
          serão exibidos os campos para
          revisão e preenchimento das
          informações.
        </p>
      </div>

      {data.expires_at && (
        <p
          style={{
            margin:
              "18px 0 0",
            color: "#667085",
            fontSize: 13,
          }}
        >
          Este acesso expira em{" "}
          <strong>
            {new Intl.DateTimeFormat(
              "pt-BR",
              {
                dateStyle:
                  "short",
                timeStyle:
                  "short",
              }
            ).format(
              new Date(
                data.expires_at
              )
            )}
          </strong>
          .
        </p>
      )}
    </section>
  );
}
