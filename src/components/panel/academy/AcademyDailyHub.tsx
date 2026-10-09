"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CalendarDays, Check, Circle, HeartHandshake, ListChecks, MessageCircleHeart, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase/client";
import { parseBibleReference } from "@/services/bibleReader";
import { createJournalEntry } from "@/services/formationJournal";
import { getTodayRoutine, getTodayWord, saveTodayRoutine, toggleRoutineStep, type RoutineStep } from "@/services/dailyRoutine";
import { getMyReadingEnrollments, listReadingPlanDays, listReadingPlans, listReadingProgress, setReadingDayCompleted, startReadingPlan } from "@/services/readingPlans";
import type { AcademyReadingDayProgress, AcademyReadingEnrollment, AcademyReadingPlan, AcademyReadingPlanDay, DailyWord, SpiritualDailyRoutine } from "@/types/domain";
import { BibleReader } from "../BibleReader";

type View = "today" | "plans" | "devotional";

const ROUTINE_STEPS: { key: RoutineStep; label: string; hint: string }[] = [
  { key: "read", label: "Ler", hint: "Abra a passagem e leia com atenção." },
  { key: "reflected", label: "Refletir", hint: "Registre o que Deus destacou no texto." },
  { key: "prayed", label: "Orar", hint: "Transforme sua leitura em oração." },
  { key: "practiced", label: "Praticar", hint: "Defina uma atitude concreta para hoje." },
  { key: "shared", label: "Compartilhar", hint: "Compartilhe a verdade aprendida quando fizer sentido." },
];

