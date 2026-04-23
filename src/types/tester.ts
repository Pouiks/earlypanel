export type TesterStatus = "pending" | "active" | "suspended" | "rejected";
export type TesterGender = "female" | "male" | "non_binary" | "prefer_not_to_say";

export interface TesterPersona {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  min_reward_cents: number;
  max_reward_cents: number;
}
export type DigitalLevel = "debutant" | "intermediaire" | "avance" | "expert";
export type TesterTier = "standard" | "expert" | "premium";
export type Availability = "1-2" | "3-5" | "5+";
export type MobileOS = string;
export type ConnectionType = "Fibre" | "ADSL" | "4G/5G";
export type UxExperience = "Jamais" | "Quelquefois" | "Régulièrement";

export interface Tester {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  linkedin_url: string | null;
  job_title: string | null;
  sector: string | null;
  company_size: string | null;
  digital_level: DigitalLevel | null;
  tools: string[];
  browsers: string[];
  devices: string[];
  phone_model: string | null;
  mobile_os: MobileOS | null;
  connection: ConnectionType | null;
  availability: Availability | null;
  timeslots: string[];
  interests: string[];
  ux_experience: UxExperience | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  birth_date: string | null;
  source: string | null;
  status: TesterStatus;
  stripe_account_id: string | null;
  payment_setup: boolean;
  quality_score: number;
  tier: TesterTier;
  missions_completed: number;
  total_earned: number;
  auth_user_id: string | null;
  profile_completed: boolean;
  profile_step: number;
  gender?: TesterGender | null;
  persona_id: string | null;
  persona_locked: boolean;
  persona?: TesterPersona | null;
}

export type TesterInsert = Pick<Tester, "email" | "auth_user_id"> &
  Partial<Omit<Tester, "id" | "created_at" | "updated_at" | "email" | "auth_user_id">>;

export type TesterUpdate = Partial<
  Omit<Tester, "id" | "created_at" | "email" | "auth_user_id">
>;
