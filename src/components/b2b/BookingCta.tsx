"use client";
import Link from "next/link";
import { BOOKING_URL } from "@/lib/cta-links";
import { testerSpaceHref, useTesterSession } from "@/components/layout/useTesterSession";

/**
 * Bouton « Réserver un appel » (Calendly), reserve aux entreprises.
 *
 * Calendly ne doit jamais apparaitre dans le parcours d'un testeur. Un
 * testeur connecte qui revient sur une page marketing (home, /entreprises,
 * blog) voit a la place un acces a son espace. Le HTML serveur contient le
 * lien Calendly (prospects, SEO) ; le remplacement se fait des que la
 * session est connue.
 */
export default function BookingCta({
  className,
  children = "Réserver un appel gratuit →",
}: {
  className: string;
  children?: React.ReactNode;
}) {
  const session = useTesterSession();

  if (session?.authenticated) {
    return (
      <Link href={testerSpaceHref(session)} className={className}>
        Accéder à mon espace →
      </Link>
    );
  }

  return (
    <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
