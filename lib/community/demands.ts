export const DEMAND_STATUS={aberta:'Aberta',em_atendimento:'Em atendimento',aguardando:'Aguardando retorno',resolvida:'Resolvida',cancelada:'Cancelada'} as const;
export const DEMAND_CATEGORY={saude:'Saúde',educacao:'Educação',seguranca:'Segurança',infraestrutura:'Infraestrutura',assistencia:'Assistência social',ambiente:'Meio ambiente',esporte:'Esporte e cultura',outros:'Outros'} as const;
export const DEMAND_PRIORITY={normal:'Normal',alta:'Alta',urgente:'Urgente'} as const;
export type Demand={id:string;organization_id:string|null;title:string;description:string;category:keyof typeof DEMAND_CATEGORY;priority:keyof typeof DEMAND_PRIORITY;responsible:string;due_on:string|null;status:keyof typeof DEMAND_STATUS;resolution:string;version:number;created_at:string;updated_at:string};
export type DemandEvent={id:string;old_status:keyof typeof DEMAND_STATUS|null;new_status:keyof typeof DEMAND_STATUS;note:string;created_at:string};
export function brazilDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function isOverdue(d:Pick<Demand,'status'|'due_on'>,today=brazilDate()){return d.status!=='resolvida'&&d.status!=='cancelada'&&Boolean(d.due_on&&d.due_on<today);}
export function validDate(v:unknown){if(v===''||v===null||v===undefined)return true;if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===v;}
export function validateDemand(b:Record<string,unknown>){const text=(v:unknown,min:number,max:number)=>typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max;const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
 if(!validDate(b.due_on)||!text(b.responsible??'',0,160))return 'Confira responsável e prazo.';
 if(b.action==='create'){if(!text(b.title,3,160)||!text(b.description,5,2000)||typeof b.category!=='string'||!Object.hasOwn(DEMAND_CATEGORY,b.category)||typeof b.priority!=='string'||!Object.hasOwn(DEMAND_PRIORITY,b.priority)||(b.organization_id&&!uuid(b.organization_id)))return 'Confira título, descrição, categoria e organização.';}
 else if(b.action==='update'){if(!uuid(b.id)||!Number.isSafeInteger(b.version)||Number(b.version)<1||typeof b.status!=='string'||!Object.hasOwn(DEMAND_STATUS,b.status)||!text(b.note,5,2000))return 'Informe a situação e o registro do atendimento.';}
 else return 'Ação inválida.';return null;}
