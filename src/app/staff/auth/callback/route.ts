import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logStaffAction } from "@/lib/audit";

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
    if (!error) authSuccess = true;
    else console.error("[staff/auth/callback] PKCE exchange failed:", error.message);
  }

  if (!authSuccess && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "recovery",
    });
    if (!error) authSuccess = true;
    else console.error("[staff/auth/callback] verifyOtp failed:", error.message);
  }

  if (!authSuccess) {
    return redirectWithCookies(new URL("/staff/auth/error", origin), cookiesToApply);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirectWithCookies(new URL("/staff/auth/error", origin), cookiesToApply);
  }

  const role = user.app_metadata?.role;
  const isStaff = role === "staff" || role === "admin";

  if (!isStaff) {
    await supabase.auth.signOut();
    return redirectWithCookies(
      new URL("/staff/auth/error?reason=not_staff", origin),
      cookiesToApply
    );
  }

  // G16 : double-check DB membership. Empeche un compte dont le role staff a
  // ete revoque cote DB (mais dont le JWT/metadata serait encore valide) de
  // rentrer.
  const admin = createAdminClient();
  if (admin) {
    const { data: member } = await admin
      .from("staff_members")
      .select("id, email")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!member) {
      await supabase.auth.signOut();
      return redirectWithCookies(
        new URL("/staff/auth/error?reason=not_member", origin),
        cookiesToApply
      );
    }

    await logStaffAction(
      {
        staff_id: member.id,
        staff_email: member.email,
        action: type === "recovery" ? "staff.password_recovery_started" : "staff.magic_link_login",
        entity_type: "auth_user",
        entity_id: user.id,
        metadata: { method: code ? "pkce" : "token_hash" },
      },
      request
    );
  }

  // Recovery → forcer le passage par /staff/reset pour definir le nouveau mdp.
  // Magic link / login → dashboard.
  const target = type === "recovery" ? "/staff/reset" : "/staff/dashboard";
  return redirectWithCookies(new URL(target, origin), cookiesToApply);
}

function redirectWithCookies(
  url: URL,
  cookies: { name: string; value: string; options: CookieOptions }[]
) {
  const response = NextResponse.redirect(url);
  cookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}
