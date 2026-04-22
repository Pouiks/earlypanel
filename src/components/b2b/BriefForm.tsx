export default function BriefForm() {
  return (
    <div className="brief-form">
      <h3>Démarrer un projet</h3>
      <p className="form-sub">On vous répond sous 24h avec une proposition sur mesure.</p>
      <div className="form-2col">
        <div className="form-row"><label>Prénom</label><input type="text" placeholder="Thomas" /></div>
        <div className="form-row"><label>Nom</label><input type="text" placeholder="Dupont" /></div>
      </div>
      <div className="form-row"><label>Email professionnel</label><input type="email" placeholder="thomas@startup.fr" /></div>
      <div className="form-row"><label>Entreprise</label><input type="text" placeholder="Votre startup ou agence" /></div>
      <div className="form-row">
        <label>Type de produit à tester</label>
        <select defaultValue="">
          <option value="" disabled>— Sélectionner</option>
          <option>SaaS B2B</option>
          <option>Application mobile</option>
          <option>Site e-commerce</option>
          <option>Site vitrine</option>
          <option>Maquette / POC</option>
          <option>Autre</option>
        </select>
      </div>
      <div className="form-row">
        <label>Décrivez votre besoin</label>
        <textarea placeholder="Qu'est-ce que vous voulez tester ? Quel est votre objectif principal ?" />
      </div>
      <div className="form-row">
        <label>Budget indicatif</label>
        <select defaultValue="">
          <option value="" disabled>— Sélectionner</option>
          <option>Quick Test · 700€ HT</option>
          <option>Standard · 1 200€ HT</option>
          <option>Expert · 2 200€ HT</option>
          <option>Sur mesure / à définir</option>
        </select>
      </div>
      <button className="form-submit">Envoyer ma demande →</button>
      <p className="form-note">En soumettant ce formulaire, vous acceptez d&apos;être contacté. NDA signé avant tout échange.</p>
    </div>
  );
}
