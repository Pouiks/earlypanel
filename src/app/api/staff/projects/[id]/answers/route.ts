import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeDefaultRewardCents, type TierRewardsMap } from "@/lib/reward-calculator";
import { checkOrigin, forbiddenOriginResponse } from "@/lib/csrf";
import { logStaffAction } from "@/lib/audit";

const BUCKET = "mission-images";

/**
 * GET : recupere les soumissions (testeurs completed) avec reponses et signed URLs.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  const { id: projectId } = await params;

  const { data: pts } = await admin
    .from("project_testers")
    .select("id, tester_id, status, started_at, submitted_at, staff_rating, staff_note, tester:testers(id, first_name, last_name, email, quality_score, tier)")
    .eq("project_id", projectId)
    .in("status", ["in_progress", "completed"])
    .order("submitted_at", { ascending: false });

  if (!pts) return NextResponse.json({ submissions: [] });

  const { data: questions } = await admin
    .from("project_questions")
    .select("id, position, question_text")
    .eq("project_id", projectId)
    .order("position");

  const submissions = await Promise.all(
    pts.map(async (pt) => {
      const { data: rawAnswers } = await admin
        .from("project_tester_answers")
        .select("question_id, answer_text, image_urls, updated_at")
        .eq("project_id", projectId)
        .eq("tester_id", pt.tester_id);

      const answers = await Promise.all(
        (rawAnswers || []).map(async (a) => {
          const paths = (a.image_urls as string[]) || [];
          const signed = await Promise.all(
            paths.map(async (p) => {
              const { data } = await admin.storage
                .from(BUCKET)
                .createSignedUrl(p, 60 * 60);
              return { path: p, signed_url: data?.signedUrl ?? null };
            })
          );
          return { ...a, images: signed };
        })
      );

      return { ...pt, answers };
    })
  );

  return NextResponse.json({
    questions: questions ?? [],
    submissions,
  });
}

/**
 * PATCH : note le travail d'un testeur.
 * Body : { project_tester_id: string, rating: 1..5, note?: string, sloppy?: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkOrigin(request)) return forbiddenOriginResponse();

  const staff = await getStaffMember();
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Config serveur" }, { status: 500 });

  const { id: projectId } = await params;
  const body = await request.json();
  const ptId = body?.project_tester_id as string;
  const rating = Number(body?.rating);
  const note = typeof body?.note === "string" ? body.note : null;
  const sloppy = body?.sloppy === true;

  // G10 : valider le rating de maniere stricte (entier 1..5, rejette NaN,
  // decimales et valeurs hors plage).
  if (!ptId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "project_tester_id et rating (entier 1-5) requis" },
      { status: 400 }
    );
  }

  // G10 : borner staff_note pour eviter les payloads enormes.
  if (note !== null && note.length > 4000) {
    return NextResponse.json(
      { error: "Note trop longue (max 4000 caracteres)" },
      { status: 400 }
    );
  }

  const { data: pt } = await admin
    .from("project_testers")
    .select("id, tester_id, project_id, status, staff_rating")
    .eq("id", ptId)
    .maybeSingle();

  if (!pt || pt.project_id !== projectId) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (pt.status !== "completed") {
    return NextResponse.json({ error: "Seules les missions soumises peuvent être notées" }, { status: 409 });
  }

  // G6 : claim atomique du "premier rating". On tente d'ecrire la note avec
  // le filtre `staff_rating IS NULL` ; si 0 ligne est modifiee, c'est qu'un
  // autre appel concurrent a deja note. Cela empeche la double application
  // du delta de score / increment missions_completed.
  const { data: claimedRows, error: claimErr } = await admin
    .from("project_testers")
    .update({ staff_rating: rating, staff_note: note })
    .eq("id", ptId)
    .eq("status", "completed")
    .is("staff_rating", null)
    .select("id");

  if (claimErr) {
    console.error("[answers/PATCH] claim error:", claimErr.message);
    return NextResponse.json({ error: "Erreur lors de la notation" }, { status: 500 });
  }

  const isFirstRating = !!claimedRows && claimedRows.length === 1;

  if (!isFirstRating) {
    // Mise a jour ulterieure (correction d'une note existante) : on met juste
    // a jour rating/note sans relancer le scoring.
    const { error: updErr } = await admin
      .from("project_testers")
      .update({ staff_rating: rating, staff_note: note })
      .eq("id", ptId);
    if (updErr) {
      console.error("[answers/PATCH] update error:", updErr.message);
      return NextResponse.json({ error: "Erreur lors de la mise a jour" }, { status: 500 });
    }
  }

  // BUG #10 : on lit le tier AVANT toute modification de score, pour que la recompense
  // refletre le travail realise dans le tier d'origine et ne change pas si le delta
  // pousse le testeur dans un tier superieur.
  const { data: testerBeforeScoring } = await admin
    .from("testers")
    .select("tier")
    .eq("id", pt.tester_id)
    .maybeSingle();
  const rewardTier = testerBeforeScoring?.tier ?? "standard";

  // Appliquer delta seulement a la premiere notation (evite double compte)
  if (isFirstRating) {
    let delta = 0;
    let reason = "";
    if (sloppy) {
      delta = -20;
      reason = "Travail bacle (evaluation staff)";
    } else if (rating >= 4) {
      delta = 10;
      reason = "Mission de qualite (evaluation staff)";
    } else if (rating === 3) {
      delta = 2;
      reason = "Mission correcte (evaluation staff)";
    } else if (rating <= 2) {
      delta = -10;
      reason = "Mission insuffisante (evaluation staff)";
    }

    if (delta !== 0) {
      await admin.rpc("apply_score_change", {
        p_tester_id: pt.tester_id,
        p_delta: delta,
        p_reason: reason,
        p_project_id: projectId,
      });
    }

    // BUG #9 : increment atomique via RPC (evite la race condition read-then-write).
    if (!sloppy && rating >= 3) {
      const { error: incErr } = await admin.rpc("increment_missions_completed", {
        p_tester_id: pt.tester_id,
      });
      if (incErr) {
        // Fallback non atomique si la migration RPC n'est pas encore deployee.
        console.warn("[answers/PATCH] increment_missions_completed RPC indispo, fallback:", incErr.message);
        const { data: t } = await admin
          .from("testers")
          .select("missions_completed")
          .eq("id", pt.tester_id)
          .maybeSingle();
        const current = t?.missions_completed ?? 0;
        await admin
          .from("testers")
          .update({ missions_completed: current + 1 })
          .eq("id", pt.tester_id);
      }
    }
  }

  const { data: projectRow } = await admin
    .from("projects")
    .select("base_reward_cents, tier_rewards")
    .eq("id", projectId)
    .single();

  let calculated = computeDefaultRewardCents({
    baseRewardCents: projectRow?.base_reward_cents ?? null,
    tierRewards: (projectRow?.tier_rewards as TierRewardsMap) ?? null,
    tier: rewardTier,
    staffRating: rating,
  });
  if (sloppy) calculated = 0;

  const { data: existingPayout } = await admin
    .from("tester_payouts")
    .select("id, calculated_amount_cents, final_amount_cents, status")
    .eq("project_tester_id", ptId)
    .maybeSingle();

  let createdPayoutId: string | null = null;

  if (existingPayout?.status === "paid") {
    // Ne pas modifier un versement deja encaisse
  } else if (!existingPayout) {
    const { data: insertedPayout } = await admin
      .from("tester_payouts")
      .upsert(
        {
          project_id: projectId,
          tester_id: pt.tester_id,
          project_tester_id: ptId,
          calculated_amount_cents: calculated,
          final_amount_cents: calculated,
          status: "pending",
        },
        { onConflict: "project_tester_id" },
      )
      .select("id")
      .maybeSingle();
    createdPayoutId = insertedPayout?.id ?? null;
  } else {
    const staffOverrodeFinal =
      existingPayout.final_amount_cents !== existingPayout.calculated_amount_cents;
    const nextFinal = staffOverrodeFinal ? existingPayout.final_amount_cents : calculated;
    await admin
      .from("tester_payouts")
      .update({
        calculated_amount_cents: calculated,
        final_amount_cents: nextFinal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPayout.id);
  }

  await logStaffAction(
    {
      staff_id: staff.id,
      staff_email: staff.email,
      action: "project_tester.rated",
      entity_type: "project_tester",
      entity_id: ptId,
      metadata: {
        project_id: projectId,
        tester_id: pt.tester_id,
        rating,
        sloppy,
        has_note: !!note,
        is_first_rating: isFirstRating,
        reward_tier: rewardTier,
      },
    },
    request,
  );

  if (createdPayoutId) {
    await logStaffAction(
      {
        staff_id: staff.id,
        staff_email: staff.email,
        action: "payout.created",
        entity_type: "tester_payout",
        entity_id: createdPayoutId,
        metadata: {
          project_id: projectId,
          tester_id: pt.tester_id,
          project_tester_id: ptId,
          calculated_amount_cents: calculated,
          final_amount_cents: calculated,
          status: "pending",
          source: "rating",
        },
      },
      request,
    );
  }

  return NextResponse.json({ success: true });
}
