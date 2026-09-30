"use client";

import { ChangeEvent, FormEvent, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { STATES } from "@/lib/states";

type TabId =
  | "identificacao"
  | "perfil"
  | "foto"
  | "contatos"
  | "fontes";

type CandidateFormProps = {
  initial?: any;
};

const CARGOS = [
  "Presidente",
  "Vice-Presidente",
  "Governador(a)",
  "Vice-Governador(a)",
  "Senador(a)",
  "Deputado(a) Federal",
  "Deputado(a) Estadual",
  "Deputado(a) Distrital",
  "Prefeito(a)",
  "Vice-Prefeito(a)",
  "Vereador(a)",
];

const MUNICIPAL_CARGOS = [
  "Prefeito(a)",
  "Vice-Prefeito(a)",
  "Vereador(a)",
];

const NATIONAL_CARGOS = [
  "Presidente",
  "Vice-Presidente",
];

function FieldHelp({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        marginTop: 6,
        color: "#667085",
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 24,
          color: "#101828",
        }}
      >
        {title}
      </h2>

      {description && (
        <p
          style={{
            margin: "7px 0 0",
            color: "#667085",
            lineHeight: 1.6,
            maxWidth: 760,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

export default function CandidateForm({
  initial,
}: CandidateFormProps) {
  const router = useRouter();

  const isNew = !initial?.id;

  const [activeTab, setActiveTab] =
    useState<TabId>("identificacao");

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    ballot_name: initial?.ballot_name ?? "",
    slug: initial?.slug ?? "",

    scope:
      initial?.state_uf === "BR"
        ? "national"
        : MUNICIPAL_CARGOS.includes(initial?.cargo)
          ? "municipal"
          : "state",

    state_uf: initial?.state_uf ?? "DF",
    city_name: initial?.city_name ?? "",
    cargo: initial?.cargo ?? "Deputado(a) Federal",
    party: initial?.party ?? "",
    number: initial?.number ?? "",

    display_order: Number(
      initial?.display_order ?? 1000
    ),

    photo_url: initial?.photo_url ?? "",

    photo_position_x: Number(
      initial?.photo_position_x ?? 50
    ),

    photo_position_y: Number(
      initial?.photo_position_y ?? 20
    ),

    photo_zoom: Number(
      initial?.photo_zoom ?? 1
    ),

    external_page_url:
      initial?.external_page_url ?? "",

    mini_cv: initial?.mini_cv ?? "",
    biography: initial?.biography ?? "",

    political_project:
      initial?.political_project ?? "",

    proposals: initial?.proposals ?? "",

    public_experience:
      initial?.public_experience ?? "",

    priority_areas:
      initial?.priority_areas ?? "",

    endorsement_reason:
      initial?.endorsement_reason ?? "",

    endorsement_issued_at:
      initial?.endorsement_issued_at ?? "",

    instagram_url:
      initial?.instagram_url ?? "",

    facebook_url:
      initial?.facebook_url ?? "",

    youtube_url:
      initial?.youtube_url ?? "",

    website_url:
      initial?.website_url ?? "",

    video_url:
      initial?.video_url ?? "",

    source_url:
      initial?.source_url ?? "",

    source_notes:
      initial?.source_notes ?? "",

    verified_at: initial?.verified_at
      ? initial.verified_at.substring(0, 10)
      : "",
});

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [savedMessage, setSavedMessage] =
    useState("");

  const [
    photoUploading,
    setPhotoUploading,
  ] = useState(false);

  const [
    photoUploadMessage,
    setPhotoUploadMessage,
  ] = useState("");

  function set(
    key: string,
    value: string | number
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setSavedMessage("");
  }

  function changeCargo(cargo: string) {
    setSavedMessage("");

    if (NATIONAL_CARGOS.includes(cargo)) {
      setForm((current) => ({
        ...current,
        cargo,
        scope: "national",
        state_uf: "BR",
        city_name: "",
      }));

      return;
    }

    if (cargo === "Deputado(a) Distrital") {
      setForm((current) => ({
        ...current,
        cargo,
        scope: "state",
        state_uf: "DF",
        city_name: "",
      }));

      return;
    }

    if (MUNICIPAL_CARGOS.includes(cargo)) {
      setForm((current) => ({
        ...current,
        cargo,
        scope: "municipal",
        state_uf:
          current.state_uf === "BR"
            ? "DF"
            : current.state_uf,
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      cargo,
      scope: "state",
      state_uf:
        current.state_uf === "BR"
          ? "DF"
          : current.state_uf,
      city_name: "",
    }));
  }

  async function uploadPhoto(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setError("");
    setPhotoUploadMessage("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Formato não permitido. Use JPG, PNG ou WebP."
      );

      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "A imagem excede o limite de 5 MB."
      );

      e.target.value = "";
      return;
    }

    if (!initial?.id) {
      setError(
        "Crie primeiro o candidato. Depois o upload da foto será liberado."
      );

      e.target.value = "";
      return;
    }

    setPhotoUploading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "Sessão administrativa não encontrada. Entre novamente no painel."
        );

        return;
      }

      const rawExtension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() || "";

      const extension = [
        "jpg",
        "jpeg",
        "png",
        "webp",
      ].includes(rawExtension)
        ? rawExtension
        : file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";

      const filePath =
        `${initial.id}/${Date.now()}-foto.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("candidate-photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

      if (uploadError) {
        setError(
          `Não foi possível enviar a foto: ${uploadError.message}`
        );

        return;
      }

      const { data: publicUrlData } =
        supabase.storage
          .from("candidate-photos")
          .getPublicUrl(filePath);

      setForm((current) => ({
        ...current,
        photo_url:
          publicUrlData.publicUrl,
      }));

      setPhotoUploadMessage(
        "Foto enviada. Clique em “Salvar alterações” para gravar a nova imagem no cadastro."
      );
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  }

  function centralizePhoto() {
    setForm((current) => ({
      ...current,
      photo_position_x: 50,
      photo_position_y: 50,
    }));
  }

  function restorePhoto() {
    setForm((current) => ({
      ...current,
      photo_position_x: 50,
      photo_position_y: 20,
      photo_zoom: 1,
    }));
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function save(e: FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSavedMessage("");

    try {
      const supabase = createClient();

      const slug =
        form.slug ||
        generateSlug(form.name);

      const {
        scope,
        endorsement_issued_at,
        ...formData
      } = form;

      const payload = {
        ...formData,

        slug,

        state_uf:
          scope === "national"
            ? "BR"
            : form.state_uf,

        city_name:
          scope === "municipal"
            ? form.city_name.trim()
            : null,

        display_order: Number(
          form.display_order
        ),

        photo_position_x: Number(
          form.photo_position_x
        ),

        photo_position_y: Number(
          form.photo_position_y
        ),

        photo_zoom: Number(
          form.photo_zoom
        ),

        verified_at:
          form.verified_at || null,

        // Nos novos cadastros sem data informada, o banco usa a data da inclusão
        // no horário de Brasília. Em cadastros existentes, a data é editável.
        ...(initial?.id
          ? { endorsement_issued_at: endorsement_issued_at || null }
          : endorsement_issued_at
            ? { endorsement_issued_at }
            : {}),

        updated_at:
          new Date().toISOString(),
      };

      if (initial?.id) {
        const { error: updateError } =
          await supabase
            .from("candidates")
            .update(payload)
            .eq("id", initial.id);

        if (updateError) {
          setError(updateError.message);
          return;
        }

        setSavedMessage(
          "Alterações salvas com sucesso."
        );

        router.refresh();
        return;
      }

      /*
       * NOVO CANDIDATO:
       * cria como rascunho e abre
       * imediatamente a ficha completa.
       */
      const { data, error: insertError } =
        await supabase
          .from("candidates")
          .insert({
            ...payload,
            // Publicação é controlada exclusivamente pelo painel de revisão/publicação.
            // Novos candidatos sempre começam como rascunho.
            status: "draft",
          })
          .select("id")
          .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (!data?.id) {
        setError(
          "O candidato foi criado, mas não foi possível abrir a ficha de edição."
        );

        return;
      }

      router.push(
        `/admin/candidatos/${data.id}`
      );

      router.refresh();
    } catch (err) {
      console.error(
        "Erro ao salvar candidato:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro inesperado ao salvar."
      );
    } finally {
      setSaving(false);
    }
  }

  const labelStyle = {
    display: "block",
    fontWeight: 700,
    marginBottom: 7,
    color: "#344054",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(250px,1fr))",
    gap: 18,
  };

  const panelStyle = {
    padding: 22,
    border: "1px solid #e4e7ec",
    borderRadius: 14,
    background: "#fff",
  };

  const tabs: {
    id: TabId;
    number: number;
    title: string;
  }[] = [
    {
      id: "identificacao",
      number: 1,
      title: "Identificação",
    },
    {
      id: "perfil",
      number: 2,
      title: "Perfil",
    },
    {
      id: "foto",
      number: 3,
      title: "Foto e mídia",
    },
    {
      id: "contatos",
      number: 4,
      title: "Contatos",
    },
    {
      id: "fontes",
      number: 5,
      title: "Fontes",
    },
  ];

  return (
    <form onSubmit={save}>
      {/* =====================================================
          NAVEGAÇÃO DAS ABAS
      ===================================================== */}

      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: 6,
          marginBottom: 22,
          border: "1px solid #e4e7ec",
          borderRadius: 14,
          background: "#f9fafb",
        }}
      >
        {tabs.map((tab) => {
          const active =
            activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(tab.id)
              }
              style={{
                flex: "1 0 auto",
                minWidth: 145,
                padding: "11px 14px",
                border: 0,
                borderRadius: 10,
                background: active
                  ? "#157347"
                  : "transparent",
                color: active
                  ? "#fff"
                  : "#344054",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  width: 22,
                  height: 22,
                  marginRight: 7,
                  borderRadius: "50%",
                  background: active
                    ? "rgba(255,255,255,.18)"
                    : "#eaecf0",
                  fontSize: 12,
                }}
              >
                {tab.number}
              </span>

              {tab.title}
            </button>
          );
        })}
      </div>

      {/* =====================================================
          ABA 1 — IDENTIFICAÇÃO
      ===================================================== */}

      {activeTab ===
        "identificacao" && (
        <section style={panelStyle}>
          <SectionTitle
            title="Identificação"
            description={
              isNew
                ? "Comece pelos dados essenciais. Depois de criar o candidato, a ficha completa será aberta automaticamente."
                : "Dados eleitorais e administrativos básicos do cadastro."
            }
          />

          <div style={gridStyle}>
            <label>
              <span style={labelStyle}>
                Nome completo *
              </span>

              <input
                className="field"
                required
                value={form.name}
                onChange={(e) =>
                  set(
                    "name",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              <span style={labelStyle}>
                Nome na urna
              </span>

              <input
                className="field"
                value={
                  form.ballot_name
                }
                onChange={(e) =>
                  set(
                    "ballot_name",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              <span style={labelStyle}>
                Cargo *
              </span>

              <select
                className="field"
                required
                value={form.cargo}
                onChange={(e) =>
                  changeCargo(
                    e.target.value
                  )
                }
              >
                {CARGOS.map(
                  (cargo) => (
                    <option
                      key={cargo}
                      value={cargo}
                    >
                      {cargo}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span style={labelStyle}>
                Abrangência
              </span>

              <select
                className="field"
                value={form.scope}
                disabled
              >
                <option value="national">
                  Nacional
                </option>

                <option value="state">
                  Estadual / Distrital
                </option>

                <option value="municipal">
                  Municipal
                </option>
              </select>

              <FieldHelp>
                Definida automaticamente
                pelo cargo.
              </FieldHelp>
            </label>

            {form.scope !==
              "national" && (
              <label>
                <span
                  style={labelStyle}
                >
                  Estado *
                </span>

                <select
                  className="field"
                  required
                  value={
                    form.state_uf
                  }
                  disabled={
                    form.cargo ===
                    "Deputado(a) Distrital"
                  }
                  onChange={(e) =>
                    set(
                      "state_uf",
                      e.target.value
                    )
                  }
                >
                  {STATES.map(
                    (state) => (
                      <option
                        key={
                          state.uf
                        }
                        value={
                          state.uf
                        }
                      >
                        {state.uf} —{" "}
                        {state.name}
                      </option>
                    )
                  )}
                </select>
              </label>
            )}

            {form.scope ===
              "municipal" && (
              <label>
                <span
                  style={labelStyle}
                >
                  Município *
                </span>

                <input
                  className="field"
                  required
                  value={
                    form.city_name
                  }
                  onChange={(e) =>
                    set(
                      "city_name",
                      e.target.value
                    )
                  }
                />
              </label>
            )}

            <label>
              <span style={labelStyle}>
                Partido
              </span>

              <input
                className="field"
                placeholder="Ex.: PL"
                value={form.party}
                onChange={(e) =>
                  set(
                    "party",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              <span style={labelStyle}>
                Número
              </span>

              <input
                className="field"
                value={form.number}
                onChange={(e) =>
                  set(
                    "number",
                    e.target.value
                  )
                }
              />
            </label>

            {!isNew && (
              <>
                <label>
                  <span
                    style={labelStyle}
                  >
                    Ordem de exibição
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="field"
                    value={
                      form.display_order
                    }
                    onChange={(e) =>
                      set(
                        "display_order",
                        Number(
                          e.target
                            .value
                        )
                      )
                    }
                  />

                  <FieldHelp>
                    Menor número aparece
                    primeiro.
                  </FieldHelp>
                </label>


              </>
            )}

            {!isNew && (
              <label>
                <span
                  style={labelStyle}
                >
                  Slug da URL
                </span>

                <input
                  className="field"
                  placeholder="Gerado automaticamente"
                  value={form.slug}
                  onChange={(e) =>
                    set(
                      "slug",
                      e.target.value
                    )
                  }
                />
              </label>
            )}
          </div>

          {isNew && (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: 12,
                background: "#f0fdf4",
                border:
                  "1px solid #bbf7d0",
                color: "#166534",
                lineHeight: 1.55,
              }}
            >
              <strong>
                Cadastro inicial
              </strong>

              <div
                style={{
                  marginTop: 4,
                }}
              >
                O candidato será criado
                como rascunho. Em seguida
                você poderá adicionar
                foto, perfil, contatos,
                fontes, escritórios e
                gerar o link de
                preenchimento.
              </div>
            </div>
          )}
        </section>
      )}

      {/* =====================================================
          ABA 2 — PERFIL
      ===================================================== */}

      {activeTab === "perfil" && (
        <section style={panelStyle}>
          <SectionTitle
            title="Perfil e apresentação"
            description="Informações apresentadas sobre trajetória, experiência e propostas do candidato."
          />

          <label>
            <span style={labelStyle}>
              Mini-CV
            </span>

            <textarea
              className="field"
              rows={5}
              placeholder="Resumo da formação, profissão e trajetória."
              value={form.mini_cv}
              onChange={(e) =>
                set(
                  "mini_cv",
                  e.target.value
                )
              }
            />
          </label>

          <label
            style={{
              display: "block",
              marginTop: 20,
            }}
          >
            <span style={labelStyle}>
              Biografia
            </span>

            <textarea
              className="field"
              rows={7}
              value={form.biography}
              onChange={(e) =>
                set(
                  "biography",
                  e.target.value
                )
              }
            />
          </label>

          <label
            style={{
              display: "block",
              marginTop: 20,
            }}
          >
            <span style={labelStyle}>
              Projeto político
            </span>

            <textarea
              className="field"
              rows={7}
              placeholder="Descrição do projeto político apresentado pelo candidato."
              value={
                form.political_project
              }
              onChange={(e) =>
                set(
                  "political_project",
                  e.target.value
                )
              }
            />
          </label>

          <label
            style={{
              display: "block",
              marginTop: 20,
            }}
          >
            <span style={labelStyle}>
              Principais propostas
            </span>

            <textarea
              className="field"
              rows={7}
              value={form.proposals}
              onChange={(e) =>
                set(
                  "proposals",
                  e.target.value
                )
              }
            />
          </label>

          <label
            style={{
              display: "block",
              marginTop: 20,
            }}
          >
            <span style={labelStyle}>
              Experiência pública
            </span>

            <textarea
              className="field"
              rows={6}
              placeholder="Mandatos, cargos e outras experiências públicas."
              value={
                form.public_experience
              }
              onChange={(e) =>
                set(
                  "public_experience",
                  e.target.value
                )
              }
            />
          </label>

          <label
            style={{
              display: "block",
              marginTop: 20,
            }}
          >
            <span style={labelStyle}>
              Áreas prioritárias
            </span>

            <textarea
              className="field"
              rows={4}
              placeholder="Ex.: saúde, educação, segurança pública, economia..."
              value={
                form.priority_areas
              }
              onChange={(e) =>
                set(
                  "priority_areas",
                  e.target.value
                )
              }
            />
          </label>

          <label style={{ display: "block", marginTop: 24, padding: 18, background: "#f0f9f4", border: "1px solid #b8e2c8", borderRadius: 14 }}>
            <span style={labelStyle}>Por que o MFB apoia esta candidatura?</span>
            <FieldHelp>Nota institucional exibida ao lado do selo de apoio na página pública. Descreva motivos específicos e aprovados pelo Movimento; evite atribuir propostas não confirmadas à candidatura.</FieldHelp>
            <textarea
              className="field"
              rows={5}
              maxLength={900}
              placeholder="O Movimento Família Brasileira apoia esta candidatura por..."
              value={form.endorsement_reason}
              onChange={(e) => set("endorsement_reason", e.target.value)}
              style={{ marginTop: 10 }}
            />
          </label>
          <label style={{ display: "block", marginTop: 16, maxWidth: 340 }}>
            <span style={labelStyle}>Data de emissão do certificado</span>
            <input
              className="field"
              type="date"
              value={form.endorsement_issued_at}
              onChange={(e) => set("endorsement_issued_at", e.target.value)}
            />
            <FieldHelp>Informe a data efetiva da aprovação. Ela permanecerá fixa na página pública; não é substituída pela data de acesso.</FieldHelp>
          </label>
        </section>
      )}

      {/* =====================================================
          ABA 3 — FOTO E MÍDIA
      ===================================================== */}

      {activeTab === "foto" && (
        <section style={panelStyle}>
          <SectionTitle
            title="Foto e mídia"
            description="Envie a foto principal e ajuste o enquadramento utilizado nos cards públicos."
          />

          {!initial?.id ? (
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                background: "#fffaeb",
                border:
                  "1px solid #fedf89",
                color: "#93370d",
              }}
            >
              Crie primeiro o candidato
              para liberar o envio da
              foto.
            </div>
          ) : (
            <>
              <label
                htmlFor="candidate-photo-upload"
                style={{
                  display: "grid",
                  placeItems: "center",
                  minHeight: 170,
                  padding: 24,
                  border:
                    "2px dashed #98a2b3",
                  borderRadius: 14,
                  background:
                    photoUploading
                      ? "#f2f4f7"
                      : "#f9fafb",
                  cursor:
                    photoUploading
                      ? "wait"
                      : "pointer",
                  textAlign: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 34,
                      marginBottom: 8,
                    }}
                  >
                    📁
                  </div>

                  <strong>
                    {photoUploading
                      ? "Enviando foto..."
                      : "Selecionar foto"}
                  </strong>

                  <div
                    style={{
                      marginTop: 6,
                      color: "#667085",
                      fontSize: 13,
                    }}
                  >
                    JPG, PNG ou WebP •
                    máximo 5 MB
                  </div>
                </div>
              </label>

              <input
                id="candidate-photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={
                  photoUploading
                }
                onChange={uploadPhoto}
                style={{
                  display: "none",
                }}
              />
            </>
          )}

          {photoUploadMessage && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 9,
                background: "#ecfdf3",
                color: "#027a48",
              }}
            >
              {photoUploadMessage}
            </div>
          )}

          <label
            style={{
              display: "block",
              marginTop: 22,
            }}
          >
            <span style={labelStyle}>
              URL da foto
            </span>

            <input
              type="url"
              className="field"
              placeholder="https://..."
              value={form.photo_url}
              onChange={(e) =>
                set(
                  "photo_url",
                  e.target.value
                )
              }
            />

            <FieldHelp>
              Também é possível usar
              uma imagem externa.
            </FieldHelp>
          </label>

          {form.photo_url && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(220px,300px) minmax(280px,1fr)",
                gap: 28,
                marginTop: 26,
                alignItems: "start",
              }}
            >
              <div>
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "3 / 4",
                    borderRadius: 14,
                    overflow: "hidden",
                    border:
                      "1px solid #d0d5dd",
                    background: "#f2f4f7",
                    position: "relative",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.photo_url}
                    alt="Pré-visualização"
                    style={{
                      position:
                        "absolute",
                      width: "100%",
                      height: "100%",
                      inset: 0,
                      objectFit: "cover",
                      objectPosition:
                        `${form.photo_position_x}% ${form.photo_position_y}%`,
                      transform:
                        `scale(${form.photo_zoom})`,
                      transformOrigin:
                        `${form.photo_position_x}% ${form.photo_position_y}%`,
                    }}
                  />
                </div>

                <FieldHelp>
                  Pré-visualização do
                  formato 3:4.
                </FieldHelp>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 16,
                }}
              >
                {[
                  {
                    title:
                      "Posição horizontal",
                    key:
                      "photo_position_x",
                    min: 0,
                    max: 100,
                    step: 1,
                    value:
                      form.photo_position_x,
                    suffix: "%",
                  },
                  {
                    title:
                      "Posição vertical",
                    key:
                      "photo_position_y",
                    min: 0,
                    max: 100,
                    step: 1,
                    value:
                      form.photo_position_y,
                    suffix: "%",
                  },
                ].map(
                  (control) => (
                    <div
                      key={control.key}
                      style={{
                        padding: 18,
                        border:
                          "1px solid #e4e7ec",
                        borderRadius: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <strong>
                          {control.title}
                        </strong>

                        <span
                          style={{
                            color:
                              "#667085",
                          }}
                        >
                          {control.value}
                          {control.suffix}
                        </span>
                      </div>

                      <input
                        type="range"
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        value={
                          control.value
                        }
                        onChange={(e) =>
                          set(
                            control.key,
                            Number(
                              e.target
                                .value
                            )
                          )
                        }
                        style={{
                          width: "100%",
                        }}
                      />
                    </div>
                  )
                )}

                <div
                  style={{
                    padding: 18,
                    border:
                      "1px solid #e4e7ec",
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <strong>
                      Zoom
                    </strong>

                    <span
                      style={{
                        color: "#667085",
                      }}
                    >
                      {Math.round(
                        form.photo_zoom *
                          100
                      )}
                      %
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.01"
                    value={
                      form.photo_zoom
                    }
                    onChange={(e) =>
                      set(
                        "photo_zoom",
                        Number(
                          e.target
                            .value
                        )
                      )
                    }
                    style={{
                      width: "100%",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={
                      centralizePhoto
                    }
                  >
                    Centralizar
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={
                      restorePhoto
                    }
                  >
                    Restaurar padrão
                  </button>
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 30,
              paddingTop: 24,
              borderTop:
                "1px solid #e4e7ec",
            }}
          >
            <label>
              <span style={labelStyle}>
                Vídeo de apresentação
              </span>

              <input
                type="url"
                className="field"
                placeholder="https://..."
                value={form.video_url}
                onChange={(e) =>
                  set(
                    "video_url",
                    e.target.value
                  )
                }
              />
            </label>
          </div>
        </section>
      )}

      {/* =====================================================
          ABA 4 — CONTATOS
      ===================================================== */}

      {activeTab ===
        "contatos" && (
        <section style={panelStyle}>
          <SectionTitle
            title="Contatos e canais públicos"
            description="Links públicos relacionados ao candidato."
          />

          <div style={gridStyle}>
            <label>
              <span style={labelStyle}>
                Site oficial
              </span>

              <input
                type="url"
                className="field"
                placeholder="https://..."
                value={
                  form.website_url
                }
                onChange={(e) =>
                  set(
                    "website_url",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              <span style={labelStyle}>
                Instagram
              </span>

              <input
                type="url"
                className="field"
                placeholder="https://..."
                value={
                  form.instagram_url
                }
                onChange={(e) =>
                  set(
                    "instagram_url",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              <span style={labelStyle}>
                Facebook
              </span>

              <input
                type="url"
                className="field"
                placeholder="https://..."
                value={
                  form.facebook_url
                }
                onChange={(e) =>
                  set(
                    "facebook_url",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              <span style={labelStyle}>
                YouTube
              </span>

              <input
                type="url"
                className="field"
                placeholder="https://..."
                value={
                  form.youtube_url
                }
                onChange={(e) =>
                  set(
                    "youtube_url",
                    e.target.value
                  )
                }
              />
            </label>
          </div>

          <div
            style={{
              marginTop: 28,
              padding: 20,
              borderRadius: 12,
              background: "#f6fff9",
              border:
                "1px solid #abefc6",
            }}
          >
            <label>
              <span style={labelStyle}>
                Página externa do
                candidato
              </span>

              <input
                type="url"
                className="field"
                placeholder="https://..."
                value={
                  form.external_page_url
                }
                onChange={(e) =>
                  set(
                    "external_page_url",
                    e.target.value
                  )
                }
              />

              <FieldHelp>
                Pode ser página pública,
                site de campanha ou outro
                endereço institucional
                relacionado ao candidato.
              </FieldHelp>
            </label>

            {form.external_page_url && (
              <a
                href={
                  form.external_page_url
                }
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  display:
                    "inline-flex",
                  marginTop: 14,
                }}
              >
                Abrir página ↗
              </a>
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          ABA 5 — FONTES
      ===================================================== */}

      {activeTab === "fontes" && (
        <section style={panelStyle}>
          <SectionTitle
            title="Fontes e conferência"
            description="Registre a origem das informações utilizadas no cadastro para facilitar conferências e atualizações."
          />

          <label>
            <span style={labelStyle}>
              Fonte principal
            </span>

            <input
              type="url"
              className="field"
              placeholder="https://..."
              value={form.source_url}
              onChange={(e) =>
                set(
                  "source_url",
                  e.target.value
                )
              }
            />
          </label>

          <label
            style={{
              display: "block",
              marginTop: 20,
            }}
          >
            <span style={labelStyle}>
              Observações sobre as
              fontes
            </span>

            <textarea
              className="field"
              rows={5}
              value={
                form.source_notes
              }
              onChange={(e) =>
                set(
                  "source_notes",
                  e.target.value
                )
              }
            />
          </label>

          <label
            style={{
              display: "block",
              marginTop: 20,
              maxWidth: 320,
            }}
          >
            <span style={labelStyle}>
              Data da verificação
            </span>

            <input
              type="date"
              className="field"
              value={
                form.verified_at
              }
              onChange={(e) =>
                set(
                  "verified_at",
                  e.target.value
                )
              }
            />
          </label>

          {!isNew && (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: 12,
                background: "#f9fafb",
                border:
                  "1px solid #e4e7ec",
                color: "#475467",
                lineHeight: 1.55,
              }}
            >
              As fontes documentais
              detalhadas continuam
              disponíveis no módulo
              específico da ficha do
              candidato, abaixo deste
              formulário.
            </div>
          )}
        </section>
      )}

      {/* =====================================================
          MENSAGENS
      ===================================================== */}

      {error && (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 10,
            background: "#fef3f2",
            border:
              "1px solid #fecdca",
            color: "#b42318",
          }}
        >
          <strong>
            Não foi possível salvar.
          </strong>

          <div style={{ marginTop: 4 }}>
            {error}
          </div>
        </div>
      )}

      {savedMessage && (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 10,
            background: "#ecfdf3",
            border:
              "1px solid #abefc6",
            color: "#027a48",
          }}
        >
          ✓ {savedMessage}
        </div>
      )}

      {/* =====================================================
          BARRA DE AÇÕES
      ===================================================== */}

      <div
        style={{
          position: "sticky",
          bottom: 12,
          zIndex: 20,
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 24,
          padding: 14,
          border:
            "1px solid #d0d5dd",
          borderRadius: 14,
          background:
            "rgba(255,255,255,.96)",
          boxShadow:
            "0 10px 30px rgba(16,24,40,.10)",
          backdropFilter:
            "blur(8px)",
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            router.push(
              "/admin/candidatos"
            )
          }
        >
          ← Voltar para candidatos
        </button>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
        >
          {saving
            ? "Salvando..."
            : isNew
              ? "Criar candidato e continuar →"
              : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
