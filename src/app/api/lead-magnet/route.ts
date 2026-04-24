import { NextResponse, type NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { sendEmail, buildLeadMagnetEmail } from "@/lib/email";

const PDF_PATH = join(process.cwd(), "public", "earlypanel-rapport-exemple.pdf");

let pdfBuffer: Buffer | null = null;
function getPdf(): Buffer {
  if (!pdfBuffer) pdfBuffer = readFileSync(PDF_PATH);
  return pdfBuffer;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const pdf = getPdf();

    await sendEmail({
      to: email,
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
