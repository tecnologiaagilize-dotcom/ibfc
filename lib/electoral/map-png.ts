/** Exports only tiles already displayed. No network requests or geographic inference. */
export type MapExportConfig={title:string;subtitle?:string;legend:string[];details:string[];filename:string};
export type ExportMarker={x:number;y:number;radius:number;color:string;label?:string};
export function pngFilename(value:string){return (value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,120)||'IBFC-mapa')+'.png';}
export function wrapLines(text:string,max:number,measure:(s:string)=>number){
 const lines:string[]=[];let line='';for(const word of text.split(/\s+/)){if(line&&measure(line+' '+word)<=max){line+=' '+word;continue;}if(line){lines.push(line);line='';}if(measure(word)<=max){line=word;continue;}for(const char of word){if(line&&measure(line+char)>max){lines.push(line);line='';}line+=char;}}if(line)lines.push(line);return lines;
}
export async function exportMapPng(host:HTMLElement,markers:ExportMarker[],config:MapExportConfig,includeBase:boolean,view:string){
 const rect=host.getBoundingClientRect();if(rect.width<1||rect.height<1)throw new Error('O mapa ainda não está visível.');
 if(host.classList.contains('leaflet-zoom-anim'))throw new Error('Aguarde o término do zoom e tente novamente.');
 const width=Math.max(900,Math.min(1600,Math.round(rect.width*2))),scale=width/rect.width,mapHeight=Math.round(rect.height*scale);
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw new Error('Este navegador não permite criar a imagem.');
 ctx.font='20px sans-serif';const max=width-80;
 const titles=[config.title,config.subtitle??''].filter(Boolean).flatMap(t=>wrapLines(t,max,s=>ctx.measureText(s).width));
 const credit=includeBase?(host.querySelector('.leaflet-control-attribution')?.textContent?.trim()||'Créditos cartográficos indisponíveis'):'Fundo cartográfico não incluído';
 const texts=[...config.legend,...config.details,credit,`Vista: ${view}`,`Exportado em ${new Date().toLocaleString('pt-BR')}`];
 const lines=texts.filter(Boolean).flatMap(t=>wrapLines(t,max,s=>ctx.measureText(s).width));
 const header=90+titles.length*29,footer=lines.length*29+90,total=header+mapHeight+footer;if(total*width>16000000)throw new Error('Vista muito alta para exportação. Reduza a altura do mapa.');
 canvas.width=width;canvas.height=total;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,total);ctx.fillStyle='#12386b';ctx.font='bold 26px sans-serif';ctx.fillText('IBFC · CIÊNCIA ELEITORAL',40,45);ctx.font='20px sans-serif';titles.forEach((line,i)=>ctx.fillText(line,40,78+i*29));
 ctx.save();ctx.beginPath();ctx.rect(0,header,width,mapHeight);ctx.clip();ctx.translate(0,header);ctx.scale(scale,scale);ctx.fillStyle='#eef2f6';ctx.fillRect(0,0,rect.width,rect.height);
 if(includeBase){let loaded=0;for(const img of Array.from(host.querySelectorAll<HTMLImageElement>('.leaflet-tile-pane img.leaflet-tile'))){const box=img.getBoundingClientRect();if(box.right<=rect.left||box.left>=rect.right||box.bottom<=rect.top||box.top>=rect.bottom)continue;let opacity=1;for(let el:HTMLElement|null=img;el&&el!==host;el=el.parentElement)opacity*=Number(getComputedStyle(el).opacity);if(opacity<=0)continue;if(!img.complete||!img.naturalWidth)throw new Error('Aguarde o carregamento das ruas ou desmarque “Incluir mapa de ruas”.');ctx.globalAlpha=opacity;ctx.drawImage(img,box.left-rect.left,box.top-rect.top,box.width,box.height);loaded++;}if(!loaded)throw new Error('Mapa de ruas indisponível. Desmarque “Incluir mapa de ruas”.');}
 ctx.globalAlpha=.95;for(const p of markers){ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#ffffff';ctx.stroke();if(p.label){ctx.globalAlpha=1;ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffffff';ctx.fillText(p.label,p.x,p.y);ctx.globalAlpha=.95;}}
 ctx.restore();ctx.fillStyle='#172338';ctx.font='20px sans-serif';lines.forEach((line,i)=>ctx.fillText(line,40,header+mapHeight+40+i*29));

 try{return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível gerar o PNG.')),'image/png'));}catch{throw new Error('O provedor não permite exportar as ruas. Desmarque “Incluir mapa de ruas” e tente novamente.');}
}
