"use client";
import {useEffect,useRef,useState} from "react";
import type {LocalComparison} from "@/lib/electoral/types";
import {number,summarize} from "@/lib/electoral/analysis";
import {exportMapPng,pngFilename,type MapExportConfig} from "@/lib/electoral/map-png";
type Position=[number,number];
type MapInstance={latLngToContainerPoint:(p:Position)=>{x:number;y:number};getCenter:()=>{lat:number;lng:number};getZoom:()=>number;setView:(position:Position,zoom:number,options?:Record<string,unknown>)=>MapInstance;fitBounds:(positions:Position[],options:Record<string,unknown>)=>void;invalidateSize:()=>void;remove:()=>void};
type Group={addTo:(map:MapInstance)=>Group;clearLayers:()=>void};
type Circle={addTo:(group:Group)=>Circle;bindPopup:(content:HTMLElement,options:Record<string,unknown>)=>Circle;bindTooltip:(content:string,options?:Record<string,unknown>)=>Circle;on:(event:string,callback:()=>void)=>Circle};
type Tiles={addTo:(map:MapInstance)=>Tiles;on:(event:string,callback:()=>void)=>Tiles};
type Leaflet={map:(host:HTMLElement,options:Record<string,unknown>)=>MapInstance;tileLayer:(url:string,options:Record<string,unknown>)=>Tiles;layerGroup:()=>Group;circleMarker:(position:Position,options:Record<string,unknown>)=>Circle};
declare global{interface Window{L?:Leaflet;}}
let loading:Promise<Leaflet>|null=null;
export function loadLeaflet():Promise<Leaflet>{
 if(window.L&&document.getElementById("ibfc-leaflet-css")?.getAttribute("data-loaded")==="true")return Promise.resolve(window.L);
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  let finished=false,jsReady=Boolean(window.L),cssReady=false;
  const end=(error?:string)=>{if(finished)return;if(!error&&(!jsReady||!cssReady))return;finished=true;clearTimeout(timer);
   if(error||!window.L){loading=null;document.getElementById("ibfc-leaflet-js")?.remove();document.getElementById("ibfc-leaflet-css")?.remove();reject(new Error(error||"Não foi possível iniciar o mapa."));}else resolve(window.L);
  };
  const timer=setTimeout(()=>end("O mapa demorou a carregar. Confira a conexão e tente novamente."),15000);
  const css=document.createElement("link");css.id="ibfc-leaflet-css";css.rel="stylesheet";css.href="/vendor/leaflet-1.9.4/leaflet.css";
  css.onload=()=>{cssReady=true;css.setAttribute("data-loaded","true");end();};css.onerror=()=>end("Não foi possível carregar o estilo do mapa. Confira a pasta public/vendor do pacote.");document.head.appendChild(css);
  if(jsReady){end();return;}
  const script=document.createElement("script");script.id="ibfc-leaflet-js";script.src="/vendor/leaflet-1.9.4/leaflet.js";script.async=true;
  script.onload=()=>{jsReady=true;end();};script.onerror=()=>end("Não foi possível carregar Leaflet. Confira a pasta public/vendor do pacote.");document.head.appendChild(script);
 });
 return loading;
}
const escaped=(text:string)=>text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
export function LeafletElectionMap({places,onSelect,viewportKey,fitPositions,exportConfig}:{places:(LocalComparison&{marker_color?:string;marker_label?:string;marker_radius?:number;marker_caption?:string;layer_kind?:string;urnas_count?:number|null})[];onSelect:(key:string)=>void;viewportKey?:string;fitPositions?:Position[];exportConfig?:MapExportConfig}){
 const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState(""),[includeBase,setIncludeBase]=useState(true);const exportEpoch=useRef(0);
 useEffect(()=>{exportEpoch.current++;setExporting(false);setExportError("");return()=>{exportEpoch.current++;};},[places,exportConfig]);
 const host=useRef<HTMLDivElement>(null),map=useRef<MapInstance|null>(null),group=useRef<Group|null>(null);
 const selectedCallback=useRef(onSelect);selectedCallback.current=onSelect;const fittedKey=useRef<string|null>(null),leaflet=useRef<Leaflet|null>(null);const [ready,setReady]=useState(0);
 const [status,setStatus]=useState("Carregando mapa…"),[tileError,setTileError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let disposed=false;let resizeObserver:ResizeObserver|null=null;
  loadLeaflet().then(L=>{
   if(disposed||!host.current)return;
   if(!map.current){
    const tileUrl=process.env.NEXT_PUBLIC_ELECTORAL_TILE_URL?.trim()||"https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    const url=new URL(tileUrl.replace(/\{[zxy]\}/g,"1"));if(url.protocol!=="https:"||url.username||url.password)throw new Error("O provedor de mapa deve usar um endereço HTTPS válido.");
    const custom=tileUrl!=="https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    const credit=process.env.NEXT_PUBLIC_ELECTORAL_TILE_ATTRIBUTION?.trim();if(custom&&!credit)throw new Error("Informe os créditos do provedor em NEXT_PUBLIC_ELECTORAL_TILE_ATTRIBUTION.");
    map.current=L.map(host.current,{scrollWheelZoom:false}).setView([-15.78,-47.93],9);
    L.tileLayer(tileUrl,{maxZoom:19,attribution:custom?escaped(credit!):'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',crossOrigin:custom?undefined:"anonymous",keepBuffer:1,updateWhenIdle:true,referrerPolicy:"strict-origin-when-cross-origin"})
     .on("tileerror",()=>{if(!disposed)setTileError(true);}).on("tileload",()=>{if(!disposed)setTileError(false);}).addTo(map.current);
    group.current=L.layerGroup().addTo(map.current);
   }
   leaflet.current=L;resizeObserver=new ResizeObserver(()=>map.current?.invalidateSize());resizeObserver.observe(host.current);setReady(v=>v+1);

  }).catch(e=>{if(!disposed)setStatus(e instanceof Error?e.message:"Não foi possível iniciar o mapa.");});
  return()=>{disposed=true;resizeObserver?.disconnect();map.current?.remove();map.current=null;group.current=null;leaflet.current=null;fittedKey.current=null;};
 },[retry]);
 useEffect(()=>{const L=leaflet.current;if(!L||!map.current||!group.current)return;let disposed=false;
   group.current?.clearLayers();const positions:Position[]=[];
   for(const place of places){
    if(place.latitude===null||place.longitude===null||!Number.isFinite(place.latitude)||!Number.isFinite(place.longitude)||Math.abs(place.latitude)>90||Math.abs(place.longitude)>180)continue;
    const position:Position=[place.latitude,place.longitude];positions.push(position);const s=summarize(place.sections);
    const box=document.createElement("div");box.className="electoral-map-info";
    const title=document.createElement("strong");title.textContent=place.name;box.appendChild(title);
    const description=document.createElement("p");description.textContent=`${place.municipality_name}/${place.uf} · Zona ${place.zone}${place.granularity==="zone"?"":` · Local ${place.local??"—"}`}`;box.appendChild(description);
    if(place.coordinate_year){const year=document.createElement("p");year.textContent=`Referência cartográfica: ${place.coordinate_year}`;box.appendChild(year);}
    if(place.marker_caption){const caption=document.createElement("p");caption.textContent=place.marker_caption;box.appendChild(caption);}
    if(place.address){const address=document.createElement("p");address.textContent=place.address;box.appendChild(address);}
    const votes=document.createElement("div");votes.className="electoral-popup-votes";
    const now=document.createElement("strong");now.textContent=`${s.newAvailable?number(s.newVotes):"Sem dados"} votos`;votes.appendChild(now);
    const detail=document.createElement("span");detail.textContent=place.granularity==="zone"?"Total da zona":`${place.section_count??place.sections.length} seções`;votes.appendChild(detail);if(!place.marker_caption)box.appendChild(votes);
    const hint=document.createElement("small");hint.textContent="Veja o painel de detalhes e aprofunde o território.";box.appendChild(hint);
    L.circleMarker(position,{radius:place.marker_radius??(place.marker_label?24:9),color:"#ffffff",weight:2,fillOpacity:.95,fillColor:place.marker_color??(s.delta===null?"#536278":s.delta>0?"#08775b":s.delta<0?"#ac4b35":"#12386b")})
     .addTo(group.current!).bindPopup(box,{minWidth:240,maxWidth:340,maxHeight:210,className:"ibfc-map-popup"}).bindTooltip(place.marker_label?escaped(place.marker_label):`Zona ${place.zone} · ${escaped(place.name)}`,place.marker_label?{permanent:true,direction:"center",className:"ibfc-zone-count",opacity:1}:undefined).on("click",()=>selectedCallback.current(place.key));
   }
   const fitting=fitPositions??positions;
   const fit=()=>{if(disposed||!map.current)return;map.current.invalidateSize();if(fitting.length===1)map.current.setView(fitting[0],14,{animate:false});else if(fitting.length>1)map.current.fitBounds(fitting,{padding:[25,25],maxZoom:14,animate:false});else map.current.setView([-15.78,-47.93],9);};
   const key=viewportKey??JSON.stringify(positions);if(fitting.length&&fittedKey.current!==key){fit();fittedKey.current=key;}
   setStatus(positions.length?"":"Nenhum ponto com coordenadas válidas nas camadas e filtros atuais. Consulte a tabela e a cobertura.");return()=>{disposed=true;};
 },[places,ready,viewportKey,fitPositions]);
 async function downloadPng(){if(!map.current||!host.current||!exportConfig)return;const epoch=exportEpoch.current;setExporting(true);setExportError("");try{const instance=map.current,center=instance.getCenter();const markers=places.flatMap(p=>{if(p.latitude===null||p.longitude===null||!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||Math.abs(p.latitude)>90||Math.abs(p.longitude)>180)return [];const xy=instance.latLngToContainerPoint([p.latitude,p.longitude]),s=summarize(p.sections);return [{...xy,radius:p.marker_radius??(p.marker_label?24:9),label:p.marker_label,color:p.marker_color??(s.delta===null?"#536278":s.delta>0?"#08775b":s.delta<0?"#ac4b35":"#12386b")}];});const blob=await exportMapPng(host.current,markers,exportConfig,includeBase,`zoom ${instance.getZoom()} · centro ${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`);if(epoch!==exportEpoch.current)return;const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=pngFilename(exportConfig.filename);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){if(epoch===exportEpoch.current)setExportError(e instanceof Error?e.message:"Não foi possível exportar.");}finally{if(epoch===exportEpoch.current)setExporting(false);}}
 return <><div className="electoral-map-wrap"><div ref={host} className="electoral-map electoral-leaflet-map" role="region" aria-label="Mapa OpenStreetMap dos territórios eleitorais"/>
  {status&&<div className="electoral-map-status" role="status">{status}{status.includes("Não foi")||status.includes("demorou")?<p><button onClick={()=>{setStatus("Carregando mapa…");setTileError(false);setRetry(n=>n+1);}}>Tentar novamente</button></p>:null}</div>}</div>
  {exportConfig&&<div className="map-png-controls no-print"><label><input type="checkbox" checked={includeBase} onChange={e=>setIncludeBase(e.target.checked)}/> Incluir mapa de ruas</label><button disabled={!ready||exporting} onClick={downloadPng} aria-label={`Baixar mapa PNG: ${exportConfig.title}`}>{exporting?"Preparando PNG…":"Baixar mapa PNG"}</button>{exportError&&<p role="alert">{exportError}</p>}</div>}
  {tileError&&<p className="electoral-caption" role="status">O mapa de ruas está temporariamente indisponível. Os pontos, a tabela e os relatórios continuam disponíveis.</p>}
  <p className="electoral-caption">Use + e − para aproximar o mapa. No celular, use dois dedos para ajustar o zoom. <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">Informar um problema no mapa de ruas</a>.</p></>;
}
