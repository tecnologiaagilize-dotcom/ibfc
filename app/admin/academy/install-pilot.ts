"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";

const slug="empreendedorismo-digital-vendas-automacao-ia";
const title="Empreendedorismo Digital, Vendas e Automação com Inteligência Artificial";
const modules=[
"01 — Mentalidade empreendedora e modelos de negócios",
"02 — Pesquisa de mercado e identificação de clientes",
"03 — Produtos tecnológicos, serviços e precificação",
"04 — Marca, comunicação e páginas de conversão",
"05 — Marketing digital e mídias sociais",
"06 — Tráfego pago e aquisição de clientes",
"07 — CRM, funis e gestão comercial",
"08 — Bots, agentes de IA e automação de atendimento",
"09 — Prospecção, negociação e fechamento de vendas",
"10 — Atendimento, fidelização e receitas recorrentes",
"11 — Finanças, LGPD e segurança dos negócios",
"12 — Laboratório de monetização e projeto final"
];
const lessonText=`# Aula 1 — Diagnóstico do negócio e da oferta
**Objetivo:** diferenciar um produto tecnológico de uma oferta comercial capaz de resolver um problema verificável.

## Conceitos
- **Produto:** conjunto de recursos e serviços efetivamente disponíveis.
- **Problema do cliente:** obstáculo específico, observável e relevante.
- **Proposta de valor:** resultado concreto que a oferta ajuda a alcançar, com limites claros.
- **Hipótese comercial:** suposição que deve ser validada com pesquisa e experimentos.

## Estudo de caso: Agilize CRM
Uma empresa recebe contatos de redes sociais e de anúncios, mas não sabe quantos contatos são qualificados, quantas reuniões aconteceram e quantas vendas foram concluídas. A hipótese é que integrar o atendimento ao CRM e medir cada etapa pode reduzir perdas operacionais. Isso **não é uma promessa de aumento de faturamento**; exige validação.

## Exercício guiado
1. Descreva em uma frase a oferta que pretende vender.
2. Liste três funções comprovadamente disponíveis no produto.
3. Identifique o cliente ideal e o problema observável.
4. Descreva como o cliente resolve hoje o mesmo problema.
5. Escreva uma hipótese mensurável de valor.
6. Faça uma lista das informações que ainda não podem ser afirmadas em anúncios.
7. Defina três métricas de acompanhamento: contatos qualificados, demonstrações e propostas.

## Entrega obrigatória
Produza uma ficha com **cliente ideal, problema, oferta, evidências e métricas**. Guarde a primeira versão para comparar com a versão revisada após entrevistas com potenciais compradores.

## Autoavaliação
- Consigo apresentar a oferta em até 60 segundos sem exagerar capacidades?
- Sei distinguir fatos verificados de hipóteses?
- Tenho uma forma objetiva de medir cada etapa?

**Próxima aula:** pesquisa de mercado e entrevistas de descoberta de clientes (em elaboração).
`;
export async function installAcademyPilotCourse(){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();
 if(!user)redirect("/admin/login");
 const {data:staff}=await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
 if(!staff||!["admin","editor"].includes(staff.role))throw new Error("Sem permissão administrativa.");
 const {data:existing,error:lookupError}=await db.from("academy_courses").select("id").eq("slug",slug).maybeSingle();
 if(lookupError)throw new Error("Não foi possível consultar o catálogo: "+lookupError.message);
 let courseId=existing?.id;
 if(!courseId){
  const {data:created,error}=await db.from("academy_courses").insert({slug,title,summary:"Formação prática em mercado, marketing, aquisição, CRM, automações, negociação, receitas recorrentes e projetos reais. Programa em produção; materiais liberados progressivamente.",estimated_hours:240,status:"draft"}).select("id").single();
  if(error||!created)throw new Error("Erro ao criar curso: "+(error?.message??"sem retorno"));
  courseId=created.id;
 }
 const {data:current,error:modsError}=await db.from("academy_modules").select("id,position").eq("course_id",courseId);
 if(modsError)throw new Error("Falha ao consultar módulos: "+modsError.message);
 const positions=new Map((current??[]).map(m=>[m.position,m.id]));
 for(let i=0;i<modules.length;i++){
  if(positions.has(i+1))continue;
  const {data:mod,error}=await db.from("academy_modules").insert({course_id:courseId,position:i+1,title:modules[i]}).select("id").single();
  if(error||!mod)throw new Error("Erro no módulo "+(i+1)+": "+(error?.message??"sem retorno"));
  positions.set(i+1,mod.id);
 }
 const firstId=positions.get(1)!;
 const {data:firstLesson,error:lessonLookup}=await db.from("academy_lessons").select("id").eq("module_id",firstId).eq("position",1).maybeSingle();
 if(lessonLookup)throw new Error("Falha ao consultar aula inicial: "+lessonLookup.message);
 if(!firstLesson){
  const {error}=await db.from("academy_lessons").insert({module_id:firstId,position:1,title:"Aula 1 — Diagnóstico do negócio e proposta de valor",description:"Conceitos, estudo de caso Agilize CRM, exercícios e ficha de diagnóstico.",content_md:lessonText,duration_minutes:60,status:"draft"});
  if(error)throw new Error("Falha ao criar aula inicial: "+error.message);
 }
 revalidatePath("/admin/academy/cursos");
 redirect("/admin/academy/cursos/"+courseId+"?message="+encodeURIComponent("Curso-piloto instalado em rascunho. São 12 módulos; a primeira aula está em elaboração e não está publicada."));
}
