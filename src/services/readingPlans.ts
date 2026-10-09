"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AcademyReadingDayProgress, AcademyReadingEnrollment, AcademyReadingPlan, AcademyReadingPlanDay } from "@/types/domain";

export async function listReadingPlans(sb: SupabaseClient): Promise<AcademyReadingPlan[]> {
  const { data, error } = await sb.from("academy_reading_plans").select("*").eq("is_active", true).order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  if (error) { console.error("[reading-plans] list", error); return []; }
  return (data ?? []) as AcademyReadingPlan[];
}

export async function listReadingPlanDays(sb: SupabaseClient, planId: string): Promise<AcademyReadingPlanDay[]> {
  const { data, error } = await sb.from("academy_reading_plan_days").select("*").eq("plan_id", planId).order("day_number");
  if (error) { console.error("[reading-plans] days", error); return []; }
  return (data ?? []) as AcademyReadingPlanDay[];
}

export async function getMyReadingEnrollments(sb: SupabaseClient, profileId: string): Promise<AcademyReadingEnrollment[]> {
  const { data, error } = await sb.from("academy_reading_enrollments").select("*").eq("profile_id", profileId).order("updated_at", { ascending: false });
  if (error) { console.error("[reading-plans] enrollments", error); return []; }
  return (data ?? []) as AcademyReadingEnrollment[];
}

export async function startReadingPlan(sb: SupabaseClient, profileId: string, planId: string): Promise<AcademyReadingEnrollment> {
  const { data, error } = await sb.from("academy_reading_enrollments").upsert({ profile_id: profileId, plan_id: planId, status: "active", started_on: new Date().toISOString().slice(0, 10) }, { onConflict: "profile_id,plan_id" }).select("*").single();
  if (error) throw error;
  return data as AcademyReadingEnrollment;
}

export async function listReadingProgress(sb: SupabaseClient, profileId: string, enrollmentId: string): Promise<AcademyReadingDayProgress[]> {
  const { data, error } = await sb.from("academy_reading_day_progress").select("*").eq("profile_id", profileId).eq("enrollment_id", enrollmentId);
  if (error) { console.error("[reading-plans] progress", error); return []; }
  return (data ?? []) as AcademyReadingDayProgress[];
}

export async function setReadingDayCompleted(sb: SupabaseClient, args: { profileId: string; enrollmentId: string; dayId: string; dayNumber: number; completed: boolean; planDuration: number }): Promise<void> {
  if (args.completed) {
    const { error } = await sb.from("academy_reading_day_progress").upsert({ profile_id: args.profileId, enrollment_id: args.enrollmentId, day_id: args.dayId }, { onConflict: "enrollment_id,day_id" });
    if (error) throw error;
  } else {
    const { error } = await sb.from("academy_reading_day_progress").delete().eq("profile_id", args.profileId).eq("enrollment_id", args.enrollmentId).eq("day_id", args.dayId);
    if (error) throw error;
  }

  const { count } = await sb.from("academy_reading_day_progress").select("id", { count: "exact", head: true }).eq("profile_id", args.profileId).eq("enrollment_id", args.enrollmentId);
  const completedCount = count ?? 0;
  const finished = completedCount >= args.planDuration;
  const nextDay = Math.min(args.planDuration, Math.max(args.dayNumber + (args.completed ? 1 : 0), 1));
  const { error: enrollmentError } = await sb.from("academy_reading_enrollments").update({ current_day: nextDay, status: finished ? "completed" : "active", completed_at: finished ? new Date().toISOString() : null }).eq("id", args.enrollmentId).eq("profile_id", args.profileId);
  if (enrollmentError) throw enrollmentError;
}
