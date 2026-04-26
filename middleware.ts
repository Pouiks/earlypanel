import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/entreprises",
  "/testeurs",
  "/app/login",
  "/app/auth",
  "/staff/login",
];

function isPublic(pathname: string) {
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/app/auth/")) return true;
  return PUBLIC_PATHS.includes(pathname);
}

function isProtectedRoute(pathname: string) {
  return pathname.startsWith("/app") || pathname.startsWith("/staff");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedRoute(pathname) || isPublic(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // SECURITE : en production, l'absence de config Supabase ne doit PAS ouvrir
    // toutes les routes protegees. Fail-closed : on redirige vers la page de login.
    // En dev, on laisse passer pour eviter de bloquer l'environnement local sans .env.
    if (process.env.NODE_ENV === "production") {
      const loginPath = pathname.startsWith("/staff") ? "/staff/login" : "/app/login";
      return NextResponse.redirect(new URL(loginPath, request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith("/staff")) {
      return NextResponse.redirect(new URL("/staff/login", request.url));
    }
    return NextResponse.redirect(new URL("/app/login", request.url));
  }

  const role = (user.app_metadata?.role as string) || "tester";

  // Staff trying to access tester routes
  if (role === "staff" || role === "admin") {
    if (pathname.startsWith("/app")) {
      return NextResponse.redirect(new URL("/staff/dashboard", request.url));
    }

    // G16 : verification DB que l'utilisateur est bien dans `staff_members`.
    // Sans ce check, un compte auth dont le role staff a ete revoque mais dont
    // le JWT n'a pas encore expire pourrait continuer d'acceder. Cache via le
    // cookie `tp-staff-ok` pendant 5 minutes pour eviter une requete DB par
    // page (compromis perf/secu raisonnable).
    if (pathname.startsWith("/staff")) {
      const staffCookie = request.cookies.get("tp-staff-ok")?.value;
      if (staffCookie !== "true") {
        const { data: member } = await supabase
          .from("staff_members")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (!member) {
          return NextResponse.redirect(new URL("/staff/login", request.url));
        }
        response.cookies.set("tp-staff-ok", "true", {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          // M6 : TTL court (2 min) pour reduire la fenetre pendant laquelle un
          // staff revoque conserve l'acces aux pages /staff/*. Les API staff
          // refont un check DB a chaque requete via getStaffMember().
          maxAge: 60 * 2,
        });
      }
    }
    return response;
  }

  // Tester trying to access staff routes
  if (pathname.startsWith("/staff")) {
    return NextResponse.redirect(new URL("/app/dashboard", request.url));
  }

  // Tester flow: profile completion check
  const profileCookie = request.cookies.get("tp-profile")?.value;
  let profileCompleted = profileCookie === "true";

  if (!profileCookie) {
    const { data: tester } = await supabase
      .from("testers")
      .select("profile_completed")
      .eq("auth_user_id", user.id)
      .single();

    profileCompleted = tester?.profile_completed ?? false;
    response.cookies.set("tp-profile", String(profileCompleted), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      // SECURITE : flag `secure` en production pour empecher l'envoi en HTTP clair.
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  if (!profileCompleted && !pathname.startsWith("/app/onboarding")) {
    return NextResponse.redirect(new URL("/app/onboarding", request.url));
  }

  if (profileCompleted && pathname.startsWith("/app/onboarding")) {
    return NextResponse.redirect(new URL("/app/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/staff/:path*"],
};
