/** Tipos de dominio do CEC FAMILY (espelham o schema do Supabase). */

export type UserRole = "master"|"apostolo"|"pastor"|"supervisor"|"lider"|"anfitriao"|"discipulador"|"membro"|"visitante";
export type ChurchType = "sede"|"nucleo"|"igreja_local";
export type JourneyStage = "visitante"|"novo_convertido"|"consolidacao"|"discipulado"|"batismo"|"membro_ativo"|"membro_efetivo"|"servo"|"lider_formacao"|"lider"|"diacono"|"supervisor"|"supervisor_setor"|"supervisor_area"|"supervisor_distrito"|"pastor_auxiliar"|"pastor_principal"|"apostolo"|"missionario";
export type MemberStatus = "ativo"|"inativo"|"afastado";
export type Weekday = "domingo"|"segunda"|"terca"|"quarta"|"quinta"|"sexta"|"sabado";
export type EventStatus = "abertas"|"encerradas"|"esgotado"|"em_breve";
export type EventTypeKind = "culto"|"congresso"|"conferencia"|"encontro"|"ebd"|"outro";
export type AttendeeKind = "membro"|"frequentador";
export type FinanceKind = "dizimo"|"oferta"|"primicia"|"missoes"|"construcao"|"outras_entradas"|"salario"|"aluguel"|"energia"|"evangelismo"|"evento"|"investimento"|"outras_saidas";
export type FinanceDirection = "entrada"|"saida";
export type DiscipleshipStatus = "ativo"|"pausado"|"concluido"|"desistente";
export type AuditAction = "insert"|"update"|"delete"|"login"|"logout"|"export"|"custom";

// B4b — Relatorios
export type WeeklyAttendanceKind = "membro" | "frequentador";
export type LgHealth = "muito_saudavel" | "saudavel" | "atencao" | "necessita_apoio";

export interface MeetingReport {
  id: string; life_group_id: string; meeting_date: string; weekday: Weekday | null;
  share_theme: string | null; bible_text: string | null;
  flowed: boolean | null; flowed_reason: string | null;
  attendance_count: number; frequentadores_count: number; total_present: number | null;
  visitors_count: number; visits_made: number; decisions_count: number;
  needs: string | null; summary: string | null; created_at: string;
  // Indicadores semanais (Caderno 11-B parte 1)
  members_with_disciplers?: number;
  mda_15_dias_happened?: boolean;
  mda_15_dias_count?: number;
  ge_happened?: boolean;
  ge_location?: string | null;
  ge_when?: string | null;
  oferta_pix?: number;
  oferta_especie?: number;
  ebd_count?: number;
  cc_count?: number;
  cel_count?: number;
  kg_amor?: number;
  // Discipulado
  disc_realizados?: number; disc_ativos?: number; disc_encontros?: number;
  disc_interrompidos?: number; disc_novos?: number;
  // Consolidação
  cons_retornantes?: number; cons_acompanhamento?: number;
  cons_integrados?: number; cons_novos_membros?: number;
  // Liderança
  lid_aux_treinamento?: boolean; lid_em_formacao?: boolean;
  lid_potencial_multiplicador?: boolean; lid_observacoes?: string | null;
  // Multiplicação
  mult_filha_preparacao?: boolean; mult_nova_lideranca?: boolean; mult_potencial?: boolean;
  // Saúde
  saude_status?: LgHealth | null; saude_comentarios?: string | null;
  // Necessidades pastorais
  nec_oracao_urgente?: boolean; nec_visita_pastoral?: boolean;
  nec_problema_familiar?: boolean; nec_problema_espiritual?: boolean;
  nec_encaminhar_supervisor?: boolean;
}

// Tela detalhada: relatório + nomes/dados ao redor
export interface ReportAttendanceRow {
  id: string; member_id: string; member_name: string;
  present: boolean; kind: string | null; absence_reason: string | null;
  had_mda_15_dias?: boolean;
  had_cc?: boolean;
  had_cel?: boolean;
}
export interface ReportVisitRow {
  id: string; visitor_name: string; phone: string | null; notes: string | null;
}
export interface ReportFull {
  report: MeetingReport;
  cell: Cell | null;
  leader_name: string | null;
  reporter_name: string | null;
  attendance: ReportAttendanceRow[];
  visits: ReportVisitRow[];
}
export interface MonthlyReport {
  id: string; life_group_id: string; year: number; month: number;
  nucleo: string | null; closed_at: string | null; created_at: string;
}
export interface MonthlyReportWeek {
  id: string; report_id: string; week_number: number;
  num_membros: number; memb_c_discipuladores: number;
  mda_15_dias: number; ge: number; visitantes: number;
  oferta_pix: number; oferta_especie: number;
  ebd: number; cc: number; cel: number; kg_amor: number;
}
export interface MonthlyReportMember {
  id: string; report_id: string; member_id: string;
  discipulador_id: string | null; discipulador_nome: string | null;
}
export interface MonthlyReportMemberWeek {
  id: string; monthly_report_member_id: string; week_number: number;
  mda: number; cc: number; cel: number;
}

// Finance
export interface Finance {
  id: string; church_id: string; sector_id: string | null;
  kind: FinanceKind; direction: FinanceDirection; amount: number;
  description: string | null; occurred_on: string;
  payer_name: string | null; payer_member_id: string | null;
  created_at: string;
}

export type ChurchStatus = "ativa"|"em_implantacao"|"inativa";
export interface Church {
  id:string; name:string; type:ChurchType; parent_id:string|null; sector_id:string|null;
  parent_level?: ChurchParentLevel | null; parent_territorial_id?: string | null;
  address:string|null; city:string|null; state:string|null;
  slug:string|null; pastor_id:string|null;
  logo_url:string|null; banner_url:string|null; short_name:string|null;
  primary_color:string|null; secondary_color:string|null;
  short_description:string|null; site_url:string|null; whatsapp_phone:string|null;
  is_active?:boolean;
  // Caderno C13b
  phone_primary?:string|null;
  phone_secondary?:string|null;
  email?:string|null;
  cep?:string|null;
  numero?:string|null;
  complemento?:string|null;
  referencia?:string|null;
  founded_at?:string|null;
  status_admin?:ChurchStatus;
  observations?:string|null;
}
export interface ChurchDependencies {
  children:number; life_groups:number; members:number; reports:number; total:number;
}

// Classificação e dashboard hierárquico
export type MdaHealth = "saudavel" | "atencao" | "necessita_intervencao";
export interface ScopeMetrics {
  total_lgs: number;
  active_lgs: number;
  reported_30d: number;
  with_leader: number;
  multiplicando: number;
  multiplicado: number;
  in_formation: number;
  members: number;
  visitors_30d: number;
  decisions_30d: number;
  evasion_count: number;
  reporting_rate: number;
  leader_coverage: number;
  health_score: number;
  health_class: MdaHealth;
}
export interface LgWithHealth {
  lg_id: string;
  lg_name: string;
  church_id: string | null;
  status_lg: string;
  members_count: number;
  last_report_date: string | null;
  evasion_count: number;
  health_class: MdaHealth;
}
export interface State { id:string; name:string; uf:string; is_active:boolean; created_at:string; }
export interface Nucleo { id:string; state_id:string; name:string; leader_id:string|null; is_active:boolean; created_at:string; }
export type DistrictParentLevel = "estado" | "nucleo";
export type SectorParentLevel = "nucleo" | "distrito";
export type ChurchParentLevel = "nucleo" | "distrito" | "setor";

export interface District {
  id:string; name:string; mother_id:string|null; leader_id:string|null; is_active:boolean;
  parent_level: DistrictParentLevel; parent_id: string;
  /** @deprecated coluna legada, pré-flexibilização — não usar em código novo */ nucleo_id?:string;
  /** @deprecated coluna legada, pré-MEO-001 — não usar em código novo */ church_id?:string|null;
}
export interface Area { id:string; district_id:string; name:string; mother_id:string|null; leader_id:string|null; is_active:boolean; }
export interface Sector {
  id:string; name:string; area_id:string|null; mother_id:string|null; leader_id:string|null; is_active:boolean;
  parent_level: SectorParentLevel; parent_id: string;
  /** @deprecated coluna legada, pré-flexibilização — não usar em código novo */ district_id?:string;
}

// MDA Health (Caderno 11-B)
export type MdaStatus = "saudavel" | "atencao" | "necessita";
export interface MdaHealthRow {
  state_id: string | null; state_name: string | null;
  nucleo_id: string | null; nucleo_name: string | null;
  church_id: string; church_name: string; church_type: string;
  district_id: string | null; district_name: string | null;
  area_id: string | null; area_name: string | null;
  sector_id: string | null; sector_name: string | null;
  lg_id: string | null; lg_name: string | null; lg_status_lg: string | null;
  lg_health: MdaStatus | null;
  sector_health: MdaStatus | null;
  area_health: MdaStatus | null;
  district_health: MdaStatus | null;
  nucleo_health: MdaStatus | null;
  state_health: MdaStatus | null;
  church_health: MdaStatus;
  lg_members_count: number | null;
  lg_last_report_date: string | null;
}

// Caderno 13 — Visualizações grandes
export interface LgGenealogyNode {
  id: string; name: string; mother_cell_id: string | null;
  church_id: string | null; leader_id: string | null;
  status_lg: string | null; founded_at: string | null;
  generation: number;
  members_count: number; direct_children_count: number;
}
export interface OrgDashboardKpis {
  total_churches: number; total_sedes: number; total_nucleos: number; total_locais: number;
  estados_alcancados: number; cidades_alcancadas: number;
  total_distritos: number; total_areas: number; total_setores: number;
  total_lgs: number; lgs_em_multiplicacao: number; lgs_multiplicados: number;
  total_membros_ativos: number; novos_convertidos: number;
  novos_membros_30d: number; novos_membros_12m: number;
  relatorios_ultima_semana: number; relatorios_ultimo_mes: number;
  total_ministerios: number;
  multiplicacoes_ano: number; multiplicacoes_12m: number;
}
export interface GrowthMonthlyRow {
  month_label: string; month_date: string;
  new_members: number; new_lgs: number;
}
export interface CityExpansion {
  state: string; city: string;
  churches_count: number; lgs_count: number; members_count: number;
  church_names: string[]; church_types: string[]; church_ids: string[];
}
export interface StateExpansion {
  state: string;
  churches_count: number; cities_count: number;
  lgs_count: number; members_count: number;
}
export type TargetAudience = "misto"|"jovens"|"adolescentes"|"adultos"|"casais"|"terceira_idade"|"mulheres"|"homens"|"outro";
export type LgStatus = "em_formacao"|"ativo"|"em_multiplicacao"|"multiplicado"|"encerrado";
export interface Cell {
  id:string; name:string; sector_id:string|null; church_id:string|null;
  leader_id:string|null; coleader_id:string|null; host_id:string|null; supervisor_id:string|null;
  host_assistant_id?:string|null;
  mother_cell_id:string|null; address:string|null;
  cep?:string|null; numero?:string|null; complemento?:string|null;
  state:string|null; city:string|null; neighborhood:string|null;
  latitude:number|null; longitude:number|null;
  meeting_weekday:Weekday|null; meeting_time:string|null; is_active:boolean;
  multiplication_target?:number;
  target_audience?:TargetAudience;
  status_lg?:LgStatus;
  founded_at?:string|null;
}

