import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

// Health check public (pas d'auth) destine aux uptime monitors externes.
// Verifie la connectivite des dependances critiques :
//   - Supabase (select 1)
//   - Stripe (accounts.list({ limit: 1 })) si configure
//
// Retourne 200 si tout est OK, 503 si au moins un check est en echec.
//
// Note : on ne logue pas les details des erreurs en sortie pour eviter
// de divulguer la structure interne ; ils sont juste resumes en booleens.

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CheckResult {
  ok: boolean;
  latencyMs?: number;
  reason?: string;
}

async function checkSupabase(): Promise<CheckResult> {
  const start = Date.now();
  const admin = createAdminClient();
  if (!admin) return { ok: false, reason: "admin_client_unavailable" };

  try {
    const { error } = await admin
      .from("staff_members")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (error) return { ok: false, reason: error.message };
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e: unknown) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" };
  }
}

async function checkStripe(): Promise<CheckResult> {
  if (!stripe) return { ok: true, reason: "not_configured" };
  const start = Date.now();
  try {
    await stripe.accounts.list({ limit: 1 });
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e: unknown) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" };
  }
}

export async function GET() {
  const [supabaseCheck, stripeCheck] = await Promise.all([
    checkSupabase(),
    checkStripe(),
  ]);

  const healthy = supabaseCheck.ok && stripeCheck.ok;
  const status = healthy ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        supabase: supabaseCheck,
        stripe: stripeCheck,
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
