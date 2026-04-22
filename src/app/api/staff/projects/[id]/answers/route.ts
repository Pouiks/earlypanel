import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeDefaultRewardCents, type TierRewardsMap } from "@/lib/reward-calculator";

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

  if (!ptId || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "project_tester_id et rating 1-5 requis" }, { status: 400 });
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

  const alreadyRated = pt.staff_rating != null;

  await admin
    .from("project_testers")
    .update({ staff_rating: rating, staff_note: note })
    .eq("id", ptId);

  // Appliquer delta seulement a la premiere notation (evite double compte)
  if (!alreadyRated) {
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

    // Incrementer compteur missions si bon travail
    if (!sloppy && rating >= 3) {
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

  const { data: projectRow } = await admin
    .from("projects")
    .select("base_reward_cents, tier_rewards")
    .eq("id", projectId)
    .single();

  const { data: testerRow } = await admin
    .from("testers")
    .select("tier")
    .eq("id", pt.tester_id)
    .maybeSingle();

  let calculated = computeDefaultRewardCents({
    baseRewardCents: projectRow?.base_reward_cents ?? null,
    tierRewards: (projectRow?.tier_rewards as TierRewardsMap) ?? null,
    tier: testerRow?.tier ?? "standard",
    staffRating: rating,
  });
  if (sloppy) calculated = 0;

  const { data: existingPayout } = await admin
    .from("tester_payouts")
    .select("id, calculated_amount_cents, final_amount_cents, status")
    .eq("project_tester_id", ptId)
    .maybeSingle();

  if (existingPayout?.status === "paid") {
    // Ne pas modifier un versement deja encaisse
  } else if (!existingPayout) {
    await admin.from("tester_payouts").upsert(
      {
        project_id: projectId,
        tester_id: pt.tester_id,
        project_tester_id: ptId,
        calculated_amount_cents: calculated,
        final_amount_cents: calculated,
        status: "pending",
      },
      { onConflict: "project_tester_id" }
    );
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

  return NextResponse.json({ success: true });
}
