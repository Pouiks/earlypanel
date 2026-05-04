import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/internal/ping-indexnow
 *
 * Notifie Bing/Yandex via le protocole IndexNow qu'une ou plusieurs URLs
 * du site doivent etre re-crawlees rapidement (au lieu d'attendre le
 * crawl naturel qui peut prendre 1-4 semaines).
 *
 * Doc : https://www.indexnow.org/documentation
 *
 * AVANTAGE : indexation Bing/Yandex/DuckDuckGo en quelques minutes a
 * quelques heures au lieu de 1-4 semaines. Google n'utilise pas IndexNow,
 * mais Search Console permet la meme chose via "Inspecter une URL".
 *
 * USAGE :
 *
 *   POST /api/internal/ping-indexnow
 *   Headers: Authorization: Bearer ${INDEXNOW_TRIGGER_SECRET}
 *   Body:    { "urls": ["https://earlypanel.fr/blog/tests-utilisateurs-prix"] }
 *
 *   Reponse: { ok: true, submitted: 1, status: 200 }
 *
 * QUAND DECLENCHER :
 *   - Au deploiement d'un nouvel article de blog/guide
 *   - A la mise a jour majeure d'une page (FAQ enrichie, refonte)
 *   - A la creation d'une page produit/service
 *   - PAS pour les mises a jour mineures (typo, style)
 *
 * Pre-requis (a faire une fois) :
 *   1. Generer une cle aleatoire 32+ caracteres alphanumeric
 *   2. La poser comme env var INDEXNOW_KEY (cote serveur)
 *   3. Servir cette cle a https://earlypanel.fr/{KEY}.txt (contenu = la cle)
 *      → fichier statique dans public/{KEY}.txt
 *   4. Generer un secret distinct pour proteger la route : INDEXNOW_TRIGGER_SECRET
 */

const HOST = "earlypanel.fr";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";

interface PingBody {
  urls: string[];
}

export async function POST(request: NextRequest) {
  // 1. Auth simple via Bearer token (route appelee depuis Vercel deploy hook,
  //    GitHub Actions, ou manuellement par le staff).
  const triggerSecret = process.env.INDEXNOW_TRIGGER_SECRET;
  if (!triggerSecret) {
    console.error("[indexnow] INDEXNOW_TRIGGER_SECRET non configure");
    return NextResponse.json({ error: "Service indisponible" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${triggerSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // 2. Cle IndexNow (a generer une fois, a stocker dans .env + dans public/{KEY}.txt)
  const key = process.env.INDEXNOW_KEY;
  if (!key || key.length < 8) {
    console.error("[indexnow] INDEXNOW_KEY non configure ou trop court");
    return NextResponse.json({ error: "Cle IndexNow non configuree" }, { status: 503 });
  }

  // 3. Parse body
  let body: Partial<PingBody>;
  try {
    body = (await request.json()) as Partial<PingBody>;
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const urls = Array.isArray(body.urls) ? body.urls.filter((u): u is string => typeof u === "string" && u.startsWith("https://" + HOST)) : [];
  if (urls.length === 0) {
    return NextResponse.json(
      { error: `Aucune URL valide. Toutes les URLs doivent commencer par https://${HOST}` },
      { status: 400 },
    );
  }
  if (urls.length > 10000) {
    return NextResponse.json({ error: "Maximum 10000 URLs par appel" }, { status: 400 });
  }

  // 4. Submit IndexNow. Le payload gere indifferemment 1 URL ou plusieurs ;
  //    on utilise toujours le format "urlList" pour simplifier.
  const payload = {
    host: HOST,
    key,
    keyLocation: `https://${HOST}/${key}.txt`,
    urlList: urls,
  };

  let upstreamStatus: number;
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });
    upstreamStatus = res.status;

    // IndexNow renvoie :
    //  200 = success
    //  202 = accepted (cle en validation, premiere fois)
    //  400 = bad request
    //  403 = key invalid (le fichier .txt n'est pas accessible)
    //  422 = URLs n'appartiennent pas a l'host declare
    //  429 = rate limited
    //  500+ = upstream error
    if (res.status >= 400) {
      const text = await res.text().catch(() => "");
      console.warn(`[indexnow] upstream ${res.status}:`, text.slice(0, 300));
    }
  } catch (e) {
    console.error("[indexnow] fetch failed:", e);
    return NextResponse.json({ error: "IndexNow API injoignable" }, { status: 502 });
  }

  return NextResponse.json({
    ok: upstreamStatus < 400,
    submitted: urls.length,
    status: upstreamStatus,
  });
}
