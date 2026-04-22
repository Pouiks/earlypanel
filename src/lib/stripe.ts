import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

let stripe: Stripe | null = null;

if (secretKey) {
  stripe = new Stripe(secretKey);
} else {
  console.warn("[Stripe] STRIPE_SECRET_KEY missing — Stripe features disabled");
}

export { stripe };
