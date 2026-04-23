export type StaffRole = "staff" | "admin";

export interface StaffMember {
  id: string;
  created_at: string;
  updated_at: string;
  auth_user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: StaffRole;
}

export type ProjectStatus = "draft" | "active" | "closed" | "archived";

export interface Project {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  status: ProjectStatus;
  title: string;
  description: string | null;
  company_name: string | null;
  sector: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  ref_number: string | null;
  start_date: string | null;
  end_date: string | null;
  urls: string[];
  target_gender: string[];
  target_age_min: number | null;
  target_age_max: number | null;
  target_csp: string[];
  target_sector: string | null;
  target_sector_restricted: boolean;
  target_locations: string[];
  /** Montant de base en centimes (hors grille tier) */
  base_reward_cents?: number | null;
  /** Grille optionnelle par tier, centimes : { "standard": 2000, "expert": 2500 } */
  tier_rewards?: Record<string, number> | null;

  /** Contexte rapport — page 3 */
  business_objective?: string | null;
  scope_included?: string[];
  scope_excluded?: string[];
  client_guidelines?: string | null;
  test_type?: "moderated" | "unmoderated" | null;
  audit_enabled?: boolean;
  audit_performance_score?: number | null;
  audit_accessibility_score?: number | null;
  audit_seo_score?: number | null;
  audit_best_practices_score?: number | null;
  audit_findings?: string[];

  questions?: ProjectQuestion[];
}

export interface ProjectQuestion {
  id: string;
  project_id: string;
  position: number;
  question_text: string;
  use_case_id?: string | null;
  question_hint?: string | null;
}

export interface ProjectUseCase {
  id: string;
  project_id: string;
  title: string;
  task_wording?: string | null;
  order: number;
  expected_testers_count?: number | null;
  created_at: string;
  updated_at: string;
  criteria?: UseCaseSuccessCriterion[];
  questions?: ProjectQuestion[];
}

export interface UseCaseSuccessCriterion {
  id: string;
  use_case_id: string;
  label: string;
  is_primary: boolean;
  order: number;
  created_at: string;
}

export interface UseCaseCompletion {
  id: string;
  project_tester_id: string;
  use_case_id: string;
  criterion_id: string;
  passed: boolean;
  recorded_at: string;
}

/* ---- Rapport de mission (JSONB) ---- */

export interface ReportKeyFigure {
  value: string;
  label: string;
}

export interface ReportSummary {
  verdict?: string;
  key_figures?: ReportKeyFigure[];
  top_actions?: string[];
}

export type Severity = "blocking" | "major" | "minor";
export type Impact = "blocking" | "slow" | "minor";
export type Priority = "P1" | "P2" | "P3";
export type TechEffort = "low" | "medium" | "high";

export interface ReportBug {
  id: string;
  description: string;
  device?: string;
  affected_testers: string[];
  severity: Severity;
  step?: string;
}

export interface ReportFrictionVerbatim {
  text: string;
  tester_id: string;
}

export interface ReportFriction {
  id: string;
  title: string;
  step?: string;
  affected_count?: number;
  panel_percentage?: number;
  impact: Impact;
  verbatims: ReportFrictionVerbatim[];
  analysis?: string;
}

export interface ReportRecommendation {
  id: string;
  title: string;
  priority: Priority;
  solves?: string;
  impact?: string;
  tech_effort: TechEffort;
}

export interface ReportImpactEffortMatrix {
  quick_wins?: string[];
  strategic?: string[];
  plan?: string[];
  backlog?: string[];
}

export interface ProjectReport {
  id: string;
  project_id: string;
  status: "draft" | "published";
  published_at?: string | null;
  delivery_date?: string | null;
  summary: ReportSummary;
  bugs: ReportBug[];
  frictions: ReportFriction[];
  recommendations: ReportRecommendation[];
  impact_effort_matrix: ReportImpactEffortMatrix;
  include_annexes: boolean;
  created_at: string;
  updated_at: string;
}

export type ProjectInsert = Pick<Project, "title"> &
  Partial<Omit<Project, "id" | "created_at" | "updated_at" | "questions">>;

export type ProjectUpdate = Partial<
  Omit<Project, "id" | "created_at" | "questions">
>;

export type ProjectTesterStatus =
  | "selected"
  | "nda_sent"
  | "nda_signed"
  | "invited"
  | "in_progress"
  | "completed"
  | "expired";

export interface ProjectTester {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  tester_id: string;
  status: ProjectTesterStatus;
  nda_document_url: string | null;
  nda_sent_at: string | null;
  nda_signed_at: string | null;
  nda_signer_ip: string | null;
  nda_signer_user_agent: string | null;
  nda_document_hash: string | null;
  invited_at: string | null;
  completed_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  staff_rating: number | null;
  staff_note: string | null;
  malus_applied: boolean;
}

export interface ProjectTesterAnswer {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  tester_id: string;
  question_id: string;
  answer_text: string | null;
  image_urls: string[];
}

export interface ProjectNda {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  title: string;
  content_html: string;
}
