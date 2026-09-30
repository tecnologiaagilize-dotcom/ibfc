import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getPublicSharedCandidate, sharedCandidateName } from "@/lib/candidates/public-share";
import { Header } from "@/components/Header";
import { MotionEnhancements } from "@/components/MotionEnhancements";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const candidate = await getPublicSharedCandidate(slug);

  if (!candidate) {
    return {
      title: "Candidatos indicados pelo MFB",
      description: "Conheça os candidatos indicados pelo Movimento Família Brasileira.",
    };
  }

  const name = sharedCandidateName(candidate);
  const title = `${name} | Candidatos indicados pelo MFB`;
  const description = `Conheça o perfil de ${name}, ${candidate.cargo} em ${candidate.state_uf}, indicado(a) pelo Movimento Família Brasileira.`;
  const url = `/candidato/${encodeURIComponent(candidate.slug)}`;
  const image = `${url}/opengraph-image?mfb=5`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "profile",
      url,
      images: [{ url: image, width: 1200, height: 630, alt: `${name} — indicado(a) pelo MFB` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

type ActivitySource = {
  source_name?: string | null;
  source_url?: string | null;
  source_type?: string | null;
  official_url?: string | null;
  verification_status?: string | null;
};

type PublicCandidateSource = {
  id: string;
  source_type: string;
  title: string | null;
  url: string | null;
  value: string | null;
  source_name: string | null;
  source_domain: string | null;
  evidence_url: string | null;
  source_level: string | null;
  validation_status: string;
  is_public: boolean;
  is_primary: boolean;
};

type PublicOffice = {
  id: string;
  office_type: string | null;
  name: string | null;
  address: string | null;
  address_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state_uf: string | null;
  postal_code: string | null;
  phone: string | null;
  whatsapp: string | null;
  public_email: string | null;
  opening_hours: string | null;
  maps_url: string | null;
  is_public: boolean;
};

const SOURCE_TYPES: Record<string, string> = {
  tse: "Justiça Eleitoral / TSE",
  partido: "Página do partido",
  site_campanha: "Site / página de campanha",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  email_campanha: "E-mail público de campanha",
  telefone_campanha: "Telefone público de campanha",
  whatsapp_campanha: "WhatsApp público de campanha",
  proposta_governo: "Proposta / plano de governo",
  outra_fonte: "Outra fonte",
};

const SOURCE_LEVELS: Record<string, string> = {
  justica_eleitoral: "Justiça Eleitoral",
  partido: "Partido / federação",
  candidato_campanha: "Candidato / campanha",
  web: "Internet / outra origem",
};

const OFFICE_TYPES: Record<string, string> = {
  office: "Escritório",
  committee: "Comitê",
  headquarters: "Sede",
  support_point: "Ponto de atendimento",
  service_point: "Ponto de atendimento",
  other: "Local de atendimento",
};

function formatDate(value?: string | null) {
  if (!value) return null;

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function sourceUrl(item: ActivitySource) {
  return item.official_url || item.source_url || null;
}

function SourceLink({
  item,
}: {
  item: ActivitySource;
}) {
  const url = sourceUrl(item);

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        marginTop: 10,
        color: "#157347",
        fontSize: 13,
        fontWeight: 800,
        textDecoration: "none",
      }}
    >
      Consultar fonte ↗
    </a>
  );
}

function VerifiedBadge({
  status,
}: {
  status?: string | null;
}) {
  if (status !== "verified") return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 999,
        background: "#ecfdf3",
        color: "#027a48",
        border: "1px solid #abefc6",
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      Fonte verificada
    </span>
  );
}

function ContentSection({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="mfb-profile-section"
    >
      <h2
        className="mfb-profile-section-title"
      >
        {title}
      </h2>

      {children}
    </section>
  );
}