// Grupo de Evangelismo — subdivisão de um Life Group (C24)
export type EvangelismGroupStatus =
  | "planejamento" | "autorizacao" | "implantacao" | "evangelizacao" | "consolidacao"
  | "encerrado_novo_lg" | "encerrado_integrado" | "encerrado_sem_resultado";

export interface EvangelismGroup {
  id:string; cell_id:string; name:string;
  address:string|null; neighborhood:string|null; city:string|null; state:string|null;
  meeting_weekday:Weekday|null; meeting_time:string|null; is_active:boolean;
  status: EvangelismGroupStatus;
  started_at: string|null; expected_end_at: string|null;
  resulting_lg_id: string|null;
  created_at:string;
  leader_ids?: string[];       // preenchido no service, a partir de evangelism_group_leaders
  leader_names?: string[];     // idem, nomes já resolvidos
}
export interface EvangelismGroupLeader { id:string; group_id:string; member_id:string; created_at:string; }

export interface Profile { id:string; full_name:string; email:string|null; phone:string|null; role:UserRole; avatar_url:string|null; church_id:string|null; }
export interface Member {
  id:string; profile_id:string|null; full_name:string; email:string|null; phone:string|null;
  birth_date:string|null; life_group_id:string|null; church_id:string|null;
  journey_stage:JourneyStage; status:MemberStatus; joined_at:string|null;
  // Dados pessoais complementares (script Cadastro/Realocação/Carteirinha)
  social_name?: string|null; gender?: string|null; marital_status?: string|null;
  nationality?: string|null; naturalidade?: string|null;
  cpf?: string|null; rg?: string|null; rg_orgao_expedidor?: string|null;
  cnh?: string|null; cnh_validade?: string|null;
  phone_recado?: string|null; phone_recado_nome?: string|null; whatsapp?: string|null;
  cep?: string|null; address?: string|null; numero?: string|null; complemento?: string|null;
  neighborhood?: string|null; city?: string|null; state?: string|null; country?: string|null;
  photo_url?: string|null; baptism_date?: string|null; discipler_id?: string|null;
  consent_accepted_at?: string|null; photo_consent_accepted_at?: string|null;
  cec_id?: string|null; card_status?: CardStatus; card_approved_at?: string|null; card_issued_at?: string|null; qr_token?: string;
  member_since?: string|null;
}
export interface Sermon { id:string; title:string; reference:string|null; speaker:string|null; youtube_url:string; thumbnail_url:string|null; category:string|null; published_at:string; is_featured:boolean; is_published:boolean; church_id:string|null; duration?:string|null; sort_order:number; description?:string|null; pdf_url?:string|null; }
export interface EventItem { id:string; title:string; description:string|null; starts_at:string; ends_at:string|null; location:string|null; image_url:string|null; registration_url:string|null; status:EventStatus; event_type:EventTypeKind; is_published:boolean; church_id:string|null; }

// M1b — Banners (Hero Carousel)
export interface Banner {
  id: string; title: string; subtitle: string | null;
  image_url: string | null; cta_label: string | null; cta_url: string | null;
  sort_order: number; is_active: boolean;
  starts_at: string | null; ends_at: string | null;
  created_at: string;
}
export interface PrayerRequest { id:string; life_group_id:string|null; member_id:string|null; request:string; is_answered:boolean; created_at:string; }
export interface Discipleship { id:string; discipler_id:string; disciple_id:string; status:DiscipleshipStatus; started_on:string; ended_on:string|null; current_module:string|null; notes:string|null; }
export type TimelineEventType = "conversao"|"batismo"|"consolidacao"|"discipulado"|"curso"|"ministerio"|"encontro"|"mudanca_etapa"|"observacao";
export interface PastoralTimeline {
  id:string; member_id:string; event_type:TimelineEventType; title:string; description:string|null;
  from_stage?:string|null; to_stage?:string|null; is_progression?:boolean|null;
  milestone_key?:string|null;
  event_date:string; created_at:string;
}
export interface RecentEvolution {
  id: string; member_id: string; from_stage: string; to_stage: string; event_date: string;
  full_name: string; phone: string | null; church_id: string | null;
}
export interface AuditLog {
  id:string; actor_id:string|null; actor_email:string|null; action:AuditAction; entity:string; entity_id:string|null;
  church_id: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  created_at:string;
}
export interface MdaMinAlert { nivel:"distrito"|"area"|"setor"; id:string; nome:string; filhos:number; }
export interface DashboardStats {
  total_members:number; total_visitors:number; total_groups:number;
  total_reports:number; baptisms:number;
  by_stage: Record<string,number>;
  reports_trend: { week:string; attendance:number; visitors:number }[];
}

/** Conteudo institucional (vindo das tabelas `church_info` e `daily_words`). */
export interface ChurchInfo {
  id: string; church_id: string; weekday: Weekday; time: string;
  description: string | null; is_active: boolean; sort_order: number;
}
export type ServiceTime = ChurchInfo; // alias usado no front
export interface DailyWord {
  id: string; date: string; title: string;
  verse_ref: string | null; verse_text: string | null; reflection: string | null;
  prayer: string | null;
  is_active: boolean;
}

// M1a — Conteudo publico e formularios
export type NewsCategory = "minha_comunidade" | "cec_manaus" | "cec_brasilia" | "geral";
export type ContactStatus = "novo" | "em_andamento" | "concluido" | "spam";
export interface News {
  id: string; slug: string; category: NewsCategory;
  title: string; summary: string | null; body: string | null;
  cover_url: string | null; author_name: string | null;
  church_id: string | null;
  is_published: boolean; published_at: string | null;
  meta_title: string | null; meta_description: string | null; og_image_url: string | null;
  created_at: string; updated_at: string; sort_order: number;
}
export interface PublicPrayerRequest {
  id: string; full_name: string; email: string | null; phone: string | null;
  city: string | null; request: string; status: ContactStatus;
  internal_notes: string | null; church_id: string | null; created_at: string;
}
export interface VisitRequest {
  id: string; full_name: string; email: string | null; phone: string;
  city: string | null; address: string | null;
  best_time: string | null; reason: string | null;
  status: ContactStatus; internal_notes: string | null;
  church_id: string | null; created_at: string;
}
export interface PendingCounts { prayer_pending: number; visit_pending: number; pipeline_new: number; }

// Engajamento — evasão, badges, multiplicação
export interface MemberAtRisk {
  member_id: string; full_name: string; life_group_id: string | null;
  church_id: string | null; phone: string | null; email: string | null;
  presences_in_last_3: number; reports_count: number; last_seen_at: string | null;
}
export interface LgBadge {
  key: string; label: string; description: string; icon: string;
}
export interface LgMultiplicationProgress {
  current_count: number; target: number; percent: number;
}

// Ministérios
export type MinistryRole = "lider" | "vice" | "membro";
export interface Ministry {
  id: string; church_id: string;
  name: string; slug: string | null; description: string | null;
  leader_id: string | null; vice_leader_id: string | null;
  color: string | null; icon: string | null; is_active: boolean;
  created_at: string;
}
export interface MinistryMember {
  id: string; ministry_id: string; member_id: string;
  role: MinistryRole; joined_at: string; is_active: boolean;
}
export interface MinistryPost {
  id: string; ministry_id: string; author_id: string | null;
  title: string; body: string | null; cover_url: string | null;
  is_published: boolean; published_at: string | null; created_at: string;
}

// IA-1 — Indicadores objetivos
export interface LgIndicators {
  life_group_id: string;
  life_group_name?: string;
  church_id?: string | null;
  attendance_avg_last_4: number;
  attendance_avg_last_12: number;
  members_now: number;
  members_30d_ago: number;
  members_90d_ago: number;
  growth_30d_pct: number;
  growth_90d_pct: number;
  new_converts_90d: number;
  discipleship_rate_pct: number;
  report_consistency_pct: number;
  visitors_avg_last_4: number;
  decisions_90d: number;
  visits_made_90d: number;
  multiplication_target: number;
  multiplication_pct: number;
  last_report_date: string | null;
  reports_last_90d: number;
}
export type AggregateLevel = "sector" | "area" | "district" | "church";
export interface AggregateIndicators {
  level: AggregateLevel;
  scope_id: string;
  total_lgs: number;
  total_members: number;
  total_new_converts_90d: number;
  attendance_avg: number;
  growth_30d_pct: number;
  discipleship_rate_pct: number;
  decisions_90d: number;
  visits_made_90d: number;
  multiplication_pct_avg: number;
  report_consistency_pct: number;
}

// M3 — Cadastro inteligente / Visitor Pipeline
export type PipelineStage = "novo"|"aguardando_contato"|"contato_realizado"|"convidado_culto"|"convidado_life_group"|"participou"|"discipulado"|"consolidacao"|"batizado"|"membro"|"servo"|"lider";
export type PipelineIntent = "lifegroup"|"discipulado"|"acompanhamento_pastoral"|"visita"|"conhecer"|"batismo"|"servir"|"outro";
export interface VisitorPipeline {
  id: string; user_id: string | null; profile_id: string | null; community_id: string | null;
  life_group_id: string | null;
  full_name: string; phone: string | null; email: string | null;
  state: string | null; city: string | null; cep: string | null;
  intent: PipelineIntent; stage: PipelineStage; source: string | null;
  assigned_to: string | null; internal_notes: string | null;
  first_contact_at: string | null; life_group_invite_at: string | null;
  discipleship_started_at: string | null;
  baptism_date: string | null; member_date: string | null;
  // M6 — sugestão automática de LG
  suggested_lg_id: string | null;
  suggestion_score: number | null;
  suggestion_reason: string | null;
  suggestion_calculated_at: string | null;
  evangelism_group_id?: string | null;
  created_at: string;
  // Cadastro completo (visitor_pipeline_create_v2)
  cpf: string | null; gender: string | null; marital_status: string | null; birth_date: string | null;
  address: string | null; neighborhood: string | null;
  baptized: boolean | null; last_church: string | null;
  holy_spirit_baptized: boolean | null; holy_spirit_baptism_date: string | null;
  seeking_reason: string | null; life_before_church: string | null; testimony: string | null;
  belongs_to_group: boolean | null; group_name: string | null;
}

export interface LgSuggestion {
  lg_id: string;
  lg_name: string;
  raw_score: number;
  adjusted_score: number;
  members_count: number;
  target: number;
  reason: string;
}

// Caderno 12 — Patrimônio
export type OccupationType = "proprio"|"alugado"|"cedido"|"comodato"|"em_regularizacao";
export type AssetCategory = "mobiliario"|"equipamentos"|"som_multimidia"|"infraestrutura"|"nao_duravel";
export type AssetCondition = "novo"|"otimo"|"bom"|"regular"|"ruim"|"inutilizado"|"baixado";
export type AssetOrigin = "compra_nf"|"doacao"|"sem_nf"|"transferencia"|"comodato"|"outro";

