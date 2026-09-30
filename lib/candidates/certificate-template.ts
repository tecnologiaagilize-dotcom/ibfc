export type CertificateTemplate = {
  brandText: string; title: string; kicker: string; endorsementHeading: string;
  fallbackReason: string; disclosure: string; datePrefix: string;
  signerOne: string; signerOneRole: string; signerTwo: string; signerTwoRole: string;
  logoUrl: string; sealUrl: string; photoSide: "left" | "right";
  showSeal: boolean; sealSide: "left" | "right" | "above" | "below"; contentOrder: "identity-first" | "reason-first";
  fontFamily: "serif" | "sans"; paperColor: string; borderColor: string;
  primaryColor: string; textColor: string; nameSize: number; bodySize: number;
  photoPercent: number; logoSize: number; sealSize: number;
  showCargo: boolean; showTerritory: boolean; showParty: boolean; showNumber: boolean;
  showCivilName: boolean; showKicker: boolean; showDisclosure: boolean; showDate: boolean;
  showSigners: boolean; showBorder: boolean; showInnerBorder: boolean;
  showHeaderLine: boolean; showIdentityLine: boolean; showReasonLine: boolean; showFooterLine: boolean;
  dateText: string; dateAlign: "left" | "center" | "right";
  nameAlign: "left" | "center" | "right";
  headerOrder: number; portraitOrder: number; reasonOrder: number; footerOrder: number;
  sectionGap: number;

};
export const defaultCertificateTemplate: CertificateTemplate = {
  brandText: "MOVIMENTO FAMÍLIA BRASILEIRA", title: "Certificado de apoio",
  kicker: "Certificado de apoio à candidatura", endorsementHeading: "Por que apoiamos {nome}?",
  fallbackReason: "O Movimento Família Brasileira apoia esta candidatura por identificar afinidade com princípios que orientam sua atuação: valorização da família, proteção de crianças e adolescentes, liberdade de crença e responsabilidade na vida pública.",
  disclosure: "Manifestação institucional de apoio do MFB. A trajetória, as propostas e as fontes estão nas seções deste perfil.",
  datePrefix: "Brasília", signerOne: "Helen Pontes", signerOneRole: "Presidente · MFB",
  signerTwo: "Paulo Rocha", signerTwoRole: "Coordenador · MFB",
  logoUrl: "/logo-mfb.png", sealUrl: "/selo-aprovacao-mfb.svg",
  photoSide: "left", showSeal: false, sealSide: "left", contentOrder: "identity-first", fontFamily: "serif",
  paperColor: "#fffcf6", borderColor: "#ba8e47", primaryColor: "#14563d", textColor: "#202922",
  nameSize: 68, bodySize: 19, photoPercent: 32, logoSize: 64, sealSize: 135,
  showCargo: true, showTerritory: false, showParty: false, showNumber: false,
  showCivilName: true, showKicker: true, showDisclosure: true, showDate: true,
  showSigners: true, showBorder: true, showInnerBorder: true,
  showHeaderLine: true, showIdentityLine: true, showReasonLine: true, showFooterLine: true,
  dateText: "{local}, {data}", dateAlign: "right", nameAlign: "left",
  headerOrder: 1, portraitOrder: 2, reasonOrder: 3, footerOrder: 4, sectionGap: 24,

};
export function normalizeCertificateTemplate(input: unknown): CertificateTemplate {
  const data = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const result = { ...defaultCertificateTemplate };
  const strings = ["brandText", "title", "kicker", "endorsementHeading", "fallbackReason", "disclosure", "datePrefix", "signerOne", "signerOneRole", "signerTwo", "signerTwoRole", "dateText"] as const;
  for (const key of strings) if (typeof data[key] === "string") {
    const value = data[key].trim().slice(0, key === "fallbackReason" ? 1800 : 350);
    result[key] = ["signerOne", "signerOneRole", "signerTwo", "signerTwoRole"].includes(key)
      ? value : value || defaultCertificateTemplate[key];
  }
  const colors = ["paperColor", "borderColor", "primaryColor", "textColor"] as const;
  for (const key of colors) if (typeof data[key] === "string" && /^#[0-9a-fA-F]{6}$/.test(data[key])) result[key] = data[key];
  const sizes = { nameSize: [30, 90], bodySize: [14, 28], photoPercent: [22, 48], logoSize: [36, 100], sealSize: [70, 210], headerOrder: [1, 4], portraitOrder: [1, 4], reasonOrder: [1, 4], footerOrder: [1, 4], sectionGap: [0, 72] } as const;
  for (const key of Object.keys(sizes) as (keyof typeof sizes)[]) {
    const n = Number(data[key]); if (data[key] !== undefined && Number.isFinite(n)) result[key] = Math.max(sizes[key][0], Math.min(sizes[key][1], Math.round(n)));
  }
  for (const key of ["logoUrl", "sealUrl"] as const) if (typeof data[key] === "string") {
    const url = data[key].trim();
    if ((url.startsWith("/") && !url.startsWith("//")) || /^https:\/\/[^\s]+$/i.test(url)) result[key] = url.slice(0, 1000);
  }
  const flags = ["showCargo", "showTerritory", "showParty", "showNumber", "showCivilName", "showKicker", "showDisclosure", "showDate", "showSigners", "showBorder", "showInnerBorder", "showHeaderLine", "showIdentityLine", "showReasonLine", "showFooterLine"] as const;
  for (const key of flags) if (typeof data[key] === "boolean") result[key] = data[key];
  for (const key of ["dateAlign", "nameAlign"] as const) if (["left", "center", "right"].includes(String(data[key]))) result[key] = data[key] as CertificateTemplate[typeof key];
  if (data.photoSide === "right") result.photoSide = "right";
  if (data.showSeal === true) result.showSeal = true;
  if (["left", "right", "above", "below"].includes(String(data.sealSide))) result.sealSide = data.sealSide as CertificateTemplate["sealSide"];
  if (data.contentOrder === "reason-first") result.contentOrder = "reason-first";
  if (data.fontFamily === "sans") result.fontFamily = "sans";
  return result;
}
