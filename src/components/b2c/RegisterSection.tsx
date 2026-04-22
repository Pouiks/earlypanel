import RegisterForm from "./RegisterForm";

export default function RegisterSection() {
  return (
    <section className="register" id="register">
      <div className="register-inner">
        <div className="register-left">
          <h2>Rejoignez le panel.<br /><em>C&apos;est gratuit.</em></h2>
          <p>Remplissez le formulaire — on revient vers vous dès qu&apos;une mission correspond à votre profil.</p>
          <div className="register-perks">
            <div className="reg-perk">
              <div className="reg-perk-dot" />
              <div><h4>Zéro engagement</h4><p>Vous acceptez ou refusez chaque mission librement. Aucune obligation de fréquence.</p></div>
            </div>
            <div className="reg-perk">
              <div className="reg-perk-dot" />
              <div><h4>Paiement sécurisé</h4><p>Virement bancaire via Stripe. Vous configurez votre IBAN une fois, le reste est automatique.</p></div>
            </div>
            <div className="reg-perk">
              <div className="reg-perk-dot" />
              <div><h4>Confidentialité garantie</h4><p>Vos données ne sont jamais revendues. Vous signez un NDA avant chaque mission.</p></div>
            </div>
            <div className="reg-perk">
              <div className="reg-perk-dot" />
              <div><h4>Missions sur mesure</h4><p>On ne vous envoie que des missions qui correspondent à votre profil et vos disponibilités.</p></div>
            </div>
          </div>
        </div>
        <RegisterForm />
      </div>
    </section>
  );
}
