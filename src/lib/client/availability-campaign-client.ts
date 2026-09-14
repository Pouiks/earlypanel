/**
 * Envoi groupe de la relance de disponibilite, pilote par le navigateur en
 * petits lots pour afficher une progression reelle.
 *
 * Pourquoi : une seule requete pour 57 emails dure ~25 s (throttle Resend
 * 0,4 s par mail) sans aucun retour, et depasse le maxDuration Vercel au-dela
 * de ~150 mails. Ici le client lit la liste des testeurs dus (vue Relances >
 * Disponibilite), puis appelle la route de campagne par lots de CHUNK_SIZE
 * identifiants. Chaque lot repasse par la selection serveur (actif, profil
 * complet, sans dispo confirmee, cooldown, plafond) : un testeur qui repond
 * entre deux lots n'est pas relance. Un `batch_id` commun relie les entrees
 * d'audit d'un meme envoi.
 */

export const CHUNK_SIZE = 5;

export interface CampaignProgress {
  done: number;
  total: number;
  sent: number;
  unmarked: number;
  errors: number;
}

export interface CampaignRunResult extends CampaignProgress {
  batch_id: string;
}

interface DueRow {
  id: string;
  state: string;
}

async function fetchDueIds(): Promise<string[]> {
  const res = await fetch("/api/staff/testers/availability-reminders", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
  }
  const data = (await res.json()) as { rows?: DueRow[] };
  return (data.rows ?? []).filter((r) => r.state === "due").map((r) => r.id);
}

/**
 * Lance l'envoi par lots. `onProgress` est appele apres chaque lot.
 * Ne s'arrete pas sur un lot en erreur : l'erreur est comptee et on passe au
 * suivant, pour que le compteur reflete ce qui est reellement parti.
 */
export async function runAvailabilityCampaign(opts: {
  onProgress?: (p: CampaignProgress) => void;
  signal?: AbortSignal;
}): Promise<CampaignRunResult> {
  const ids = await fetchDueIds();
  const batch_id = `web-${Date.now().toString(36)}`;
  const progress: CampaignProgress = { done: 0, total: ids.length, sent: 0, unmarked: 0, errors: 0 };
  opts.onProgress?.({ ...progress });

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    if (opts.signal?.aborted) break;
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    try {
      const res = await fetch("/api/staff/testers/availability-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tester_ids: chunk, batch_id }),
        signal: opts.signal,
      });
      const data = (await res.json().catch(() => ({}))) as { sent?: number; unmarked?: number; total?: number; error?: string };
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      progress.sent += data.sent ?? 0;
      progress.unmarked += data.unmarked ?? 0;
      progress.errors += Math.max(0, (data.total ?? 0) - (data.sent ?? 0));
    } catch (e) {
      if ((e as Error).name === "AbortError") break;
      progress.errors += chunk.length;
    }
    progress.done = Math.min(ids.length, i + chunk.length);
    opts.onProgress?.({ ...progress });
  }

  return { ...progress, batch_id };
}
