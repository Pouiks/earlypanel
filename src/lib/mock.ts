import type { Tester } from "@/types/tester";

export const USE_MOCK_DATA = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export const MOCK_TESTER: Tester = {
  id: "mock-tester-001",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  email: "marie@exemple.fr",
  first_name: "Marie",
  last_name: "Dupont",
  phone: null,
  linkedin_url: null,
  job_title: "Chargée RH",
  sector: "Ressources humaines",
  company_size: "50-200",
  digital_level: "intermediaire",
  tools: ["Notion", "Slack", "Google Meet"],
  browsers: ["Chrome", "Firefox"],
  devices: ["Ordi Windows", "iPhone"],
  phone_model: "iPhone 14",
  mobile_os: "iOS",
  connection: "Fibre",
  availability: "1-2",
  timeslots: ["Matin", "Soir"],
  interests: ["SaaS B2B", "Fintech"],
  ux_experience: "Quelquefois",
  address: null,
  city: null,
  postal_code: null,
  birth_date: null,
  source: "landing",
  status: "pending",
  stripe_account_id: null,
  payment_setup: false,
  quality_score: 50,
  tier: "standard",
  missions_completed: 0,
  total_earned: 0,
  auth_user_id: "mock-auth-001",
  profile_completed: true,
  profile_step: 5,
  persona_id: null,
  persona_locked: false,
  persona: null,
};

const MOCK_TESTER_BLANK: Tester = {
  ...MOCK_TESTER,
  first_name: null,
  last_name: null,
  phone: null,
  linkedin_url: null,
  job_title: null,
  sector: null,
  company_size: null,
  digital_level: null,
  tools: [],
  browsers: [],
  devices: [],
  phone_model: null,
  mobile_os: null,
  connection: null,
  availability: null,
  timeslots: [],
  interests: [],
  ux_experience: null,
  profile_completed: false,
  profile_step: 1,
};

let mockOnboardingState: Tester = { ...MOCK_TESTER_BLANK };
let mockOnboardingActive = true;

export function getMockTester(): Tester {
  if (mockOnboardingActive && !mockOnboardingState.profile_completed) {
    return { ...mockOnboardingState };
  }
  return { ...MOCK_TESTER };
}

export function updateMockTester(data: Partial<Tester>): void {
  mockOnboardingState = { ...mockOnboardingState, ...data, updated_at: new Date().toISOString() };
  if (data.profile_completed) {
    mockOnboardingActive = false;
  }
}

export function resetMockOnboarding(): void {
  mockOnboardingState = { ...MOCK_TESTER_BLANK };
  mockOnboardingActive = true;
}

export const MOCK_MISSIONS = [
  {
    id: "mock-1",
    title: "Logiciel de facturation B2B",
    category: "SaaS B2B",
    duration_minutes: 25,
    amount: 20,
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "invited" as const,
  },
  {
    id: "mock-2",
    title: "Application mobile e-commerce",
    category: "App mobile",
    duration_minutes: 30,
    amount: 22,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "invited" as const,
  },
];
