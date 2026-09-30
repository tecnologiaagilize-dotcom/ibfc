"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function CourseForm(){
 const router=useRouter(); const supabase=createClient();
 const [busy,setBusy]=useState(false); const [error,setError]=useState("");
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");const f=new FormData(e.currentTarget);const title=String(f.get("title")||"");const slug=String(f.get("slug")||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
 const {error}=await supabase.from("courses").insert({title,slug,description:String(f.get("description")||""),cover_url:String(f.get("cover_url")||"")||null,status:String(f.get("status")||"draft")});
 if(error){setError(error.message);setBusy(false);return;} router.push("/admin/cursos");router.refresh();}
 return <form onSubmit={submit} className="course-form admin-panel"><label>Título<input className="field" name="title" required/></label><label>Slug<input className="field" name="slug" placeholder="formacao-de-liderancas" required/></label><label>Descrição<textarea className="field course-textarea" name="description"/></label><label>URL da capa<input className="field" name="cover_url" placeholder="https://..."/></label><label>Status<select className="field" name="status"><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label>{error&&<p className="form-error">{error}</p>}<button className="btn btn-primary" disabled={busy}>{busy?"Salvando...":"Criar curso"}</button></form>
}