export interface Property {
  id: string; church_id: string; name: string; occupation_type: OccupationType;
  cep: string | null; state: string | null; city: string | null; neighborhood: string | null;
  address: string | null; numero: string | null; complemento: string | null;
  latitude: number | null; longitude: number | null;
  acquired_at: string | null; contract_end_at: string | null; iptu_due_at: string | null;
  owner_name: string | null; owner_document: string | null; owner_phone: string | null;
  observations: string | null; is_active: boolean;
  created_at: string;
}

export interface Asset {
  id: string; church_id: string; property_id: string | null;
  patrimony_code: string | null; tag_number: string | null;
  name: string; category: AssetCategory; subcategory: string | null;
  description: string | null; manufacturer: string | null; model: string | null;
  serial_number: string | null; responsible_id: string | null; location_text: string | null;
  acquired_at: string | null; acquisition_value: number | null; origin: AssetOrigin;
  condition: AssetCondition; is_durable: boolean; is_active: boolean;
  observations: string | null;
  created_at: string;
}

export interface PropertyDocument {
  id: string; property_id: string; doc_type: string; title: string;
  storage_path: string | null; size_bytes: number | null; mime_type: string | null;
  uploaded_at: string; observations: string | null;
  doc_number: string | null; issued_at: string | null; expires_at: string | null;
  issuing_body: string | null; version: number;
  superseded_by: string | null; is_current: boolean;
}

export interface AssetDocument {
  id: string; asset_id: string; doc_type: string; title: string;
  storage_path: string | null; size_bytes: number | null; mime_type: string | null;
  uploaded_at: string; observations: string | null;
}

export interface AssetPhoto {
  id: string; asset_id: string; photo_year: number | null; taken_at: string | null;
  storage_path: string; caption: string | null; uploaded_at: string;
}

export interface PatrimonySummary {
  church_id: string; church_name: string;
  properties_count: number; assets_count: number;
  total_acquisition_value: number; contracts_expiring_90d: number;
}

// C16 — Inteligência Ministerial
export type HealthBand = "saudavel" | "atencao" | "critico";
export type ReliabilityBand = "confiavel" | "atencao" | "critico";

export interface LgScoreMinisterial {
  id: string; name: string; church_id: string; leader_id: string | null;
  status_lg: string; founded_at: string | null; mother_cell_id: string | null;
  direct_children: number; members_count: number;
  total_relatorios: number | null; media_presentes: number | null;
  total_visitantes: number | null; total_decisoes: number | null;
  total_disc_ativos: number | null; total_integrados: number | null;
  total_novos_membros: number | null; ultimo_relatorio: string | null;
  pts_reporte: number; pts_frequencia: number; pts_retencao: number;
  pts_discipulado: number; pts_evangelismo: number; pts_multiplicacao: number;
  score_total: number; health_band: HealthBand;
}
export interface LgRanking extends LgScoreMinisterial {
  church_name: string | null;
  rank_geral: number; rank_frequencia: number; rank_evangelismo: number;
  rank_multiplicacao: number; rank_discipulado: number; rank_visitantes: number; rank_membros: number;
}
export interface RetentionFunnel {
  visitantes: number; consolidacao: number; discipulado: number; batismo: number;
  membros_ativos: number; servos_e_formacao: number; lideres: number; total: number;
}
export interface RetentionFunnelByChurch extends RetentionFunnel {
  church_id: string; church_name: string | null;
}
export interface LgReliabilityIndex {
  id: string; name: string; church_id: string; church_name: string | null;
  members_count: number; relatorios_90d: number; ultimo_relatorio: string | null;
  dias_sem_relatorio: number; taxa_reporte_pct: number;
  flag_sem_relatorio_recente: boolean; flag_reporte_irregular: boolean;
  flag_dados_suspeitos: boolean; flag_sem_membros: boolean;
  total_flags: number; reliability_band: ReliabilityBand;
}
export interface ReliabilitySummary {
  total_lgs: number; lgs_confiaveis: number; lgs_atencao: number; lgs_criticos: number;
  lgs_sem_relatorio_recente: number; lgs_reporte_irregular: number;
  lgs_dados_suspeitos: number; lgs_sem_membros: number;
  taxa_reporte_media_pct: number; pct_confiaveis: number;
}
export interface MonthlyConsolidation {
  mes: string; mes_label: string; church_id: string; church_name: string | null;
  church_type: string | null; church_parent_id: string | null;
  sector_id: string | null; sector_name: string | null;
  area_id: string | null; area_name: string | null;
  district_id: string | null; district_name: string | null;
  lgs_reportaram: number; total_relatorios: number;
  total_presentes: number; total_frequentadores: number;
  total_visitantes: number; total_decisoes: number;
  total_disc_ativos: number; total_disc_novos: number;
  total_integrados: number; total_novos_membros: number;
  lgs_em_preparacao_mult: number; lgs_nova_lideranca: number;
  total_oracao_urgente: number; total_visita_pastoral: number;
}
export interface GrowthVariation {
  mes_label: string; mes: string;
  presentes: number; visitantes: number; decisoes: number;
  integrados: number; disc_ativos: number; lgs_reportaram: number;
  var_pct_presentes: number | null; var_pct_visitantes: number | null; var_pct_lgs_reportaram: number | null;
}

// C17 — Central de Metas
export type GoalScope = "nacional"|"sede"|"nucleo"|"distrito"|"area"|"setor"|"lg"|"ministerio";
export type GoalIndicator = "membros_ativos"|"visitantes"|"decisoes"|"batismos"|"multiplicacoes"|"lgs_ativos"|"disc_ativos"|"integrados"|"relatorios_enviados"|"novos_membros"|"integrantes_ministerio";
export type GoalStatus = "atingido"|"no_caminho"|"atencao";
export interface MinistryGoal {
  id: string; scope: GoalScope; scope_id: string | null; scope_name: string;
  year: number; month: number | null; indicator: GoalIndicator;
  target_value: number; notes: string | null; created_by: string | null;
  created_at: string; updated_at: string;
}
export interface GoalVsActual extends MinistryGoal {
  actual_value: number; pct_atingido: number; status_meta: GoalStatus;
}
export interface MinistryGoalVsActual extends MinistryGoal {
  ministry_name: string; actual_value: number; pct_atingido: number; status_meta: GoalStatus;
}

// C18 — Torre de Controle
export type AlertType = "sem_relatorio"|"oracao_urgente"|"visita_pastoral"|"score_critico"|"sem_membros"|"meta_atrasada"|"relmda_atrasado";
export type AlertSeverity = "critico"|"atencao";

export interface ControlTowerAlert {
  alert_type: AlertType;
  severity: AlertSeverity;
  category: string;
  lg_id: string | null;
  lg_name: string;
  church_id: string | null;
  church_name: string | null;
  detail: string;
  severity_score: number;
  alert_date: string;
}

export interface ControlTowerSummary {
  total_criticos: number;
  total_atencao: number;
  total_alertas: number;
  alertas_sem_relatorio: number;
  alertas_oracao_urgente: number;
  alertas_visita_pastoral: number;
  alertas_score_critico: number;
  alertas_sem_membros: number;
  alertas_meta_atrasada: number;
  lgs_afetados: number;
  igrejas_afetadas: number;
  alertas_relmda_atrasado: number;
}

// C19 — Governança por Delegação
export type DelegationModule = "intelligence"|"reports"|"control_tower"|"finance"|"patrimony"|"audit"|"administrativo"|"comunicacao"|"documentacao"|"supervisao"|"usuarios"|"kids"|"live360";

export interface Permission {
  key: string; module: DelegationModule; label: string; description: string | null; is_write: boolean;
}
export type DelegationScope  = "lg"|"setor"|"area"|"distrito"|"nucleo"|"sede"|"nacional";
export type DelegationStatus = "pendente"|"ativo"|"rejeitado"|"revogado"|"expirado"|"programada"|"concluida"|"suspensa";
export type CouncilVote      = "aprovado"|"reprovado"|"abstencao";

export interface CouncilMember {
  id: string; profile_id: string; cargo: string; is_active: boolean;
  created_at: string; updated_at: string;
}
export interface ModuleDelegation {
  id: string; profile_id: string; module: DelegationModule;
  trust_level: number; scope: DelegationScope; scope_id: string|null; scope_name: string;
  status: DelegationStatus; expires_at: string|null;
  requested_by: string|null; requested_at: string; request_reason: string;
  is_critical: boolean; council_pauta: boolean; council_pauta_at: string|null;
  reviewed_by: string|null; reviewed_at: string|null; review_notes: string|null;
  revoked_by: string|null; revoked_at: string|null; revoke_reason: string|null;
  propagates_to_subordinates?: boolean; scope_exceptions?: string[];
  created_at: string; updated_at: string;
}
export interface DelegationPanel extends ModuleDelegation {
  profile_name: string; profile_email: string; profile_role: string;
  profile_church_id: string|null; profile_church_name: string|null;
  requested_by_name: string|null; reviewed_by_name: string|null; revoked_by_name: string|null;
  votes_yes: number; votes_no: number; votes_abstain: number; votes_total: number;
  days_remaining: number|null;
}
export interface DelegationApproval {
  id: string; delegation_id: string; director_id: string;
  vote: CouncilVote; observation: string|null; created_at: string;
}
export interface RoleDelegation {
  id: string; role_name: string; module: DelegationModule;
  trust_level: number; scope: string; description: string|null; is_active: boolean;
}
export interface EmergencyAccess {
  id: string; profile_id: string; module: DelegationModule;
  reason: string; approved_by: string|null; starts_at: string; expires_at: string; is_active: boolean;
}
export interface ComplianceDashboard {
  total_delegacoes: number; ativas: number; pendentes: number; expiradas: number; revogadas: number;
  vencendo_7d: number; vencendo_15d: number; vencendo_30d: number;
  permanentes: number; criticas_ativas: number; nivel_estrategico: number; aguardando_conselho: number;
}
export interface ModuleDelegationRanking {
  module: DelegationModule; delegacoes_ativas: number; pendentes: number;
  total_historico: number; nivel_medio: number;
}

// C20 — Score do Membro + Aniversariantes
export type EngagementBand = "engajado" | "ativo" | "em_risco";

export interface MemberScore {
  id: string; full_name: string; birth_date: string | null;
  journey_stage: string; status: string;
  life_group_id: string | null; church_id: string | null;
  joined_at: string | null; discipler_id: string | null;
  reunioes_presente_90d: number; reunioes_total_90d: number;
  disc_ativos: number; disc_concluidos: number; total_ministerios: number;
  pts_estagio: number; pts_progressao: number; pts_discipulado: number;
  pts_presenca: number; pts_ministerio: number;
  score_total: number; engagement_band: EngagementBand;
  proximo_estagio: string | null;
}

