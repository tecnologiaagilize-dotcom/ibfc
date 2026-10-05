import { NextRequest, NextResponse } from "next/server";
import { electoralStaff } from "@/lib/electoral/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const failure = (error: {message: string}) => NextResponse.json({error: `Não foi possível consultar a base eleitoral: ${error.message}. Confira a migração 20261009_ibfc_map_and_tse_sync.sql e a atualização 20261010_ibfc_party_auto_sync.sql.`}, {status:500});
export async function GET() {
  const {db, allowed} = await electoralStaff();
  if (!allowed) return NextResponse.json({error:"Acesso administrativo necessário."},{status:403});
  const {data,error} = await db.rpc("ibfc_electoral_catalogue");
  return error ? failure(error) : NextResponse.json(data, {headers:{"Cache-Control":"no-store"}});
}
export async function POST(request: NextRequest) {
  const {db, allowed} = await electoralStaff();
  if (!allowed) return NextResponse.json({error:"Acesso administrativo necessário."},{status:403});
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({error:"Origem inválida."},{status:403});
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({error:"JSON inválido."},{status:400}); }
  if (!body || typeof body!=="object") return NextResponse.json({error:"Pedido inválido."},{status:400});
  const valid = (c: Record<string, unknown> | undefined, year: number) => c && ["DF","GO","MG"].includes(String(c.uf)) && c.year === year && Number.isInteger(c.election) && Number(c.election)>0 && [1,2].includes(Number(c.turn)) && [1,3,5,6,7,8].includes(Number(c.office)) && (c.kind===undefined||c.kind==="candidate"||c.kind==="party") && (c.kind==="party"?/^\d{2}$/:/^\d{2,5}$/).test(String(c.number));
  if (!valid(body.new,2026) || (body.old && (!valid(body.old,2022) || body.old.uf !== body.new.uf || body.old.office !== body.new.office || body.old.turn !== body.new.turn || (body.old.kind??"candidate") !== (body.new.kind??"candidate"))))
    return NextResponse.json({error:"Selecione candidaturas de 2022 e 2026 ou partidos para a mesma UF, cargo e turno."},{status:400});
  const {data:catalogue,error:catalogueError}=await db.rpc("ibfc_electoral_catalogue");
  if(catalogueError)return failure(catalogueError);
  const exists=(c:Record<string,unknown>)=>((c.kind==="party"?(catalogue.parties??[]):catalogue.candidates) as Record<string,unknown>[]).some(x=>x.uf===c.uf&&x.year===c.year&&x.election===c.election&&x.turn===c.turn&&x.office===c.office&&x.number===String(c.number));
  if(!exists(body.new)||(body.old&&!exists(body.old)))return NextResponse.json({error:"Candidatura não localizada na versão atual dos resultados. Atualize a lista."},{status:400});
  const {data,error} = await db.rpc("ibfc_electoral_compare",{p_old:body.old,p_new:body.new});
  return error ? failure(error) : NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});
}
