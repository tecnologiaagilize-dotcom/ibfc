import {redirect} from 'next/navigation';
import {electoralStaff} from '@/lib/electoral/auth';
import {AdminShell} from '@/components/admin/AdminShell';
import {CommunityWorkspace} from '@/components/community/CommunityWorkspace';
export const dynamic='force-dynamic';
export default async function Page(){const {allowed,user}=await electoralStaff();if(!user)redirect('/admin/login');if(!allowed)redirect('/membro');return <AdminShell email={user.email}><CommunityWorkspace/></AdminShell>;}
