/**
 * Bandeau "Phase de pré-lancement" pour la page /testeurs.
 *
 * But : transparence claire sur le fait qu'earlypanel ouvre son panel
 * mais que les missions reelles n'ont pas encore commence. Evite toute
 * accusation de pratique commerciale trompeuse (art. L121-1 du Code de
 * la consommation) en informant explicitement le visiteur que :
 *   1) Les missions demarrent dans les prochaines semaines
 *   2) L'inscription est gratuite et sans obligation
 *   3) Tous les inscrits ne seront pas forcement contactes (pertinence
 *      profil x demande client)
 */
export default function PreLaunchBanner() {
  return (
    <div
      role="status"
      aria-label="Information de pré-lancement"
      style={{
        background: "#fef3c7",
        borderBottom: "1px solid #fde68a",
        padding: "10px 16px",
        textAlign: "center",
        fontSize: 13,
        color: "#78350f",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
        lineHeight: 1.5,
      }}
    >
      <strong>Phase de pré-lancement.</strong>{" "}
      earlypanel ouvre son panel — les premières missions démarrent dans les prochaines semaines. Inscrivez-vous dès maintenant pour être contacté(e) quand une mission correspond à votre profil.
    </div>
  );
}
