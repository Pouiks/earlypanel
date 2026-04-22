/**
 * Validation des images cote serveur par magic number.
 * Ne se fie pas au MIME envoye par le client.
 */

export type AllowedImageMime = "image/jpeg" | "image/png" | "image/webp";

export const ALLOWED_MIME_TYPES: AllowedImageMime[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGES_PER_QUESTION = 3;
export const MAX_IMAGES_PER_MISSION = 15;

/**
 * Detecte le type MIME reel d'un buffer a partir de ses magic numbers.
 * Retourne null si le type n'est pas reconnu/autorise.
 */
export function detectImageMime(buffer: Uint8Array): AllowedImageMime | null {
  if (buffer.length < 12) return null;

  // JPEG : FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP : "RIFF" ... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export function extensionForMime(mime: AllowedImageMime): string {
  switch (mime) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
  }
}

// Rate limit en memoire (reinitialise au redemarrage du serveur).
// Pour production scale, utiliser Redis ou un KV store persistant.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 min
const RATE_LIMIT_MAX = 30;

export function checkRateLimit(key: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0 };
  }
  entry.count++;
  return { ok: true, remaining: RATE_LIMIT_MAX - entry.count };
}
