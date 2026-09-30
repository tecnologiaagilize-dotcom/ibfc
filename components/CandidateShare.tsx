"use client";

import { useState } from "react";

type Props = { slug: string; name: string };

export function CandidateShare({ slug, name }: Props) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const path = `/candidato/${encodeURIComponent(slug)}`;
  const caption = `Conheça o perfil de ${name}, candidato(a) indicado(a) pelo Movimento Família Brasileira:`;

  function shareUrl() {
    const url = new URL(path, window.location.origin);
    url.searchParams.set("mfb", "5");
    return url.toString();
  }

  async function shareOther() {
    const url = shareUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} | MFB`, text: caption, url });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      window.prompt("Copie o link do perfil:", url);
    }
  }

  async function shareWhatsApp() {
    if (sharing) return;
    setSharing(true);
    const message = `${caption} ${shareUrl()}`;
    try {
      const imageUrl = new URL(`${path}/opengraph-image?mfb=5`, window.location.origin);
      const response = await fetch(imageUrl);
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("Imagem indisponível");
      const file = new File([await response.blob()], `mfb-${slug}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          // O sistema operacional apresenta os aplicativos disponíveis; selecione WhatsApp.
          await navigator.share({ files: [file], text: message, title: `${name} | MFB` });
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          throw error;
        }
        return;
      }
    } catch {
      // Em computadores e navegadores sem compartilhamento de arquivos,
      // a miniatura vem da imagem Open Graph do perfil público.
    } finally {
      setSharing(false);
    }
    window.location.assign(`https://wa.me/?text=${encodeURIComponent(message)}`);
  }

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
      <button type="button" className="btn btn-secondary" disabled={sharing} onClick={() => void shareWhatsApp()} style={{ flex: 1, minWidth: 110 }}>
        {sharing ? "Preparando…" : "WhatsApp"}
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => void shareOther()} style={{ flex: 1, minWidth: 110 }}>
        {copied ? "Link copiado" : "Outras mídias"}
      </button>
    </div>
  );
}
