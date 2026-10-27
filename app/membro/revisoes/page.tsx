import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function Reviews(){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)redirect("/entrar");
 const {data:rows,error}=await db.from("academy_responses").select("id,prompt,options,selected_option,correct_option,created_at").eq("user_id",user.id).eq("is_correct",false).order("created_at",{ascending:false}).limit(100);
 return <main className="member-area"><section className="member-content"><div className="academy-hero"><h1>Meu caderno de erros</h1><p>Até 100 erros mais recentes, com o enunciado e o gabarito registrados no envio. Repetições aparecem separadamente.</p><Link href="/membro/cursos">Voltar aos cursos</Link></div>{error?<p role="alert">Não foi possível carregar o caderno de erros.</p>:!rows?.length?<p>Nenhum erro registrado. Resultados anteriores à atualização não possuem respostas individuais.</p>:rows.map(row=><article className="member-panel" key={row.id} style={{padding:20,marginTop:12}}><h2>{row.prompt}</h2><p>Sua resposta: {row.options[row.selected_option]}</p><p>Gabarito: {row.options[row.correct_option]}</p><small>{new Date(row.created_at).toLocaleDateString("pt-BR")}</small></article>)}</section></main>;
}
