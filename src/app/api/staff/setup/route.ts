import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { email, password, first_name, last_name, setup_key } = await request.json();

  const expectedKey = process.env.STAFF_SETUP_KEY;
  if (!expectedKey || setup_key !== expectedKey) {
    return NextResponse.json({ error: "Clé de setup invalide" }, { status: 403 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit faire au moins 8 caractères" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "staff" },
  });

  if (authError) {
    if (authError.message?.includes("already been registered")) {
      const { data: { users } } = await admin.auth.admin.listUsers();
      const existingUser = users?.find((u) => u.email === email);

      if (existingUser) {
        await admin.auth.admin.updateUserById(existingUser.id, {
          app_metadata: { role: "staff" },
        });

        const { error: insertError } = await admin
          .from("staff_members")
          .upsert({
            auth_user_id: existingUser.id,
            email,
            first_name: first_name || null,
            last_name: last_name || null,
            role: "admin",
          }, { onConflict: "email" });

        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: "Utilisateur existant mis à jour avec le rôle staff",
          user_id: existingUser.id,
        });
      }
    }
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const { error: insertError } = await admin
    .from("staff_members")
    .insert({
      auth_user_id: authData.user.id,
      email,
      first_name: first_name || null,
      last_name: last_name || null,
      role: "admin",
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Compte staff créé avec succès",
    user_id: authData.user.id,
  }, { status: 201 });
}
