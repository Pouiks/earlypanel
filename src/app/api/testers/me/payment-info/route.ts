import { NextResponse, type NextRequest } from "next/server";
import { getAuthedTester } from "@/lib/tester-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkOrigin, forbiddenOriginResponse } from "@/lib/csrf";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  validateIban,
  getIbanLast4,
  validateBic,
  isValidFiscalCountry,
  normalizeIban,
} from "@/lib/iban";
import { CGU_VERSION, getCguHash } from "@/lib/tester-cgu";

/**
 * GET /api/testers/me/payment-info
 * Retourne les infos non sensibles : last4, country, holder, signature CGU.
 * L'IBAN clair n'est JAMAIS retourne par cette route.
 */
export async function GET() {
  const tester = await getAuthedTester();
  if (!tester) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service indisponible" }, { status: 500 });

  const { data, error } = await admin
    .from("tester_payment_info")
    .select("iban_last4, iban_country, bic, account_holder_name, fiscal_residence_country, cgu_signed_at, cgu_version, updated_at")
    .eq("tester_id", tester.testerId)
    .maybeSingle();

  if (error) {
    console.error("[payment-info GET]", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({
    configured: true,
    iban_last4: data.iban_last4,
    iban_country: data.iban_country,
    bic: data.bic,
    account_holder_name: data.account_holder_name,
    fiscal_residence_country: data.fiscal_residence_country,
    cgu_signed_at: data.cgu_signed_at,
    cgu_version: data.cgu_version,
    cgu_current_version: CGU_VERSION,
    updated_at: data.updated_at,
  });
}

/**
 * POST /api/testers/me/payment-info
 * Cree ou met a jour l'IBAN + signe la version courante des CGU.
 * Body : { iban, bic?, account_holder_name, fiscal_residence_country, accept_cgu: true }
 */
export async function POST(request: NextRequest) {
  if (!checkOrigin(request)) return forbiddenOriginResponse();

  const tester = await getAuthedTester();
  if (!tester) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const ip = getClientIp(request);
  const ipLimit = rateLimit(`payment-info:ip:${ip}`, { windowMs: 60_000, max: 5 });
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives. Reessayez dans une minute." },
      { status: 429 }
    );
  }
  const userLimit = rateLimit(`payment-info:tester:${tester.testerId}`, {
    windowMs: 60 * 60_000,
    max: 3,
  });
  if (!userLimit.ok) {
    return NextResponse.json(
      { error: "Limite horaire atteinte. Reessayez plus tard." },
      { status: 429 }
    );
  }

  const encryptionKey = process.env.IBAN_ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length < 32) {
    console.error("[payment-info POST] IBAN_ENCRYPTION_KEY missing or too short");
    return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const ibanRaw = typeof body.iban === "string" ? body.iban : "";
  const bicRaw = typeof body.bic === "string" ? body.bic.trim() : "";
  const holder = typeof body.account_holder_name === "string" ? body.account_holder_name.trim() : "";
  const fiscalCountry = typeof body.fiscal_residence_country === "string" ? body.fiscal_residence_country : "";
  const acceptCgu = body.accept_cgu === true;

  if (!acceptCgu) {
    return NextResponse.json(
      { error: "Vous devez accepter les CGU testeur pour enregistrer votre IBAN." },
      { status: 400 }
    );
  }
  if (!holder || holder.length < 2 || holder.length > 100) {
    return NextResponse.json(
      { error: "Le nom du titulaire est requis (2 a 100 caracteres)." },
      { status: 400 }
    );
  }
  if (!isValidFiscalCountry(fiscalCountry)) {
    return NextResponse.json(
      { error: "Pays de residence fiscale invalide." },
      { status: 400 }
    );
  }

  const ibanCheck = validateIban(ibanRaw);
  if (!ibanCheck.valid) {
    return NextResponse.json({ error: ibanCheck.reason }, { status: 400 });
  }
  if (bicRaw && !validateBic(bicRaw)) {
    return NextResponse.json({ error: "BIC invalide." }, { status: 400 });
  }

  const cleanIban = ibanCheck.clean;
  const last4 = getIbanLast4(cleanIban);
  const country = ibanCheck.country;
  const userAgent = request.headers.get("user-agent") || "unknown";
  const cguHash = getCguHash();

  // Pour le DAS-2 : si le pays fiscal est "OTHER", on stocke "ZZ" (placeholder
  // valide CHAR(2) majuscules). Sinon le code pays.
  const fiscalCountryStored = fiscalCountry === "OTHER" ? "ZZ" : fiscalCountry;

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service indisponible" }, { status: 500 });

  const { error: rpcError } = await admin.rpc("upsert_tester_payment_info", {
    p_tester_id: tester.testerId,
    p_iban_clear: cleanIban,
    p_iban_last4: last4,
    p_iban_country: country,
    p_bic: bicRaw || null,
    p_account_holder_name: holder,
    p_fiscal_residence_country: fiscalCountryStored,
    p_cgu_version: CGU_VERSION,
    p_cgu_signature_ip: ip === "unknown" ? "0.0.0.0" : ip,
    p_cgu_signature_user_agent: userAgent,
    p_cgu_signature_hash: cguHash,
    p_encryption_key: encryptionKey,
  });

  if (rpcError) {
    console.error("[payment-info POST] RPC error:", rpcError.message);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    iban_last4: last4,
    iban_country: country,
    cgu_version: CGU_VERSION,
    cgu_signed_at: new Date().toISOString(),
  });
}

/**
 * DELETE /api/testers/me/payment-info
 * Supprime l'IBAN et la signature CGU. Le testeur ne pourra plus etre paye
 * tant qu'il n'aura pas re-renseigne un IBAN. Les missions deja validees
 * restent dues : elles seront payees quand un nouvel IBAN sera fourni.
 */
export async function DELETE(request: NextRequest) {
  if (!checkOrigin(request)) return forbiddenOriginResponse();

  const tester = await getAuthedTester();
  if (!tester) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const ip = getClientIp(request);
  const ipLimit = rateLimit(`payment-info-del:ip:${ip}`, { windowMs: 60_000, max: 5 });
  if (!ipLimit.ok) {
    return NextResponse.json({ error: "Trop de tentatives." }, { status: 429 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service indisponible" }, { status: 500 });

  // Recupere l'ancienne info pour audit avant suppression. On garde les
  // metadonnees (last4, version CGU) dans l'audit log : preuve qu'a la
  // demande du testeur, ses donnees ont ete supprimees a telle date.
  const { data: previous } = await admin
    .from("tester_payment_info")
    .select("iban_last4, cgu_version, cgu_signed_at")
    .eq("tester_id", tester.testerId)
    .maybeSingle();

  if (!previous) {
    return NextResponse.json({ success: true, alreadyEmpty: true });
  }

  const { error } = await admin
    .from("tester_payment_info")
    .delete()
    .eq("tester_id", tester.testerId);

  if (error) {
    console.error("[payment-info DELETE]", error.message);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    deleted_at: new Date().toISOString(),
    deleted_iban_last4: previous.iban_last4,
  });
}
