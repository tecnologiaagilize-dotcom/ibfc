"use client";
import { useEffect, useMemo, useState } from "react";
import { STATES } from "@/lib/states";

type PublicCandidate = { id: string; name: string; ballot_name: string | null; cargo: string; number: string | null; state_uf: string; city_name?: string | null; photo_url?: string | null; slug: string };
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"]);
const displayName = (person: PublicCandidate) => person.ballot_name && !/^\d+$/.test(person.ballot_name) ? person.ballot_name : person.name;
export function ColinhaBuilder({ candidates, initialState, loadError = false }: { candidates: PublicCandidate[]; initialState?: string; loadError?: boolean }) {
  const [state, setState] = useState(() => STATES.some(s => s.uf === initialState) ? initialState! : candidates.some(c => c.state_uf === "DF") ? "DF" : (candidates.find(c => c.state_uf !== "BR")?.state_uf ?? "DF"));
  const [city, setCity] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const stateLabel = state === "DF" ? "Brasília" : STATES.find(item => item.uf === state)?.name ?? state;
  const choiceLabel = `Minha escolha para ${stateLabel}`;
  const [cardColors, setCardColors] = useState<Record<string,string>>({});
  const defaults=["#103d78","#2576b7","#073d88","#087846","#602893"];
  function cardColor(person: PublicCandidate, rowIndex: number) { return cardColors[person.id] || defaults[Math.min(officeRank(person.cargo),defaults.length-1)] || defaults[rowIndex%defaults.length]; }
  function matchPhotoColor(id: string, image: HTMLImageElement) {
    if (cardColors[id]) return;
    try {
      const sample=document.createElement("canvas");sample.width=16;sample.height=16;
      const context=sample.getContext("2d");if(!context)return;
      context.drawImage(image,0,0,16,16);
      const pixels=context.getImageData(1,1,4,4).data;
      let red=0,green=0,blue=0,count=0;
      for(let index=0;index<pixels.length;index+=4){if(pixels[index+3]<200)continue;red+=pixels[index];green+=pixels[index+1];blue+=pixels[index+2];count++;}
      if(!count)return;
      const channel=(value:number)=>Math.max(20,Math.min(135,Math.round(value/count*.66))).toString(16).padStart(2,"0");
      setCardColors(old=>old[id]?old:{...old,[id]:`#${channel(red)}${channel(green)}${channel(blue)}`});
    }catch{/* The palette remains editable when a remote host blocks pixel access. */}
  }
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  const cityOptions = useMemo(() => [...new Set(candidates.filter(c => c.state_uf === state && c.city_name).map(c => c.city_name!))].sort((a,b) => a.localeCompare(b,"pt-BR")), [candidates,state]);
  const available = useMemo(() => candidates.filter(c => c.state_uf === "BR" || (c.state_uf === state && (!c.city_name || c.city_name === city))), [candidates,state,city]);
  const officeRank = (cargo: string) => {
    const value = cargo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (value.includes("president")) return 0;
    if (value.includes("governador")) return 1;
    if (value.includes("senador")) return 2;
    if (value.includes("federal")) return 3;
    if (value.includes("distrital") || value.includes("estadual")) return 4;
    return 5;
  };
  const chosen = available.filter(c => selected.includes(c.id)).sort((a,b) => officeRank(a.cargo)-officeRank(b.cargo));
  const posterRows: PublicCandidate[][] = [];
  for (let index=0; index<chosen.length;) {
    const rank=officeRank(chosen[index].cargo);
    if (rank === 0 && index+1 < chosen.length && officeRank(chosen[index+1].cargo) === 1) {
      posterRows.push([chosen[index],chosen[index+1]]); index+=2; continue;
    }
    if (rank < 2) { posterRows.push([chosen[index++]]); continue; }
    const first=chosen[index++];
    if (index < chosen.length && officeRank(chosen[index].cargo) === rank) posterRows.push([first,chosen[index++]]);
    else if (index < chosen.length && rank >= 3 && officeRank(chosen[index].cargo) >= 3) posterRows.push([first,chosen[index++]]);
    else posterRows.push([first]);
  }
  const isExecutiveRow = (row: PublicCandidate[]) => row.length === 2 && officeRank(row[0].cargo) === 0 && officeRank(row[1].cargo) === 1;
  const rowHeights = posterRows.map(row => isExecutiveRow(row) ? 285 : 350);
  function choose(id: string) { setSelected(old => old.includes(id) ? old.filter(value => value !== id) : [...old,id]); }
  function upload(file?: File) {
    if (!file) return;
    if (!allowedTypes.has(file.type) || file.size > 5_000_000) { setError("Use JPG, PNG ou WebP com até 5 MB."); return; }
    setError(""); setPhoto(URL.createObjectURL(file));
  }
  async function loadImage(url: string) {
    const image = new Image(); image.crossOrigin = "anonymous"; image.src = url;
    await image.decode(); return image;
  }
  async function makeImage(action: "download" | "share" | "whatsapp" | "instagram") {
    if (!chosen.length) { setError("Selecione pelo menos um candidato para gerar a colinha."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const canvas = document.createElement("canvas");
      const width=1080, topHeight=390, bottomHeight=100;
      canvas.width=width;canvas.height=topHeight+rowHeights.reduce((sum,height)=>sum+height,0)+bottomHeight;
      const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Seu navegador não permitiu gerar a imagem.");
      const background=ctx.createLinearGradient(0,0,width,canvas.height);
      background.addColorStop(0,"#007c4c");background.addColorStop(.3,"#092f71");background.addColorStop(1,"#f6c735");
      ctx.fillStyle=background;ctx.fillRect(0,0,width,canvas.height);
      ctx.fillStyle="#ffdf2b";ctx.fillRect(404,50,652,204);
      let supporter: HTMLImageElement;
      try { supporter=await loadImage(photo ?? "/bandeira-brasil.svg"); }
      catch { throw new Error(photo ? "Não foi possível abrir sua foto. Escolha JPG, PNG ou WebP compatível com seu navegador." : "Não foi possível carregar a bandeira do Brasil."); }
      const photoX=22,photoY=30,photoW=350,photoH=338;
      const crop=(photo ? Math.max : Math.min)(photoW/supporter.width,photoH/supporter.height);
      ctx.save();ctx.beginPath();ctx.roundRect(photoX,photoY,photoW,photoH,18);ctx.clip();
      if (!photo) { ctx.fillStyle="#009b3a";ctx.fillRect(photoX,photoY,photoW,photoH); }
      ctx.drawImage(supporter,photoX+(photoW-supporter.width*crop)/2,photoY+(photoH-supporter.height*crop)/2,supporter.width*crop,supporter.height*crop);ctx.restore();
      ctx.strokeStyle="#fff";ctx.lineWidth=8;ctx.strokeRect(photoX,photoY,photoW,photoH);
      ctx.fillStyle="#082c67";ctx.font="italic 900 88px Arial";ctx.fillText("COLINHA",432,158,585);
      ctx.font="bold 37px Arial";ctx.fillText(choiceLabel.toUpperCase(),440,220,565);
      ctx.fillStyle="#fff";ctx.font="bold 24px Arial";ctx.fillText(`${city ? city + " · " : ""}${state} · Movimento Família Brasileira`,410,318,625);
      const top=topHeight;
      let rowY=top;
      for(const [rowIndex,row] of posterRows.entries()){
        const gap=8,boxW=(width-32-gap*(row.length-1))/row.length;
        for(const [column,person] of row.entries()){
          const x=16+column*(boxW+gap),y=rowY,w=boxW,h=rowHeights[rowIndex]-8;
          ctx.fillStyle=cardColor(person,rowIndex);ctx.beginPath();ctx.roundRect(x,y,w,h,16);ctx.fill();
          ctx.strokeStyle="#fff";ctx.lineWidth=4;ctx.stroke();
          const portraitWidth=row.length===1?370:230;
          if(person.photo_url){
            try {const portrait=await loadImage(person.photo_url);const ratio=Math.max(portraitWidth/portrait.width,(h-10)/portrait.height);
              ctx.save();ctx.beginPath();ctx.roundRect(x+5,y+5,portraitWidth,h-10,12);ctx.clip();
              ctx.drawImage(portrait,x+5+(portraitWidth-portrait.width*ratio)/2,y+5+(h-10-portrait.height*ratio)/2,portrait.width*ratio,portrait.height*ratio);ctx.restore();
            }catch{/* Keep a readable card when a photo host disallows browser drawing. */}
          }
          const tx=x+portraitWidth+23,availableWidth=w-portraitWidth-42;
          ctx.fillStyle="#fff";ctx.font=`bold ${row.length===1?40:28}px Arial`;ctx.fillText(person.cargo.toUpperCase(),tx,y+Math.round(h*.21),availableWidth);
          const number=person.number||"—";
          const longNumber=number.length>=5;
          let numberSize=longNumber ? (row.length===1?116:70) : (row.length===1?150:105);
          ctx.font=`900 ${numberSize}px Arial`;
          while(numberSize>32 && ctx.measureText(number).width>availableWidth){numberSize-=2;ctx.font=`900 ${numberSize}px Arial`;}
          ctx.fillStyle="#ffe22c";ctx.fillText(number,tx,y+Math.round(h*.68));
          ctx.fillStyle="#fff";ctx.font=`bold ${row.length===1?47:30}px Arial`;ctx.fillText(displayName(person).toUpperCase(),tx,y+h-25,availableWidth);
        }
        rowY+=rowHeights[rowIndex];
      }
      ctx.fillStyle="#ffdf2b";ctx.fillRect(0,canvas.height-bottomHeight,width,bottomHeight);
      ctx.fillStyle="#092f72";ctx.font="bold 27px Arial";
      ctx.fillText("movimentofamiliabrasileira.com.br",55,canvas.height-52);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("Não foi possível exportar a imagem.")),"image/png"));
      const file=new File([blob],"minha-colinha-mfb.png",{type:"image/png"});
      if (action !== "download" && navigator.share && navigator.canShare?.({files:[file]})) {
        try {
          await navigator.share({files:[file],title:choiceLabel,text:choiceLabel});
          return;
        } catch (cause) {
          if (cause instanceof DOMException && cause.name === "AbortError") return;
          // Alguns navegadores oferecem compartilhamento, mas falham ao abrir o app.
        }
      }
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement("a");
      anchor.href=url;anchor.download=file.name;
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      if (action === "whatsapp") {
        setNotice("O PNG foi baixado. Anexe a imagem à conversa no WhatsApp.");
      } else if (action === "instagram") {
        setNotice("O PNG foi baixado. Abra o Instagram e selecione a imagem para publicar ou enviar.");
      } else if (action === "share") {
        setNotice("O PNG foi baixado. Anexe a imagem ao aplicativo em que deseja compartilhar.");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível gerar a colinha."); }
    finally { setBusy(false); }
  }
  return <>
    <header className="colinha-heading"><span className="badge">PERSONALIZE</span><h1>Minha colinha</h1><p>Escolha sua localidade e seus representantes. Se quiser, adicione sua foto; sem ela, a bandeira do Brasil aparecerá na colinha.</p></header>
    <div className="colinha-grid"><section className="card colinha-controls" aria-label="Configuração da colinha">
      <label>Estado<select value={state} onChange={event=>{setState(event.target.value);setCity("");setSelected([]);}}>{STATES.map(item=><option value={item.uf} key={item.uf}>{item.name}</option>)}</select></label>
      {cityOptions.length>0 && <label>Município<select value={city} onChange={event=>{setCity(event.target.value);setSelected([]);}}><option value="">Selecione para ver candidaturas municipais</option>{cityOptions.map(value=><option key={value} value={value}>{value}</option>)}</select></label>}
      <label>Sua foto para o topo do cartaz (opcional)<input type="file" accept="image/*" onChange={event=>upload(event.target.files?.[0])} /></label>
      {photo && <button type="button" className="btn btn-secondary" onClick={()=>setPhoto(null)}>Remover foto</button>}
      {!photo && <p className="colinha-photo-hint">Sem foto pessoal, a bandeira do Brasil será usada na prévia e na imagem baixada.</p>}
      <h2>Escolha os candidatos</h2>
      {loadError ? <p role="alert" className="colinha-error">Não foi possível carregar a lista de candidatos. Tente novamente mais tarde.</p>
        : available.length===0 && <p>Não há candidatos publicados para esta localidade.</p>}
      <div className="colinha-options">{available.map(person=><div key={person.id} className="colinha-option"><label><input type="checkbox" checked={selected.includes(person.id)} onChange={()=>choose(person.id)} /><span><strong>{displayName(person)}</strong><small>{person.cargo} · {person.number || "Número não informado"}</small></span></label><input className="colinha-color-input" type="color" aria-label={`Cor do cartão de ${displayName(person)}`} value={cardColors[person.id] || defaults[Math.min(officeRank(person.cargo),4)]} onChange={event=>setCardColors(old=>({...old,[person.id]:event.target.value}))} /></div>)}</div>
      <div className="colinha-actions" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(135px,1fr))",gap:8}}>
        <button className="btn btn-primary" type="button" disabled={busy || !chosen.length} onClick={()=>makeImage("download")}>{busy?"Gerando…":"Baixar PNG no PC"}</button>
        <button className="btn btn-secondary" type="button" disabled={busy || !chosen.length} onClick={()=>makeImage("whatsapp")}>WhatsApp</button>
        <button className="btn btn-secondary" type="button" disabled={busy || !chosen.length} onClick={()=>makeImage("instagram")}>Instagram</button>
        <button className="btn btn-secondary" type="button" disabled={busy || !chosen.length} onClick={()=>makeImage("share")}>Compartilhar</button>
      </div>
      {notice && <p role="status" className="colinha-photo-hint">{notice} {notice.includes("WhatsApp") && <a href={`https://wa.me/?text=${encodeURIComponent(choiceLabel)}`} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>}{notice.includes("Instagram") && <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Abrir Instagram</a>}</p>}
      {error && <p role="alert" className="colinha-error">{error}</p>}
    </section>
    <section className="colinha-preview colinha-poster" aria-label="Prévia da colinha"><div className="colinha-preview-top">
      {photo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={photo} alt="Sua foto" onError={()=>setError("Sua foto não pôde ser exibida. Escolha JPG, PNG ou WebP.")} /> : /* eslint-disable-next-line @next/next/no-img-element */ <img className="colinha-flag" src="/bandeira-brasil.svg" alt="Bandeira do Brasil" />}
      <div className="colinha-poster-heading"><h2>COLINHA</h2><strong>{choiceLabel}</strong><p>{city ? `${city} · ` : ""}{state} · MFB</p></div>
    </div><div className="colinha-preview-list">{chosen.length?posterRows.map((row,index)=><div key={index} className={`colinha-poster-row colinha-poster-row-${index % 5}${isExecutiveRow(row) ? " colinha-executive-row" : ""}`}>{row.map(person=><div key={person.id} className="colinha-preview-row" style={{backgroundColor:cardColor(person,index)}}>{person.photo_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={person.photo_url} alt="" loading="lazy" onLoad={event=>matchPhotoColor(person.id,event.currentTarget)} />}<div className="colinha-poster-text"><small>{person.cargo}</small><b className={(person.number?.length ?? 0)>=5 ? "colinha-number-long" : (person.number?.length ?? 0)>=4 ? "colinha-number-medium" : ""}>{person.number||"—"}</b><strong>{displayName(person)}</strong></div></div>)}</div>):<p>Escolha candidatos para ver o cartaz.</p>}</div><footer><small>movimentofamiliabrasileira.com.br</small></footer></section></div>
  </>;
}
