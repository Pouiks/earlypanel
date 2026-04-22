import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildNdaVariables } from "@/lib/nda-pdf";

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* Server Component context */ }
        },
      },
    }
  );
}

const VARIABLE_LABELS: Record<string, string> = {
  tester_first_name: "prénom",
  tester_last_name: "nom",
  tester_email: "email",
  tester_phone: "téléphone",
  tester_address: "adresse",
  tester_city: "ville",
  tester_postal_code: "code postal",
  tester_birth_date: "date de naissance",
  tester_job_title: "poste",
  tester_sector: "secteur",
  project_title: "projet",
  project_ref: "réf. projet",
  company_name: "société",
  contact_name: "contact",
  contact_email: "email contact",
  sign_date: "date de signature",
  sign_ip: "adresse IP",
  nda_ref: "réf. NDA",
};

function replaceVariables(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = vars[key];
    if (value) return value;
    const label = VARIABLE_LABELS[key];
    if (label) return `<span style="color:#b45309;background:#fef3c7;padding:1px 6px;border-radius:4px;font-size:12px;">[${label} non renseigné(e)]</span>`;
    return match;
  });
}

export async function GET() {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });

    const { data: tester } = await admin
      .from("testers")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!tester) return NextResponse.json([], { status: 200 });

    const { data: assignments, error } = await admin
      .from("project_testers")
      .select("id, project_id, status, nda_sent_at, nda_signed_at, nda_document_url")
      .eq("tester_id", tester.id)
      .in("status", ["nda_sent", "nda_signed", "invited", "in_progress", "completed"]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!assignments || assignments.length === 0) return NextResponse.json([]);

    const results = [];
    for (const pt of assignments) {
      const { data: project } = await admin
        .from("projects")
        .select("*")
        .eq("id", pt.project_id)
        .single();

      const { data: nda } = await admin
        .from("project_ndas")
        .select("title, content_html")
        .eq("project_id", pt.project_id)
        .maybeSingle();

      let resolvedNda = nda;
      if (nda && project) {
        const variables = buildNdaVariables({ tester, project });
        const varsRecord = variables as unknown as Record<string, string>;
        resolvedNda = {
          ...nda,
          content_html: replaceVariables(nda.content_html, varsRecord),
        };
      }

      results.push({
        ...pt,
        project: project ? { title: project.title, company_name: project.company_name } : null,
        nda: resolvedNda || null,
      });
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("[documents] unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
