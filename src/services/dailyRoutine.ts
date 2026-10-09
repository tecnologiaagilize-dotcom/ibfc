"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyWord, SpiritualDailyRoutine } from "@/types/domain";

export type RoutineStep = "read" | "reflected" | "prayed" | "practiced" | "shared";

export async function getTodayWord(sb: SupabaseClient): Promise<DailyWord | null> {
  const { data, error } = await sb.rpc("get_todays_word");
  if (error) { console.error("[daily-routine] todays word", error); return null; }
  return (data ?? null) as DailyWord | null;
}

export async function getTodayRoutine(sb: SupabaseClient, profileId: string): Promise<SpiritualDailyRoutine | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb.from("spiritual_daily_routine").select("*").eq("profile_id", profileId).eq("routine_date", today).maybeSingle();
  if (error) { console.error("[daily-routine] today", error); return null; }
  return (data ?? null) as SpiritualDailyRoutine | null;
}

export async function saveTodayRoutine(sb: SupabaseClient, profileId: string, patch: Partial<SpiritualDailyRoutine>): Promise<SpiritualDailyRoutine> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb.from("spiritual_daily_routine").upsert({ profile_id: profileId, routine_date: today, ...patch }, { onConflict: "profile_id,routine_date" }).select("*").single();
  if (error) throw error;
  return data as SpiritualDailyRoutine;
}

export async function toggleRoutineStep(sb: SupabaseClient, profileId: string, step: RoutineStep, checked: boolean): Promise<SpiritualDailyRoutine> {
  const field = `${step}_at` as keyof SpiritualDailyRoutine;
  return saveTodayRoutine(sb, profileId, { [field]: checked ? new Date().toISOString() : null } as Partial<SpiritualDailyRoutine>);
}
