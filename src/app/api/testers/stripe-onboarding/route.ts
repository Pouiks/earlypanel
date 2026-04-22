import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";
import { USE_MOCK_DATA } from "@/lib/mock";

export async function POST() {
  if (USE_MOCK_DATA) {
    return NextResponse.json({
      url: "https://connect.stripe.com/setup/e/mock",
      mock: true,
    });
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe non configuré" },
      { status: 503 }
    );
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

  const { data: tester } = await supabase
    .from("testers")
    .select("stripe_account_id")
    .eq("auth_user_id", user.id)
    .single();

  let accountId = tester?.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
    });
    accountId = account.id;

    await supabase
      .from("testers")
      .update({ stripe_account_id: accountId })
      .eq("auth_user_id", user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/app/dashboard/gains`,
    return_url: `${appUrl}/app/dashboard/gains`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
