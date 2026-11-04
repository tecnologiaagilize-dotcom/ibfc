"use client";
import { useState, useTransition } from "react";
import { saveNote, saveReading } from "./actions";

export function ReaderControls({bookId,initialPage,initialFavorite,pageCount,initialState,notes}:{bookId:string;initialPage:number;initialFavorite:boolean;pageCount:number|null;initialState:"want"|"reading"|"paused"|"completed";notes:{id:string;page_number:number|null;body:string}[]}) {
 const [page,setPage]=useState(initialPage);
 const [favorite,setFavorite]=useState(initialFavorite);
 const [state,setState]=useState(initialState);
 const [note,setNote]=useState("");
 const [message,setMessage]=useState("");
 const [pending,start]=useTransition();
 const save=(nextPage=page,nextFavorite=favorite,nextState=state)=>start(async()=>{
  try {await saveReading(bookId,nextPage,nextState,nextFavorite);setMessage("Leitura salva na sua conta.");}
  catch(e){setMessage(e instanceof Error?e.message:"Falha ao salvar.");}
 });
 return <div style={{display:"grid",gap:12}}>
  <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
   <label>Página atual <input aria-label="Página atual" type="number" min={1} max={pageCount||undefined} value={page} onChange={e=>setPage(Number(e.target.value))} style={{display:"block",width:95,padding:9}} /></label>
   <label>Situação <select aria-label="Situação da leitura" value={state} onChange={e=>setState(e.target.value as typeof state)} style={{display:"block",padding:10}}><option value="want">Quero ler</option><option value="reading">Lendo</option><option value="paused">Pausado</option><option value="completed">Concluído</option></select></label>
   <label><input type="checkbox" checked={favorite} onChange={e=>setFavorite(e.target.checked)}/> Favorito</label>
   <button className="btn btn-primary" disabled={pending||!Number.isInteger(page)||page<1||!!(pageCount&&page>pageCount)} onClick={()=>save()}>Salvar posição</button>
  </div>
  <p style={{fontSize:13}}>Por enquanto, informe a página alcançada para salvar. A posição não representa todas as páginas lidas.</p>
  <div><h2>Meu caderno</h2><label htmlFor="note">Anotação pessoal · página {page}</label><textarea id="note" value={note} onChange={e=>setNote(e.target.value)} rows={4} maxLength={10000} style={{display:"block",width:"100%",padding:12}} placeholder="Escreva uma reflexão, referência bíblica ou pergunta..."/>
  <button className="btn btn-secondary" disabled={pending||!note.trim()} onClick={()=>start(async()=>{try{await saveNote(bookId,page,note);setNote("");setMessage("Anotação registrada.");}catch(e){setMessage(e instanceof Error?e.message:"Falha ao registrar.");}})}>Salvar anotação</button></div>
  <div aria-live="polite">{message}</div>
  {notes.length>0&&<div><h3>Anotações salvas</h3>{notes.map(n=><article key={n.id} style={{padding:12,borderBottom:"1px solid #aaa"}}><small>Página {n.page_number??"não informada"}</small><p style={{whiteSpace:"pre-wrap"}}>{n.body}</p></article>)}</div>}
 </div>;
}