export interface BirthdayMember {
  id: string; full_name: string; birth_date: string;
  phone: string | null; email: string | null;
  journey_stage: string | null; life_group_id: string | null;
  church_id: string | null; lg_name: string | null; church_name: string | null;
  idade: number; dia?: number; mes?: number;
  dias_ate_aniversario?: number; dias_restantes?: number;
  aniversario_este_ano?: string;
}

// C21 — Financeiro Completo
export interface FinanceMonthlyFlow {
  mes: string; mes_label: string; mes_curto: string;
  church_id: string;
  entradas: number; saidas: number; saldo: number;
}

export interface FinanceByCategory {
  church_id: string; church_name: string | null;
  direction: string; kind: string;
  ano: number; mes: number; mes_label: string;
  qtd_lancamentos: number; total: number; media: number;
  minimo: number; maximo: number;
}

export interface FinanceNationalMonthly {
  mes_label: string; mes: string;
  igrejas_reportaram: number;
  total_entradas: number; total_saidas: number; saldo: number;
  dizimo: number; oferta: number; primicia: number;
  missoes: number; construcao: number; outras_entradas: number;
  salario: number; aluguel: number; energia: number;
  evangelismo: number; evento: number; investimento: number; outras_saidas: number;
}

export interface FinanceBudget {
  id: string; church_id: string; year: number;
  kind: string; direction: string;
  amount: number; notes: string | null;
  created_by: string | null; created_at: string; updated_at: string;
}

export interface FinanceBudgetVsActual extends FinanceBudget {
  church_name: string | null;
  budgeted: number; actual: number;
  pct_realizado: number;
  status: "atingido" | "no_caminho" | "atencao";
}

// C12 Blocos 2-5 — Patrimônio Avançado
export type DepreciationMethod = "linear" | "acelerado" | "soma_digitos";
export type MaintenanceType = "preventiva" | "corretiva" | "emergencial" | "revisao";
export type MaintenanceStatus = "agendada" | "em_andamento" | "concluida" | "cancelada";
export type InventoryStatus = "encontrado" | "nao_encontrado" | "divergente" | "baixado";

export interface AssetDepreciation {
  id: string; asset_id: string;
  method: DepreciationMethod;
  useful_life_years: number;
  residual_value: number;
  start_date: string;
  notes: string | null;
  created_at: string; updated_at: string;
}

export interface AssetDepreciationSummary {
  asset_id: string; asset_name: string;
  church_id: string; category: string; condition: string;
  acquisition_value: number | null; acquired_at: string | null;
  method: string; useful_life_years: number; residual_value: number; start_date: string;
  anos_decorridos: number; depreciacao_anual: number;
  depreciacao_acumulada: number; valor_atual_liquido: number;
  pct_depreciado: number; status_depreciacao: string;
}

export interface AssetMaintenance {
  id: string; asset_id: string;
  type: MaintenanceType; status: MaintenanceStatus;
  scheduled_at: string; completed_at: string | null;
  next_maintenance: string | null; cost: number | null;
  provider_name: string | null; provider_phone: string | null;
  description: string; result: string | null;
  responsible_id: string | null; created_by: string | null;
  created_at: string; updated_at: string;
}

export interface MaintenanceUpcoming extends AssetMaintenance {
  asset_name: string; church_id: string; church_name: string | null;
  category: string; dias_para_manutencao: number;
}

export interface MaintenanceHistory extends AssetMaintenance {
  asset_name: string; church_id: string; church_name: string | null; category: string;
}

export interface AssetInventory {
  id: string; campaign_name: string;
  church_id: string | null; inventory_date: string;
  asset_id: string; status: InventoryStatus;
  found_condition: string | null; found_location: string | null;
  notes: string | null; checked_by: string | null; created_at: string;
}

export interface AssetLastInventory {
  asset_id: string; campaign_name: string; inventory_date: string;
  last_status: string; found_condition: string | null; found_location: string | null;
  notes: string | null; asset_name: string; church_id: string;
  church_name: string | null; category: string; current_condition: string;
}

export interface InventoryCampaignSummary {
  campaign_name: string; church_id: string | null; inventory_date: string;
  total_bens: number; encontrados: number; nao_encontrados: number;
  divergentes: number; baixados: number; pct_encontrados: number;
}

export interface PatrimonyAccounting {
  church_id: string; church_name: string | null; category: string;
  total_bens: number; bens_duraveis: number;
  valor_aquisicao_total: number; depreciacao_acumulada_total: number; valor_atual_total: number;
  custo_manutencao_ano: number;
  cond_novo: number; cond_otimo: number; cond_bom: number; cond_regular: number; cond_ruim: number;
}

export interface PatrimonyNationalSummary {
  igrejas_com_patrimonio: number; total_imoveis: number; total_bens: number;
  valor_total_aquisicao: number; depreciacao_total: number; valor_liquido_total: number;
  manutencoes_pendentes: number; bens_nao_encontrados: number; bens_depreciados: number;
}

export interface PatrimonyAlert {
  alert_type: string; severity: string;
  asset_id: string | null; asset_name: string;
  church_id: string | null; church_name: string | null;
  detail: string; days_overdue: number;
}

// CT-002 — Central Inteligente de Convites e Cadastro
export type InviteLinkKind =
  | "membro" | "visitante" | "lider_lg" | "pastor" | "diretor_financeiro"
  | "secretario" | "lider_jovens" | "lider_casais" | "lider_criancas"
  | "musico" | "administrador";
export type InviteLinkStatus = "ativo" | "expirado" | "esgotado" | "revogado";
export type InviteValidity = "permanente" | "24h" | "7d" | "30d" | "90d";

export type ScopeLevel = "nacional" | "estado" | "nucleo" | "distrito" | "setor" | "igreja";

export interface InviteLinkCreateInput {
  kind: InviteLinkKind;
  church_id: string;
  district_id?: string | null;
  area_id?: string | null;
  sector_id?: string | null;
  life_group_id?: string | null;
  ministry_id?: string | null;
  target_role: UserRole;
  discipler_id?: string | null;
  validity: InviteValidity;
  max_uses?: number | null;
  allowed_ip_cidr?: string | null;
  scope_level?: ScopeLevel | null;
  scope_id?: string | null;
}

export interface InviteLinkRow {
  id: string; token: string; kind: InviteLinkKind; status: InviteLinkStatus;
  church_name: string | null; life_group_name: string | null; target_role: UserRole;
  max_uses: number | null; uses_count: number; expires_at: string | null;
  created_by_name: string | null; created_at: string;
  scope_level?: ScopeLevel | null; scope_name?: string | null;
}

export interface InviteTokenValidation {
  valid: boolean; reason: string | null;
  kind: InviteLinkKind | null; church_name: string | null;
  life_group_name: string | null; ministry_name: string | null;
  target_role: UserRole | null;
  scope_level?: ScopeLevel | null; scope_name?: string | null;
  church_logo_url?: string | null; org_unit_name?: string | null;
}

// Aba Liderança (script de melhoria, Seção 6) — histórico de designações
export type LeadershipFunction =
  | "apostolo" | "pastor_principal" | "pastor_auxiliar" | "pastor_distrito"
  | "supervisor_distrito" | "supervisor_area" | "supervisor_setor"
  | "lider_lg" | "lider_auxiliar" | "diacono" | "lider_ministerio"
  | "lider_louvor" | "lider_jovens" | "lider_casais" | "lider_infantil"
  | "lider_evangelismo" | "lider_missoes" | "outro";
export type LeadershipStatus = "ativo" | "encerrado";

export interface LeadershipAssignment {
  id: string; function_type: LeadershipFunction; status: LeadershipStatus;
  started_at: string; ended_at: string | null; notes: string | null;
  profile_id: string; profile_name: string; profile_email: string | null;
  church_id: string | null; church_name: string | null;
  ministry_id: string | null; ministry_name: string | null;
  life_group_id: string | null; life_group_name: string | null;
  scope_level: ScopeLevel | null; scope_id: string | null;
  assigned_by: string | null; assigned_by_name: string | null;
  created_at: string;
}

export interface AssignLeadershipInput {
  profile_id: string; function_type: LeadershipFunction;
  church_id?: string | null; scope_level?: ScopeLevel | null; scope_id?: string | null;
  ministry_id?: string | null; life_group_id?: string | null;
  started_at?: string; notes?: string | null;
}

// Realocação/Transferência de Membros (script de melhoria, Seção 5)
export type RelocationReason =
  | "correcao_cadastro" | "mudanca_endereco" | "transferencia_ministerial" | "mudanca_igreja"
  | "multiplicacao_lg" | "reorganizacao_territorial" | "designacao_pastoral" | "solicitacao_membro" | "outro";

export interface MemberRelocation {
  id: string; member_id: string; member_name: string;
  from_church_id: string | null; from_church_name: string | null;
  from_life_group_id: string | null; from_life_group_name: string | null;
  to_church_id: string | null; to_church_name: string | null;
  to_life_group_id: string | null; to_life_group_name: string | null;
  reason: RelocationReason; notes: string | null;
  previous_function: string | null; new_function: string | null;
  performed_by: string | null; performed_by_name: string | null;
  approved_by: string | null; approved_by_name: string | null;
  created_at: string;
}

export interface RelocateMemberInput {
  member_id: string; to_church_id: string; to_life_group_id?: string | null;
  reason: RelocationReason; notes?: string | null;
  previous_function?: string | null; new_function?: string | null;
}

// CEC ID — Carteirinha Digital (Fase 1)
export type CardStatus =
  | "cadastro_incompleto" | "aguardando_foto" | "aguardando_documentos" | "aguardando_validacao"
  | "aguardando_aprovacao" | "elegivel" | "emitida" | "suspensa" | "cancelada";

export interface MemberCard {
  member_id: string; cec_id: string | null; card_status: CardStatus;
  card_approved_at: string | null; card_issued_at: string | null; qr_token: string;
  categoria: string; completion_percent: number;
}

export interface CecIdValidation {
  valid: boolean; cec_id: string | null; full_name: string | null; photo_url: string | null;
  categoria: string | null; church_name: string | null; card_status: CardStatus | null;
}

// CEC ID Fase 2 — Leitor de Portaria
export interface CheckinLookupResult {
  member_id: string; cec_id: string | null; full_name: string; photo_url: string | null;
  categoria: string | null; church_name: string | null; church_id: string | null; card_status: CardStatus;
}
export interface CecIdCheckin {
  id: string; member_id: string; cec_id: string | null; event_label: string;
  method: "qr" | "manual"; checked_by: string | null; church_id: string | null; checked_at: string;
}

// CECmais — Catálogo de Ofertas (Fase 3)
export type CECmaisCategoriaSlug = "saude" | "protecao" | "formacao" | "fe" | "leitura" | "vantagens";
export type CECmaisOfertaTipo = "produto" | "conteudo_digital" | "curso" | "assinatura" | "servico_plano";

export interface CECmaisOferta {
  id: string;
  categoria: CECmaisCategoriaSlug;
  tipo: CECmaisOfertaTipo;
  nome: string;
  descricao_curta: string | null;
  descricao_completa: string | null;
  imagem_url: string | null;
  parceiro_nome: string | null;
  preco: number | null;
  estoque: number | null;
  arquivo_url: string | null;
  carga_horaria_horas: number | null;
  numero_modulos: number | null;
  emite_certificado: boolean;
  preco_recorrente: number | null;
  periodicidade: string | null;
  permite_dependentes: boolean;
  carencia_dias: number | null;
  is_active: boolean;
  created_at: string;
}

