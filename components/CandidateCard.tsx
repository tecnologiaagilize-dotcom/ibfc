import Link from "next/link";
import type { Candidate } from "@/lib/types";
import { CandidateShare } from "@/components/CandidateShare";

export function CandidateCard({
  candidate,
}: {
  candidate: Candidate;
}) {
  const profileUrl = `/candidato/${candidate.slug}`;

  return (
    <article
      className="card mfb-candidate-card"
      style={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#ffffff",
        borderRadius: 16,
      }}
    >
      {/* =====================================================
          FOTO — FORMATO RETRATO 3:4
      ===================================================== */}

      <Link
        href={profileUrl}
        style={{
          display: "block",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "3 / 4",
            background:
              "linear-gradient(135deg,#e9f7ef,#eef2ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {candidate.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={candidate.photo_url}
              alt={candidate.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center top",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                color: "#009b5b",
              }}
            >
              {candidate.name.charAt(0)}
            </div>
          )}
        </div>
      </Link>

      {/* =====================================================
          INFORMAÇÕES
      ===================================================== */}

      <div
        style={{
          padding: 18,
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        {/* CARGO */}

        <div>
          <span className="badge">
            {candidate.cargo}
          </span>
        </div>

        {/* NOME */}

        <Link
          href={profileUrl}
          style={{
            textDecoration: "none",
            color: "#172033",
          }}
        >
          <h3
            style={{
              fontSize: 21,
              lineHeight: 1.2,
              margin: "12px 0 7px",
            }}
          >
            {candidate.name}
          </h3>
        </Link>

        {/* ESTADO / PARTIDO / NÚMERO */}

        <div
          style={{
            color: "#667085",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {candidate.state_uf !== "BR" && (
            <>
              {candidate.state_uf}
              {(candidate.party ||
                candidate.number) &&
                " · "}
            </>
          )}

          {candidate.party}

          {candidate.party &&
            candidate.number &&
            " · "}

          {candidate.number &&
            `Nº ${candidate.number}`}
        </div>

        {/* ESPAÇADOR */}

        <div style={{ flex: 1 }} />

        {/* BOTÃO */}

        <Link
          href={profileUrl}
          className="btn btn-primary"
          style={{
            marginTop: 18,
            width: "100%",
            textAlign: "center",
          }}
        >
          Ver perfil
        </Link>

        <CandidateShare
          slug={candidate.slug}
          name={candidate.ballot_name && !/^\d+$/.test(candidate.ballot_name) ? candidate.ballot_name : candidate.name}
        />
      </div>
    </article>
  );
}
