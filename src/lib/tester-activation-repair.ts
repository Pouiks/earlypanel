import type { SupabaseClient } from "@supabase/supabase-js";

/** Valeur de secours reconnue par le trigger `auto_activate_tester` (CHECK sur testers.connection). */
const DEFAULT_CONNECTION = "4G/5G" as const;

type TesterActivationRow = {
  id: string;
  status: string;
  connection: string | null;
  profile_step: number | null;
  profile_completed: boolean | null;
};

/**
 * Parcours historiques : l’étape 4 pouvait enregistrer `connection` vide → le
 * trigger BDD ne passait jamais le testeur en `active`. Un UPDATE avec une
 * valeur valide relance le trigger.
 */
export async function backfillConnectionIfStuck(
  admin: SupabaseClient,
  row: TesterActivationRow
): Promise<{ applied: boolean; profile_completed_after: boolean | null }> {
  if (row.status !== "pending") {
    return { applied: false, profile_completed_after: null };
  }
  if (row.connection != null && String(row.connection).trim() !== "") {
    return { applied: false, profile_completed_after: null };
  }
  const step = row.profile_step ?? 0;
  if (step < 5 && !row.profile_completed) {
    return { applied: false, profile_completed_after: null };
  }

  const { error: fixErr } = await admin
    .from("testers")
    .update({ connection: DEFAULT_CONNECTION, updated_at: new Date().toISOString() })
    .eq("id", row.id);

  if (fixErr) {
    return { applied: false, profile_completed_after: null };
  }

  const { data: t2 } = await admin
    .from("testers")
    .select("profile_completed")
    .eq("id", row.id)
    .maybeSingle();

  return { applied: true, profile_completed_after: t2?.profile_completed ?? null };
}
