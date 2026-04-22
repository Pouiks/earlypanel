type ProfileRarity = "standard" | "recherche" | "rare";

function RarityBadge({ level }: { level: ProfileRarity }) {
  const map: Record<ProfileRarity, { label: string; bg: string; fg: string }> = {
    standard: { label: "Standard", bg: "#f5f5f7", fg: "#6e6e73" },
    recherche: { label: "Recherché", bg: "#f0faf5", fg: "#0A7A5A" },
    rare: { label: "Profil rare", bg: "#fff7e6", fg: "#b45309" },
  };
  const m = map[level];
  return (
    <span
      className="profile-bonus"
      style={{ background: m.bg, color: m.fg, fontWeight: 600 }}
    >
      {m.label}
    </span>
  );
}

export default function ProfileGrid() {
  return (
    <section className="profiles">
      <div className="profiles-inner">
        <div className="sec-eye">Qui peut rejoindre le panel ?</div>
        <div className="sec-title">Tous les profils sont les bienvenus.</div>
        <p style={{ fontSize: "15px", color: "var(--gray)", lineHeight: 1.6, marginTop: ".75rem", maxWidth: "540px" }}>
          Vous n&apos;avez pas besoin d&apos;être un expert en tech. On cherche des utilisateurs authentiques — pas des professionnels du test.
          La rémunération exacte vous est communiquée après votre inscription selon votre profil.
        </p>
        <div className="profile-grid">
          <div className="profile-card">
            <div className="profile-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg></div>
            <h4>Salarié en poste</h4>
            <p>Tout secteur, tout niveau</p>
            <RarityBadge level="standard" />
          </div>
          <div className="profile-card">
            <div className="profile-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg></div>
            <h4>Freelance</h4>
            <p>Indépendant, consultant</p>
            <RarityBadge level="recherche" />
          </div>
          <div className="profile-card">
            <div className="profile-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg></div>
            <h4>Étudiant</h4>
            <p>Grande école, université</p>
            <RarityBadge level="standard" />
          </div>
          <div className="profile-card">
            <div className="profile-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></div>
            <h4>Parent à domicile</h4>
            <p>Congé parental, temps partiel</p>
            <RarityBadge level="standard" />
          </div>
          <div className="profile-card">
            <div className="profile-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg></div>
            <h4>Gérant de PME</h4>
            <p>TPE, PME, artisan</p>
            <RarityBadge level="recherche" />
          </div>
          <div className="profile-card">
            <div className="profile-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg></div>
            <h4>Professionnel de santé</h4>
            <p>Médecin, infirmier, kiné…</p>
            <RarityBadge level="rare" />
          </div>
          <div className="profile-card">
            <div className="profile-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></div>
            <h4>Profil finance</h4>
            <p>DAF, comptable, contrôleur</p>
            <RarityBadge level="rare" />
          </div>
          <div className="profile-card">
            <div className="profile-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg></div>
            <h4>Profil IT</h4>
            <p>Dev, chef de projet, DSI</p>
            <RarityBadge level="recherche" />
          </div>
        </div>
      </div>
    </section>
  );
}
