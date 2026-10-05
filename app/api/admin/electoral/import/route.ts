import { NextRequest, NextResponse } from "next/server";
import { electoralStaff } from "@/lib/electoral/auth";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const {db,user,allowed} = await electoralStaff();
  if (!allowed || !user) return NextResponse.json({error:"Acesso administrativo necessário."},{status:403});
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({error:"Origem inválida."},{status:403});
  if (Number(request.headers.get("content-length")) > 1_500_000) return NextResponse.json({error:"Lote muito grande."},{status:413});
  let b;
  try { b=await request.json(); } catch { return NextResponse.json({error:"JSON inválido."},{status:400}); }
  if (!b || typeof b!=="object") return NextResponse.json({error:"Pedido inválido."},{status:400});
  if (b.action === "start") {
    if (![2022,2026].includes(b.year) || !["votes","locations"].includes(b.kind) || typeof b.filename!=="string" || !b.filename || b.filename.length>250)
      return NextResponse.json({error:"Arquivo, ano ou tipo inválido."},{status:400});
    let source: URL;
    try { source = new URL(b.source_url); if(source.protocol!=="https:" || !["dadosabertos.tse.jus.br","cdn.tse.jus.br","www.tre-df.jus.br","www.tre-go.jus.br","www.tre-mg.jus.br"].includes(source.hostname)) throw new Error(); }
    catch { return NextResponse.json({error:"Informe o endereço HTTPS da fonte oficial TSE ou TRE-DF/GO/MG."},{status:400}); }
    const {data,error} = await db.from("ibfc_electoral_imports").insert({year:b.year,kind:b.kind,filename:b.filename,source_url:source.toString(),created_by:user.id}).select("id").single();
    return error ? NextResponse.json({error:error.message},{status:500}) : NextResponse.json(data);
  }
  if (typeof b.id!=="string" || !/^[0-9a-f-]{36}$/i.test(b.id)) return NextResponse.json({error:"Identificador inválido."},{status:400});
  if (b.action === "batch") {
    if (!Array.isArray(b.rows) || !b.rows.length || b.rows.length>500) return NextResponse.json({error:"Lote inválido."},{status:400});
    const {data,error} = await db.rpc("ibfc_electoral_batch",{p_import:b.id,p_rows:b.rows});
    return error ? NextResponse.json({error:error.message},{status:400}) : NextResponse.json({saved:data});
  }
  if (b.action === "finish") {
    const {error} = await db.rpc("ibfc_electoral_finish",{p_import:b.id,p_error:typeof b.error==="string" ? b.error.slice(0,1000) : null});
    return error ? NextResponse.json({error:error.message},{status:400}) : NextResponse.json({ok:true});
  }
  return NextResponse.json({error:"Ação inválida."},{status:400});
}
