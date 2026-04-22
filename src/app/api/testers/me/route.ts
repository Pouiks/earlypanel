import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { USE_MOCK_DATA, getMockTester, updateMockTester } from "@/lib/mock";
import { recomputePersonaForTester } from "@/lib/persona-matcher";

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
  if (USE_MOCK_DATA) {
    return NextResponse.json(getMockTester());
  }

  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
    }

    const { data, error } = await admin
      .from("testers")
      .select("*, persona:tester_personas(id, slug, name, description, min_reward_cents, max_reward_cents)")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[testers/me] Query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Profil testeur non trouvé" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[testers/me] Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (USE_MOCK_DATA) {
    const body = await request.json();
    updateMockTester(body);
    return NextResponse.json({ success: true, mock: true });
  }

  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();

  const forbidden = ["id", "created_at", "email", "auth_user_id", "persona_id", "persona_locked", "tier", "quality_score", "missions_completed"];
  forbidden.forEach((key) => delete body[key]);

  const admin = createAdminClient();
  const client = admin || supabase;

  const { error } = await client
    .from("testers")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("auth_user_id", user.id);

  if (error) {
    console.error("[testers/me PATCH] Update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Recalcule le persona si des champs pertinents ont potentiellement change.
  if (admin) {
    const { data: row } = await admin
      .from("testers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (row?.id) {
      try {
        await recomputePersonaForTester(admin, row.id);
      } catch (e) {
        console.error("[testers/me PATCH] persona recompute failed", e);
      }
    }
  }

  return NextResponse.json({ success: true });
}
