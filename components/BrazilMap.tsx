"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";

const GEO_URL =
  "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

type Candidate = {
  id?: string;
  name: string;
  ballot_name?: string | null;
  slug?: string | null;
  state_uf: string;
  cargo?: string | null;
  party?: string | null;
  number?: string | number | null;
  photo_url?: string | null;
};

type BrazilMapProps = {
  counts?: Record<string, number>;
  candidates?: Candidate[];

  /**
   * Permite reutilizar o mapa em diferentes áreas.
   *
   * Exemplos:
   * /estado
   * /admin/territorio
   */
  hrefPrefix?: string;

  /**
   * Controla a exibição do mosaico.
   * Por padrão, aparece quando candidates é informado.
   */
  showCandidateMosaic?: boolean;
};

function getUF(properties: any): string {
  const value =
    properties?.sigla ??
    properties?.SIGLA ??
    properties?.UF ??
    properties?.uf ??
    properties?.postal ??
    properties?.abbr ??
    properties?.code ??
    "";

  return String(value).trim().toUpperCase();
}

export function BrazilMap({
  counts = {},
  candidates = [],
  hrefPrefix = "/estado",
  showCandidateMosaic = true,
}: BrazilMapProps) {
  const [hoveredUF, setHoveredUF] =
    useState<string | null>(null);

  /**
   * Organiza os candidatos por UF uma única vez.
   */
  const candidatesByState = useMemo(() => {
    const grouped: Record<string, Candidate[]> = {};

    candidates.forEach((candidate) => {
      if (!candidate.state_uf) return;

      const uf = candidate.state_uf
        .trim()
        .toUpperCase();

      // BR representa candidatura de abrangência nacional.
      // Não deve entrar dentro de um estado.
      if (!uf || uf === "BR") return;

      if (!grouped[uf]) {
        grouped[uf] = [];
      }

      grouped[uf].push(candidate);
    });

    return grouped;
  }, [candidates]);

  const hoveredCandidates =
    hoveredUF && candidatesByState[hoveredUF]
      ? candidatesByState[hoveredUF]
      : [];

  const stateHref = (uf: string) => {
    const prefix = hrefPrefix.endsWith("/")
      ? hrefPrefix.slice(0, -1)
      : hrefPrefix;

    return `${prefix}/${uf}`;
  };

  return (
    <div
      onMouseLeave={() => setHoveredUF(null)}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      {/* =====================================================
          MAPA DO BRASIL
      ===================================================== */}

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [-54, -15],
          scale: 700,
        }}
        width={800}
        height={650}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
        }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }: any) =>
            geographies.map((geo: any) => {
              const uf = getUF(
                geo.properties
              );

              const count =
                counts[uf] ??
                candidatesByState[uf]?.length ??
                0;

              if (!uf) {
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: {
                        fill: "#D9E2E8",
                        stroke: "#FFFFFF",
                        strokeWidth: 1.2,
                        outline: "none",
                      },
                      hover: {
                        fill: "#AAB7C2",
                        stroke: "#FFFFFF",
                        strokeWidth: 1.2,
                        outline: "none",
                      },
                      pressed: {
                        fill: "#AAB7C2",
                        stroke: "#FFFFFF",
                        strokeWidth: 1.2,
                        outline: "none",
                      },
                    }}
                  />
                );
              }

              return (
                <Link
                  key={geo.rsmKey}
                  href={stateHref(uf)}
                  onClick={(event) => {
                    if (showCandidateMosaic && candidates.length > 0 && window.matchMedia("(hover: none)").matches) {
                      event.preventDefault();
                      setHoveredUF(uf);
                    }
                  }}
                >
                  <Geography
                    geography={geo}
                    onMouseEnter={() => {
                      if (
                        showCandidateMosaic &&
                        candidates.length > 0
                      ) {
                        setHoveredUF(uf);
                      }
                    }}
                    style={{
                      default: {
                        fill:
                          count > 0
                            ? "#157347"
                            : "#D9E2E8",

                        stroke: "#FFFFFF",
                        strokeWidth: 1.2,
                        outline: "none",
                        cursor: "pointer",

                        transition:
                          "fill .15s ease",
                      },

                      hover: {
                        fill:
                          count > 0
                            ? "#F4C430"
                            : "#AAB7C2",

                        stroke: "#FFFFFF",
                        strokeWidth: 1.5,
                        outline: "none",
                        cursor: "pointer",
                      },

                      pressed: {
                        fill: "#F4C430",
                        stroke: "#FFFFFF",
                        strokeWidth: 1.5,
                        outline: "none",
                        cursor: "pointer",
                      },
                    }}
                  />
                </Link>
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* =====================================================
          MOSAICO DE APOIADOS
      ===================================================== */}

      {showCandidateMosaic &&
        hoveredUF &&
        candidates.length > 0 && (
          <div
            className="brazil-map-popover"
            role="region"
            aria-label={`Apoiados pelo MFB em ${hoveredUF}`}
            style={{
              background: "#ffffff",

              border:
                "1px solid #e4e7ec",

              borderRadius: 16,

              boxShadow:
                "0 18px 50px rgba(16,24,40,.20)",
            }}
          >
            {/* CABEÇALHO */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1.1,
                    color: "#157347",
                  }}
                >
                  APOIADOS PELO MFB
                </div>

                <h3
                  style={{
                    margin: "3px 0 0",
                    fontSize: 26,
                    lineHeight: 1.1,
                  }}
                >
                  {hoveredUF}
                </h3>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ minWidth: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 9px", borderRadius: 20, background: "#f2f4f7", fontSize: 13, fontWeight: 800 }}>
                  {hoveredCandidates.length}
                </div>
                <button type="button" className="brazil-map-popover-close" aria-label="Fechar card de apoiados" onClick={() => setHoveredUF(null)}>×</button>
              </div>
            </div>

            {/* SEM CANDIDATOS */}

            {hoveredCandidates.length ===
            0 ? (
              <div>
                <p
                  style={{
                    color: "#667085",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Nenhum apoiado publicado
                  neste estado.
                </p>

                <Link
                  className="brazil-map-popover-link"
                  href={stateHref(
                    hoveredUF
                  )}
                  style={{
                    display:
                      "inline-block",
                    marginTop: 14,
                    fontWeight: 800,
                    color: "#157347",
                    textDecoration: "none",
                  }}
                >
                  Ver estado →
                </Link>
              </div>
            ) : (
              <>
                {/* FOTOS */}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, minmax(0, 1fr))",
                    gap: 11,
                  }}
                >
                  {hoveredCandidates
                    .slice(0, 6)
                    .map(
                      (
                        candidate,
                        index
                      ) => {
                        const displayName =
                          candidate.ballot_name ||
                          candidate.name;

                        const href =
                          candidate.slug
                            ? `/candidato/${candidate.slug}`
                            : stateHref(
                                hoveredUF
                              );

                        return (
                          <Link
                            className="brazil-map-popover-link"
                            key={
                              candidate.id ||
                              candidate.slug ||
                              `${candidate.name}-${index}`
                            }
                            href={href}
                            style={{
                              display:
                                "block",
                              color:
                                "inherit",
                              textDecoration:
                                "none",
                            }}
                          >
                            {/* FOTO 3:4 */}

                            <div
                              style={{
                                width:
                                  "100%",
                                aspectRatio:
                                  "3 / 4",

                                overflow:
                                  "hidden",

                                borderRadius:
                                  10,

                                background:
                                  "#eef2f4",

                                border:
                                  "1px solid #eaecf0",
                              }}
                            >
                              {candidate.photo_url ? (
                                <img
                                  src={
                                    candidate.photo_url
                                  }
                                  alt={
                                    displayName
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

                                    background:
                                      "#f2f4f7",

                                    color:
                                      "#98a2b3",

                                    fontSize:
                                      34,
                                  }}
                                >
                                  👤
                                </div>
                              )}
                            </div>

                            {/* NOME */}

                            <div
                              style={{
                                marginTop: 7,

                                fontSize:
                                  12,

                                fontWeight:
                                  800,

                                lineHeight:
                                  1.25,
                              }}
                            >
                              {
                                displayName
                              }
                            </div>

                            {/* CARGO */}

                            {candidate.cargo && (
                              <div
                                style={{
                                  marginTop:
                                    2,

                                  color:
                                    "#667085",

                                  fontSize:
                                    10,

                                  lineHeight:
                                    1.25,
                                }}
                              >
                                {
                                  candidate.cargo
                                }
                              </div>
                            )}

                            {/* PARTIDO / NÚMERO */}

                            {(candidate.party ||
                              candidate.number) && (
                              <div
                                style={{
                                  marginTop:
                                    3,

                                  color:
                                    "#157347",

                                  fontSize:
                                    10,

                                  fontWeight:
                                    800,
                                }}
                              >
                                {candidate.party}

                                {candidate.party &&
                                candidate.number
                                  ? " • "
                                  : ""}

                                {
                                  candidate.number
                                }
                              </div>
                            )}
                          </Link>
                        );
                      }
                    )}
                </div>

                {/* QUANTIDADE EXTRA */}

                {hoveredCandidates.length >
                  6 && (
                  <div
                    style={{
                      marginTop: 13,

                      padding:
                        "8px 10px",

                      background:
                        "#f9fafb",

                      borderRadius: 8,

                      color:
                        "#475467",

                      fontSize: 12,

                      fontWeight: 600,
                    }}
                  >
                    +{" "}
                    {hoveredCandidates.length -
                      6}{" "}
                    outros apoiados neste
                    estado
                  </div>
                )}

                {/* VER TODOS */}

                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 14,

                    borderTop:
                      "1px solid #eaecf0",
                  }}
                >
                  <Link
                    className="brazil-map-popover-link"
                    href={stateHref(
                      hoveredUF
                    )}
                    style={{
                      display:
                        "inline-flex",

                      alignItems:
                        "center",

                      gap: 5,

                      color:
                        "#157347",

                      fontWeight: 800,

                      fontSize: 14,

                      textDecoration:
                        "none",
                    }}
                  >
                    Ver todos de{" "}
                    {hoveredUF} →
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
    </div>
  );
}

export default BrazilMap;
