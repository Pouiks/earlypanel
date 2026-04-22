/**
 * CTA centralises pour la landing B2B/B2C.
 * Surcharger via NEXT_PUBLIC_BOOKING_URL et NEXT_PUBLIC_CONTACT_EMAIL dans .env.local.
 */
export const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL?.trim() || "https://calendly.com/testpanel/demo";

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "contact@testpanel.fr";

export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Contact testpanel"
)}`;
