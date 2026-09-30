import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { Header } from "@/components/Header";
import { CandidateCard } from "@/components/CandidateCard";
import { BrazilMap } from "@/components/BrazilMap";

import { STATES } from "@/lib/states";
import type { Candidate } from "@/lib/types";
import { cargoRank } from "@/lib/candidates/cargo-order";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("status", "published")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const candidates: Candidate[] =
    (data as Candidate[] | null) ?? [];

  function sortByDisplayOrder(list: Candidate[]) {
    return [...list].sort((a, b) => {
      const rankDifference = cargoRank(a.cargo) - cargoRank(b.cargo);
      if (rankDifference !== 0) return rankDifference;
      const orderA = Number((a as Candidate & { display_order?: number }).display_order ?? 1000);
      const orderB = Number((b as Candidate & { display_order?: number }).display_order ?? 1000);
      if (orderA !== orderB) return orderA - orderB;
      return (a.name ?? "").localeCompare(b.name ?? "", "pt-BR", { sensitivity: "base" });
    });
  }

  /* =========================================================
     CANDIDATOS DE ABRANGÊNCIA NACIONAL
  ========================================================= */

  const nationalCandidates = sortByDisplayOrder(
    candidates.filter(
      (candidate) =>
        candidate.state_uf?.toUpperCase() === "BR"
    )
  );

  /* =========================================================
     CANDIDATOS ESTADUAIS / DISTRITAIS
  ========================================================= */

  const stateCandidates = sortByDisplayOrder(
    candidates.filter(
      (candidate) =>
        candidate.state_uf?.toUpperCase() !== "BR"
    )
  );

  /* =========================================================
     AGRUPAMENTO DOS CANDIDATOS POR ESTADO
  ========================================================= */

  const candidatesByState =
    stateCandidates.reduce(
      (
        acc: Record<string, Candidate[]>,
        candidate
      ) => {
        if (!candidate.state_uf) {
          return acc;
        }

        const uf =
          candidate.state_uf.toUpperCase();

        if (!acc[uf]) {
          acc[uf] = [];
        }

        acc[uf].push(candidate);

        return acc;
      },
      {}
    );

  Object.keys(candidatesByState).forEach((uf) => {
    candidatesByState[uf] = sortByDisplayOrder(candidatesByState[uf]);
  });

  /* =========================================================
     CONTAGEM POR ESTADO
  ========================================================= */

  const counts = Object.entries(
    candidatesByState
  ).reduce(
    (
      acc: Record<string, number>,
      [uf, list]
    ) => {
      acc[uf] = list.length;

      return acc;
    },
    {}
  );

  /* =========================================================
     SOMENTE ESTADOS QUE POSSUEM CANDIDATOS PUBLICADOS
  ========================================================= */

  const statesWithCandidates =
    STATES.filter(
      (state) =>
        (candidatesByState[state.uf]?.length ??
          0) > 0
    );

  return (
    <>
      <Header />

      <main>
        <section
          className="section"
          style={{
            background: "#fff",
          }}
        >
          <div className="container">

            {/* =================================================
                VOLTAR
            ================================================= */}

            <div
              style={{
                marginBottom: 22,
              }}
            >
              <Link
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#157347",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                ← Voltar
              </Link>
            </div>

            {/* =================================================
                CABEÇALHO
            ================================================= */}

            <span className="badge">
              ELEIÇÕES 2026
            </span>

            <h1
              style={{
                fontSize:
                  "clamp(38px,6vw,62px)",
                margin: "12px 0",
                lineHeight: 1.05,
              }}
            >
              Candidatos indicados pelo MFB
            </h1>

            <p
              style={{
                fontSize: 18,
                color: "#667085",
                maxWidth: 780,
                lineHeight: 1.7,
              }}
            >
              Consulte os candidatos cadastrados
              na plataforma, navegue pelo mapa do
              Brasil e acesse os perfis
              disponíveis em cada Estado.
            </p>

            {/* =================================================
                CANDIDATOS NACIONAIS
            ================================================= */}

            {nationalCandidates.length > 0 && (
              <section
                style={{
                  marginTop: 42,
                }}
              >
                <div
                  style={{
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      color: "#157347",
                      fontSize: 13,
                      fontWeight: 900,
                      letterSpacing: 1,
                      marginBottom: 5,
                    }}
                  >
                    ABRANGÊNCIA NACIONAL
                  </span>

                  <h2
                    style={{
                      fontSize: 32,
                      margin: 0,
                    }}
                  >
                    Candidatos nacionais
                  </h2>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 290px))",
                    gap: 22,
                    alignItems: "stretch",
                  }}
                >
                  {nationalCandidates.map(
                    (candidate) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                      />
                    )
                  )}
                </div>
              </section>
            )}

            {/* =================================================
                MAPA DO BRASIL
            ================================================= */}

            <section
              className="card"
              style={{
                marginTop: 48,
                padding: 20,
              }}
            >
              <h2
                style={{
                  fontSize: 26,
                  margin: "6px 8px",
                }}
              >
                Mapa do Brasil
              </h2>

              <p
                style={{
                  color: "#667085",
                  margin: "0 8px 18px",
                  lineHeight: 1.6,
                }}
              >
                Passe o mouse sobre um Estado para
                visualizar seus candidatos ou
                clique para acessar a página
                completa da unidade da Federação.
              </p>

              <BrazilMap
                counts={counts}
                candidates={stateCandidates}
                hrefPrefix="/estado"
                showCandidateMosaic={true}
              />
            </section>

            {/* =================================================
                ESTADOS
            ================================================= */}

            <section
              style={{
                marginTop: 52,
              }}
            >
              <div
                style={{
                  marginBottom: 20,
                }}
              >
                <h2
                  style={{
                    fontSize: 32,
                    marginBottom: 6,
                  }}
                >
                  Estados
                </h2>

                <p
                  style={{
                    color: "#667085",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  Consulte os candidatos
                  cadastrados em cada unidade da
                  Federação.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(260px,1fr))",
                  gap: 16,
                }}
              >
                {STATES.map((state) => {
                  const stateList =
                    candidatesByState[state.uf] ??
                    [];

                  const visibleCandidates =
                    stateList.slice(0, 5);

                  const remaining = Math.max(
                    stateList.length -
                      visibleCandidates.length,
                    0
                  );

                  return (
                    <Link
                      href={`/estado/${state.uf}`}
                      key={state.uf}
                      className="card"
                      style={{
                        display: "block",
                        padding: 18,
                        color: "#172033",
                        textDecoration: "none",
                        minHeight: 190,
                      }}
                    >
                      {/* CABEÇALHO */}

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "flex-start",
                          justifyContent:
                            "space-between",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 24,
                              fontWeight: 900,
                              color: "#157347",
                            }}
                          >
                            {state.uf}
                          </div>

                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              marginTop: 2,
                            }}
                          >
                            {state.name}
                          </div>
                        </div>

                        <div
                          style={{
                            minWidth: 34,
                            height: 34,
                            padding: "0 9px",
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            background:
                              "#f2f4f7",
                            borderRadius: 20,
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          {stateList.length}
                        </div>
                      </div>

                      {/* MINIATURAS */}

                      {visibleCandidates.length >
                      0 ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "flex-end",
                            gap: 7,
                            marginTop: 18,
                          }}
                        >
                          {visibleCandidates.map(
                            (
                              candidate,
                              index
                            ) => (
                              <div
                                key={
                                  candidate.id ||
                                  `${candidate.name}-${index}`
                                }
                                title={
                                  candidate.name
                                }
                                style={{
                                  width: 48,
                                  aspectRatio:
                                    "3 / 4",
                                  flexShrink: 0,
                                  borderRadius: 8,
                                  overflow:
                                    "hidden",
                                  background:
                                    "#eef2f4",
                                  border:
                                    "1px solid #e4e7ec",
                                }}
                              >
                                {candidate.photo_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={
                                      candidate.photo_url
                                    }
                                    alt={
                                      candidate.name
                                    }
                                    style={{
                                      width:
                                        "100%",
                                      height:
                                        "100%",
                                      display:
                                        "block",
                                      objectFit:
                                        "cover",
                                      objectPosition:
                                        "center top",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width:
                                        "100%",
                                      height:
                                        "100%",
                                      display:
                                        "flex",
                                      alignItems:
                                        "center",
                                      justifyContent:
                                        "center",
                                      color:
                                        "#157347",
                                      background:
                                        "#e9f7ef",
                                      fontWeight:
                                        900,
                                      fontSize:
                                        20,
                                    }}
                                  >
                                    {candidate.name
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                )}
                              </div>
                            )
                          )}

                          {remaining > 0 && (
                            <div
                              style={{
                                width: 48,
                                height: 48,
                                flexShrink: 0,
                                display: "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                borderRadius:
                                  "50%",
                                background:
                                  "#157347",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 900,
                              }}
                            >
                              +{remaining}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            marginTop: 20,
                            minHeight: 64,
                            display: "flex",
                            alignItems: "center",
                            color: "#98a2b3",
                            fontSize: 13,
                          }}
                        >
                          Nenhum candidato
                          publicado.
                        </div>
                      )}

                      {/* RODAPÉ */}

                      <div
                        style={{
                          marginTop: 16,
                          paddingTop: 12,
                          borderTop:
                            "1px solid #eaecf0",
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#157347",
                        }}
                      >
                        {stateList.length > 0
                          ? `Ver candidatos de ${state.uf} →`
                          : `Ver ${state.uf} →`}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* =================================================
                TODOS OS CANDIDATOS ESTADUAIS
            ================================================= */}

            <section
              style={{
                marginTop: 64,
              }}
            >
              <div
                style={{
                  marginBottom: 28,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    color: "#157347",
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: 1,
                    marginBottom: 5,
                  }}
                >
                  POR UNIDADE DA FEDERAÇÃO
                </span>

                <h2
                  style={{
                    fontSize: 34,
                    margin: "0 0 8px",
                  }}
                >
                  Todos os candidatos publicados
                </h2>

                <p
                  style={{
                    color: "#667085",
                    margin: 0,
                    lineHeight: 1.6,
                    maxWidth: 760,
                  }}
                >
                  Os candidatos de abrangência
                  estadual e distrital estão
                  organizados abaixo por unidade
                  da Federação.
                </p>
              </div>

              {error ? (
                <div
                  className="card"
                  style={{
                    padding: 24,
                    color: "#b42318",
                  }}
                >
                  Não foi possível carregar os
                  candidatos.
                </div>
              ) : stateCandidates.length === 0 ? (
                <div
                  className="card"
                  style={{
                    padding: 24,
                    color: "#667085",
                  }}
                >
                  Nenhum candidato estadual ou
                  distrital publicado ainda.
                </div>
              ) : (
                <div>
                  {statesWithCandidates.map(
                    (state, stateIndex) => {
                      const stateList =
                        candidatesByState[
                          state.uf
                        ] ?? [];

                      return (
                        <section
                          key={state.uf}
                          style={{
                            marginTop:
                              stateIndex === 0
                                ? 0
                                : 54,
                          }}
                        >
                          {/* ESTADO */}

                          <div
                            style={{
                              display: "flex",
                              alignItems:
                                "flex-end",
                              justifyContent:
                                "space-between",
                              gap: 20,
                              flexWrap: "wrap",
                              paddingBottom: 14,
                              borderBottom:
                                "2px solid #157347",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  color:
                                    "#157347",
                                  fontSize: 13,
                                  fontWeight:
                                    900,
                                  letterSpacing:
                                    1,
                                }}
                              >
                                {state.uf}
                              </div>

                              <h3
                                style={{
                                  fontSize: 28,
                                  margin:
                                    "3px 0 0",
                                }}
                              >
                                {state.name}
                              </h3>
                            </div>

                            <Link
                              href={`/estado/${state.uf}`}
                              style={{
                                color:
                                  "#157347",
                                fontWeight:
                                  800,
                                textDecoration:
                                  "none",
                                fontSize: 14,
                              }}
                            >
                              Ver página de{" "}
                              {state.uf} →
                            </Link>
                          </div>

                          {/* CARDS EM RETRATO */}

                          <div
                            style={{
                              display: "grid",

                              gridTemplateColumns:
                                "repeat(auto-fill, minmax(210px, 260px))",

                              gap: 22,

                              marginTop: 24,

                              alignItems:
                                "stretch",
                            }}
                          >
                            {stateList.map(
                              (candidate) => (
                                <CandidateCard
                                  key={
                                    candidate.id
                                  }
                                  candidate={
                                    candidate
                                  }
                                />
                              )
                            )}
                          </div>
                        </section>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>

    </>
  );
}
