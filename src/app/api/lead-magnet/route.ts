import { NextResponse, type NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { sendEmail, buildLeadMagnetEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const PDF_PATH = join(process.cwd(), "public", "earlypanel-rapport-exemple.pdf");

let pdfBuffer: Buffer | null = null;
function getPdf(): Buffer {
  if (!pdfBuffer) pdfBuffer = readFileSync(PDF_PATH);
  return pdfBuffer;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`lead-magnet:${ip}`, { windowMs: 60_000, max: 3 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Trop de requetes, reessayez dans une minute" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const { email } = await request.json();

    // G10 : validation regex stricte au lieu d'un simple includes("@").
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const pdf = getPdf();

    await sendEmail({
      to: email.trim(),
      subject: "Votre exemple de rapport earlypanel",
      html: buildLeadMagnetEmail(),
      attachments: [
        {
          filename: "earlypanel-rapport-exemple.pdf",
          content: pdf,
        },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[lead-magnet]", err);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi" },
      { status: 500 }
    );
  }
}
