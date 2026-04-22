import { NextRequest, NextResponse } from "next/server";
import { getStaffMember } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const staff = await getStaffMember();
  if (!staff) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  let query = admin
    .from("projects")
    .select("*, project_questions(id)")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const staff = await getStaffMember();
  if (!staff) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
  }

  const body = await request.json();
  const { questions, ...projectData } = body;

  const startRaw = projectData.start_date as string | undefined;
  const endRaw = projectData.end_date as string | undefined;
  if (!startRaw || !endRaw) {
    return NextResponse.json(
      { error: "start_date et end_date sont obligatoires" },
      { status: 400 }
    );
  }
  const startT = new Date(startRaw);
  const endT = new Date(endRaw);
  if (isNaN(startT.getTime()) || isNaN(endT.getTime())) {
    return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
  }
  if (endT <= startT) {
    return NextResponse.json(
      { error: "end_date doit être après start_date" },
      { status: 400 }
    );
  }

  const { data: project, error } = await admin
    .from("projects")
    .insert({ ...projectData, created_by: staff.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (questions && Array.isArray(questions) && questions.length > 0) {
    const questionRows = questions.map((q: { question_text: string }, i: number) => ({
      project_id: project.id,
      position: i,
      question_text: q.question_text,
    }));

    await admin.from("project_questions").insert(questionRows);
  }

  return NextResponse.json(project, { status: 201 });
}
