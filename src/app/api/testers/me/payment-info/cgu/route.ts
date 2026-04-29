import { NextResponse } from "next/server";
import { CGU_VERSION, CGU_TEXT, getCguHash } from "@/lib/tester-cgu";

/**
 * GET /api/testers/me/payment-info/cgu
 * Retourne le texte des CGU testeur a afficher avant signature.
 * Le client recoit aussi le hash : il doit le renvoyer en POST pour qu'on
 * verifie qu'il signe bien la version qu'il a vue (defense en profondeur,
 * meme si on hashera cote serveur de toutes facons).
 */
export async function GET() {
  return NextResponse.json({
    version: CGU_VERSION,
    text: CGU_TEXT,
    hash: getCguHash(),
  });
}
