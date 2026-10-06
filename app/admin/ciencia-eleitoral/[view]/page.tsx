import {redirect,notFound} from 'next/navigation';
import {electoralStaff} from '@/lib/electoral/auth';
import {AdminShell} from '@/components/admin/AdminShell';
import {ScienceNav,SCIENCE_VIEWS} from '@/components/science/ScienceNav';
import {ScienceExplorer} from '@/components/science/ScienceExplorer';
import {Investigations} from '@/components/science/Investigations';
import {ScienceReports} from '@/components/science/ScienceReports';
import {ScienceIntegrations} from '@/components/science/ScienceIntegrations';
import '@/components/electoral/electoral.css';
import '@/components/science/science.css';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{view:string}>}){const {view}=await params;if(!Object.hasOwn(SCIENCE_VIEWS,view))notFound();const {user,allowed}=await electoralStaff();if(!user)redirect('/admin/login');if(!allowed)redirect('/membro');return <AdminShell email={user.email}><div className="science-shell"><ScienceNav view={view}/>{view==='relatorios'?<ScienceReports/>:view==='investigacoes'?<Investigations/>:view==='integracoes'?<ScienceIntegrations/>:<ScienceExplorer models={view==='modelos'} cross={view==='cargos'}/>}</div></AdminShell>;}
