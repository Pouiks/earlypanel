import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/testers/documents/[projectId]/download
 *
 * Telecharge le NDA signe en PDF :
 *   1. Authentifie le testeur courant
 *   2. Verifie qu'il a un NDA signe sur ce projet (nda_document_url + status approprie)
 *   3. Genere une signed URL FRESH (TTL 5min) avec Content-Disposition: attachment
 *      via l'option `download` de Supabase Storage
 *   4. Redirige vers la signed URL (302)
 *
 * Avantages vs lien direct :
 *   - URL toujours fraiche (jamais d'expiration vue par l'utilisateur)
 *   - Force le download (pas d'affichage inline dans l'onglet)
 *   - Filename explicite : NDA-{project_ref}-{Nom_Prenom}.pdf
 *   - Auth re-verifiee a chaque clic
 */

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
          catch { /* readonly */ }
        },
      },
    },
  );
}

function sanitizeFilename(input: string): string {
  // Retire les caracteres de chemin et de controle, garde lettres/chiffres/underscore/-/espace.
  return input.replace(/[^a-zA-Z0-9 _-]/g, "_").replace(/_+/g, "_").trim().slice(0, 80) || "doc";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

    const { projectId } = await params;

    // 1. Charge le tester
    const { data: tester } = await admin
      .from("testers")
      .select("id, first_name, last_name")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!tester) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

    // 2. Verifie l'acces et recupere le path
    const { data: pt } = await admin
      .from("project_testers")
      .select("nda_document_url, status, project:projects(title, ref_number, company_name)")
      .eq("project_id", projectId)
      .eq("tester_id", tester.id)
      .maybeSingle();

    if (!pt) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    if (!pt.nda_document_url) {
      return NextResponse.json({ error: "Aucun document disponible" }, { status: 404 });
    }

    // Le NDA n'est telechargeable que apres signature. Statuts compatibles :
    // nda_signed, invited, in_progress, completed.
    const allowedStatuses = ["nda_signed", "invited", "in_progress", "completed"];
    if (!allowedStatuses.includes(pt.status as string)) {
      return NextResponse.json(
        { error: "NDA non encore signé pour ce projet" },
        { status: 403 },
      );
    }

    // 3. Resout le path
    const docRef = pt.nda_document_url as string;
    if (!docRef.startsWith("storage:")) {
      // Anciennes valeurs (URL publiques pre-G4) : redirige tel quel.
      return NextResponse.redirect(docRef);
    }
    const storagePath = docRef.slice("storage:".length);

    // 4. Construit le filename de telechargement
    const project = Array.isArray(pt.project) ? pt.project[0] : pt.project;
    const projectRef = project?.ref_number || project?.title || "projet";
    const testerName = `${tester.first_name ?? ""}_${tester.last_name ?? ""}`.trim() || "testeur";
    const filename = sanitizeFilename(`NDA-${projectRef}-${testerName}`) + ".pdf";

    // 5. Genere une signed URL fresh avec force-download
    const { data: signed, error: signErr } = await admin.storage
      .from("documents")
      .createSignedUrl(storagePath, 60 * 5, { download: filename });

    if (signErr || !signed?.signedUrl) {
      console.error("[NDA download] signed URL error:", signErr?.message);
      return NextResponse.json(
        { error: "Lien de téléchargement indisponible. Réessayez." },
        { status: 503 },
      );
    }

    // 6. Redirect 302 vers la signed URL
    return NextResponse.redirect(signed.signedUrl);
  } catch (err) {
    console.error("[NDA download] unexpected:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
