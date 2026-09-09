import { glossify } from "@/components/ui/glossify";
export default function StatementSection() {
  return (
    <section className="statement">
      <div className="statement-inner">
        <div className="statement-eye">Un service de tests utilisateurs, pas un outil</div>
        <p className="statement-lead">
          Avec <em>earlypanel</em>, vous n&apos;avez rien à configurer, rien à analyser, rien à rédiger.
        </p>
        <p className="statement-sub">{glossify("Vous nous expliquez ce que vous voulez valider, on s'occupe du reste\u00a0: recrutement des testeurs dans un panel humain, scénarios, collecte à distance, analyse, rapport rédigé.")}</p>
      </div>
    </section>
  );
}
