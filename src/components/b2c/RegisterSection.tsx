import RegisterForm from "./RegisterForm";

export default function RegisterSection() {
  return (
    <section className="register" id="register">
      <div className="register-inner">
        <div className="register-left">
          <h2>Rejoignez le panel earlypanel.</h2>
          <p>Le formulaire prend 5 minutes. Une fois votre profil validé, on commence à vous proposer des missions dès qu&apos;une correspond à ce que vous faites.</p>
          <div className="register-perks">
            <div className="reg-perk">
              <div className="reg-perk-dot" />
              <div><h4>Aucun engagement</h4><p>Vous acceptez les missions qui vous intéressent, vous refusez les autres. Pas de quota à atteindre, pas de pénalité si vous passez votre tour.</p></div>
            </div>
            <div className="reg-perk">
              <div className="reg-perk-dot" />
              <div><h4>Paiement par virement bancaire</h4><p>Vous renseignez votre IBAN une fois dans votre profil. À chaque test validé, le virement part automatiquement, sous 72h dans la plupart des cas.</p></div>
            </div>
            <div className="reg-perk">
              <div className="reg-perk-dot" />
              <div><h4>Confidentialité contractualisée</h4><p>Vos données ne sont jamais revendues. Vous signez un NDA avant chaque mission.</p></div>
            </div>
            <div className="reg-perk">
              <div className="reg-perk-dot" />
              <div><h4>Missions ciblées</h4><p>On ne vous spamme pas. Vous ne recevez une invitation que si votre profil correspond précisément à ce que le client cherche, et si vos disponibilités collent au délai.</p></div>
            </div>
          </div>
        </div>
        <RegisterForm />
      </div>
    </section>
  );
}