export function AcademyDailyHub({ profileId, onBack }: { profileId: string | null; onBack: () => void }) {
  const [view, setView] = useState<View>("today");
  const [word, setWord] = useState<DailyWord | null>(null);
  const [routine, setRoutine] = useState<SpiritualDailyRoutine | null>(null);
  const [plans, setPlans] = useState<AcademyReadingPlan[]>([]);
  const [enrollments, setEnrollments] = useState<AcademyReadingEnrollment[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<AcademyReadingPlan | null>(null);
  const [days, setDays] = useState<AcademyReadingPlanDay[]>([]);
  const [progress, setProgress] = useState<AcademyReadingDayProgress[]>([]);
  const [reflection, setReflection] = useState("");
  const [prayer, setPrayer] = useState("");
  const [practice, setPractice] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [bibleRef, setBibleRef] = useState<string | null>(null);

  const activeEnrollment = useMemo(() => enrollments.find((e) => e.status === "active") ?? enrollments.find((e) => e.status === "paused") ?? null, [enrollments]);
  const activePlan = useMemo(() => activeEnrollment ? plans.find((p) => p.id === activeEnrollment.plan_id) ?? null : null, [activeEnrollment, plans]);
  const activeDay = useMemo(() => activeEnrollment ? days.find((d) => d.day_number === activeEnrollment.current_day) ?? days[0] ?? null : null, [activeEnrollment, days]);
  const completedDayIds = useMemo(() => new Set(progress.map((p) => p.day_id)), [progress]);

  useEffect(() => {
    (async () => {
      const [todayWord, availablePlans] = await Promise.all([getTodayWord(supabase), listReadingPlans(supabase)]);
      setWord(todayWord);
      setPlans(availablePlans);
      if (!profileId) return;
      const [todayRoutine, mine] = await Promise.all([getTodayRoutine(supabase, profileId), getMyReadingEnrollments(supabase, profileId)]);
      setRoutine(todayRoutine);
      setReflection(todayRoutine?.reflection ?? "");
      setPrayer(todayRoutine?.prayer ?? "");
      setPractice(todayRoutine?.practice ?? "");
      setEnrollments(mine);
    })();
  }, [profileId]);

  useEffect(() => {
    const targetPlan = selectedPlan ?? activePlan;
    if (!targetPlan) { setDays([]); setProgress([]); return; }
    (async () => {
      const planDays = await listReadingPlanDays(supabase, targetPlan.id);
      setDays(planDays);
      const enrollment = enrollments.find((e) => e.plan_id === targetPlan.id);
      if (profileId && enrollment) setProgress(await listReadingProgress(supabase, profileId, enrollment.id));
      else setProgress([]);
    })();
  }, [selectedPlan, activePlan?.id, enrollments, profileId]);

  function openReference(reference: string | null | undefined) {
    if (!reference) return;
    setBibleRef(reference);
  }

  async function startPlan(plan: AcademyReadingPlan) {
    if (!profileId) { flash("Entre na sua conta para iniciar um plano."); return; }
    setBusy(true);
    try {
      const enrollment = await startReadingPlan(supabase, profileId, plan.id);
      setEnrollments((prev) => [enrollment, ...prev.filter((e) => e.id !== enrollment.id)]);
      setSelectedPlan(plan);
      setView("today");
      flash("Plano iniciado. Sua jornada diária já está pronta.");
    } catch (error) { console.error(error); flash("Não foi possível iniciar o plano agora."); }
    finally { setBusy(false); }
  }

  async function toggleDay(day: AcademyReadingPlanDay, completed: boolean) {
    const enrollment = enrollments.find((e) => e.plan_id === day.plan_id);
    const plan = plans.find((p) => p.id === day.plan_id);
    if (!profileId || !enrollment || !plan) return;
    setBusy(true);
    try {
      await setReadingDayCompleted(supabase, { profileId, enrollmentId: enrollment.id, dayId: day.id, dayNumber: day.day_number, completed, planDuration: plan.duration_days });
      const [nextProgress, nextEnrollments] = await Promise.all([listReadingProgress(supabase, profileId, enrollment.id), getMyReadingEnrollments(supabase, profileId)]);
      setProgress(nextProgress); setEnrollments(nextEnrollments);
      flash(completed ? "Leitura do dia concluída." : "Conclusão removida.");
    } catch (error) { console.error(error); flash("Não foi possível atualizar o progresso."); }
    finally { setBusy(false); }
  }

  async function toggleStep(step: RoutineStep, checked: boolean) {
    if (!profileId) return;
    try { setRoutine(await toggleRoutineStep(supabase, profileId, step, checked)); }
    catch (error) { console.error(error); flash("Não foi possível atualizar a rotina."); }
  }

  async function saveDevotional() {
    if (!profileId) { flash("Entre na sua conta para salvar o devocional."); return; }
    setBusy(true);
    try {
      const reference = activeDay?.bible_references?.[0] ?? word?.verse_ref ?? routine?.bible_reference ?? null;
      const saved = await saveTodayRoutine(supabase, profileId, { bible_reference: reference, reflection, prayer, practice, reflected_at: reflection.trim() ? (routine?.reflected_at ?? new Date().toISOString()) : routine?.reflected_at ?? null, prayed_at: prayer.trim() ? (routine?.prayed_at ?? new Date().toISOString()) : routine?.prayed_at ?? null, practiced_at: practice.trim() ? (routine?.practiced_at ?? new Date().toISOString()) : routine?.practiced_at ?? null });
      setRoutine(saved);
      const content = [reference ? `Texto: ${reference}` : null, reflection.trim() ? `Reflexão:\n${reflection.trim()}` : null, prayer.trim() ? `Oração:\n${prayer.trim()}` : null, practice.trim() ? `Prática:\n${practice.trim()}` : null].filter(Boolean).join("\n\n");
      if (content) await createJournalEntry(supabase, { profile_id: profileId, entry_type: "reflexao", content, is_private: true });
      flash("Devocional salvo na rotina e no Diário de Formação.");
    } catch (error) { console.error(error); flash("Não foi possível salvar o devocional."); }
    finally { setBusy(false); }
  }

  function flash(text: string) { setMessage(text); window.setTimeout(() => setMessage(""), 2800); }

  if (bibleRef) {
    const parsed = parseBibleReference(bibleRef);
    if (parsed) return <BibleReader onBack={() => setBibleRef(null)} initialBook={parsed.bookAbbrev} initialChapter={parsed.chapter} studyContext={{ source_type: "devotional", title: "Rotina diária", bible_reference: bibleRef }} />;
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-navy"><ArrowLeft className="h-4 w-4" />Voltar para Academy</button>

      <Card className="overflow-hidden border-gold/30 bg-gradient-to-br from-gold/10 via-card to-card">
        <CardHeader>
          <div className="flex items-start gap-3"><span className="icon-tile-md bg-gold/15 text-gold"><CalendarDays className="h-5 w-5" /></span><div><CardTitle className="font-display text-xl text-navy">Minha rotina com a Palavra</CardTitle><CardDescription>Leia, reflita, ore, pratique e compartilhe — um passo por vez.</CardDescription></div></div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant={view === "today" ? "default" : "outline"} size="sm" onClick={() => setView("today")}><ListChecks className="mr-1.5 h-4 w-4" />Hoje</Button>
          <Button variant={view === "plans" ? "default" : "outline"} size="sm" onClick={() => setView("plans")}><BookOpen className="mr-1.5 h-4 w-4" />Planos de leitura</Button>
          <Button variant={view === "devotional" ? "default" : "outline"} size="sm" onClick={() => setView("devotional")}><HeartHandshake className="mr-1.5 h-4 w-4" />Meu devocional</Button>
        </CardContent>
      </Card>

      {message && <div className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-navy">{message}</div>}

      {view === "today" && (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-4">
            {activePlan && activeDay ? (
              <Card>
                <CardHeader><CardTitle className="font-display text-lg text-navy">Dia {activeDay.day_number} de {activePlan.duration_days} — {activePlan.title}</CardTitle><CardDescription>{activeDay.title ?? "Leitura de hoje"}</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">{activeDay.bible_references.map((ref) => <Button key={ref} variant="outline" size="sm" onClick={() => openReference(ref)}><BookOpen className="mr-1.5 h-4 w-4" />{ref}</Button>)}</div>
                  {activeDay.reflection_prompt && <Prompt label="Refletir" text={activeDay.reflection_prompt} />}
                  {activeDay.prayer_prompt && <Prompt label="Orar" text={activeDay.prayer_prompt} />}
                  {activeDay.practice_prompt && <Prompt label="Praticar" text={activeDay.practice_prompt} />}
                  <Button disabled={busy} onClick={() => toggleDay(activeDay, !completedDayIds.has(activeDay.id))}>{completedDayIds.has(activeDay.id) ? <><Check className="mr-1.5 h-4 w-4" />Concluído hoje</> : <><Play className="mr-1.5 h-4 w-4" />Marcar leitura como concluída</>}</Button>
                </CardContent>
              </Card>
            ) : (
              <Card><CardContent className="space-y-3 pt-5"><p className="font-display text-lg text-navy">Comece um plano de leitura</p><p className="text-sm text-muted-foreground">Escolha uma trilha para receber uma leitura e uma proposta de reflexão por dia.</p><Button onClick={() => setView("plans")}>Ver planos disponíveis</Button></CardContent></Card>
            )}

            {word && (
              <Card className="border-navy/10">
                <CardHeader><CardTitle className="font-display text-lg text-navy">Palavra do dia</CardTitle><CardDescription>{word.title}</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  {word.verse_ref && <button className="font-semibold text-gold hover:underline" onClick={() => openReference(word.verse_ref)}>{word.verse_ref}</button>}
                  {word.verse_text && <p className="border-l-2 border-gold pl-3 text-sm italic text-ink">{word.verse_text}</p>}
                  {word.reflection && <p className="whitespace-pre-wrap text-sm text-ink">{word.reflection}</p>}
                  {word.prayer && <p className="rounded-lg bg-muted/50 p-3 text-sm text-ink"><span className="font-semibold text-navy">Oração: </span>{word.prayer}</p>}
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader><CardTitle className="font-display text-lg text-navy">Ciclo diário</CardTitle><CardDescription>Seu acompanhamento é pessoal e fica vinculado ao seu perfil.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {ROUTINE_STEPS.map((item) => {
                const value = Boolean(routine?.[`${item.key}_at` as keyof SpiritualDailyRoutine]);
                return <button key={item.key} onClick={() => toggleStep(item.key, !value)} className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${value ? "border-gold/40 bg-gold/10" : "hover:bg-muted/40"}`}><span className="mt-0.5 text-gold">{value ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</span><span><span className="block text-sm font-semibold text-navy">{item.label}</span><span className="block text-xs text-muted-foreground">{item.hint}</span></span></button>;
              })}
              <Button variant="outline" className="mt-2 w-full" onClick={() => setView("devotional")}><MessageCircleHeart className="mr-1.5 h-4 w-4" />Registrar minha reflexão</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {view === "plans" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plans.length === 0 && <Card><CardContent className="pt-5 text-sm text-muted-foreground">Nenhum plano de leitura publicado ainda. A estrutura já está pronta para o administrador cadastrar planos.</CardContent></Card>}
          {plans.map((plan) => {
            const enrollment = enrollments.find((e) => e.plan_id === plan.id);
            const isActive = enrollment?.status === "active";
            return <Card key={plan.id} className={plan.is_featured ? "border-gold/40" : ""}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="font-display text-lg text-navy">{plan.title}</CardTitle><CardDescription>{plan.duration_days} dias{plan.audience ? ` • ${plan.audience}` : ""}</CardDescription></div>{plan.is_featured && <span className="rounded-full bg-gold/10 px-2 py-1 text-[10px] font-bold uppercase text-gold"><Sparkles className="mr-1 inline h-3 w-3" />Destaque</span>}</div></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{plan.description ?? "Plano de leitura bíblica."}</p><Button disabled={busy} variant={isActive ? "outline" : "default"} onClick={() => { setSelectedPlan(plan); if (!isActive) startPlan(plan); else setView("today"); }}>{isActive ? `Continuar — dia ${enrollment?.current_day ?? 1}` : enrollment ? "Retomar plano" : "Começar plano"}</Button></CardContent></Card>;
          })}
        </div>
      )}

      {view === "devotional" && (
        <Card>
          <CardHeader><CardTitle className="font-display text-lg text-navy">Meu devocional de hoje</CardTitle><CardDescription>O registro fica privado no seu perfil e também pode ser consultado no Diário de Formação.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Field label="O que Deus destacou para mim?" value={reflection} onChange={setReflection} placeholder="Escreva sua reflexão…" />
            <Field label="Minha oração" value={prayer} onChange={setPrayer} placeholder="Registre sua oração…" />
            <Field label="O que vou colocar em prática?" value={practice} onChange={setPractice} placeholder="Defina uma atitude concreta…" />
            <div className="flex flex-wrap gap-2"><Button disabled={busy || (!reflection.trim() && !prayer.trim() && !practice.trim())} onClick={saveDevotional}>{busy ? "Salvando…" : "Salvar no Diário"}</Button>{(activeDay?.bible_references?.[0] || word?.verse_ref) && <Button variant="outline" onClick={() => openReference(activeDay?.bible_references?.[0] ?? word?.verse_ref)}><BookOpen className="mr-1.5 h-4 w-4" />Abrir texto bíblico</Button>}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Prompt({ label, text }: { label: string; text: string }) { return <div className="rounded-lg bg-muted/40 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-gold">{label}</p><p className="mt-1 text-sm text-ink">{text}</p></div>; }
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <div><label className="mb-1 block text-sm font-semibold text-navy">{label}</label><Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>; }
