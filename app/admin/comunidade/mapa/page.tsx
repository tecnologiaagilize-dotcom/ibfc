import {redirect} from 'next/navigation';
import {electoralStaff} from '@/lib/electoral/auth';
import {AdminShell} from '@/components/admin/AdminShell';
import {CommunityMapWorkspace} from '@/components/community/CommunityMapWorkspace';
export const dynamic='force-dynamic';
export default async function Page(){const {user,allowed}=await electoralStaff();if(!user)redirect('/admin/login');if(!allowed)redirect('/membro');return <AdminShell email={user.email}><CommunityMapWorkspace/></AdminShell>;}
