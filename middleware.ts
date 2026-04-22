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
    // Staff accessing /staff/* => allowed
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
