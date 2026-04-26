import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { backfillConnectionIfStuck } from "@/lib/tester-activation-repair";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const cookiesToApply: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesToApply.push({ name, value, options });
          });
        },
      },
    }
  );

  let authSuccess = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      authSuccess = true;
    } else {
      console.error("[auth/callback] PKCE exchange failed:", error.message);
    }
  }

  if (!authSuccess && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink",
    });
    if (!error) {
      authSuccess = true;
    } else {
      console.error("[auth/callback] Token hash verify failed:", error.message);
    }
  }

  if (!authSuccess) {
    const errorResponse = NextResponse.redirect(new URL("/app/auth/error", origin));
    cookiesToApply.forEach(({ name, value, options }) => {
      errorResponse.cookies.set(name, value, options);
    });
    return errorResponse;
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/app/login", origin));
  }

  let profileCompleted = false;
  const admin = createAdminClient();
  if (admin) {
    const { data: tester } = await admin
      .from("testers")
      .select("id, profile_completed, status, connection, profile_step")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (tester) {
      const { applied, profile_completed_after } = await backfillConnectionIfStuck(admin, {
        id: tester.id,
        status: tester.status,
        connection: tester.connection,
        profile_step: tester.profile_step,
        profile_completed: tester.profile_completed,
      });
      profileCompleted = applied
        ? (profile_completed_after ?? false)
        : (tester.profile_completed ?? false);
    }
  }

  const redirectUrl = profileCompleted ? "/app/dashboard" : "/app/onboarding";
  const response = NextResponse.redirect(new URL(redirectUrl, origin));

  cookiesToApply.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  response.cookies.set("tp-profile", String(profileCompleted), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    // SECURITE : flag `secure` en production (HTTPS uniquement).
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