export type CECmaisOfertaInput = Partial<Omit<CECmaisOferta, "id" | "created_at">>;

// ============================================================
// RELMDA — Relatório Semanal de Life Group (Fase 1)
// ============================================================
export type RelmdaStatus =
  | "rascunho" | "enviado" | "em_analise" | "correcao_solicitada"
  | "corrigido" | "validado" | "encerrado";

export type RelmdaHealth = "muito_saudavel" | "saudavel" | "atencao" | "necessita_apoio";
export type RelmdaFlow = "muito_bem" | "bem" | "regular" | "dificil";
export type RelmdaVisitorFollowup = "sem_contato" | "contatado" | "em_acompanhamento" | "integrado";
export type RelmdaNoMeetingReason =
  | "feriado" | "evento_igreja" | "enfermidade" | "ausencia_lideranca" | "reorganizacao" | "outro";

export interface RelmdaWeeklyReport {
  id: string;
  life_group_id: string;
  week_number: number;
  month: number;
  year: number;
  reference_date: string | null;

  happened: boolean;
  no_meeting_reason: RelmdaNoMeetingReason | null;
  no_meeting_note: string | null;
  extraordinary: boolean;
  week_note: string | null;

  mda_count: number;
  new_discipleships: number;
  interrupted_discipleships: number;

  ge_happened: boolean;
  ge_count: number;
  evangelism_group_id: string | null;
  ge_people_reached: number;
  ge_decisions: number;

  tadel_count: number;

  emp_participants: number;
  emp_occurrences: number;

  offering_pix: number;
  offering_especie: number;
  offering_outros: number;
  offering_outros_desc: string | null;
  offering_total: number;

  kg_amor: number;
  cestas_completas: number;

  topic: string | null;
  bible_text: string | null;
  flow: RelmdaFlow | null;
  health_assessment: RelmdaHealth | null;
  health_comment: string | null;
  summary: string | null;

  status: RelmdaStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  sent_by: string | null;
  sent_at: string | null;
  validated_by: string | null;
  validated_at: string | null;

  supervisor_note: string | null;
  needs_correction: boolean;
  correction_items: string[] | null;
  correction_deadline: string | null;
  needs_support: boolean;
  support_type: string | null;
}

export type RelmdaWeeklyReportInput = Partial<Omit<RelmdaWeeklyReport,
  "id" | "created_at" | "updated_at" | "offering_total">>;

export interface RelmdaAttendance {
  id: string;
  report_id: string;
  member_id: string;
  present: boolean;
}

export interface RelmdaVisitor {
  id: string;
  report_id: string;
  full_name: string;
  phone: string | null;
  first_visit: boolean;
  followup_status: RelmdaVisitorFollowup;
  note: string | null;
  created_at: string;
}
export type RelmdaVisitorInput = Partial<Omit<RelmdaVisitor, "id" | "report_id" | "created_at">> & { full_name: string };

export interface RelmdaPastoralNeed {
  id: string;
  report_id: string;
  need_type: string | null;
  urgent_prayer: boolean;
  pastoral_visit: boolean;
  related_member_id: string | null;
  description: string | null;
  responsible_id: string | null;
  deadline: string | null;
  status: string;
  created_at: string;
}
export type RelmdaPastoralNeedInput = Partial<Omit<RelmdaPastoralNeed, "id" | "report_id" | "created_at">>;

export interface RelmdaStatusHistory {
  id: string;
  report_id: string;
  from_status: RelmdaStatus | null;
  to_status: RelmdaStatus;
  changed_by: string | null;
  changed_at: string;
  note: string | null;
}

export interface RelmdaLgSnapshot {
  total_members: number;
  with_discipler: number;
}

export interface RelmdaReportFull {
  report: RelmdaWeeklyReport;
  attendance: RelmdaAttendance[];
  visitors: RelmdaVisitor[];
  needs: RelmdaPastoralNeed[];
  snapshot: RelmdaLgSnapshot;
}

export interface RelmdaSupervisorOverviewRow {
  life_group_id: string;
  life_group_name: string;
  leader_name: string | null;
  church_id: string | null;
  church_name: string | null;
  report_id: string | null;
  status: RelmdaStatus;
  sent_at: string | null;
  total_members: number;
  mda_count: number;
  visitantes_count: number;
  ge_count: number;
  offering_total: number;
  kg_amor: number;
  tadel_count: number;
  emp_participants: number;
  needs_correction: boolean;
  correction_deadline: string | null;
  is_inconsistent: boolean;
}

export interface RelmdaMonthlyComparisonRow {
  week_number: number;
  life_groups: number;
  total_members: number;
  mda_count: number;
  ge_count: number;
  visitantes_count: number;
  offering_total: number;
  kg_amor: number;
  tadel_count: number;
  emp_participants: number;
  enviados: number;
  esperados: number;
}

// ============================================================
// Rádio Web
// ============================================================
export interface RadioConfig {
  id: string;
  church_id: string | null;
  is_enabled: boolean;
  display_name: string;
  short_name: string | null;
  logo_url: string | null;
  stream_url: string | null;
  theme_color: string | null;
  description: string | null;
}

export type RadioProgramMode = "automatico" | "gravado" | "ao_vivo" | "hibrido";

export interface RadioProgram {
  id: string;
  church_id: string | null;
  title: string;
  description: string | null;
  host_name: string | null;
  cover_url: string | null;
  weekday: Weekday | null;
  start_time: string | null;
  end_time: string | null;
  is_recurring: boolean;
  is_active: boolean;
  sort_order: number;
  mode?: RadioProgramMode | null;
  fallback_url?: string | null;
  playlist_id?: string | null;
  is_special?: boolean;
  special_start_date?: string | null;
  special_end_date?: string | null;
}

export interface RadioPlaylist {
  id: string;
  church_id: string | null;
  name: string;
  description: string | null;
  mode: "ordered" | "shuffle" | "thematic";
  is_active: boolean;
  sort_order: number;
}

export interface RadioPlaylistItem {
  id: string;
  playlist_id: string;
  episode_id: string | null;
  sort_order: number;
}

export type RadioEpisodeCategory =
  | "pregacao"
  | "louvor"
  | "noticia"
  | "devocional"
  | "entrevista"
  | "estudo"
  | "especial";

export interface RadioEpisode {
  id: string;
  church_id: string | null;
  program_id: string | null;
  title: string;
  description: string | null;
  cover_url: string | null;
  audio_url: string;
  duration_seconds: number | null;
  category: RadioEpisodeCategory | null;
  speaker: string | null;
  published_at: string | null;
  status: "draft" | "published" | "archived";
  is_featured: boolean;
  is_podcast?: boolean;
  sort_order: number;
  transcript_text?: string | null;
  auto_summary?: string | null;
  auto_tags?: string[] | null;
  transcript_status?: "none" | "processing" | "done" | "failed";
  transcript_error?: string | null;
  transcript_updated_at?: string | null;
}

// ============================================================
// Eventos com Inscrição (sem pagamento por enquanto)
// ============================================================
export type RegistrationEventStatus = "rascunho" | "em_revisao" | "agendado" | "inscricoes_abertas" | "inscricoes_encerradas" | "lotado" | "em_andamento" | "finalizado" | "cancelado" | "arquivado";
export type EventRegistrationStatus = "confirmada" | "lista_espera" | "cancelada";

export interface RegistrationEvent {
  id: string;
  church_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  location: string | null;
  is_online: boolean;
  online_url: string | null;
  start_at: string;
  end_at: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  capacity: number | null;
  is_free: boolean;
  status: RegistrationEventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category: string | null;
  highlight_dashboard: boolean;
  highlight_public: boolean;
  requires_cpf: boolean;
  requires_image_consent: boolean;
  custom_fields: CustomFieldDefinition[];
  popup_template: PopupTemplate;
  popup_repeat_mode: PopupRepeatMode;
  popup_repeat_interval_hours: number | null;
  popup_video_url: string | null;
  subtitle: string | null;
  target_audience: string | null;
  cancellation_reason: string | null;
  attendance_closed_at: string | null;
}
export type RegistrationEventInput = Partial<Omit<RegistrationEvent, "id" | "created_at" | "updated_at">>;

export type CustomFieldType = "texto_curto" | "texto_longo" | "selecao_unica" | "selecao_multipla" | "sim_nao" | "data";
export interface CustomFieldDefinition {
  id: string; label: string; type: CustomFieldType; options?: string[]; required?: boolean;
}
export type PopupTemplate = "classico" | "moderno" | "jovem";
export type PopupRepeatMode = "uma_vez_por_sessao" | "sempre" | "intervalo_horas" | "uma_vez_so";

export interface EventRegistration {
  id: string;
  event_id: string;
  member_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  status: EventRegistrationStatus;
  registered_at: string;
  cancelled_at: string | null;
  checked_in_at: string | null;
  no_show: boolean;
  group_id: string | null;
}

export interface EventRegistrationSummary {
  confirmadas: number;
  lista_espera: number;
  canceladas: number;
  capacidade: number | null;
}

export interface RegisterForEventResult {
  registration_id: string;
  reg_status: EventRegistrationStatus;
  queue_position: number | null;
}

export interface MyEventRegistration extends EventRegistration {
  event: RegistrationEvent;
}

// RELMDA Fase 5 — prazos configuráveis
export interface RelmdaDeadlineConfig {
  id?: string;
  church_id: string | null;
  deadline_weekday: number; // 0=domingo ... 6=sábado
  deadline_time: string;    // "HH:MM:SS"
  correction_deadline_days: number;
  reminder_before_hours: number;
}

// Formação — Cursos, Turmas, Matrículas
export type EnrollmentStatus = "matriculado" | "cursando" | "concluido" | "desistente";
export type ClassStatus = "planejada" | "em_andamento" | "concluida" | "cancelada";

export interface Course {
  id: string; name: string; description: string | null; category: string | null;
  church_id: string | null; is_active: boolean; created_at: string;
  escola_id: string | null;
  programa_id: string | null;
  tutor_id: string | null;
  // CEC Academy — Metodologia de 5 dimensões
  content_conhecer: string | null; content_refletir: string | null; content_orar: string | null;
  content_praticar: string | null; content_compartilhar: string | null;
}
export interface CourseClass {
  id: string; course_id: string; church_id: string | null; name: string;
  instructor_id: string | null; location: string | null;
  start_date: string | null; end_date: string | null; max_vagas: number | null;
  status: ClassStatus; created_at: string;
}
export interface CourseEnrollment {
  id: string; class_id: string; member_id: string; status: EnrollmentStatus;
  enrolled_at: string; completed_at: string | null; certificate_issued: boolean; notes: string | null;
  // CEC Academy — 3 indicadores de crescimento (substituem % concluído)
  knowledge_level: GrowthLevel; practice_level: GrowthLevel; sharing_level: GrowthLevel;
}
export interface CourseEnrollmentView extends CourseEnrollment {
  member_name: string; class_name: string; class_status: ClassStatus;
  start_date: string | null; end_date: string | null; course_name: string; course_category: string | null;
}
export interface FormacaoStats {
  total_cursos: number; total_turmas_ativas: number;
  total_matriculados: number; total_concluintes_90d: number;
}

