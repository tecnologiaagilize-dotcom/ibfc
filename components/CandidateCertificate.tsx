import type { CSSProperties } from "react";
import { CertificateTemplate } from "@/lib/candidates/certificate-template";

type Candidate = {
  name: string; ballot_name?: string | null; cargo?: string | null; party?: string | null;
  number?: string | null; photo_url?: string | null; photo_position_x?: number | null;
  photo_position_y?: number | null; photo_zoom?: number | null;
  endorsement_reason?: string | null; endorsement_issued_at?: string | null;
};
export function CandidateCertificate({ candidate, publicName, territory, template: t }: {
  candidate: Candidate; publicName: string; territory: string; template: CertificateTemplate;
}) {
  const style = {
    "--cert-gap": `${t.sectionGap}px`,
    "--cert-header-order": t.headerOrder, "--cert-portrait-order": t.portraitOrder,
    "--cert-reason-order": t.reasonOrder, "--cert-footer-order": t.footerOrder,
    "--cert-name-align": t.nameAlign, "--cert-date-align": t.dateAlign,

    "--cert-paper": t.paperColor, "--cert-border": t.borderColor,
    "--cert-primary": t.primaryColor, "--cert-text": t.textColor,
    "--cert-name-size": `${t.nameSize}px`, "--cert-body-size": `${t.bodySize}px`,
    "--cert-photo-width": `${t.photoPercent}%`, "--cert-logo-size": `${t.logoSize}px`,
    "--cert-seal-size": `${t.sealSize}px`,
    "--cert-font": t.fontFamily === "serif" ? "Georgia,serif" : "Arial,sans-serif",
  } as CSSProperties;
  const date = candidate.endorsement_issued_at;
  const printedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : "data de emissão a confirmar";
  const meta = [t.showCargo && candidate.cargo, t.showTerritory && territory,
    t.showParty && candidate.party, t.showNumber && candidate.number && `Nº ${candidate.number}`].filter(Boolean).join(" · ");
  const signers = [{ name: t.signerOne.trim(), role: t.signerOneRole.trim() }, { name: t.signerTwo.trim(), role: t.signerTwoRole.trim() }].filter(person => person.name);
  const identity = <div className="mfb-certificate-identity" key="identity">
    {t.showKicker && <span className="mfb-certificate-kicker">{t.kicker}</span>}
    <h1>{publicName}</h1>
    {t.showCivilName && candidate.ballot_name && candidate.name !== candidate.ballot_name && <p className="mfb-certificate-civil-name">{candidate.name}</p>}
    {meta && <p className="mfb-certificate-meta">{meta}</p>}
  </div>;
  const reason = <section className={`mfb-endorsement ${t.showSeal ? `mfb-seal-${t.sealSide}` : "mfb-seal-hidden"}`} aria-label="Motivo do apoio">
    {t.showSeal && /* eslint-disable-next-line @next/next/no-img-element */ <img className="mfb-endorsement-seal" src={t.sealUrl} alt="Selo institucional de aprovação do Movimento Família Brasileira" width={t.sealSize} height={t.sealSize} />}
    <div className="mfb-endorsement-copy"><h2>{t.endorsementHeading.replaceAll("{nome}", publicName)}</h2>
      <p className="mfb-endorsement-reason">{candidate.endorsement_reason?.trim() || t.fallbackReason}</p>
      {t.showDisclosure && <p className="mfb-endorsement-disclosure">{t.disclosure}</p>}</div>
  </section>;
  return <section className={`mfb-certificate ${t.photoSide === "right" ? "mfb-photo-right" : ""} ${!t.showBorder ? "mfb-no-border" : ""} ${!t.showInnerBorder ? "mfb-no-inner-border" : ""} ${!t.showHeaderLine ? "mfb-no-header-line" : ""} ${!t.showIdentityLine ? "mfb-no-identity-line" : ""} ${!t.showReasonLine ? "mfb-no-reason-line" : ""} ${!t.showFooterLine ? "mfb-no-footer-line" : ""}`} style={style} aria-label={t.title}>
    <div className="mfb-certificate-heading">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={t.logoUrl} alt="Logomarca institucional" width={t.logoSize} height={t.logoSize} />
      <div><p>{t.brandText}</p><h2>{t.title}</h2></div><span className="mfb-certificate-heading-rule" aria-hidden="true" />
    </div>
    <div className="mfb-certificate-layout">
      <div className="mfb-certificate-photo-wrap"><div className="mfb-certificate-portrait">
        {candidate.photo_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={candidate.photo_url} alt={publicName} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:`${candidate.photo_position_x ?? 50}% ${candidate.photo_position_y ?? 20}%`,transform:`scale(${candidate.photo_zoom ?? 1})`}} /> : <div className="mfb-certificate-photo-fallback">{publicName.charAt(0).toUpperCase()}</div>}
      </div></div>
      <div className="mfb-certificate-content">{identity}</div>
    </div>
    {reason}
    <footer className="mfb-certificate-footer">{t.showDate && <p className="mfb-certificate-date">{t.dateText.replaceAll("{local}", t.datePrefix).replaceAll("{data}", printedDate)}</p>}
      {t.showSigners && signers.length > 0 && <div className={`mfb-certificate-signatures ${signers.length === 1 ? "mfb-one-signatory" : ""}`} aria-label="Responsáveis institucionais pelo apoio">
        {signers.map((person,index) => <div className="mfb-certificate-signatory" key={index}><span aria-hidden="true"/><strong>{person.name}</strong><small>{person.role}</small></div>)}
      </div>}
    </footer>
  </section>;
}
