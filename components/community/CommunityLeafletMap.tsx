'use client';
import {useEffect,useRef,useState} from 'react';
import {loadLeaflet} from '@/components/electoral/LeafletElectionMap';
import {hasCoordinates,type CommunityPoint} from '@/lib/community/map';
export function CommunityLeafletMap({places,demands,picking,onSelect,onLocation}:{places:CommunityPoint[];demands:boolean;picking:boolean;onSelect:(id:string)=>void;onLocation:(latitude:number,longitude:number)=>void}){
 const host=useRef<HTMLDivElement>(null),map=useRef<ReturnType<NonNullable<Window['L']>['map']>|null>(null),group=useRef<ReturnType<NonNullable<Window['L']>['layerGroup']>|null>(null),callbacks=useRef({onSelect,onLocation,picking});callbacks.current={onSelect,onLocation,picking};
 const positionsRef=useRef<[number,number][]>([]);
 const [ready,setReady]=useState(0),[retry,setRetry]=useState(0),[error,setError]=useState(''),[tilesError,setTilesError]=useState(false);
 useEffect(()=>{let disposed=false;let observer:ResizeObserver|null=null;setError('');setReady(0);loadLeaflet().then(L=>{if(disposed||!host.current)return;const tileUrl=process.env.NEXT_PUBLIC_ELECTORAL_TILE_URL?.trim()||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',credit=process.env.NEXT_PUBLIC_ELECTORAL_TILE_ATTRIBUTION?.trim();const url=new URL(tileUrl.replace(/\{[zxy]\}/g,'1'));if(url.protocol!=='https:'||url.username||url.password)throw new Error('O provedor de mapa deve usar HTTPS.');const custom=tileUrl!=='https://tile.openstreetmap.org/{z}/{x}/{y}.png';if(custom&&!credit)throw new Error('Informe os créditos do provedor de mapa.');
 const instance=L.map(host.current,{scrollWheelZoom:false}).setView([-15.78,-47.93],9);map.current=instance;
 const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 L.tileLayer(tileUrl,{maxZoom:19,attribution:custom?escape(credit!):'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',keepBuffer:1,updateWhenIdle:true,referrerPolicy:'strict-origin-when-cross-origin'}).on('tileerror',()=>{if(!disposed)setTilesError(true);}).on('tileload',()=>{if(!disposed)setTilesError(false);}).addTo(instance);
 group.current=L.layerGroup().addTo(instance);
 (instance as typeof instance&{on:(event:string,fn:(e:{latlng:{lat:number;lng:number}})=>void)=>void}).on('click',e=>{if(callbacks.current.picking)callbacks.current.onLocation(e.latlng.lat,e.latlng.lng);});
 observer=new ResizeObserver(()=>{instance.invalidateSize();const points=positionsRef.current;if(points.length>1)instance.fitBounds(points,{padding:[30,30],maxZoom:14,animate:false});else if(points.length===1)instance.setView(points[0],13,{animate:false});});observer.observe(host.current);setReady(n=>n+1);
 }).catch(e=>{if(!disposed)setError(e instanceof Error?e.message:'Não foi possível iniciar o mapa.');});return()=>{disposed=true;observer?.disconnect();map.current?.remove();map.current=null;group.current=null;};},[retry]);
 useEffect(()=>{if(!ready||!window.L||!map.current||!group.current)return;group.current.clearLayers();const positions:[number,number][]=[];
 for(const p of places){if(!hasCoordinates(p))continue;const position:[number,number]=[p.latitude!,p.longitude!];positions.push(position);const count=demands&&p.demands_open>0;
 const box=document.createElement('div');box.className='community-map-popup';const title=document.createElement('strong');title.textContent=p.name;box.append(title);
 for(const line of [`${p.municipality}/${p.uf}${p.territory?' · '+p.territory:''}`,`${p.demands_open} demandas abertas · ${p.demands_overdue} com prazo vencido`,p.location_note]){const paragraph=document.createElement('p');paragraph.textContent=line;box.append(paragraph);}
 const circle=window.L.circleMarker(position,{radius:count?23:10,color:'#fff',weight:2,fillOpacity:.95,fillColor:count?'#b86d14':'#187453'}).addTo(group.current).bindPopup(box,{minWidth:220,maxWidth:310,maxHeight:200,className:'community-map-popup-shell'}).on('click',()=>{if(!callbacks.current.picking)callbacks.current.onSelect(p.id);});
 circle.bindTooltip(count?String(p.demands_open):p.name.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)),count?{permanent:true,direction:'center',className:'community-map-count',opacity:1}:undefined);
 }
 positionsRef.current=positions;
 if(positions.length===1)map.current.setView(positions[0],13,{animate:false});else if(positions.length>1)map.current.fitBounds(positions,{padding:[30,30],maxZoom:14,animate:false});
 },[places,demands,ready]);
 return <><div className={'community-map-container'+(picking?' picking':'')}><div ref={host} className="community-leaflet" role="region" aria-label="Mapa de organizações e demandas comunitárias"/>{!ready&&!error&&<p className="community-map-status" role="status">Carregando mapa…</p>}{error&&<div className="community-map-status" role="alert">{error}<button onClick={()=>{setTilesError(false);setRetry(n=>n+1);}}>Tentar novamente</button></div>}</div>{tilesError&&<p role="status">Mapa de ruas indisponível. A tabela e os pontos cadastrados continuam acessíveis.</p>}<p className="community-map-caption">Use + e − para aproximar. Os círculos representam pontos públicos de atendimento cadastrados, não limites territoriais.</p></>;
}