// CEC Academy — Diário de Formação
export type JournalEntryType = "versiculo" | "oracao" | "reflexao" | "testemunho" | "aprendizado" | "duvida" | "missao_cumprida";
export interface FormationJournalEntry {
  id: string; profile_id: string; entry_type: JournalEntryType; content: string;
  course_id: string | null; is_private: boolean; created_at: string; updated_at: string;
}

export type ContextualNoteSource = "academy" | "ebd" | "bible" | "devotional" | "sermon" | "lifegroup" | "ai";
export interface ContextualNote {
  id: string; profile_id: string; source_type: ContextualNoteSource; title: string | null; content: string;
  bible_reference: string | null; course_id: string | null; lesson_id: string | null;
  ebd_magazine_id: string | null; ebd_lesson_id: string | null; metadata: Record<string, unknown>;
  is_private: boolean; created_at: string; updated_at: string;
}

// CEC Academy — Indicadores de Crescimento (substituem % concluído)
export type GrowthLevel = 0 | 1 | 2 | 3; // 0=não iniciado, 1=iniciado, 2=em progresso, 3=consolidado

// CEC Academy Bloco 1 — Escola → Curso → Módulo → Lição
export interface Escola {
  id: string; name: string; slug: string; description: string | null;
  icon_key: string | null; order_index: number; is_active: boolean; created_at: string;
}
export interface JornadaFormacao {
  id: string; escola_id: string; name: string; description: string | null;
  order_index: number; is_active: boolean; created_at: string;
}
export interface ProgramaFormacao {
  id: string; jornada_id: string; name: string; description: string | null;
  order_index: number; is_active: boolean; created_at: string;
}
export interface EscolaTreeItem {
  jornada_id: string; jornada_name: string; jornada_order: number;
  programa_id: string | null; programa_name: string | null; programa_order: number | null;
  course_id: string | null; course_name: string | null; course_description: string | null;
}
export interface CourseModule {
  id: string; course_id: string; name: string; description: string | null; order_index: number; created_at: string;
}
export interface CourseLesson {
  id: string; module_id: string; title: string; objective: string | null; content_main: string | null;
  bible_reference: string | null; video_url: string | null; audio_url: string | null;
  content_reflexao: string | null; content_oracao: string | null; content_pratica: string | null; content_compartilhar: string | null;
  order_index: number; created_at: string;
}
export interface EbdMagazine {
  id: string; church_id: string | null; audience: string; year: number; quarter: number;
  title: string; subtitle: string | null; theme: string | null; commentator: string | null;
  cover_url: string | null; description: string | null; starts_on: string | null; ends_on: string | null;
  is_active: boolean; order_index: number; created_at: string; updated_at: string;
}
export interface EbdLesson {
  id: string; magazine_id: string; lesson_number: number; title: string; lesson_date: string | null;
  golden_text: string | null; golden_text_reference: string | null; practical_truth: string | null;
  class_bible_reading: string | null; objectives: string[]; introduction: string | null;
  topics: Array<{ title?: string; content?: string; bible_reference?: string }>; conclusion: string | null;
  teacher_notes: string | null; supporting_material: string | null; course_lesson_id: string | null;
  is_published: boolean; order_index: number; created_at: string; updated_at: string;
}
export interface EbdWeeklyReading {
  id: string; lesson_id: string; weekday: number; label: string | null; bible_reference: string;
  prompt: string | null; order_index: number; created_at: string;
}

export type TeacherPlanSourceType = "academy" | "ebd" | "bible" | "custom";
export type TeacherPlanStatus = "draft" | "ready" | "taught" | "archived";
export interface TeacherLessonPlan {
  id: string; profile_id: string; source_type: TeacherPlanSourceType;
  course_id: string | null; lesson_id: string | null; ebd_magazine_id: string | null; ebd_lesson_id: string | null;
  title: string; audience: string | null; duration_minutes: number | null; objective: string | null; bible_reference: string | null;
  introduction: string | null; key_points: string[]; questions: string[]; activity: string | null; application: string | null;
  conclusion: string | null; prayer: string | null; private_notes: string | null; status: TeacherPlanStatus;
  scheduled_for: string | null; taught_at: string | null; created_at: string; updated_at: string;
}
export interface TeacherLessonPlanInput {
  profile_id: string; source_type: TeacherPlanSourceType;
  course_id?: string | null; lesson_id?: string | null; ebd_magazine_id?: string | null; ebd_lesson_id?: string | null;
  title: string; audience?: string | null; duration_minutes?: number | null; objective?: string | null; bible_reference?: string | null;
  introduction?: string | null; key_points?: string[]; questions?: string[]; activity?: string | null; application?: string | null;
  conclusion?: string | null; prayer?: string | null; private_notes?: string | null; status?: TeacherPlanStatus;
  scheduled_for?: string | null;
}


// CEC Academy — Sprint 6: preparação de sermões
export type SermonDraftSourceType = "academy" | "ebd" | "bible" | "custom";
export type SermonDraftStatus = "draft" | "ready" | "preached" | "archived";
export interface SermonDraft {
  id: string; profile_id: string; source_type: SermonDraftSourceType;
  course_id: string | null; lesson_id: string | null; ebd_magazine_id: string | null; ebd_lesson_id: string | null;
  title: string; theme: string | null; bible_reference: string | null; selected_text: string | null; audience: string | null;
  duration_minutes: number | null; purpose: string | null; thesis: string | null; introduction: string | null;
  outline_points: string[]; illustrations: string | null; application: string | null; conclusion: string | null; appeal: string | null;
  prayer: string | null; private_notes: string | null; tags: string[]; status: SermonDraftStatus;
  scheduled_for: string | null; preached_at: string | null; published_sermon_id: string | null; created_at: string; updated_at: string;
}
export interface SermonDraftInput {
  profile_id: string; source_type: SermonDraftSourceType; course_id?: string | null; lesson_id?: string | null;
  ebd_magazine_id?: string | null; ebd_lesson_id?: string | null; title: string; theme?: string | null; bible_reference?: string | null;
  selected_text?: string | null; audience?: string | null; duration_minutes?: number | null; purpose?: string | null; thesis?: string | null;
  introduction?: string | null; outline_points?: string[]; illustrations?: string | null; application?: string | null; conclusion?: string | null;
  appeal?: string | null; prayer?: string | null; private_notes?: string | null; tags?: string[]; status?: SermonDraftStatus; scheduled_for?: string | null;
}

export type LessonProgressStatus = "nao_iniciada" | "em_andamento" | "concluida";
export interface CourseContentItem {
  module_id: string; module_name: string; module_order: number;
  lesson_id: string; lesson_title: string; lesson_order: number;
  status: LessonProgressStatus; completed_at: string | null;
}

// CEC Academy Bloco 7 — Tutor, Avaliações, Certificações
export interface LessonAssessment {
  id: string; lesson_id: string; question: string; options: string[]; correct_index: number; order_index: number; created_at: string;
}
export interface AssessmentAttempt {
  id: string; profile_id: string; assessment_id: string; selected_index: number; is_correct: boolean; created_at: string;
}
export interface CourseCertificate {
  id: string; profile_id: string; course_id: string; certificate_code: string; issued_at: string; issued_by: string | null;
}
export interface TutoringCourse {
  course_id: string; course_name: string; total_alunos: number; alunos_concluidos: number;
}

// CEC Academy Bloco 4 — Exploração Inteligente do Conhecimento Bíblico
export type KnowledgeCategory = "lugar" | "historia_cultura" | "linha_tempo" | "arqueologia" | "personagem";
export type RelationType = "pai_de" | "mae_de" | "conjuge_de" | "contemporaneo_de" | "local_de";
export interface KnowledgePoint {
  id: string; category: KnowledgeCategory; title: string; subtitle: string | null; description: string | null;
  image_url: string | null; period_label: string | null; latitude: number | null; longitude: number | null;
  bible_refs: string | null; order_index: number; is_active: boolean; created_at: string;
}
export interface KnowledgePointRelated {
  related_id: string; related_category: KnowledgeCategory; related_title: string; related_image_url: string | null;
  relation_type: RelationType | null; relation_direction: "saida" | "entrada" | null;
}
export interface KnowledgePointDetail extends KnowledgePoint {
  related: KnowledgePointRelated[];
}

// CEC Academy Blocos 2/3 — Conhecimento Integrado + Biblioteca
export type KnowledgeObjectType =
  | "biblia" | "livro" | "pdf" | "video" | "podcast" | "imagem" | "mapa"
  | "artigo" | "apostila" | "modelo_3d" | "infografico" | "plano_aula" | "questionario";
export type EducationLevel = "introducao" | "fundamental" | "intermediario" | "avancado" | "pesquisa_academica";
export type KnowledgeObjectStatus =
  | "rascunho" | "em_catalogacao" | "em_curadoria" | "aguardando_aprovacao"
  | "publicado" | "atualizado" | "arquivado";
export type KnowledgeObjectScope = "global" | "institucional" | "local" | "turma" | "pessoal";

export interface KnowledgeObject {
  id: string; cid: string; title: string; description: string | null; object_type: KnowledgeObjectType;
  language: string | null; author: string | null; institution: string | null; publisher: string | null; year: number | null;
  storage_url: string | null; external_url: string | null; thumbnail_url: string | null;
  escola_id: string | null; jornada_id: string | null; programa_id: string | null;
  course_id: string | null; module_id: string | null; lesson_id: string | null;
  education_level: EducationLevel | null; target_audience: string | null; bible_refs: string | null;
  license: string | null; rights_origin: string | null;
  download_allowed: boolean; share_allowed: boolean; print_allowed: boolean;
  status: KnowledgeObjectStatus; scope: KnowledgeObjectScope;
  created_by: string | null; curated_by: string | null; curator_notes: string | null;
  approved_by: string | null; approved_at: string | null;
  version: number; created_at: string; updated_at: string;
  // Bloco 5 — Player Unificado
  chapters: { label: string; time_seconds: number }[] | null;
  subtitles_url: string | null; audio_description_url: string | null; duration_seconds: number | null;
}
export interface ObjectPlaybackProgress {
  profile_id: string; object_id: string; position_seconds: number; playback_rate: number;
  is_finished: boolean; updated_at: string;
}

