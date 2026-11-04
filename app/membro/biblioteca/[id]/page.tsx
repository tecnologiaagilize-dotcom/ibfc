import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReaderControls } from "./ReaderControls";

export default async function BookReader({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 if(!/^[a-f0-9-]{36}$/i.test(id)) notFound();
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect("/entrar");
 const {data:book}=await supabase.from("library_books").select("id,title,authors,description,primary_subject,page_count,storage_path,status").eq("id",id).eq("status","published").maybeSingle();
 if(!book) notFound();
 const [{data:reading},{data:notes}]=await Promise.all([
 supabase.from("library_reading").select("current_page,favorite,state").eq("user_id",user.id).eq("book_id",id).maybeSingle(),
 supabase.from("library_notes").select("id,page_number,body").eq("user_id",user.id).eq("book_id",id).order("created_at",{ascending:false}).limit(50)
 ]);
 // As políticas de Storage são privadas: o servidor precisa emitir URL temporária.
 const signed=book.storage_path?await supabase.storage.from("ibfc-library").createSignedUrl(book.storage_path,900):null;
 const pdf=signed?.data?.signedUrl||null;
 const page=Math.max(1,reading?.current_page||1);
 return <main className="member-area"><div className="container" style={{maxWidth:1100,padding:"28px 16px"}}>
 <Link href="/membro/biblioteca">← Biblioteca</Link><h1>{book.title}</h1>
 <p>{(book.authors||[]).join(", ")||"Autor pendente de revisão"} · {book.primary_subject||"Sem classificação"}</p>
 {book.description&&<p>{book.description}</p>}
 {pdf?<iframe title={`Leitor: ${book.title}`} src={`${pdf}#page=${page}&toolbar=1`} style={{width:"100%",height:"min(75vh,800px)",border:"1px solid #aaa",borderRadius:10}}/>:<div role="status" className="member-panel" style={{padding:20}}><h2>Arquivo ainda não disponível</h2><p>O cadastro existe, mas a cópia autorizada do PDF ainda não foi preparada no armazenamento protegido do IBFC.</p></div>}
 <section style={{marginTop:24}}><ReaderControls bookId={id} initialPage={page} initialFavorite={!!reading?.favorite} initialState={reading?.state||"want"} pageCount={book.page_count} notes={notes||[]}/></section>
 </div></main>;
}
