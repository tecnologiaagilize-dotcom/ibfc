import { createClient } from "@/lib/supabase/server";
export async function electoralStaff() {
  const db = await createClient();
  const {data: {user}, error} = await db.auth.getUser();
  if (error || !user) return {db, user: null, allowed: false};
  const {data: profile} = await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
  return {db, user, allowed: profile?.role === "admin" || profile?.role === "editor"};
}