// CEC Academy — Bíblia Integrada
export interface BibleBook { abbrev: { pt: string; en: string }; author: string; chapters: number; group: string; name: string; testament: string }
export interface BibleVerse { number: number; text: string }
export interface BibleChapter { book: { abbrev: { pt: string; en: string }; name: string; author: string; group: string; version: string }; chapter: { number: number; verses: number }; verses: BibleVerse[] }
export interface BibleHighlight {
  id: string; profile_id: string; version: string; book_abbrev: string; chapter: number;
  verse_start: number; verse_end: number;
  color: "gold" | "green" | "blue" | "pink" | "purple"; created_at: string;
}
export interface BibleAnnotation {
  id: string; profile_id: string; version: string; book_abbrev: string; chapter: number;
  verse_start: number; verse_end: number;
  note_text: string; created_at: string; updated_at: string;
}
export interface BibleBookmark {
  id: string; profile_id: string; version: string; book_abbrev: string; chapter: number;
  verse_start: number; verse_end: number; created_at: string;
}
export interface BibleRecentRead {
  id: string; profile_id: string; version: string; book_abbrev: string; chapter: number; opened_at: string;
}
export type BibleReadingMode = "reading" | "study" | "devotional";
export interface BibleReadingProgress {
  profile_id: string; version: string; book_abbrev: string; chapter: number;
  reading_mode: BibleReadingMode; updated_at: string;
}
export interface KnowledgeObjectRelated {
  related_id: string; related_title: string; related_type: KnowledgeObjectType; related_label: string | null;
}
export interface KnowledgeObjectDetail extends KnowledgeObject {
  related: KnowledgeObjectRelated[];
}
export interface CentralEstudosItem {
  kind: "objeto" | "ponto"; id: string; title: string; subtitle: string | null;
  description: string | null; image_url: string | null; item_type: string;
}

// Família (UX-003 §6.29/6.53)
export type FamilyRelationshipType = "pai" | "mae" | "conjuge" | "filho" | "irmao" | "responsavel_legal" | "outro";
export interface MemberRelationship {
  id: string; member_id: string; related_member_id: string | null;
  relationship_type: FamilyRelationshipType; related_name: string; related_phone: string | null;
  notes: string | null; created_at: string;
}

// Motor de Regras Ministeriais (UX-003 §6.47)
export interface MemberRecommendation {
  rule_key: string; message: string; priority: "critico" | "atencao" | "info";
}

// CT-017 — Central de Acessibilidade e Personalização (Fase 1)
export type AccessibilityTheme = "claro" | "escuro" | "automatico";
export type AccessibilityFontSize = "pequena" | "media" | "grande" | "extra_grande";
export interface UserPreferences {
  profile_id: string; theme: AccessibilityTheme; font_size: AccessibilityFontSize;
  extra: Record<string, unknown>; onboarded: boolean; updated_at: string;
}

// CEC Academy Bloco 6 — Modos Educacionais
export type EducationMode = "individual" | "familia" | "life_group" | "sala_de_aula" | "pulpito" | "somente_audio";

// Dízimos e Ofertas (QR Code PIX por igreja)
export interface ChurchGivingInfo {
  id: string; church_id: string; qr_code_url: string | null;
  cnpj: string | null; razao_social: string | null; banco: string | null;
  pix_key: string | null; is_active: boolean; updated_at: string;
}

// Relatório Consolidado por Área (demanda adicional)
export interface AreaConsolidadoRow {
  sector_id: string; sector_name: string;
  lg_id: string; bairro: string | null; lider_nome: string | null; lider_fone: string | null;
  auxiliar_nome: string | null; dia_semana: string | null; membros: number;
  discipuladores: number; mda_semanal: number; cc: number; cel: number;
  pct_mda: number; ge: boolean; visitantes: number;
  oferta_pix: number; oferta_especie: number; total_presencas: number; kg_amor: number;
  relatorio_enviado: boolean;
}
export interface AccessibleArea { area_id: string; area_name: string; sector_id: string; sector_name: string; }

// GOV-002 §9 — Central de Delegações (diretório de usuários pra busca)
export interface AdminUserDirectoryRow {
  profile_id: string; member_id: string | null;
  full_name: string; email: string | null; phone: string | null; cec_id: string | null; photo_url: string | null;
  role: string; journey_stage: string | null; member_status: string | null; joined_at: string | null;
  church_id: string | null; church_name: string | null;
  life_group_id: string | null; life_group_name: string | null;
  state_id: string | null; state_name: string | null;
  district_id: string | null; district_name: string | null;
  sector_id: string | null; sector_name: string | null;
  delegacoes_ativas: number;
}

export type ContentLibraryType = "imagem" | "video_youtube" | "documento" | "logo" | "outro";

// Eventos — Check-in, Palestrantes, Promoção de fila, Mudanças, Feedback, Programação (EVT005-EVT013)
// Confirmados por uso direto no código (EventCheckinAdmin.tsx, events.ts):
export interface EventCheckinLookup {
  registration_id: string; group_id: string | null; full_name: string;
  email: string | null; phone: string | null; status: EventRegistrationStatus; checked_in_at: string | null;
  event_id: string; event_name: string;
}
export interface EventGroupMember {
  registration_id: string; full_name: string; status: EventRegistrationStatus; checked_in_at: string | null;
}
export interface EventSpeaker {
  id: string; event_id: string; name: string; photo_url: string | null; topic: string | null;
  order_index: number; created_at: string;
}
export interface EventScheduleItem {
  id: string; event_id: string; start_at: string; end_at: string | null; title: string;
  description: string | null; location: string | null; speaker_id: string | null;
  order_index: number; created_at: string;
}
export interface GroupRegistrationResult {
  registration_id: string; full_name: string; reg_status: EventRegistrationStatus; queue_position: number | null;
}
// Inferidos pelo nome da RPC/função (list_recent_event_checkins, list_my_pending_promotions,
// list_my_event_changes, get_event_feedback_summary) — sem uso direto visível no código local
// pra confirmar campo a campo. Ajuste se o formato real do banco for diferente.
export interface RecentEventCheckin {
  registration_id: string; full_name: string; checked_in_at: string;
}
export interface PendingPromotion {
  registration_id: string; event_name: string;
}
export interface EventChange {
  registration_id: string; event_name: string;
  change_type: "cancelado" | "horario" | "local";
  cancellation_reason: string | null;
  old_start_at: string; new_start_at: string;
  new_location: string | null;
}
export interface EventFeedbackSummary {
  total: number; average: number; comments: { rating: number; comment: string }[];
}

// Fluxo Editorial (workflow de revisão de conteúdo — notícias/banners/pregações)
export type ContentWorkflowStatus = "rascunho" | "em_revisao" | "aprovado" | "agendado" | "publicado" | "arquivado";
export interface ContentWorkflowState {
  status: ContentWorkflowStatus; review_note: string | null; reviewer_name: string | null;
}
export interface ContentPendingReview {
  entity_type: string; entity_id: string; submitted_by_name: string | null; submitted_at: string;
}

// Taxonomia de Conteúdo (categorias e tags reutilizáveis por Notícias/Banners/Pregações/etc.)
export interface ContentCategory {
  id: string; name: string; slug: string; color: string | null; order_index: number;
}
export interface ContentTag {
  id: string; name: string;
}
export interface ContentTaxonomy {
  categories: ContentCategory[]; tags: ContentTag[];
}

// CT-019 — Escala de Papéis da Reunião do Life Group
export type LgMeetingMomentKey = "oracao_inicial" | "louvor" | "dinamica" | "palavra" | "oferta" | "caixinha_oracao" | "avisos_cec_news";
export interface LgMeetingRoleInput {
  life_group_id: string; meeting_date: string; moment_key: LgMeetingMomentKey;
  moment_order: number; responsible_member_id: string | null; confirmed: boolean; notes?: string | null;
}
export interface LgMeetingRoleWithMember {
  id: string; life_group_id: string; meeting_date: string; moment_key: LgMeetingMomentKey;
  moment_order: number; responsible_member_id: string | null; confirmed: boolean; notes: string | null;
  responsible: { id: string; full_name: string } | null;
}

// CT-020 §14 — Tarefas Ministeriais do Life Group
export type MinisterialTaskStatus = "pendente" | "em_andamento" | "aguardando_retorno" | "concluida" | "cancelada";
export type MinisterialTaskPriority = "baixa" | "media" | "alta" | "urgente";
export interface MinisterialTask {
  id: string; title: string; origin: string; life_group_id: string; priority: MinisterialTaskPriority;
  responsible_id: string | null; created_by: string | null; status: MinisterialTaskStatus;
  due_date: string | null; notes: string | null; created_at: string;
}
export interface MinisterialTaskInput {
  title: string; origin: string; life_group_id: string; priority: MinisterialTaskPriority;
  responsible_id: string | null; created_by: string | null; status?: MinisterialTaskStatus;
  due_date?: string | null; notes?: string | null;
}

// CEC News Vídeos — subaba da Central de Conteúdos
export type NewsVideoScope = "nacional" | "sede" | "nucleo" | "distrito" | "setor" | "igreja";
export type NewsVideoStatus = "rascunho" | "em_revisao" | "agendado" | "publicado" | "encerrado" | "arquivado" | "rejeitado" | "cancelado";
export interface CecNewsVideoAdmin {
  id: string; title: string; description: string | null; video_url: string; cover_image_url: string | null;
  event_id: string | null; event_name: string | null;
  scope: NewsVideoScope; scope_ref_id: string | null; scope_ref_name: string | null;
  published_at: string | null; display_start_at: string; display_end_at: string | null;
  is_featured: boolean; is_pinned: boolean; allow_autoplay: boolean;
  show_signup_button: boolean; show_event_button: boolean; show_share_button: boolean;
  sort_order: number; status: NewsVideoStatus; responsible_id: string | null; responsible_name: string | null;
  created_at: string;
}
export interface VisibleNewsVideo {
  id: string; title: string; description: string | null; video_url: string; cover_image_url: string | null;
  event_id: string | null; event_name: string | null; event_start_at: string | null; event_slug: string | null;
  scope: NewsVideoScope; is_featured: boolean; is_pinned: boolean; allow_autoplay: boolean;
  show_signup_button: boolean; show_event_button: boolean; show_share_button: boolean;
  published_at: string | null;
}
export interface ContentLibraryItem {
  id: string; title: string; type: ContentLibraryType; url: string;
  tags: string[]; church_id: string | null; created_by: string | null; created_at: string;
}

// CT-017 Fase 3 — Perfis Inteligentes completos
export type AccessibilityContrast = "normal" | "alto" | "muito_alto";
export type AccessibilitySpacing = "compacto" | "padrao" | "confortavel" | "ampliado";
export type AccessibilityAnimations = "normal" | "reduzida" | "desativada";
export type AccessibilityButtonSize = "normal" | "grande" | "extra_grande";
export type AccessibilityIconStyle = "coloridos" | "monocromaticos" | "minimalistas";
export type AccessibilityProfile = "padrao" | "idoso" | "baixa_visao" | "smartphone" | "tablet" | "desktop" | "simplificado";

