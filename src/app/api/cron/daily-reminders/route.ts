import { NextResponse } from "next/server";
import { GET as runNdaReminders } from "../nda-reminders/route";
import { GET as runProjectReminders } from "../project-reminders/route";
import { logStaffAction } from "@/lib/audit";

export const runtime = "nodejs";

// =====================================================================
// Cron quotidien combine : appelle les 2 logiques de relance en serie.
// =====================================================================
// Existe pour respecter la limite Vercel Hobby (max 2 crons par projet).
// On garde `close-expired` comme cron 1, et ce endpoint comme cron 2 qui
// orchestre les 2 reminders precedemment separes :
//   - /api/cron/nda-reminders (relance NDA non signe > 3j)
//   - /api/cron/project-reminders (rappel mi-parcours)
//
// Les endpoints individuels restent accessibles pour debug / retry manuel
// via curl, mais ne sont plus declenches automatiquement par vercel.json.
//
// Auth : Bearer CRON_SECRET (delegue aux 2 sous-endpoints qui le verifient
// chacun, on n'a pas a re-verifier ici).

interface SubResult {
  endpoint: string;
  ok: boolean;
  status: number;
  body: unknown;
}

async function callSafely(
  label: string,
  handler: (req: Request) => Promise<Response>,
  request: Request
): Promise<SubResult> {
  try {
    const response = await handler(request);
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // pas de JSON parsable
    }
    return {
      endpoint: label,
      ok: response.ok,
      status: response.status,
      body,
    };
  } catch (err) {
    console.error(`[cron/daily-reminders] ${label} threw`, err);
    return {
      endpoint: label,
      ok: false,
      status: 500,
      body: { error: err instanceof Error ? err.message : "unknown" },
    };
  }
}

export async function GET(request: Request) {
  // Verification basique de l'auth ici aussi (defense en profondeur).
  // Les sous-handlers la refont, mais si on oublie ici, ils s'arretent.
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !cronSecret) {
    console.error("[cron/daily-reminders] CRON_SECRET manquant en production");
    return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Important : on appelle les handlers AVEC le request original. Les
  // sous-handlers re-verifient le Bearer cote eux, ce qui leur permet de
  // rester appelables individuellement aussi (route legacy, debug curl).
  const ndaResult = await callSafely("nda-reminders", runNdaReminders, request);
  const midwayResult = await callSafely("project-reminders", runProjectReminders, request);

  await logStaffAction({
    staff_id: null,
    staff_email: "cron.daily-reminders",
    action: "cron.daily_reminders_batch",
    entity_type: "cron",
    metadata: {
      nda_status: ndaResult.status,
      nda_body: ndaResult.body,
      midway_status: midwayResult.status,
      midway_body: midwayResult.body,
    },
  });

  // On retourne 200 meme si l'un des deux a echoue : l'autre a fait son job
  // et on veut que Vercel considere le cron comme reussi (il retry si 500).
  return NextResponse.json({
    nda_reminders: ndaResult,
    project_reminders: midwayResult,
  });
}
