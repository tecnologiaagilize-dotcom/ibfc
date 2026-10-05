"use client";
import { useEffect, useRef, useState } from "react";
import type { LocalComparison } from "@/lib/electoral/types";
import { number, summarize } from "@/lib/electoral/analysis";

type GMap = { fitBounds: (b: unknown) => void };
type GMarker = {map: GMap | null; addListener: (name: string, fn:()=>void) => {remove:()=>void}};
type GInfo = {setContent:(content:HTMLElement)=>void; open:(args:{map:GMap;anchor:GMarker})=>void;close:()=>void};
type Maps = {
  Map: new(el:HTMLElement, options:Record<string,unknown>)=>GMap;
  LatLngBounds: new()=>{extend:(p:{lat:number;lng:number})=>void};
  InfoWindow: new()=>GInfo;
  marker:{AdvancedMarkerElement:new(options:Record<string,unknown>)=>GMarker};
};
declare global { interface Window { google?: {maps:Maps}; ibfcMapsReady?:()=>void; gm_authFailure?:()=>void; } }
let loading: Promise<Maps> | null = null;
function loadMaps(key:string):Promise<Maps> {
  if(window.google?.maps.marker) return Promise.resolve(window.google.maps);
  if(loading) return loading;
  loading=new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(error?:string)=>{
      if(settled) return; settled=true;clearTimeout(timer);
      if(error || !window.google?.maps.marker){loading=null;document.getElementById("ibfc-google-maps")?.remove();reject(new Error(error || "O Google Maps não iniciou."));}
      else resolve(window.google.maps);
    };
    const timer=setTimeout(()=>finish("O mapa demorou a responder. Confira a conexão e a configuração da chave."),20000);
    window.ibfcMapsReady=()=>finish();
    window.gm_authFailure=()=>{window.dispatchEvent(new Event("ibfc-google-auth-error"));finish("Google Maps recusou a chave. Confira API habilitada, faturamento e domínios autorizados.");};
    const script=document.createElement("script");script.id="ibfc-google-maps";script.async=true;
    const url=new URL("https://maps.googleapis.com/maps/api/js");
    for(const [k,v] of Object.entries({key,libraries:"marker",loading:"async",callback:"ibfcMapsReady",v:"weekly",language:"pt-BR",region:"BR"})) url.searchParams.set(k,v);
    script.src=url.toString();script.onerror=()=>finish("Não foi possível carregar o Google Maps.");document.head.appendChild(script);
  });
  return loading;
}
export function GoogleElectionMap({places,onSelect}:{places:LocalComparison[];onSelect:(key:string)=>void}) {
  const host=useRef<HTMLDivElement>(null);
  const map=useRef<GMap | null>(null);
  const [status,setStatus]=useState("Carregando Google Maps…");
  const key=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  useEffect(()=>{
    if(!key){setStatus("Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY na Vercel para exibir o Google Maps. A tabela e os relatórios funcionam sem o mapa.");return;}
    let disposed=false;
    const authError=()=>setStatus("Google Maps recusou a chave. Confira API habilitada, faturamento e domínios autorizados.");
    window.addEventListener("ibfc-google-auth-error",authError);
    const markers:GMarker[]=[],listeners:{remove:()=>void}[]=[];
    let info:GInfo | null=null;
    loadMaps(key).then(maps=>{
      if(disposed || !host.current) return;
      if(!map.current) map.current=new maps.Map(host.current,{center:{lat:-15.78,lng:-47.93},zoom:10,
        mapId:process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",mapTypeControl:false,streetViewControl:false,gestureHandling:"cooperative"});
      const bounds=new maps.LatLngBounds();info=new maps.InfoWindow();let count=0;
      for(const place of places) {
        if(place.latitude===null || place.longitude===null) continue;
        count++;
        const p={lat:place.latitude,lng:place.longitude};bounds.extend(p);
        const s=summarize(place.sections);
        const dot=document.createElement("span");dot.className="electoral-pin";
        dot.style.background=s.delta===null ? "#536278" : s.delta>0 ? "#08775b" : s.delta<0 ? "#ac4b35" : "#12386b";
        dot.textContent=String(place.zone);dot.setAttribute("aria-label",place.name);
        const marker=new maps.marker.AdvancedMarkerElement({map:map.current,position:p,title:place.name,content:dot});
        markers.push(marker);
        listeners.push(marker.addListener("click",()=>{
          if(!map.current || !info) return;
          onSelect(place.key);
          const box=document.createElement("div");box.className="electoral-map-info";
          const heading=document.createElement("strong");heading.textContent=place.name;box.appendChild(heading);
          for(const line of [`${place.municipality_name}/${place.uf} · Zona ${place.zone} · Local ${place.local ?? "não identificado"}`,place.address,
            `${place.sections.length} seções com resultado importado`,
            `2022: ${s.oldAvailable ? number(s.oldVotes) : "sem dados"} · 2026: ${s.newAvailable ? number(s.newVotes) : "sem dados"}`,
            s.movedSections ? "Há seções que mudaram de local; conferir continuidade territorial." : "Comparação por chaves de seção; continuidade não verificada."]){
            const paragraph=document.createElement("p");paragraph.textContent=line;box.appendChild(paragraph);
          }
          info.setContent(box);info.open({map:map.current,anchor:marker});
        }));
      }
      if(count>1)map.current.fitBounds(bounds);
      setStatus(count ? "" : "Nenhum local com coordenadas neste recorte. Importe a base de locais do DF e Entorno.");
    }).catch(e=>{if(!disposed)setStatus(e.message);});
    return ()=>{disposed=true;window.removeEventListener("ibfc-google-auth-error",authError);listeners.forEach(l=>l.remove());markers.forEach(m=>m.map=null);info?.close();};
  },[key,places,onSelect]);
  return <div className="electoral-map-wrap"><div ref={host} className="electoral-map" aria-label="Mapa dos locais de votação do Distrito Federal e Entorno"/>{status&&<div className="electoral-map-status" role="status">{status}</div>}</div>;
}
