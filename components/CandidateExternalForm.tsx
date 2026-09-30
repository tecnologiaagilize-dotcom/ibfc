"use client";

import {
  FormEvent,
  useState,
} from "react";

type CandidateData = {
  name: string;
  ballot_name: string | null;
  state_uf: string;
  city_name: string | null;
  cargo: string;
  party: string | null;
  number: string | null;

  biography: string | null;
  mini_cv: string | null;
  political_project: string | null;
  public_experience: string | null;
  priority_areas: string | null;
  proposals: string | null;

  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  website_url: string | null;
  video_url: string | null;
  external_page_url: string | null;

  source_url: string | null;
  source_notes: string | null;
};

type Props = {
  token: string;
  candidate: CandidateData;
};

const inputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "12px 14px",
  border:
    "1px solid #d0d5dd",
  borderRadius: 9,
  background: "#fff",
  color: "#101828",
  fontSize: 15,
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  color: "#344054",
  fontWeight: 700,
  fontSize: 14,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children:
    React.ReactNode;
}) {
  return (
    <section
      style={{
        paddingTop: 26,
        marginTop: 26,
        borderTop:
          "1px solid #eaecf0",
      }}
    >
      <h3
        style={{
          margin: "0 0 5px",
          color: "#101828",
          fontSize: 21,
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            margin: "0 0 18px",
            color: "#667085",
            lineHeight: 1.5,
            fontSize: 14,
          }}
        >
          {description}
        </p>
      )}

      {children}
    </section>
  );
}

