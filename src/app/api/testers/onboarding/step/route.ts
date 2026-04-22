import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { USE_MOCK_DATA, updateMockTester } from "@/lib/mock";

const REQUIRED_TEXT_FIELDS = [
  "first_name", "last_name", "phone",
  "job_title", "sector", "company_size",
  "digital_level", "connection", "availability", "ux_experience",
] as const;

const REQUIRED_ARRAY_FIELDS = [
  "tools", "browsers", "devices", "interests",
] as const;

function isProfileComplete(profile: Record<string, unknown>): boolean {
  for (const field of REQUIRED_TEXT_FIELDS) {
    if (!profile[field]) return false;
  }
  for (const field of REQUIRED_ARRAY_FIELDS) {
    const arr = profile[field];
    if (!Array.isArray(arr) || arr.length === 0) return false;
  }
  return true;
}

export async function PATCH(request: NextRequest) {
  if (USE_MOCK_DATA) {
    const body = await request.json();
    const isLast = body.step === 5;
    const updateData = {
      ...body.data,
      profile_step: body.step,
      ...(isLast ? { profile_completed: true, status: "active" as const } : {}),
    };
    updateMockTester(updateData);
    return NextResponse.json({
      success: true,
      mock: true,
      redirect: isLast ? "/app/dashboard" : undefined,
    });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { step, data } = await request.json();

  if (!step || typeof step !== "number" || step < 1 || step > 5) {
    return NextResponse.json({ error: "Étape invalide" }, { status: 400 });
  }

  const forbidden = ["id", "created_at", "email", "auth_user_id"];
  forbidden.forEach((key) => delete data[key]);

  const updatePayload: Record<string, unknown> = {
    ...data,
    profile_step: step,
    updated_at: new Date().toISOString(),
  };

  if (step === 5) {
    updatePayload.profile_completed = true;

    const { error: updateError } = await supabase
      .from("testers")
      .update(updatePayload)
      .eq("auth_user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { data: fullProfile } = await supabase
      .from("testers")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (fullProfile && isProfileComplete(fullProfile)) {
      await supabase
        .from("testers")
        .update({ status: "active" })
        .eq("auth_user_id", user.id);
    }

    cookieStore.set("tp-profile", "true", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    return NextResponse.json({ success: true, redirect: "/app/dashboard" });
  }

  const { error } = await supabase
    .from("testers")
    .update(updatePayload)
    .eq("auth_user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
