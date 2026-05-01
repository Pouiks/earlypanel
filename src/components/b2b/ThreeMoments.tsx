/**
 * Section "3 moments metier" : structure la page B2B autour du cycle de
 * vie produit du visiteur (avant code / avant lancement / une fois en
 * prod). Complementaire de UseCaseGrid juste apres, qui liste les formats
 * techniques (Figma, URL recette, mobile, etc.) supportes.
 *
 * Objectif copywriting : que le PM/Head of Product se reconnaisse dans
 * un moment precis, pas dans une grille technique abstraite.
 */

const MOMENTS = [
  {
    eyebrow: "Validation early-stage",
    title: "Vous avez une idée. Pas encore une ligne de code.",
    body: "Vous avez investi du temps en design, vous avez une maquette Figma ou un prototype cliquable, et la question vous brûle : est-ce qu'on construit le bon produit, ou est-ce qu'on s'apprête à payer 6 mois de dev pour rien ?",
    actions: [
      "On teste votre maquette avec 5 à 10 profils représentatifs de votre cible.",
      "Vous voyez où les gens bloquent, ce qu'ils ne comprennent pas, ce qu'ils attendent à la place.",
      "Vous identifiez les frictions structurelles avant qu'elles ne deviennent des bugs en prod.",
    ],
    when: "Idéalement entre la fin du design et le début du développement. Plus tôt vous testez, moins ça coûte cher de corriger.",
  },
  {
    eyebrow: "Validation pré-lancement",
    title: "Le produit est prêt. Mais est-ce que les clients vont comprendre ?",
    body: "Vous êtes à quelques semaines du go-live. Le code marche, l'équipe est confiante en interne, mais personne d'extérieur n'a encore mis les mains dedans. C'est le moment de vérifier que vos utilisateurs vivent le produit comme vous l'imaginez, pas comme vous le craignez.",
    actions: [
      "On envoie 10 à 20 testeurs sur votre URL de staging avec un parcours précis à effectuer.",
      "On documente les points de friction qu'aucun de vos collègues n'a vus, parce qu'ils connaissent le produit par cœur.",
      "Vous arbitrez avant le lancement : quels bugs UX bloquent un go-live, lesquels peuvent attendre la v1.1.",
    ],
    when: "Entre la pre-prod stabilisée et le J-7 du lancement. Si vous nous appelez la veille, on vous dira d'attendre la version suivante.",
  },
  {
    eyebrow: "Optimisation post-lancement",
    title: "Le produit est live. Le funnel ne convertit pas comme prévu.",
    body: "Vous avez lancé. Les analytics vous disent où les utilisateurs partent, mais pas pourquoi. Vos hypothèses internes tournent en rond. C'est le moment de demander directement aux utilisateurs ce qu'ils ont vécu, et d'arrêter de spéculer en réunion.",
    actions: [
      "On cible la zone précise du parcours qui pose problème (checkout, onboarding, dashboard, fonctionnalité X).",
      "On recrute des profils qui ressemblent vraiment à votre base utilisateur, pas des testeurs grand public.",
      "On vous remet les verbatims annotés et la priorisation des frictions à corriger pour débloquer la conversion.",
    ],
    when: "Quand vos métriques disent « il y a un problème » sans que votre équipe sache lequel. Quand la roadmap se construit sur des hypothèses non vérifiées.",
  },
];

export default function ThreeMoments() {
  return (
    <section className="moments">
      <div className="moments-inner">
        <div className="sec-eye">À quel moment nous appeler</div>
        <h2 className="sec-title">Trois situations où nos clients nous contactent.</h2>
        <p className="sec-sub">
          Ce ne sont pas des phases que vous traversez forcément toutes. Identifiez celle où vous êtes aujourd&apos;hui, c&apos;est à ce moment-là qu&apos;un test apporte le plus de valeur.
        </p>

        <div className="moments-grid">
          {MOMENTS.map((m, i) => (
            <article className="moment-card" key={m.eyebrow}>
              <div className="moment-num">{String(i + 1).padStart(2, "0")}</div>
              <div className="moment-eye">{m.eyebrow}</div>
              <h3 className="moment-title">{m.title}</h3>
              <p className="moment-body">{m.body}</p>
              <ul className="moment-actions">
                {m.actions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <div className="moment-when">
                <strong>Quand nous appeler.</strong> {m.when}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
