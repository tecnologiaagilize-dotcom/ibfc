"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/browser";
import { cargoRank } from "@/lib/candidates/cargo-order";

type CandidateItem = {
  id: string;
  name: string;
  ballot_name?: string | null;
  photo_url?: string | null;

  photo_position_x?: number | null;
  photo_position_y?: number | null;
  photo_zoom?: number | null;

  state_uf?: string | null;
  city_name?: string | null;

  cargo?: string | null;
  party?: string | null;
  number?: string | null;

  status?: string | null;
  review_status?: string | null;

  display_order?: number | null;
};

export default function CandidateOrderManager({
  candidates,
}: {
  candidates: CandidateItem[];
}) {
  const router = useRouter();

  /*
   * Publicados aparecem primeiro,
   * agrupados por cargo e seguindo a ordem manual dentro do grupo.
   *
   * Rascunhos aparecem depois,
   * agrupados por cargo e em ordem alfabética.
   */
  const initialItems = useMemo(() => {
    const published = candidates
      .filter(
        (candidate) =>
          candidate.status === "published"
      )
      .sort((a, b) => {
        const rankDifference = cargoRank(a.cargo) - cargoRank(b.cargo);
        if (rankDifference !== 0) return rankDifference;
        const orderA = Number(
          a.display_order ?? 1000
        );

        const orderB = Number(
          b.display_order ?? 1000
        );

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return (
          a.ballot_name || a.name
        ).localeCompare(
          b.ballot_name || b.name,
          "pt-BR",
          {
            sensitivity: "base",
          }
        );
      });

    const drafts = candidates
      .filter(
        (candidate) =>
          candidate.status !== "published"
      )
      .sort((a, b) =>
        cargoRank(a.cargo) - cargoRank(b.cargo) || (
          a.ballot_name || a.name
        ).localeCompare(
          b.ballot_name || b.name,
          "pt-BR",
          {
            sensitivity: "base",
          }
        )
      );

    return [
      ...published,
      ...drafts,
    ];
  }, [candidates]);

  const [items, setItems] =
    useState<CandidateItem[]>(
      initialItems
    );

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const publishedItems =
    items.filter(
      (candidate) =>
        candidate.status === "published"
    );

  /*
   * Move somente candidatos publicados.
   *
   * Rascunhos não participam da
   * ordenação pública.
   */
  function movePublished(
    candidateId: string,
    direction: -1 | 1
  ) {
    setMessage("");
    setError("");

    const published =
      items.filter(
        (candidate) =>
          candidate.status === "published"
      );

    const drafts =
      items.filter(
        (candidate) =>
          candidate.status !== "published"
      );

    const index =
      published.findIndex(
        (candidate) =>
          candidate.id === candidateId
      );

    if (index === -1) {
      return;
    }

    const targetIndex =
      index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >=
        published.length
    ) {
      return;
    }

    // As setas mudam a posição somente dentro do cargo disputado.
    if (cargoRank(published[index].cargo) !== cargoRank(published[targetIndex].cargo)) {
      return;
    }

    const nextPublished =
      [...published];

    const current =
      nextPublished[index];

    nextPublished[index] =
      nextPublished[targetIndex];

    nextPublished[targetIndex] =
      current;

    setItems([
      ...nextPublished,
      ...drafts,
    ]);
  }

  async function saveOrder() {
    setSaving(true);
    setMessage("");
    setError("");

    const supabase =
      createClient();

    const published =
      items.filter(
        (candidate) =>
          candidate.status === "published"
      );

    /*
     * Gravamos:
     *
     * 1º = 10
     * 2º = 20
     * 3º = 30
     *
     * A interface mostra 1, 2, 3...
     * mas o banco mantém intervalos.
     */
    const ordered =
      published.map(
        (candidate, index) => ({
          ...candidate,

          display_order:
            (index + 1) * 10,
        })
      );

    for (
      const candidate
      of ordered
    ) {
      const {
        error: updateError,
      } = await supabase
        .from("candidates")
        .update({
          display_order:
            candidate.display_order,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          candidate.id
        );

      if (updateError) {
        setError(
          "Não foi possível salvar a ordem: " +
            updateError.message
        );

        setSaving(false);

        return;
      }
    }

    const drafts =
      items.filter(
        (candidate) =>
          candidate.status !== "published"
      );

    setItems([
      ...ordered,
      ...drafts,
    ]);

    setMessage(
      "Ordem dos cards salva com sucesso."
    );

    setSaving(false);

    router.refresh();
  }

  function getPublishedPosition(
    candidateId: string
  ) {
    const index =
      publishedItems.findIndex(
        (candidate) =>
          candidate.id === candidateId
      );

    if (index === -1) {
      return null;
    }

    return index + 1;
  }

  function getReviewLabel(
    reviewStatus?: string | null
  ) {
    switch (reviewStatus) {
      case "awaiting_completion":
        return "Aguardando preenchimento";

      case "in_review":
        return "Em revisão";

      case "approved":
        return "Aprovado";

      case "draft":
      default:
        return null;
    }
  }

  return (
    <section
      className="admin-panel"
      style={{
        marginTop: 24,
      }}
    >
      {/* CABEÇALHO */}

      <div
        style={{
          padding: 22,

          display: "flex",

          alignItems:
            "flex-start",

          justifyContent:
            "space-between",

          gap: 18,

          flexWrap: "wrap",

          borderBottom:
            "1px solid #e4e7ec",
        }}
      >
        <div>
          <span
            style={{
              display:
                "inline-block",

              color:
                "#157347",

              fontSize: 12,

              fontWeight: 900,

              letterSpacing: 1,

              marginBottom: 5,
            }}
          >
            GESTÃO DOS APOIADOS
          </span>

          <h2
            style={{
              margin:
                "0 0 6px",

              fontSize: 26,
            }}
          >
            Candidatos cadastrados
          </h2>

          <p
            style={{
              margin: 0,

              color:
                "#667085",

              lineHeight: 1.6,

              maxWidth: 750,
            }}
          >
            Visualize os candidatos,
            altere manualmente a posição
            dos cards publicados e acesse
            a edição completa de cada
            cadastro.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={saveOrder}
          disabled={
            saving ||
            publishedItems.length === 0
          }
        >
          {saving
            ? "Salvando..."
            : "💾 Salvar ordem"}
        </button>
      </div>

      {/* TABELA */}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                Foto
              </th>

              <th>
                Posição
              </th>

              <th>
                Candidato
              </th>

              <th>
                Estado
              </th>

              <th>
                Cargo
              </th>

              <th>
                Partido
              </th>

              <th>
                Status
              </th>

              <th>
                Ação
              </th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign:
                      "center",

                    padding: 30,

                    color:
                      "#667085",
                  }}
                >
                  Nenhum candidato
                  cadastrado.
                </td>
              </tr>
            )}

            {items.map(
              (candidate) => {
                const published =
                  candidate.status ===
                  "published";

                const position =
                  getPublishedPosition(
                    candidate.id
                  );

                const reviewLabel =
                  getReviewLabel(
                    candidate.review_status
                  );

                const isFirst =
                  published &&
                  (position === 1 ||
                    cargoRank(publishedItems[position! - 2]?.cargo) !== cargoRank(candidate.cargo));

                const isLast =
                  published &&
                  (position === publishedItems.length ||
                    cargoRank(publishedItems[position!]?.cargo) !== cargoRank(candidate.cargo));

                const objectPositionX =
                  Number(
                    candidate.photo_position_x ??
                      50
                  );

                const objectPositionY =
                  Number(
                    candidate.photo_position_y ??
                      20
                  );

                const zoom =
                  Number(
                    candidate.photo_zoom ??
                      1
                  );

                return (
                  <tr
                    key={
                      candidate.id
                    }
                  >
                    {/* FOTO */}

                    <td>
                      <div
                        style={{
                          width: 54,
                          height: 68,

                          borderRadius:
                            9,

                          overflow:
                            "hidden",

                          background:
                            "#f2f4f7",

                          border:
                            "1px solid #e4e7ec",

                          position:
                            "relative",
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
                              width:
                                "100%",

                              height:
                                "100%",

                              objectFit:
                                "cover",

                              objectPosition: `${objectPositionX}% ${objectPositionY}%`,

                              transform: `scale(${zoom})`,

                              transformOrigin: `${objectPositionX}% ${objectPositionY}%`,

                              display:
                                "block",
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

                              fontWeight:
                                900,

                              fontSize:
                                20,
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
                      </div>
                    </td>

                    {/* POSIÇÃO */}

                    <td>
                      {published ? (
                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap: 6,

                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          <button
                            type="button"
                            title="Subir candidato"
                            aria-label={`Subir ${
                              candidate.ballot_name ||
                              candidate.name
                            }`}
                            disabled={
                              isFirst
                            }
                            onClick={() =>
                              movePublished(
                                candidate.id,
                                -1
                              )
                            }
                            style={{
                              width: 36,
                              height: 36,

                              border:
                                "1px solid #d0d5dd",

                              borderRadius:
                                8,

                              background:
                                "#fff",

                              cursor:
                                isFirst
                                  ? "not-allowed"
                                  : "pointer",

                              opacity:
                                isFirst
                                  ? 0.35
                                  : 1,

                              fontSize:
                                18,

                              fontWeight:
                                900,
                            }}
                          >
                            ↑
                          </button>

                          <div
                            style={{
                              minWidth:
                                34,

                              height:
                                34,

                              padding:
                                "0 8px",

                              borderRadius:
                                17,

                              display:
                                "flex",

                              alignItems:
                                "center",

                              justifyContent:
                                "center",

                              background:
                                "#e9f7ef",

                              color:
                                "#157347",

                              fontWeight:
                                900,
                            }}
                          >
                            {position}
                          </div>

                          <button
                            type="button"
                            title="Descer candidato"
                            aria-label={`Descer ${
                              candidate.ballot_name ||
                              candidate.name
                            }`}
                            disabled={
                              isLast
                            }
                            onClick={() =>
                              movePublished(
                                candidate.id,
                                1
                              )
                            }
                            style={{
                              width: 36,
                              height: 36,

                              border:
                                "1px solid #d0d5dd",

                              borderRadius:
                                8,

                              background:
                                "#fff",

                              cursor:
                                isLast
                                  ? "not-allowed"
                                  : "pointer",

                              opacity:
                                isLast
                                  ? 0.35
                                  : 1,

                              fontSize:
                                18,

                              fontWeight:
                                900,
                            }}
                          >
                            ↓
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{
                            color:
                              "#98a2b3",

                            fontSize:
                              13,
                          }}
                        >
                          —
                        </span>
                      )}
                    </td>

                    {/* CANDIDATO */}

                    <td>
                      <div
                        style={{
                          fontWeight:
                            900,
                        }}
                      >
                        {candidate.ballot_name ||
                          candidate.name}
                      </div>

                      {candidate.ballot_name &&
                        candidate.ballot_name !==
                          candidate.name && (
                          <div
                            style={{
                              marginTop:
                                3,

                              color:
                                "#667085",

                              fontSize:
                                12,
                            }}
                          >
                            {
                              candidate.name
                            }
                          </div>
                        )}

                      {candidate.number && (
                        <div
                          style={{
                            marginTop:
                              4,

                            color:
                              "#667085",

                            fontSize:
                              12,
                          }}
                        >
                          Nº{" "}
                          {
                            candidate.number
                          }
                        </div>
                      )}
                    </td>

                    {/* ESTADO */}

                    <td>
                      <div>
                        {candidate.state_uf ||
                          "—"}
                      </div>

                      {candidate.city_name && (
                        <div
                          style={{
                            color:
                              "#667085",

                            fontSize:
                              12,

                            marginTop:
                              3,
                          }}
                        >
                          {
                            candidate.city_name
                          }
                        </div>
                      )}
                    </td>

                    {/* CARGO */}

                    <td>
                      {candidate.cargo ||
                        "—"}
                    </td>

                    {/* PARTIDO */}

                    <td>
                      {candidate.party ||
                        "—"}
                    </td>

                    {/* STATUS */}

                    <td>
                      <div
                        style={{
                          display:
                            "flex",

                          flexDirection:
                            "column",

                          alignItems:
                            "flex-start",

                          gap: 5,
                        }}
                      >
                        <span
                          className={`status-pill ${candidate.status}`}
                        >
                          {published
                            ? "Publicado"
                            : "Rascunho"}
                        </span>

                        {reviewLabel && (
                          <span
                            style={{
                              fontSize:
                                11,

                              color:
                                "#667085",

                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {
                              reviewLabel
                            }
                          </span>
                        )}
                      </div>
                    </td>

                    {/* AÇÃO */}

                    <td>
                      <Link
                        href={`/admin/candidatos/${candidate.id}`}
                        className="admin-edit"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      {/* MENSAGENS */}

      {message && (
        <div
          style={{
            margin: 18,

            padding: 12,

            borderRadius: 9,

            background:
              "#ecfdf3",

            color:
              "#027a48",

            fontWeight: 700,
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            margin: 18,

            padding: 12,

            borderRadius: 9,

            background:
              "#fef3f2",

            color:
              "#b42318",
          }}
        >
          {error}
        </div>
      )}
    </section>
  );
}
