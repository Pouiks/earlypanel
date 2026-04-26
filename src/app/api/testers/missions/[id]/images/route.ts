import { NextResponse, type NextRequest } from "next/server";
import { getAuthedTester } from "@/lib/tester-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectAllowsTesterWorkWithGrace } from "@/lib/project-lifecycle";
import {
  detectImageMime,
  extensionForMime,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_QUESTION,
  MAX_IMAGES_PER_MISSION,
  checkRateLimit,
} from "@/lib/image-validation";

const BUCKET = "mission-images";

async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
  if (!admin) return;
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_IMAGE_BYTES,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
  }
}

/**
 * POST multipart/form-data :
 *   - file : Blob
 *   - question_id : string
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await getAuthedTester();
    if (!authed) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const rl = checkRateLimit(`upload:${authed.testerId}`);
    if (!rl.ok) {
      return NextResponse.json({ error: "Trop de requêtes, réessayez plus tard" }, { status: 429 });
    }

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

    const { id: projectId } = await params;

    const formData = await request.formData();
    const file = formData.get("file");
    const questionId = formData.get("question_id");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }
    if (typeof questionId !== "string" || !questionId) {
      return NextResponse.json({ error: "question_id requis" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    const { data: pt } = await admin
      .from("project_testers")
      .select("id, status")
      .eq("project_id", projectId)
      .eq("tester_id", authed.testerId)
      .maybeSingle();
    if (!pt) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    if (pt.status !== "in_progress") {
      return NextResponse.json({ error: "Mission non en cours" }, { status: 409 });
    }

    const { data: project } = await admin
      .from("projects")
      .select("end_date, status")
      .eq("id", projectId)
      .single();
    // Fenetre de grace 24h post-cloture pour ne pas perdre l'upload d'un testeur en cours.
    if (
      !projectAllowsTesterWorkWithGrace(
        project?.status as string,
        (project?.end_date as string | null) ?? null
      )
    ) {
      return NextResponse.json(
        { error: "Le projet n'accepte plus de modifications (delai depasse au-dela de la grace 24h)" },
        { status: 403 }
      );
    }

    const { data: question } = await admin
      .from("project_questions")
      .select("id")
      .eq("id", questionId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!question) {
      return NextResponse.json({ error: "Question invalide" }, { status: 400 });
    }

    const arrayBuf = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    const detectedMime = detectImageMime(bytes);
    if (!detectedMime) {
      return NextResponse.json(
        { error: "Format invalide. Autorisés : JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    // G7 : pre-check tolerant des plafonds (UX rapide), MAIS la verite vient
    // de la RPC atomique ci-dessous qui re-controle sous verrou DB.
    const { data: answers } = await admin
      .from("project_tester_answers")
      .select("question_id, image_urls")
      .eq("project_id", projectId)
      .eq("tester_id", authed.testerId);

    const totalImages = (answers || []).reduce(
      (acc, a) => acc + ((a.image_urls as string[] | null)?.length ?? 0),
      0
    );
    if (totalImages >= MAX_IMAGES_PER_MISSION) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES_PER_MISSION} images par mission atteint` },
        { status: 400 }
      );
    }

    const currentAnswer = (answers || []).find((a) => a.question_id === questionId);
    const currentCount = (currentAnswer?.image_urls as string[] | null)?.length ?? 0;
    if (currentCount >= MAX_IMAGES_PER_QUESTION) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES_PER_QUESTION} images par question atteint` },
        { status: 400 }
      );
    }

    await ensureBucket(admin);

    const ext = extensionForMime(detectedMime);
    const uuid = crypto.randomUUID();
    const path = `${projectId}/${authed.testerId}/${questionId}/${uuid}.${ext}`;

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: detectedMime,
        upsert: false,
      });

    if (upErr) {
      console.error("[images/upload] storage err:", upErr);
      return NextResponse.json({ error: "Erreur upload" }, { status: 500 });
    }

    // G7 : ajout atomique du path dans image_urls via RPC (verrou ligne + check
    // plafond a l'interieur de la transaction). Evite le lost-update si deux
    // uploads concurrents lisent la meme liste avant ecriture.
    const { error: rpcErr } = await admin.rpc("append_image_to_answer", {
      p_project_id: projectId,
      p_tester_id: authed.testerId,
      p_question_id: questionId,
      p_path: path,
      p_max_per_question: MAX_IMAGES_PER_QUESTION,
      p_max_per_mission: MAX_IMAGES_PER_MISSION,
    });

    if (rpcErr) {
      // Detection des erreurs metier (plafond depasse cote DB sous verrou).
      if (rpcErr.message?.includes("images_per_question_limit_exceeded")) {
        await admin.storage.from(BUCKET).remove([path]).catch(() => {});
        return NextResponse.json(
          { error: `Maximum ${MAX_IMAGES_PER_QUESTION} images par question atteint` },
          { status: 400 }
        );
      }
      if (rpcErr.message?.includes("images_per_mission_limit_exceeded")) {
        await admin.storage.from(BUCKET).remove([path]).catch(() => {});
        return NextResponse.json(
          { error: `Maximum ${MAX_IMAGES_PER_MISSION} images par mission atteint` },
          { status: 400 }
        );
      }

      // Fallback non-atomique si la migration 020 n'est pas encore deployee.
      // On utilise les donnees relues plus haut (`answers`) ; ce chemin reste
      // race-prone mais maintient la compat tant que la RPC n'est pas en prod.
      console.warn("[images/upload] append_image_to_answer RPC indispo, fallback:", rpcErr.message);
      if (currentAnswer) {
        const newPaths = [...(currentAnswer.image_urls as string[]), path];
        const { error: updErr } = await admin
          .from("project_tester_answers")
          .update({ image_urls: newPaths })
          .eq("project_id", projectId)
          .eq("tester_id", authed.testerId)
          .eq("question_id", questionId);
        if (updErr) {
          await admin.storage.from(BUCKET).remove([path]).catch(() => {});
          return NextResponse.json({ error: "Erreur enregistrement" }, { status: 500 });
        }
      } else {
        const { error: insErr } = await admin.from("project_tester_answers").insert({
          project_id: projectId,
          tester_id: authed.testerId,
          question_id: questionId,
          answer_text: "",
          image_urls: [path],
        });
        if (insErr) {
          await admin.storage.from(BUCKET).remove([path]).catch(() => {});
          return NextResponse.json({ error: "Erreur enregistrement" }, { status: 500 });
        }
      }
    }

    // Signed URL pour affichage immediat
    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);

    return NextResponse.json({
      success: true,
      path,
      signed_url: signed?.signedUrl,
    });
  } catch (err) {
    console.error("[images/upload] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * DELETE multipart/json :
 *   - question_id : string
 *   - path : string (path du fichier storage)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await getAuthedTester();
    if (!authed) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

    const { id: projectId } = await params;
    const body = await request.json();
    const questionId = body?.question_id as string;
    const path = body?.path as string;

    if (!questionId || !path) {
      return NextResponse.json({ error: "question_id et path requis" }, { status: 400 });
    }

    // Verifier que le path correspond bien a ce projet/tester/question
    if (!path.startsWith(`${projectId}/${authed.testerId}/${questionId}/`)) {
      return NextResponse.json({ error: "Chemin invalide" }, { status: 403 });
    }

    const { data: pt } = await admin
      .from("project_testers")
      .select("id, status")
      .eq("project_id", projectId)
      .eq("tester_id", authed.testerId)
      .maybeSingle();
    if (!pt || pt.status !== "in_progress") {
      return NextResponse.json({ error: "Mission non modifiable" }, { status: 409 });
    }

    // G7 : suppression atomique via RPC (array_remove sous verrou ligne).
    // Le storage.remove est best-effort : meme s'il echoue, on a deja retire
    // le path de la liste de la reponse.
    const { error: rpcErr } = await admin.rpc("remove_image_from_answer", {
      p_project_id: projectId,
      p_tester_id: authed.testerId,
      p_question_id: questionId,
      p_path: path,
    });

    if (rpcErr) {
      if (rpcErr.message?.includes("answer_not_found")) {
        return NextResponse.json({ error: "Reponse introuvable" }, { status: 404 });
      }

      // Fallback non-atomique si la migration 020 n'est pas encore deployee.
      console.warn("[images/delete] remove_image_from_answer RPC indispo, fallback:", rpcErr.message);
      const { data: answer } = await admin
        .from("project_tester_answers")
        .select("id, image_urls")
        .eq("project_id", projectId)
        .eq("tester_id", authed.testerId)
        .eq("question_id", questionId)
        .maybeSingle();

      if (!answer) return NextResponse.json({ error: "Reponse introuvable" }, { status: 404 });

      const newPaths = (answer.image_urls as string[]).filter((p) => p !== path);
      await admin
        .from("project_tester_answers")
        .update({ image_urls: newPaths })
        .eq("id", answer.id);
    }

    await admin.storage.from(BUCKET).remove([path]).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[images/delete] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
