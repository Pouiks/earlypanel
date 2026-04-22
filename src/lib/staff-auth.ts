import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getStaffUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const role = user.app_metadata?.role;
  if (role !== "staff" && role !== "admin") return null;

  return user;
}

export async function getStaffMember() {
  const user = await getStaffUser();
  if (!user) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("staff_members")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return data;
}
