import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ElectoralDashboard } from "@/components/electoral/ElectoralDashboard";
import { electoralStaff } from "@/lib/electoral/auth";
export const dynamic="force-dynamic";
export default async function ElectoralMapPage() {
  const {user,allowed}=await electoralStaff();
  if(!user) redirect("/admin/login");
  if(!allowed) redirect("/membro");
  return <AdminShell email={user.email}><ElectoralDashboard/></AdminShell>;
}
