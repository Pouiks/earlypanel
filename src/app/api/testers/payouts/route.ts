import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context
          }
        },
      },
    }
  );
}

export async function GET() {
  const supabase = await getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur" }, { status: 500 });
  }

  const { data: tester } = await admin
    .from("testers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!tester) {
    return NextResponse.json({ error: "Profil testeur non trouvé" }, { status: 404 });
  }

  const { data: payouts, error } = await admin
    .from("tester_payouts")
    .select(`
      id,
      created_at,
      final_amount_cents,
      calculated_amount_cents,
      status,
      paid_at,
      project:projects(name)
    `)
    .eq("tester_id", tester.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = payouts ?? [];
  const totalPaidCents = list
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.final_amount_cents ?? 0), 0);
  const totalPendingCents = list
    .filter((p) => p.status === "pending" || p.status === "approved")
    .reduce((sum, p) => sum + (p.final_amount_cents ?? 0), 0);

  return NextResponse.json({
    payouts: list,
    total_paid_cents: totalPaidCents,
    total_pending_cents: totalPendingCents,
  });
}
