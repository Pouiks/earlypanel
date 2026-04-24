import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config manquante" }, { status: 500 });
  }

  const now = new Date().toISOString();

  const { data: expired, error } = await admin
    .from("projects")
    .select("id, title, end_date")
    .eq("status", "active")
    .lt("end_date", now);

  if (error) {
    console.error("[cron/close-expired]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expired?.length) {
    return NextResponse.json({ closed: 0, projects: [] });
  }

  const ids = expired.map((p) => p.id);

  const { error: updateError } = await admin
    .from("projects")
    .update({ status: "closed" })
    .in("id", ids);

  if (updateError) {
    console.error("[cron/close-expired] update failed", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  console.log(`[cron/close-expired] Closed ${ids.length} project(s):`, expired.map((p) => p.title));

  return NextResponse.json({
    closed: ids.length,
    projects: expired.map((p) => ({ id: p.id, title: p.title, end_date: p.end_date })),
  });
}
