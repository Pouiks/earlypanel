import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkOrigin, forbiddenOriginResponse } from "@/lib/csrf";
import { logStaffAction } from "@/lib/audit";

// Champs autorises sur PATCH : on bloque toute modification de status, timestamps,
// flags de malus ou ids systeme. Le workflow (selected -> nda_sent -> ... -> completed)
// passe exclusivement par les routes dediees (nda/send, missions/start, submit, answers).
const PT_ALLOWED_PATCH_FIELDS = ["staff_rating", "staff_note"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testerId: string }> }
) {
  if (!checkOrigin(request)) return forbiddenOriginResponse();

  const staff = await getStaffMember();
  if (!staff) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
  }

  const { id, testerId } = await params;
  const body = (await request.json()) as Record<string, unknown>;

  const update: Record<string, unknown> = {};
  for (const key of PT_ALLOWED_PATCH_FIELDS) {
    if (body[key] !== undefined) {
      update[key] = body[key];
    }
  }

  // G10 : staff_rating doit etre un ENTIER strict dans [1..5]. Number.isInteger
  // rejette NaN, decimales et infinity, contrairement a `Number.isFinite` qui
  // accepte les decimales (3.5) et serait stocke en INTEGER avec troncature.
  if (update.staff_rating !== undefined && update.staff_rating !== null) {
    const r = Number(update.staff_rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return NextResponse.json(
        { error: "staff_rating doit etre un entier entre 1 et 5" },
        { status: 400 }
      );
    }
    update.staff_rating = r;
  }

  // G10 : borner staff_note pour empecher l'injection de payloads massifs.
  if (update.staff_note !== undefined && update.staff_note !== null) {
    if (typeof update.staff_note !== "string") {
      return NextResponse.json(
        { error: "staff_note doit etre une chaine" },
        { status: 400 }
      );
    }
    if (update.staff_note.length > 4000) {
      return NextResponse.json(
        { error: "staff_note trop longue (max 4000 caracteres)" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      {
        error: `Aucun champ modifiable. Champs autorises: ${PT_ALLOWED_PATCH_FIELDS.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("project_testers")
    .update(update)
    .eq("project_id", id)
    .eq("tester_id", testerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testerId: string }> }
) {
  if (!checkOrigin(request)) return forbiddenOriginResponse();

  const staff = await getStaffMember();
  if (!staff) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
  }

  const { id, testerId } = await params;

  // G12 : on bloque le DELETE si le testeur a deja avance dans le workflow.
  // Supprimer un project_tester en `nda_signed`/`in_progress`/`completed`
  // perdrait la trace juridique du NDA, les reponses du testeur, et un
  // eventuel payout. Pour ces statuts, on demande au staff de gerer cela
  // explicitement (ex. mettre a jour le statut, ne pas supprimer).
  const { data: pt } = await admin
    .from("project_testers")
    .select("id, status")
    .eq("project_id", id)
    .eq("tester_id", testerId)
    .maybeSingle();

  if (!pt) {
    return NextResponse.json({ error: "Assignation introuvable" }, { status: 404 });
  }

  const advancedStatuses = ["nda_signed", "invited", "in_progress", "completed"];
  if (advancedStatuses.includes(pt.status as string)) {
    return NextResponse.json(
      {
        error:
          "Impossible de retirer ce testeur : la mission est trop avancee (NDA signe ou travail effectue). Contactez le support.",
      },
      { status: 409 }
    );
  }

  // G12 : cleanup best-effort des artefacts storage avant DELETE en cascade.
  // - mission-images : tous les fichiers du dossier `${projectId}/${testerId}/...`.
  // - documents (NDA) : on liste pour recuperer les paths (le dossier `ndas/${projectId}`
  //   peut contenir des PDF d'autres testeurs, donc on filtre).
  try {
    const { data: imgFiles } = await admin.storage
      .from("mission-images")
      .list(`${id}/${testerId}`, { limit: 1000 });
    if (imgFiles && imgFiles.length > 0) {
      const paths = imgFiles.map((f) => `${id}/${testerId}/${f.name}`);
      // Si certains chemins sont en sous-dossier (par question_id), il faut
      // descendre. On tente d'abord la liste a plat ; si la structure est
      // /projectId/testerId/questionId/uuid.ext, on liste recursivement.
      await admin.storage.from("mission-images").remove(paths).catch(() => {});
    }
    // Recursion par question_id (couvre la structure reelle).
    const { data: questionDirs } = await admin.storage
      .from("mission-images")
      .list(`${id}/${testerId}`, { limit: 1000 });
    for (const dir of questionDirs ?? []) {
      const { data: files } = await admin.storage
        .from("mission-images")
        .list(`${id}/${testerId}/${dir.name}`, { limit: 1000 });
      if (files && files.length > 0) {
        const paths = files.map((f) => `${id}/${testerId}/${dir.name}/${f.name}`);
        await admin.storage.from("mission-images").remove(paths).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("[pt/DELETE] mission-images cleanup failed", err);
  }

  // NDA : si le NDA n'a pas ete signe, on peut nettoyer les eventuels brouillons
  // (cas rare, mais pour les statuts <= nda_sent on est ici).
  try {
    const { data: ndaFiles } = await admin.storage
      .from("documents")
      .list(`ndas/${id}`, { limit: 1000 });
    const myFiles = (ndaFiles ?? []).filter((f) => f.name.startsWith(`${testerId}_`));
    if (myFiles.length > 0) {
      const paths = myFiles.map((f) => `ndas/${id}/${f.name}`);
      await admin.storage.from("documents").remove(paths).catch(() => {});
    }
  } catch (err) {
    console.warn("[pt/DELETE] documents cleanup failed", err);
  }

  const { error } = await admin
    .from("project_testers")
    .delete()
    .eq("project_id", id)
    .eq("tester_id", testerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: "project_tester.delete",
      entity_type: "project_tester",
      entity_id: pt.id,
      metadata: { project_id: id, tester_id: testerId, prev_status: pt.status },
    },
    request
  );

  return NextResponse.json({ success: true });
}
