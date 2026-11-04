import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Search, Bookmark, Target, NotebookPen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ q?: string; assunto?: string }>;
export default async function Biblioteca({searchParams}:{searchParams:SearchParams}) {
 const supabase = await createClient();
 const {data:{user}} = await supabase.auth.getUser();
 if(!user) redirect("/entrar");
 const params = await searchParams;
 const query = (params.q || "").trim().slice(0,100);
 const subject = (params.assunto || "").trim().slice(0,100);
 const {data:books,error} = await supabase.from("library_books")
  .select("id,title,authors,primary_subject,themes,description,cover_url,page_count,created_at")
  .eq("status","published").order("title").limit(120);
 const {data:reading} = await supabase.from("library_reading")
  .select("book_id,state,current_page,pages_read,favorite").eq("user_id",user.id);
 const {data:goals} = await supabase.from("library_goals").select("id,target,unit,period").eq("user_id",user.id).limit(3);
 const progress=new Map((reading||[]).map(r=>[r.book_id,r]));
 const subjects=Array.from(new Set((books||[]).map(b=>b.primary_subject).filter(Boolean))) as string[];
 const filtered=(books||[]).filter(b=>{
  const haystack=[b.title,...(b.authors||[]),b.primary_subject,...(b.themes||[])].join(" ").toLocaleLowerCase("pt-BR");
  return (!query||haystack.includes(query.toLocaleLowerCase("pt-BR"))) && (!subject||b.primary_subject===subject);
 });
 const continuing=(books||[]).filter(b=>progress.get(b.id)?.state==="reading");
 return <main className="member-area"><div className="container" style={{padding:"32px 16px",maxWidth:1100}}>
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
  <div><Link href="/membro">← Área do membro</Link><h1>Biblioteca IBFC</h1><p>Seu espaço de leitura e estudo, integrado ao Academy.</p></div>
  <BookOpen size={40}/>
 </div>
 <div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"24px 0"}}>
  <span><Bookmark size={16} style={{display:"inline"}}/> {reading?.filter(r=>r.favorite).length||0} favoritos</span>
  <span><Target size={16} style={{display:"inline"}}/> {goals?.length||0} metas</span>
  <span><NotebookPen size={16} style={{display:"inline"}}/> Anotações privadas</span>
 </div>
 {continuing.length>0&&<section><h2>Continuar lendo</h2><div style={{display:"flex",flexWrap:"wrap",gap:12}}>{continuing.map(b=><Link key={b.id} href={`/membro/biblioteca/${b.id}`} className="btn btn-secondary">{b.title} · pág. {progress.get(b.id)?.current_page}</Link>)}</div></section>}
 <section style={{marginTop:28}}><h2>Catálogo</h2>
 <form method="get" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
  <label style={{flex:"1 1 230px"}}><Search size={16} style={{display:"inline"}}/> Buscar por título, autor ou tema<input name="q" defaultValue={query} placeholder="Pesquisar livros" style={{display:"block",padding:12,width:"100%"}} /></label>
  <label>Assunto<select name="assunto" defaultValue={subject} style={{display:"block",padding:12}}><option value="">Todos</option>{subjects.map(s=><option key={s}>{s}</option>)}</select></label>
  <button className="btn btn-primary" type="submit">Buscar</button>
 </form>
 {error&&<p>Não foi possível consultar o catálogo. Verifique se a migração da biblioteca foi aplicada.</p>}
 {!error&&filtered.length===0&&<p>Nenhum livro publicado encontrado. O administrador pode importar e revisar o acervo.</p>}
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:16}}>
 {filtered.map(b=><article key={b.id} className="member-panel" style={{padding:18}}>
 <BookOpen size={28}/><h3 style={{marginTop:12}}>{b.title}</h3><p>{(b.authors||[]).join(", ")||"Autor pendente de revisão"}</p><small>{b.primary_subject||"Sem assunto"} · {b.page_count?b.page_count+" páginas":"Paginação a verificar"}</small>
 <p>{b.description?.slice(0,160)||"Descrição em revisão."}</p>
 <Link className="btn btn-secondary" href={`/membro/biblioteca/${b.id}`}>Abrir livro</Link>
 </article>)}</div>
 </section></div></main>;
}
