export interface FaqItem {
  question: string;
  answer: string;
}

export interface Scenario {
  tag: string;
  session: string;
  question: string;
  hint: string;
  answer: string;
  progress: string;
  pct: string;
  fill: string;
  name: string;
  job: string;
  avatar: string;
  avatarBg: string;
  avatarColor: string;
  device: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  job: string;
  avatar: string;
  avatarBg: string;
  avatarColor: string;
}

export interface PricingPack {
  category: string;
  name: string;
  price: string;
  features: string[];
  featured?: boolean;
  trackingId: string;
}

export interface UseCase {
  title: string;
  description: string;
  example: string;
  icon: React.ReactNode;
}

export interface Profile {
  title: string;
  description: string;
  bonus: string;
  icon: React.ReactNode;
}

export interface EarnRow {
  profile: string;
  subtitle: string;
  duration: string;
  earn: string;
  badge?: string;
  badgeType?: "premium" | "standard";
}

declare global {
  interface Window {
    _paq?: Array<Array<string | number>>;
  }
}