export default function CandidateExternalForm({
  token,
  candidate,
}: Props) {
  const [form, setForm] =
    useState({
      name:
        candidate.name || "",

      ballot_name:
        candidate.ballot_name ||
        "",

      state_uf:
        candidate.state_uf ||
        "",

      city_name:
        candidate.city_name ||
        "",

      cargo:
        candidate.cargo || "",

      party:
        candidate.party || "",

      number:
        candidate.number || "",

      mini_cv:
        candidate.mini_cv ||
        "",

      biography:
        candidate.biography ||
        "",

      public_experience:
        candidate.public_experience ||
        "",

      political_project:
        candidate.political_project ||
        "",

      priority_areas:
        candidate.priority_areas ||
        "",

      proposals:
        candidate.proposals ||
        "",

      instagram_url:
        candidate.instagram_url ||
        "",

      facebook_url:
        candidate.facebook_url ||
        "",

      youtube_url:
        candidate.youtube_url ||
        "",

      website_url:
        candidate.website_url ||
        "",

      video_url:
        candidate.video_url ||
        "",

      external_page_url:
        candidate.external_page_url ||
        "",

      source_url:
        candidate.source_url ||
        "",

      source_notes:
        candidate.source_notes ||
        "",
    });

  const [
    confirmed,
    setConfirmed,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    submitted,
    setSubmitted,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  function change(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    setError("");

    if (!confirmed) {
      setError(
        "Confirme a declaração antes de enviar."
      );
      return;
    }

    setSending(true);

    try {
      const response =
        await fetch(
          `/api/candidate-invite/${encodeURIComponent(
            token
          )}/submit`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              ...form,
              confirmed,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Não foi possível enviar o cadastro."
        );
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o cadastro."
      );
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          marginTop: 26,
          padding: 28,
          background: "#ecfdf3",
          border:
            "1px solid #abefc6",
          borderRadius: 14,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 38,
            marginBottom: 10,
          }}
        >
          ✓
        </div>

        <h2
          style={{
            color: "#027a48",
            margin: "0 0 8px",
          }}
        >
          Cadastro enviado
        </h2>

        <p
          style={{
            margin: 0,
            color: "#475467",
            lineHeight: 1.6,
          }}
        >
          As informações foram
          encaminhadas para análise.
          Elas somente serão
          incorporadas ao cadastro
          após aprovação administrativa.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <Section
        title="1. Identificação"
        description="Revise os dados básicos do cadastro."
      >
        <div style={gridStyle}>
          <div>
            <label
              style={labelStyle}
            >
              Nome completo *
            </label>

            <input
              required
              style={inputStyle}
              value={form.name}
              onChange={(e) =>
                change(
                  "name",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label
              style={labelStyle}
            >
              Nome de urna
            </label>

            <input
              style={inputStyle}
              value={
                form.ballot_name
              }
              onChange={(e) =>
                change(
                  "ballot_name",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label
              style={labelStyle}
            >
              Cargo *
            </label>

            <input
              required
              style={inputStyle}
              value={form.cargo}
              onChange={(e) =>
                change(
                  "cargo",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label
              style={labelStyle}
            >
              UF *
            </label>

            <input
              required
              maxLength={2}
              style={inputStyle}
              value={
                form.state_uf
              }
              onChange={(e) =>
                change(
                  "state_uf",
                  e.target.value
                    .toUpperCase()
                )
              }
            />
          </div>

          <div>
            <label
              style={labelStyle}
            >
              Município
            </label>

            <input
              style={inputStyle}
              value={
                form.city_name
              }
              onChange={(e) =>
                change(
                  "city_name",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label
              style={labelStyle}
            >
              Partido
            </label>

            <input
              style={inputStyle}
              value={form.party}
              onChange={(e) =>
                change(
                  "party",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label
              style={labelStyle}
            >
              Número
            </label>

            <input
              style={inputStyle}
              value={form.number}
              onChange={(e) =>
                change(
                  "number",
                  e.target.value
                )
              }
            />
          </div>
        </div>
      </Section>

      <Section
        title="2. Apresentação"
        description="Informações públicas para apresentação do cadastro."
      >
        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          <div>
            <label
              style={labelStyle}
            >
              Mini currículo
            </label>

            <textarea
              rows={4}
              style={inputStyle}
              value={form.mini_cv}
              onChange={(e) =>
                change(
                  "mini_cv",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label
              style={labelStyle}
            >
              Biografia
            </label>

            <textarea
              rows={6}
              style={inputStyle}
              value={
                form.biography
              }
              onChange={(e) =>
                change(
                  "biography",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label
              style={labelStyle}
            >
              Experiência pública
            </label>

            <textarea
              rows={5}
              style={inputStyle}
              value={
                form.public_experience
              }
              onChange={(e) =>
                change(
                  "public_experience",
                  e.target.value
                )
              }
            />
          </div>
        </div>
      </Section>

      <Section
        title="3. Projeto e propostas"
        description="Descreva as informações que deverão ser analisadas pela equipe responsável."
      >
        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          <div>
            <label
              style={labelStyle}
            >
              Projeto político
            </label>

            <textarea
              rows={5}
              style={inputStyle}
              value={
                form.political_project
              }
              onChange={(e) =>
                change(
                  "political_project",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label
              style={labelStyle}
            >
              Áreas prioritárias
            </label>

            <textarea
              rows={4}
              style={inputStyle}
              value={
                form.priority_areas
              }
              onChange={(e) =>
                change(
                  "priority_areas",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label
              style={labelStyle}
            >
              Propostas
            </label>

            <textarea
              rows={7}
              style={inputStyle}
              value={
                form.proposals
              }
              onChange={(e) =>
                change(
                  "proposals",
                  e.target.value
                )
              }
            />
          </div>
        </div>
      </Section>

      <Section
        title="4. Comunicação"
        description="Informe endereços públicos e oficiais."
      >
        <div style={gridStyle}>
          <UrlField
            label="Instagram"
            value={
              form.instagram_url
            }
            onChange={(value) =>
              change(
                "instagram_url",
                value
              )
            }
          />

          <UrlField
            label="Facebook"
            value={
              form.facebook_url
            }
            onChange={(value) =>
              change(
                "facebook_url",
                value
              )
            }
          />

          <UrlField
            label="YouTube"
            value={
              form.youtube_url
            }
            onChange={(value) =>
              change(
                "youtube_url",
                value
              )
            }
          />

          <UrlField
            label="Site oficial"
            value={
              form.website_url
            }
            onChange={(value) =>
              change(
                "website_url",
                value
              )
            }
          />

          <UrlField
            label="Vídeo"
            value={
              form.video_url
            }
            onChange={(value) =>
              change(
                "video_url",
                value
              )
            }
          />

          <UrlField
            label="Página externa"
            value={
              form.external_page_url
            }
            onChange={(value) =>
              change(
                "external_page_url",
                value
              )
            }
          />
        </div>
      </Section>

      <Section
        title="5. Fontes"
        description="Informe fontes públicas que permitam conferir as informações."
      >
        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          <UrlField
            label="Link da fonte"
            value={
              form.source_url
            }
            onChange={(value) =>
              change(
                "source_url",
                value
              )
            }
          />

          <div>
            <label
              style={labelStyle}
            >
              Observações sobre as
              fontes
            </label>

            <textarea
              rows={4}
              style={inputStyle}
              value={
                form.source_notes
              }
              onChange={(e) =>
                change(
                  "source_notes",
                  e.target.value
                )
              }
            />
          </div>
        </div>
      </Section>

      <Section title="6. Confirmação">
        <label
          style={{
            display: "flex",
            gap: 12,
            alignItems:
              "flex-start",
            padding: 18,
            borderRadius: 12,
            background: "#f9fafb",
            border:
              "1px solid #eaecf0",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) =>
              setConfirmed(
                e.target.checked
              )
            }
            style={{
              marginTop: 3,
            }}
          />

          <span
            style={{
              color: "#475467",
              lineHeight: 1.6,
            }}
          >
            Declaro que as
            informações fornecidas
            são verdadeiras e
            autorizo seu envio para
            análise e eventual
            publicação no portal
            MFB.
          </span>
        </label>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 10,
              background: "#fef3f2",
              border:
                "1px solid #fecdca",
              color: "#b42318",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            sending ||
            !confirmed
          }
          style={{
            marginTop: 20,
            width: "100%",
            padding: "14px 20px",
            border: 0,
            borderRadius: 10,
            background:
              confirmed
                ? "#157347"
                : "#d0d5dd",
            color: "#fff",
            fontSize: 16,
            fontWeight: 800,
            cursor:
              sending ||
              !confirmed
                ? "not-allowed"
                : "pointer",
          }}
        >
          {sending
            ? "Enviando..."
            : "Enviar para análise"}
        </button>
      </Section>
    </form>
  );
}

function UrlField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      <input
        type="url"
        placeholder="https://"
        style={inputStyle}
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
      />
    </div>
  );
}
