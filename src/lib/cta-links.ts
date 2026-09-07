/**
 * CTA centralises pour la landing B2B/B2C.
 * Surcharger via NEXT_PUBLIC_BOOKING_URL, NEXT_PUBLIC_BOOKING_DURATION_MIN et
 * NEXT_PUBLIC_CONTACT_EMAIL dans .env.local.
 *
 * BOOKING_DURATION_MIN : duree affichee dans les textes ("un appel de X min").
 * Doit correspondre a l'event Calendly reellement pointe par BOOKING_URL,
 * sinon le site promet 15 min et le visiteur tombe sur un creneau de 30.
 */
export const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL?.trim() || "https://calendly.com/virgilejoinville/30min";

const parsedDuration = Number.parseInt(process.env.NEXT_PUBLIC_BOOKING_DURATION_MIN ?? "", 10);
export const BOOKING_DURATION_MIN =
  Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 30;

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "contact@earlypanel.fr";

export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Contact earlypanel"
)}`;

/** Fourchette de prix publique, unique source de verite pour tout le site. */
export const PRICE_RANGE_LABEL = "1 500 à 6 000 € HT";
