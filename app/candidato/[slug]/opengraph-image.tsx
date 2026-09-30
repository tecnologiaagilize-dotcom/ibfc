import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getPublicSharedCandidate, sharedCandidateName } from "@/lib/candidates/public-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Candidato indicado pelo Movimento Família Brasileira";

async function photoDataUrl(rawUrl: string | null): Promise<string | null> {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (url.hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) return null;

    const response = await fetch(url, { signal: AbortSignal.timeout(6500), redirect: "follow" });
    const mime = response.headers.get("content-type")?.split(";")[0];
    const length = Number(response.headers.get("content-length") || 0);
    if (!response.ok || !mime || !["image/jpeg", "image/png", "image/webp"].includes(mime) || length > 4_000_000) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 4_000_000) return null;
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

async function logoDataUrl(): Promise<string | null> {
  try {
    const bytes = await readFile(join(process.cwd(), "public", "logo-mfb.png"));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.movimentofamiliabrasileira.com.br";
      const response = await fetch(new URL("/logo-mfb.png", baseUrl), { signal: AbortSignal.timeout(4500) });
      if (!response.ok) return null;
      const bytes = Buffer.from(await response.arrayBuffer());
      return `data:image/png;base64,${bytes.toString("base64")}`;
    } catch {
      return null;
    }
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const candidate = await getPublicSharedCandidate(slug);

  if (!candidate) return new Response("Cadastro público indisponível", { status: 404 });

  // A arte sempre utiliza a foto cadastrada, com o mesmo enquadramento da ficha.
  // Se o servidor não conseguir lê-la, não entrega uma imagem substituta.
  if (!candidate.photo_url) return new Response("Foto do cadastro indisponível", { status: 404 });

  const name = sharedCandidateName(candidate);
  const [photo, logo] = await Promise.all([
    photoDataUrl(candidate.photo_url || null),
    logoDataUrl(),
  ]);
  if (!photo) return new Response("Não foi possível carregar a foto cadastrada", { status: 502 });

  const x = candidate.photo_position_x ?? 50;
  const y = candidate.photo_position_y ?? 20;
  const zoom = candidate.photo_zoom ?? 1;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#f7faf8", color: "#172033", fontFamily: "sans-serif" }}>
      <div style={{ width: 460, height: 630, display: "flex", background: "#e2f1e8", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})` }} />
      </div>
      <div style={{ width: 740, padding: "46px 56px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo} alt="" width={76} height={76} style={{ objectFit: "contain" }} />}
          <span style={{ fontSize: 23, fontWeight: 800, color: "#087f50" }}>MOVIMENTO FAMÍLIA BRASILEIRA</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 23, color: "#087f50", fontWeight: 700 }}>{candidate.cargo} · {candidate.state_uf}</div>
          <div style={{ fontSize: name.length > 30 ? 47 : 59, lineHeight: 1.1, fontWeight: 800, overflowWrap: "break-word" }}>{name}</div>
          {candidate.number && <div style={{ fontSize: 33, fontWeight: 800 }}>Nº {candidate.number}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", borderTop: "3px solid #087f50", paddingTop: 20, fontSize: 24, fontWeight: 800, color: "#087f50" }}>
          ✓ APROVADO(A) PELO MFB
        </div>
      </div>
    </div>,
    { ...size, headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } }
  );
}
