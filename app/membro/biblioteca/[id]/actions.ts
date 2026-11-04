"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveReading(bookId:string, currentPage:number, state:"want"|"reading"|"paused"|"completed", favorite:boolean) {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) throw new Error("Sessão expirada.");
 if(!/^[a-f0-9-]{36}$/i.test(bookId)||!Number.isSafeInteger(currentPage)||currentPage<1) throw new Error("Dados inválidos.");
 const {data:book}=await supabase.from("library_books").select("id,page_count").eq("id",bookId).eq("status","published").single();
 if(!book) throw new Error("Livro indisponível.");
 if(book.page_count && currentPage>book.page_count) throw new Error("Página fora do livro.");
 const {data:previous}=await supabase.from("library_reading").select("started_at").eq("book_id",bookId).eq("user_id",user.id).maybeSingle();
 const {error}=await supabase.from("library_reading").upsert({
  user_id:user.id,book_id:bookId,current_page:currentPage,state,favorite,
  started_at:previous?.started_at||(state==="reading"?new Date().toISOString():null),
  completed_at:state==="completed"?new Date().toISOString():null,
  updated_at:new Date().toISOString()
 },{onConflict:"user_id,book_id"});
 if(error) throw new Error("Não foi possível salvar a leitura.");
 revalidatePath("/membro/biblioteca");
 revalidatePath(`/membro/biblioteca/${bookId}`);
}
export async function saveNote(bookId:string,page:number,body:string) {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) throw new Error("Sessão expirada.");
 if(!/^[a-f0-9-]{36}$/i.test(bookId)||!Number.isSafeInteger(page)||page<1||!body.trim()||body.length>10000) throw new Error("Dados inválidos.");
 const {data:book}=await supabase.from("library_books").select("id,page_count").eq("id",bookId).eq("status","published").single();
 if(!book || (book.page_count&&page>book.page_count)) throw new Error("Livro indisponível ou página inválida.");
 const {error}=await supabase.from("library_notes").insert({user_id:user.id,book_id:bookId,page_number:page,body:body.trim()});
 if(error) throw new Error("Não foi possível salvar a anotação.");
 revalidatePath(`/membro/biblioteca/${bookId}`);
}