function ActivityCard({
  title,
  meta,
  description,
  children,
  source,
}: {
  title: string;
  meta?: string | null;
  description?: string | null;
  children?: React.ReactNode;
  source?: ActivitySource;
}) {
  return (
    <article
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
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              lineHeight: 1.4,
              color: "#101828",
            }}
          >
            {title}
          </h3>

          {meta && (
            <div
              style={{
                marginTop: 5,
                color: "#667085",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {meta}
            </div>
          )}
        </div>

        {source && (
          <VerifiedBadge
            status={source.verification_status}
          />
        )}
      </div>

      {description && (
        <p
          style={{
            margin: "12px 0 0",
            color: "#475467",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}
        >
          {description}
        </p>
      )}

      {children}

      {source && <SourceLink item={source} />}
    </article>
  );
}

function PublicSourceCard({
  source,
}: {
  source: PublicCandidateSource;
}) {
  const title =
    source.title ||
    SOURCE_TYPES[source.source_type] ||
    "Fonte";

  const type =
    SOURCE_TYPES[source.source_type] ||
    source.source_type;

  const level = source.source_level
    ? SOURCE_LEVELS[source.source_level] ||
      source.source_level
    : null;

  return (
    <article
      style={{
        padding: 18,
        border: source.is_primary
          ? "2px solid #157347"
          : "1px solid #e4e7ec",
        borderRadius: 14,
        background: source.is_primary
          ? "#f6fef9"
          : "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 7,
              flexWrap: "wrap",
              marginBottom: 7,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                padding: "4px 8px",
                borderRadius: 999,
                background: "#ecfdf3",
                color: "#027a48",
                border: "1px solid #abefc6",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              Fonte aprovada
            </span>

            {source.is_primary && (
              <span
                style={{
                  display: "inline-flex",
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "#fffaeb",
                  color: "#b54708",
                  border: "1px solid #fedf89",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                Fonte principal
              </span>
            )}
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: 17,
              color: "#101828",
            }}
          >
            {title}
          </h3>

          <div
            style={{
              marginTop: 7,
              color: "#667085",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <div>
              <strong>Tipo:</strong> {type}
            </div>

            {source.source_name && (
              <div>
                <strong>Origem:</strong>{" "}
                {source.source_name}
              </div>
            )}

            {level && (
              <div>
                <strong>Nível:</strong> {level}
              </div>
            )}

            {source.source_domain && (
              <div>
                <strong>Domínio:</strong>{" "}
                {source.source_domain}
              </div>
            )}

            {source.value && (
              <div>
                <strong>Referência:</strong>{" "}
                {source.value}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 9,
          flexWrap: "wrap",
          marginTop: 14,
        }}
      >
        {source.url?.startsWith("http") && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Abrir fonte ↗
          </a>
        )}

        {source.evidence_url?.startsWith("http") &&
          source.evidence_url !== source.url && (
            <a
              href={source.evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Ver comprovação ↗
            </a>
          )}
      </div>
    </article>
  );
}

function OfficeCard({
  office,
}: {
  office: PublicOffice;
}) {
  const officeType =
    (office.office_type &&
      OFFICE_TYPES[office.office_type]) ||
    office.office_type ||
    "Local de atendimento";

  const addressLine = [
    office.address,
    office.address_number,
  ]
    .filter(Boolean)
    .join(", ");

  const cityLine = [
    office.neighborhood,
    office.city,
    office.state_uf,
  ]
    .filter(Boolean)
    .join(" · ");

  const whatsappDigits =
    office.whatsapp?.replace(/\D/g, "") || "";

  const phoneHref =
    office.phone?.replace(/[^\d+]/g, "") || "";

  return (
    <article
      style={{
        padding: 20,
        border: "1px solid #e4e7ec",
        borderRadius: 14,
        background: "#fff",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#157347",
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {officeType}
      </div>

      <h3
        style={{
          margin: "7px 0 0",
          fontSize: 19,
          color: "#101828",
        }}
      >
        {office.name || officeType}
      </h3>

      {(addressLine ||
        office.complement ||
        cityLine ||
        office.postal_code) && (
        <div
          style={{
            marginTop: 14,
            color: "#475467",
            lineHeight: 1.7,
            fontSize: 14,
          }}
        >
          {addressLine && <div>{addressLine}</div>}

          {office.complement && (
            <div>{office.complement}</div>
          )}

          {cityLine && <div>{cityLine}</div>}

          {office.postal_code && (
            <div>CEP {office.postal_code}</div>
          )}
        </div>
      )}

      {office.opening_hours && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 9,
            background: "#f9fafb",
            color: "#344054",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <strong>Horário:</strong>{" "}
          {office.opening_hours}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 9,
          flexWrap: "wrap",
          marginTop: 16,
        }}
      >
        {office.phone && phoneHref && (
          <a
            href={`tel:${phoneHref}`}
            className="btn btn-secondary"
          >
            Telefone
          </a>
        )}

        {office.whatsapp &&
          whatsappDigits && (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              WhatsApp
            </a>
          )}

        {office.public_email && (
          <a
            href={`mailto:${office.public_email}`}
            className="btn btn-secondary"
          >
            E-mail
          </a>
        )}

        {office.maps_url?.startsWith("http") && (
          <a
            href={office.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Ver localização ↗
          </a>
        )}
      </div>
    </article>
  );
}

export default async function CandidatePage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: candidate } = await supabase
    .from("candidates_public")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!candidate) {
    return notFound();
  }

  const [
    positionsResult,
    propositionsResult,
    votesResult,
    committeesResult,
    deliveriesResult,
    sourcesResult,
    officesResult,
  ] = await Promise.all([
    supabase
      .from("candidate_public_positions")
      .select("*")
      .eq("candidate_id", candidate.id)
      .order("start_date", {
        ascending: false,
      }),

    supabase
      .from("candidate_public_propositions")
      .select("*")
      .eq("candidate_id", candidate.id)
      .order("presented_at", {
        ascending: false,
      }),

    supabase
      .from("candidate_public_votes")
      .select("*")
      .eq("candidate_id", candidate.id)
      .order("vote_date", {
        ascending: false,
      }),

    supabase
      .from("candidate_public_committees")
      .select("*")
      .eq("candidate_id", candidate.id)
      .order("start_date", {
        ascending: false,
      }),

    supabase
      .from("candidate_public_deliveries")
      .select("*")
      .eq("candidate_id", candidate.id)
      .order("occurred_at", {
        ascending: false,
      }),

    /*
     * Somente campos destinados à exibição pública.
     * Campos administrativos como notes, rejection_reason
     * e created_by não são consultados.
     */
    supabase
      .from("candidate_sources")
      .select(
        `
          id,
          source_type,
          title,
          url,
          value,
          source_name,
          source_domain,
          evidence_url,
          source_level,
          validation_status,
          is_public,
          is_primary,
          created_at
        `
      )
      .eq("candidate_id", candidate.id)
      .eq("validation_status", "approved")
      .eq("is_public", true)
      .order("is_primary", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      }),

    /*
     * Presença territorial.
     * contact_name e demais informações internas
     * não são consultados.
     */
    supabase
      .from("candidate_offices")
      .select(
        `
          id,
          office_type,
          name,
          address,
          address_number,
          complement,
          neighborhood,
          city,
          state_uf,
          postal_code,
          phone,
          whatsapp,
          public_email,
          opening_hours,
          maps_url,
          is_public
        `
      )
      .eq("candidate_id", candidate.id)
      .eq("is_public", true)
      .order("created_at", {
        ascending: true,
      }),
  ]);

  const positions =
    positionsResult.data || [];

  const propositions =
    propositionsResult.data || [];

  const votes =
    votesResult.data || [];

  const committees =
    committeesResult.data || [];

  const deliveries =
    deliveriesResult.data || [];

  const publicSources =
    (sourcesResult.data ||
      []) as PublicCandidateSource[];

  const publicOffices =
    (officesResult.data ||
      []) as PublicOffice[];

  const hasActivity =
    positions.length > 0 ||
    propositions.length > 0 ||
    votes.length > 0 ||
    committees.length > 0 ||
    deliveries.length > 0;

  const publicName =
    candidate.ballot_name && !/^\d+$/.test(candidate.ballot_name.trim())
      ? candidate.ballot_name
      : candidate.name;

  const territory =
    candidate.state_uf === "BR"
      ? "Brasil"
      : candidate.city_name
        ? `${candidate.city_name} · ${
            candidate.state_name ||
            candidate.state_uf
          }`
        : candidate.state_name ||
          candidate.state_uf;

  const hasProfile =
    candidate.mini_cv ||
    candidate.biography;

  const hasPoliticalContent =
    candidate.political_project ||
    candidate.proposals ||
    candidate.priority_areas;

  return (
    <>
      <Header />

      <main
        className="section"
        style={{
          background: "#f8fafc",
        }}
      >
        <div
          className="container"
          style={{
            maxWidth: 1050,
          }}
        >
          {/* VOLTAR */}

          <div
            style={{
              marginBottom: 22,
            }}
          >
            <Link
              href="/candidatos"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "#157347",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              ← Voltar para candidatos
            </Link>
          </div>

          <div
            className="card mfb-profile-card"
            style={{
              padding: 28,
              overflow: "hidden",
            }}
          >
            <MotionEnhancements page="profile" />
            <header className="mfb-profile-hero">
              <div className="mfb-profile-photo">
                {candidate.photo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={candidate.photo_url}
                    alt={`Foto de ${publicName}`}
                    style={{
                      objectPosition: `${candidate.photo_position_x ?? 50}% ${candidate.photo_position_y ?? 20}%`,
                      transform: `scale(${candidate.photo_zoom ?? 1})`,
                    }}
                  />
                ) : (
                  <span aria-hidden="true">{publicName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="mfb-profile-intro">
                <h1>{publicName}</h1>
                {candidate.ballot_name && candidate.name !== publicName && (
                  <p className="mfb-profile-civil-name">{candidate.name}</p>
                )}
                <p className="mfb-profile-meta">
                  {[candidate.cargo, territory, candidate.party, candidate.number && `Nº ${candidate.number}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </header>

            {candidate.endorsement_reason?.trim() && (
              <ContentSection id="apoio" title="Motivo da indicação">
                <p style={{ margin: 0, lineHeight: 1.8, color: "#475467", whiteSpace: "pre-wrap" }}>
                  {candidate.endorsement_reason}
                </p>
              </ContentSection>
            )}

            <nav className="mfb-profile-nav" aria-label="Navegação do perfil">
              {candidate.endorsement_reason?.trim() && <a href="#apoio">Indicação</a>}
              {hasProfile && <a href="#sobre">Trajetória</a>}
              {hasPoliticalContent && <a href="#propostas">Projeto e propostas</a>}
              {hasActivity && <a href="#atuacao">Atuação documentada</a>}
              {candidate.public_experience && <a href="#experiencia">Experiência</a>}
              {publicOffices.length > 0 && <a href="#territorio">Presença</a>}
              {(publicSources.length > 0 || candidate.source_url) && <a href="#fontes">Fontes</a>}
              {candidate.website_url && <a href={candidate.website_url} target="_blank" rel="noopener noreferrer">Site ↗</a>}
              {candidate.instagram_url && <a href={candidate.instagram_url} target="_blank" rel="noopener noreferrer">Instagram ↗</a>}
              {candidate.facebook_url && <a href={candidate.facebook_url} target="_blank" rel="noopener noreferrer">Facebook ↗</a>}
              {candidate.youtube_url && <a href={candidate.youtube_url} target="_blank" rel="noopener noreferrer">YouTube ↗</a>}
              {candidate.video_url && <a href="#apresentacao">Vídeo</a>}
            </nav>

            {/* SOBRE */}

            {hasProfile && (
              <ContentSection id="sobre" title="Sobre">
                {candidate.mini_cv && (
                  <p className="mfb-profile-mini-cv">{candidate.mini_cv}</p>
                )}
                {candidate.biography && (
                  <p
                    style={{
                      margin: 0,
                      lineHeight: 1.8,
                      color: "#475467",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {candidate.biography}
                  </p>
                )}
              </ContentSection>
            )}

            {/* PROJETO E PROPOSTAS */}

            {hasPoliticalContent && (
              <ContentSection id="propostas" title="Projeto e propostas">
                <div
                  style={{
                    display: "grid",
                    gap: 22,
                  }}
                >
                  {candidate.political_project && (
                    <div>
                      <h3
                        style={{
                          margin: "0 0 8px",
                          fontSize: 18,
                        }}
                      >
                        Projeto apresentado
                      </h3>

                      <p
                        style={{
                          margin: 0,
                          lineHeight: 1.8,
                          color: "#475467",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {
                          candidate.political_project
                        }
                      </p>
                    </div>
                  )}

                  {candidate.proposals && (
                    <div>
                      <h3
                        style={{
                          margin: "0 0 8px",
                          fontSize: 18,
                        }}
                      >
                        Propostas informadas
                      </h3>

                      <p
                        style={{
                          margin: 0,
                          lineHeight: 1.8,
                          color: "#475467",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {candidate.proposals}
                      </p>
                    </div>
                  )}

                  {candidate.priority_areas && (
                    <div>
                      <h3
                        style={{
                          margin: "0 0 8px",
                          fontSize: 18,
                        }}
                      >
                        Áreas prioritárias informadas
                      </h3>

                      <p
                        style={{
                          margin: 0,
                          lineHeight: 1.8,
                          color: "#475467",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {
                          candidate.priority_areas
                        }
                      </p>
                    </div>
                  )}
                </div>
              </ContentSection>
            )}

            {/* ATUAÇÃO PÚBLICA */}

            {hasActivity && (
              <ContentSection id="atuacao" title="Atuação Pública documentada">
                <p
                  style={{
                    margin: "-5px 0 22px",
                    color: "#667085",
                    lineHeight: 1.65,
                    fontSize: 14,
                  }}
                >
                  Registros factuais cadastrados
                  com base nas fontes indicadas.
                </p>

                <div
                  style={{
                    display: "grid",
                    gap: 28,
                  }}
                >
                  {positions.length > 0 && (
                    <div>
                      <h3>
                        Cargos e funções públicas
                      </h3>

                      <div
                        style={{
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        {positions.map(
                          (item: any) => (
                            <ActivityCard
                              key={item.id}
                              title={
                                item.title ||
                                "Cargo ou função"
                              }
                              meta={[
                                item.institution,
                                item.start_date
                                  ? `Início: ${formatDate(
                                      item.start_date
                                    )}`
                                  : null,
                                item.end_date
                                  ? `Término: ${formatDate(
                                      item.end_date
                                    )}`
                                  : item.is_current
                                    ? "Atual"
                                    : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                              description={
                                item.description
                              }
                              source={item}
                            />
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {propositions.length > 0 && (
                    <div>
                      <h3>Proposições</h3>

                      <div
                        style={{
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        {propositions.map(
                          (item: any) => (
                            <ActivityCard
                              key={item.id}
                              title={
                                item.title ||
                                item.proposition_number ||
                                "Proposição"
                              }
                              meta={[
                                item.proposition_type,
                                item.proposition_number,
                                item.institution,
                                formatDate(
                                  item.presented_at
                                ),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                              description={
                                item.description
                              }
                              source={item}
                            />
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {votes.length > 0 && (
                    <div>
                      <h3>
                        Votações nominais documentadas
                      </h3>

                      <div
                        style={{
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        {votes.map(
                          (item: any) => (
                            <ActivityCard
                              key={item.id}
                              title={
                                item.title ||
                                item.proposition_reference ||
                                "Votação"
                              }
                              meta={[
                                item.institution,
                                formatDate(
                                  item.vote_date
                                ),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                              description={
                                item.description
                              }
                              source={item}
                            >
                              {item.vote_value && (
                                <div
                                  style={{
                                    marginTop: 12,
                                    padding: "9px 12px",
                                    borderRadius: 9,
                                    background: "#f9fafb",
                                    color: "#344054",
                                    fontSize: 14,
                                  }}
                                >
                                  Voto registrado:{" "}
                                  <strong>
                                    {
                                      item.vote_value
                                    }
                                  </strong>
                                </div>
                              )}
                            </ActivityCard>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {committees.length > 0 && (
                    <div>
                      <h3>
                        Comissões e colegiados
                      </h3>

                      <div
                        style={{
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        {committees.map(
                          (item: any) => (
                            <ActivityCard
                              key={item.id}
                              title={
                                item.committee_name ||
                                "Comissão"
                              }
                              meta={[
                                item.role,
                                item.institution,
                                item.start_date
                                  ? `Início: ${formatDate(
                                      item.start_date
                                    )}`
                                  : null,
                                item.end_date
                                  ? `Término: ${formatDate(
                                      item.end_date
                                    )}`
                                  : item.is_current
                                    ? "Atual"
                                    : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                              description={
                                item.description
                              }
                              source={item}
                            />
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {deliveries.length > 0 && (
                    <div>
                      <h3>
                        Entregas e realizações documentadas
                      </h3>

                      <div
                        style={{
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        {deliveries.map(
                          (item: any) => (
                            <ActivityCard
                              key={item.id}
                              title={
                                item.title ||
                                "Registro"
                              }
                              meta={[
                                item.institution,
                                item.category,
                                item.city_name,
                                item.state_uf,
                                formatDate(
                                  item.occurred_at
                                ),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                              description={
                                item.description
                              }
                              source={item}
                            />
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ContentSection>
            )}

            {/* EXPERIÊNCIA */}

            {candidate.public_experience && (
              <ContentSection id="experiencia" title="Experiência pública informada">
                <p
                  style={{
                    margin: 0,
                    lineHeight: 1.8,
                    color: "#475467",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {candidate.public_experience}
                </p>
              </ContentSection>
            )}

            {/* PRESENÇA TERRITORIAL */}

            {publicOffices.length > 0 && (
              <ContentSection id="territorio" title="Presença territorial">
                <p
                  style={{
                    margin: "-5px 0 20px",
                    color: "#667085",
                    lineHeight: 1.65,
                    fontSize: 14,
                  }}
                >
                  Locais cadastrados para
                  atendimento ou presença
                  territorial e marcados para
                  divulgação pública.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 14,
                  }}
                >
                  {publicOffices.map((office) => (
                    <OfficeCard
                      key={office.id}
                      office={office}
                    />
                  ))}
                </div>
              </ContentSection>
            )}

            {/* FONTES */}

            {publicSources.length > 0 && (
              <ContentSection id="fontes" title="Fontes e referências">
                <p
                  style={{
                    margin: "-5px 0 20px",
                    color: "#667085",
                    lineHeight: 1.65,
                    fontSize: 14,
                  }}
                >
                  Referências aprovadas para
                  consulta pública e conferência
                  das informações apresentadas
                  neste perfil.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 14,
                  }}
                >
                  {publicSources.map((source) => (
                    <PublicSourceCard
                      key={source.id}
                      source={source}
                    />
                  ))}
                </div>
              </ContentSection>
            )}

            {/* VÍDEO */}

            {candidate.video_url && (
              <ContentSection id="apresentacao" title="Apresentação">
                <a
                  href={candidate.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  Assistir vídeo ↗
                </a>
              </ContentSection>
            )}

            {/* FONTE LEGADA */}

            {candidate.source_url &&
              publicSources.length === 0 && (
                <ContentSection id="fontes" title="Fonte de referência">
                  <p
                    style={{
                      margin: "0 0 12px",
                      color: "#667085",
                      lineHeight: 1.65,
                    }}
                  >
                    Consulte a referência
                    registrada para conferência
                    das informações deste
                    perfil.
                  </p>

                  <a
                    href={candidate.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                  >
                    Consultar fonte ↗
                  </a>

                  {candidate.verified_at && (
                    <div
                      style={{
                        marginTop: 12,
                        color: "#667085",
                        fontSize: 13,
                      }}
                    >
                      Data de conferência:{" "}
                      {formatDate(
                        candidate.verified_at
                      )}
                    </div>
                  )}
                </ContentSection>
              )}

          </div>
        </div>
      </main>

    </>
  );
}
