import { NextResponse } from "next/server";
import { getStaffUser } from "@/lib/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getStaffUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500 });
  }

  const { data, error } = await admin
    .from("staff_members")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Profil staff introuvable" }, { status: 404 });
  }

  return NextResponse.json(data);
}
