/**
 * Configuration du rapport de mission.
 * Seuils de classification severity ajustables sans toucher au code.
 */

export const SEVERITY_THRESHOLDS = {
  blocking: 0.40,
  major_low: 0.25,
  major_high: 0.50,
} as const;

export function computeReadableTesterId(index: number): string {
  return `T${String(index + 1).padStart(2, "0")}`;
}

export function computeAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function computeDeviceSummary(tester: {
  devices?: string[];
  phone_model?: string | null;
  mobile_os?: string | null;
  browsers?: string[];
}): string {
  const parts: string[] = [];
  if (tester.devices?.length) parts.push(tester.devices.join(", "));
  if (tester.phone_model) parts.push(tester.phone_model);
  if (tester.mobile_os) parts.push(tester.mobile_os);
  if (tester.browsers?.length) parts.push(tester.browsers.join(", "));
  return parts.join(" · ") || "Non renseigné";
}

export const GENDER_EXPORT_LABELS: Record<string, string> = {
  female: "Femme",
  male: "Homme",
  non_binary: "Non-binaire",
  prefer_not_to_say: "—",
};

export const DIGITAL_LEVEL_LABELS: Record<string, string> = {
  debutant: "Novice",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
  expert: "Expert",
};