// ============================================================
// KIDS — Sistema de Custódia, Cuidado, Desenvolvimento e
// Transferência Segura de Crianças. Fase 1, Rodada 1: Identidade.
// ============================================================
export interface KidsGroup {
  id: string; church_id: string; name: string; min_age: number | null; max_age: number | null;
  description: string | null; is_active: boolean; created_at: string;
}
export interface KidsDependent {
  id: string; church_id: string; full_name: string; preferred_name: string | null;
  birth_date: string | null; photo_url: string | null; default_group_id: string | null;
  health_notes: string | null; special_needs: string | null;
  is_active: boolean; created_by: string | null; created_at: string; updated_at: string;
}
export type GuardianRelationship = "mae" | "pai" | "avo" | "ava" | "tio" | "tia" | "tutor_legal" | "outro";
export interface KidsGuardian {
  id: string; dependent_id: string; profile_id: string; relationship: GuardianRelationship;
  is_primary: boolean; created_at: string;
}
export type AuthorizationScope = "permanent" | "temporary" | "single_use";
export type AuthorizationStatus = "draft" | "pending" | "active" | "revoked" | "expired" | "used" | "cancelled";
export interface KidsAuthorizedPerson {
  id: string; dependent_id: string; authorized_by: string; authorized_profile_id: string | null;
  full_name: string; document_number: string | null; phone: string | null; photo_url: string | null;
  relationship_label: string | null; scope: AuthorizationScope;
  valid_from: string; valid_until: string | null; status: AuthorizationStatus;
  revoked_by: string | null; revoked_at: string | null; created_at: string;
}
export interface KidsTerminology {
  church_id: string; concept_key: string; singular: string; plural: string | null; short_label: string | null;
}
export type CustodySessionStatus = "scheduled" | "open" | "closed" | "cancelled";
export interface KidsCustodySession {
  id: string; church_id: string; group_id: string | null; name: string;
  starts_at: string; ends_at: string | null; status: CustodySessionStatus;
  capacity: number | null; created_by: string | null; created_at: string;
}
export type CustodyRecordStatus = "expected" | "in_custody" | "pickup_requested" | "released" | "cancelled";
export interface KidsCustodyRecord {
  id: string; dependent_id: string; session_id: string; status: CustodyRecordStatus;
  checked_in_at: string | null; checked_in_by: string | null; delivered_by: string | null; entry_notes: string | null;
  pickup_requested_at: string | null; pickup_requested_by: string | null; released_at: string | null;
  claim_code: string | null; created_at: string;
}
export interface KidsDependentStatus {
  dependent_id: string; full_name: string; preferred_name: string | null; photo_url: string | null;
  custody_record_id: string | null; custody_status: CustodyRecordStatus | null;
  session_name: string | null; checked_in_at: string | null; group_name: string | null;
}
export type HandoffPickupType = "guardian" | "authorized_person";
export interface KidsHandoff {
  id: string; custody_record_id: string; pickup_type: HandoffPickupType;
  pickup_guardian_id: string | null; pickup_authorized_person_id: string | null;
  operator_id: string; claim_code_matched: boolean; notes: string | null; confirmed_at: string;
}
export interface KidsAuditEvent {
  id: string; church_id: string; event_type: string; dependent_id: string | null;
  actor_id: string | null; details: Record<string, unknown> | null; created_at: string;
}
export type CredentialStatus = "issued" | "active" | "suspended" | "revoked" | "expired" | "consumed";
export interface KidsCredential {
  id: string; church_id: string; issued_to_profile: string; authorized_person_id: string | null;
  status: CredentialStatus; purpose: "pickup" | "checkin_lookup" | "guardian_verification";
  expires_at: string | null; revoked_at: string | null; revoked_by: string | null; revoke_reason: string | null;
  created_by: string | null; created_at: string;
}
export interface CredentialValidationRow {
  credential_id: string | null; status: string; pin_required: boolean; pin_ok: boolean;
  custody_record_id: string | null; dependent_name: string | null; scope_consumed: boolean;
}

// ============================================================
// Rádio Web — Studio (convites do apresentador) e Gravações (RADIO-004)
// ============================================================
export type RadioStudioInviteStatus = "ativo" | "revogado" | "expirado" | "usado";

export interface RadioStudioInvite {
  id: string;
  church_id: string | null;
  program_id: string | null;
  token: string;
  presenter_name: string | null;
  presenter_email: string | null;
  role: string;
  status: RadioStudioInviteStatus;
  waitroom_at: string | null;
  techcheck_at: string | null;
  starts_at: string;
  ends_at: string;
  access_ends_at: string | null;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
}

export interface RadioInviteValidation {
  valid: boolean;
  reason: string | null;
  invite_id: string | null;
  program_id: string | null;
  program_title: string | null;
  presenter_name: string | null;
  role: string | null;
  church_id: string | null;
  waitroom_at: string | null;
  techcheck_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  access_ends_at: string | null;
}

export type RadioRecordingStatus =
  | "gravando" | "processando" | "revisao" | "publicada" | "reprovada" | "erro";

export interface RadioRecording {
  id: string;
  church_id: string | null;
  program_id: string | null;
  episode_id: string | null;
  title: string;
  presenter_name: string | null;
  category: string | null;
  storage_path: string;
  audio_url: string | null;
  duration_seconds: number | null;
  status: RadioRecordingStatus;
  cover_url?: string | null;
  cover_storage_path?: string | null;
  recorded_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  is_reprise: boolean;
  created_at: string;
}

// ============================================================
// Rádio Web — Ciclo 2 (RADIO-005): podcasts, analytics, multi-convidados
// ============================================================
export type RadioGuestRole = "convidado" | "especial" | "co-apresentador" | "musica";

export interface RadioProgramGuest {
  id: string;
  program_id: string;
  guest_name: string;
  guest_email: string | null;
  guest_role: RadioGuestRole;
  sort_order: number;
  created_at: string;
}

export type RadioPlaySource = "episode" | "podcast" | "live" | "recording" | "reprise";

export interface RadioPlayEvent {
  id: string;
  church_id: string | null;
  profile_id: string | null;
  episode_id: string | null;
  recording_id: string | null;
  program_id: string | null;
  source: RadioPlaySource;
  started_at: string;
  listened_seconds: number;
  ip_hash: string | null;
  user_agent: string | null;
}

export interface RadioEpisodePlayStats {
  episode_id: string;
  title: string;
  church_id: string | null;
  category: string | null;
  is_podcast: boolean | null;
  total_plays: number;
  total_listened_seconds: number;
  unique_listeners: number;
  last_play_at: string | null;
}

export interface RadioAnalyticsSummary {
  total_plays: number;
  total_listened_seconds: number;
  unique_listeners: number;
  live_plays: number;
  podcast_plays: number;
  episode_plays: number;
  last_7d_plays: number;
}

// ============================================================
// Rádio Web — Ciclo 4 (RADIO-004 agenda): grade semanal visual
// ============================================================
export interface RadioScheduleItem {
  program_id: string;
  title: string;
  description: string | null;
  host_name: string | null;
  cover_url: string | null;
  mode: RadioProgramMode | null;
  weekday: Weekday;
  start_time: string | null;
  end_time: string | null;
  is_recurring: boolean;
  is_special: boolean;
  date: string | null;
}

export interface RadioScheduleDay {
  weekday: Weekday;
  label: string;
  items: RadioScheduleItem[];
}

export interface RadioWeeklySchedule {
  days: RadioScheduleDay[];
  today: Weekday;
  week_start: string;
  week_end: string;
}

// ============================================================
// Rádio Web — Ciclo 5 (RADIO-008): ouvintes e notificações
// ============================================================
export type RadioListenerStatus = "ativo" | "pausado" | "cancelado";

export interface RadioListener {
  id: string;
  church_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  token: string;
  status: RadioListenerStatus;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface RadioListenerWithPrograms extends RadioListener {
  program_ids: string[];
}

export interface RadioRegisterResult {
  id: string;
  token: string;
  status: string;
  email: string;
}

export interface RadioNotificationLog {
  id: string;
  listener_id: string | null;
  program_id: string | null;
  church_id: string | null;
  channel: string;
  status: string;
  error: string | null;
  sent_at: string;
}

// ============================================================
// Live-360 (S360-LIVE-000) — apresentação ao vivo
// ============================================================
export type LiveSessionStatus = "offline" | "preview" | "live" | "frozen";
export type LiveItemKind = "bible" | "lyric" | "media" | "blank" | "logo";
export type LiveTokenRole = "operator" | "viewer";

export interface LiveSession {
  id: string;
  church_id: string | null;
  title: string;
  status: LiveSessionStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiveCurrentItem {
  session_id: string;
  kind: LiveItemKind;
  ref: string | null;
  payload: Record<string, unknown> | null;
  seq: number;
  updated_at: string;
}

export interface LiveControlTokenResult {
  raw_token: string;
  expires_at: string;
}

export interface LiveTokenValidation {
  valid: boolean;
  role: LiveTokenRole | null;
  session_title: string | null;
}

// ── Repertório de louvor (Slice 2) ──
export type LiveLyricBlockType = "verse" | "chorus" | "bridge" | "ending";

export interface LiveLyricBlock {
  type: LiveLyricBlockType;
  lines: string[];
}

export interface LiveLyric {
  id: string;
  church_id: string | null;
  title: string;
  author: string | null;
  lyrics: LiveLyricBlock[];
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiveOnairLyric {
  id: string;
  title: string;
  author: string | null;
  lyrics: LiveLyricBlock[];
}

// ── Slice 4/5 — tema visual da projeção e histórico de comandos ──
export interface LiveTheme {
  bg: string;
  text: string;
  accent: string;
  fontDisplay: string;
  // Slice 5 — ajustes finos de projeção (segundo monitor / proporção 16:9).
  ratio?: "16:9" | "auto";
  scale?: number;
}

export interface LiveCommandLogEntry {
  id: number;
  cmd: string;
  payload: Record<string, unknown> | null;
  operator_name: string;
  token_id: string | null;
  client_id: string | null;
  created_at: string;
}

// CEC Academy — Sprint 7: planos de leitura, devocional e rotina diária
export type ReadingPlanEnrollmentStatus = "active" | "paused" | "completed" | "archived";
export interface AcademyReadingPlan {
  id: string; title: string; description: string | null; duration_days: number; cover_url: string | null;
  audience: string | null; is_featured: boolean; is_active: boolean; created_by: string | null;
  created_at: string; updated_at: string;
}
export interface AcademyReadingPlanDay {
  id: string; plan_id: string; day_number: number; title: string | null; bible_references: string[];
  reflection_prompt: string | null; prayer_prompt: string | null; practice_prompt: string | null; created_at: string;
}
export interface AcademyReadingEnrollment {
  id: string; profile_id: string; plan_id: string; status: ReadingPlanEnrollmentStatus; started_on: string;
  current_day: number; completed_at: string | null; created_at: string; updated_at: string;
}
export interface AcademyReadingDayProgress {
  id: string; enrollment_id: string; day_id: string; profile_id: string; completed_at: string;
}
export interface SpiritualDailyRoutine {
  id: string; profile_id: string; routine_date: string; bible_reference: string | null;
  read_at: string | null; reflected_at: string | null; prayed_at: string | null; practiced_at: string | null; shared_at: string | null;
  reflection: string | null; prayer: string | null; practice: string | null; created_at: string; updated_at: string;
}
