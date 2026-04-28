"use client";

import { useState, useEffect, useCallback } from "react";
import type { Tester } from "@/types/tester";
import TesterDrawer from "./TesterDrawer";
import { useConfirm } from "@/components/ui/ConfirmModal";

interface AssignedTester {
  id: string;
  tester_id: string;
  status: string;
  nda_sent_at: string | null;
  nda_signed_at: string | null;
  completed_at: string | null;
  tester: Pick<Tester, "id" | "email" | "first_name" | "last_name" | "phone" | "job_title" | "sector" | "devices" | "digital_level" | "browsers" | "connection" | "status" | "profile_completed">;
}

interface ProjectTestersTabProps {
  projectId: string;
}

const FILTER_SECTIONS: {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "digital_level",
    label: "Niveau digital",
    options: [
      { value: "debutant", label: "Débutant" },
      { value: "intermediaire", label: "Intermédiaire" },
      { value: "avance", label: "Avancé" },
      { value: "expert", label: "Expert" },
    ],
  },
  {
    key: "connection",
    label: "Connexion",
    options: [
      { value: "Fibre", label: "Fibre" },
      { value: "ADSL", label: "ADSL" },
      { value: "4G/5G", label: "4G/5G" },
    ],
  },
  {
    key: "devices",
    label: "Appareils",
    options: [
      { value: "PC Windows", label: "PC Windows" },
      { value: "Mac", label: "Mac" },
      { value: "PC Linux", label: "PC Linux" },
      { value: "iPhone", label: "iPhone" },
      { value: "Smartphone Android", label: "Android" },
      { value: "iPad", label: "iPad" },
      { value: "Tablette Android", label: "Tablette Android" },
    ],
  },
  {
    key: "browsers",
    label: "Navigateurs",
    options: [
      { value: "Chrome", label: "Chrome" },
      { value: "Firefox", label: "Firefox" },
      { value: "Safari", label: "Safari" },
      { value: "Edge", label: "Edge" },
      { value: "Arc", label: "Arc" },
    ],
  },
];

const NDA_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  selected: { label: "Sélectionné (sans NDA envoyé)", color: "#86868B", bg: "#f5f5f7" },
  nda_sent: { label: "NDA envoyé", color: "#b45309", bg: "#fef3c7" },
  nda_signed: { label: "NDA signé", color: "#0A7A5A", bg: "#f0faf5" },
  invited: { label: "Invité", color: "#1d4ed8", bg: "#eff6ff" },
  in_progress: { label: "En cours", color: "#7c3aed", bg: "#f5f3ff" },
  completed: { label: "Terminé", color: "#0A7A5A", bg: "#f0faf5" },
};

// Groupes pour la colonne "Mes testeurs assignés".
const STATUS_GROUPS = [
  { id: "pending_nda", label: "NDA en attente d'envoi", statuses: ["selected"] },
  { id: "nda_sent", label: "NDA envoyé, en attente de signature", statuses: ["nda_sent"] },
  { id: "active", label: "En mission", statuses: ["nda_signed", "invited", "in_progress"] },
  { id: "done", label: "Terminés", statuses: ["completed"] },
] as const;

function FilterSidebar({
  filters,
  setFilters,
  collapsed,
  setCollapsed,
}: {
  filters: Record<string, Set<string>>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>;
  collapsed: Record<string, boolean>;
  setCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  function toggleFilter(key: string, value: string) {
    setFilters((prev) => {
      const next = { ...prev };
      const set = new Set(prev[key] || []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next[key] = set;
      return next;
    });
  }

  function toggleSection(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const activeCount = Object.values(filters).reduce((sum, s) => sum + s.size, 0);

  return (
    <div style={{
      width: 200, minWidth: 200, background: "#fff", borderRadius: 14,
      border: "0.5px solid rgba(0,0,0,0.08)", padding: "14px 0",
      alignSelf: "flex-start", maxHeight: "calc(100vh - 240px)", overflowY: "auto",
    }}>
      <div style={{
        padding: "0 14px 10px", display: "flex", alignItems: "center",
        justifyContent: "space-between", borderBottom: "0.5px solid rgba(0,0,0,0.06)",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1d1d1f" }}>Filtres</span>
        {activeCount > 0 && (
          <button
            onClick={() => setFilters({})}
            style={{
              fontSize: 10, color: "#e53e3e", background: "none", border: "none",
              cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
            }}
          >
            Effacer ({activeCount})
          </button>
        )}
      </div>
      {FILTER_SECTIONS.map((section) => {
        const isCollapsed = collapsed[section.key] ?? false;
        const activeInSection = filters[section.key]?.size || 0;
        return (
          <div key={section.key} style={{ borderBottom: "0.5px solid rgba(0,0,0,0.04)" }}>
            <button
              onClick={() => toggleSection(section.key)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "9px 14px", background: "none", border: "none",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: "#1d1d1f" }}>
                {section.label}
                {activeInSection > 0 && (
                  <span style={{
                    marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#fff",
                    background: "#0A7A5A", borderRadius: 980, padding: "1px 5px",
                  }}>
                    {activeInSection}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 9, color: "#86868B", transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)" }}>▼</span>
            </button>
            {!isCollapsed && (
              <div style={{ padding: "0 14px 8px" }}>
                {section.options.map((opt) => {
                  const checked = filters[section.key]?.has(opt.value) || false;
                  return (
                    <label
                      key={opt.value}
                      style={{
                        display: "flex", alignItems: "center", gap: 7,
                        padding: "3px 0", cursor: "pointer", fontSize: 11, color: "#1d1d1f",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFilter(section.key, opt.value)}
                        style={{ accentColor: "#0A7A5A", width: 13, height: 13 }}
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ProjectTestersTab({ projectId }: ProjectTestersTabProps) {
  const [allTesters, setAllTesters] = useState<Tester[]>([]);
  const [assigned, setAssigned] = useState<AssignedTester[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { notify, confirm, ConfirmModal } = useConfirm();

  const assignedTesterIds = new Set(assigned.map((a) => a.tester_id));

  const fetchAssigned = useCallback(async () => {
    const res = await fetch(`/api/staff/projects/${projectId}/testers`);
    if (res.ok) setAssigned(await res.json());
  }, [projectId]);

  const fetchTesters = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("status", "active");
    if (search) params.set("search", search);
    const res = await fetch(`/api/staff/testers?${params}`);
    if (res.ok) setAllTesters(await res.json());
  }, [search]);

  useEffect(() => {
    Promise.all([fetchTesters(), fetchAssigned()]).finally(() => setLoading(false));
  }, [fetchTesters, fetchAssigned]);

  function applyClientFilters(list: Tester[]): Tester[] {
    return list.filter((t) => {
      for (const [key, values] of Object.entries(filters)) {
        if (values.size === 0) continue;
        if (key === "devices" || key === "browsers") {
          const arr = (t as unknown as Record<string, unknown>)[key] as string[] | undefined;
          if (!arr || !arr.some((v) => values.has(v))) return false;
        } else {
          const val = (t as unknown as Record<string, unknown>)[key] as string | undefined;
          if (!val || !values.has(val)) return false;
        }
      }
      return true;
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Bouton principal : invitation auto (assign + envoi NDA en 1 clic).
  // Utilise le nouvel endpoint /api/staff/projects/:id/testers/invite.
  async function handleInvite() {
    const ids = [...selected].filter((id) => !assignedTesterIds.has(id));
    if (ids.length === 0) return;
    const ok = await confirm({
      title: `Inviter ${ids.length} testeur${ids.length > 1 ? "s" : ""} ?`,
      message: `Le NDA va être envoyé immédiatement par email. Le projet sera activé si ce n'est pas déjà fait.`,
      confirmLabel: "Inviter et envoyer le NDA",
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/testers/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tester_ids: ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        await notify({ title: "Erreur", message: data.error || "Erreur lors de l'invitation" });
        return;
      }
      setSelected(new Set());
      await Promise.all([fetchAssigned(), fetchTesters()]);
      await notify({
        title: "Invitations envoyées",
        message: `${data.invited}/${data.total} testeur(s) invité(s). Le NDA a été envoyé par email.`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Action secondaire (rare) : ajouter sans envoyer le NDA, pour shortlister.
  async function handleAddAsSelection() {
    const ids = [...selected].filter((id) => !assignedTesterIds.has(id));
    if (ids.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/testers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tester_ids: ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        await notify({ title: "Erreur", message: data.error || "Erreur lors de l'ajout" });
        return;
      }
      setSelected(new Set());
      setActionMenuOpen(false);
      await Promise.all([fetchAssigned(), fetchTesters()]);
    } finally {
      setSubmitting(false);
    }
  }

  // Envoi NDA pour les testeurs deja en "selected" (cas legacy : on a
  // shortliste sans envoyer, puis on envoie plus tard).
  async function handleNdaSendForSelected(testerIds: string[]) {
    if (testerIds.length === 0) return;
    const ok = await confirm({
      title: `Envoyer le NDA à ${testerIds.length} testeur${testerIds.length > 1 ? "s" : ""} ?`,
      message: "Cette action enverra l'email d'invitation NDA.",
      confirmLabel: "Envoyer le NDA",
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/nda/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tester_ids: testerIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        await notify({ title: "Erreur", message: data.error || "Erreur" });
        return;
      }
      await fetchAssigned();
      await notify({
        title: "NDA envoyé",
        message: `${data.sent}/${data.total} testeur(s) notifié(s).`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(testerId: string) {
    const a = assigned.find((x) => x.tester_id === testerId);
    if (!a) return;
    const ok = await confirm({
      title: "Retirer ce testeur du projet ?",
      message: a.status === "selected"
        ? "Ce testeur n'a pas encore reçu de NDA, il peut être retiré sans impact."
        : "Le NDA est envoyé ou signé : retirer ce testeur peut casser des données. Confirmer ?",
      confirmLabel: "Retirer",
      danger: true,
    });
    if (!ok) return;

    const res = await fetch(`/api/staff/projects/${projectId}/testers/${testerId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      await notify({ title: "Impossible de retirer", message: err.error || "Erreur" });
      return;
    }
    await fetchAssigned();
  }

  const filteredCatalog = applyClientFilters(allTesters)
    .filter((t) => !assignedTesterIds.has(t.id))
    .sort((a, b) => (a.last_name ?? "").localeCompare(b.last_name ?? ""));

  const selectedCatalogCount = [...selected].filter((id) => !assignedTesterIds.has(id)).length;

  // Groupement des assignés par état (pour la colonne droite)
  const grouped: Record<string, AssignedTester[]> = {};
  for (const grp of STATUS_GROUPS) grouped[grp.id] = [];
  for (const a of assigned) {
    for (const grp of STATUS_GROUPS) {
      if ((grp.statuses as readonly string[]).includes(a.status)) {
        grouped[grp.id].push(a);
        break;
      }
    }
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px 0", color: "#86868B", fontSize: 14 }}>Chargement…</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <FilterSidebar filters={filters} setFilters={setFilters} collapsed={collapsed} setCollapsed={setCollapsed} />

        {/* COLONNE 1 : catalogue */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>
              Catalogue testeurs
              <span style={{ fontSize: 12, fontWeight: 400, color: "#86868B", marginLeft: 8 }}>
                {filteredCatalog.length} disponible{filteredCatalog.length > 1 ? "s" : ""}
              </span>
            </h3>
            <input
              type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email…"
              style={{
                width: "100%", padding: "9px 12px", fontSize: 13,
                border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10,
                outline: "none", background: "#fff", fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
          </div>

          {selectedCatalogCount > 0 && (
            <div style={{
              background: "#f0faf5", border: "1.5px solid #0A7A5A", borderRadius: 12,
              padding: "10px 14px", marginBottom: 10, position: "relative",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0A7A5A" }}>
                {selectedCatalogCount} testeur{selectedCatalogCount > 1 ? "s" : ""} sélectionné{selectedCatalogCount > 1 ? "s" : ""}
              </span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  onClick={handleInvite}
                  disabled={submitting}
                  style={{
                    padding: "7px 16px", fontSize: 13, fontWeight: 700, color: "#fff",
                    background: "#0A7A5A", border: "none", borderRadius: 980,
                    cursor: submitting ? "wait" : "pointer", fontFamily: "inherit",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  Inviter au projet →
                </button>
                <button
                  onClick={() => setActionMenuOpen((v) => !v)}
                  disabled={submitting}
                  aria-label="Plus d'actions"
                  style={{
                    padding: "7px 10px", fontSize: 13, fontWeight: 700, color: "#0A7A5A",
                    background: "#fff", border: "1px solid #0A7A5A", borderRadius: 980,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  ⋯
                </button>
                {actionMenuOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", right: 0,
                    background: "#fff", borderRadius: 12, padding: 6,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    border: "0.5px solid rgba(0,0,0,0.08)", zIndex: 10,
                    minWidth: 240,
                  }}>
                    <button
                      onClick={handleAddAsSelection}
                      style={{
                        width: "100%", textAlign: "left", padding: "8px 12px",
                        background: "none", border: "none", borderRadius: 8,
                        fontSize: 12, color: "#1d1d1f", cursor: "pointer", fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f7"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                    >
                      <strong>Ajouter à la sélection</strong>
                      <br />
                      <span style={{ color: "#86868B", fontSize: 11 }}>
                        Sans envoyer le NDA (shortlist)
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{
            background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)",
            overflow: "hidden", maxHeight: 560, overflowY: "auto",
          }}>
            {filteredCatalog.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#86868B", fontSize: 13 }}>
                Aucun testeur disponible avec ces critères.
              </div>
            ) : (
              filteredCatalog.map((t) => {
                const eligible = t.status === "active" && t.profile_completed === true;
                const isSelected = selected.has(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => setDrawerId(t.id)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "30px 1fr auto",
                      gap: 10, padding: "10px 14px",
                      borderBottom: "0.5px solid rgba(0,0,0,0.05)",
                      cursor: "pointer", alignItems: "center",
                      background: isSelected ? "#f0faf5" : "transparent",
                      opacity: eligible ? 1 : 0.55,
                      transition: "background 100ms",
                    }}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(t.id)}
                        disabled={!eligible}
                        title={eligible ? undefined : "Profil incomplet : ce testeur n'est pas eligible"}
                        style={{ accentColor: "#0A7A5A", cursor: eligible ? "pointer" : "not-allowed" }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.first_name} {t.last_name}
                        {!eligible && (
                          <span style={{
                            marginLeft: 6, fontSize: 10, fontWeight: 600,
                            padding: "1px 6px", borderRadius: 980,
                            background: "#fef3c7", color: "#92400e",
                          }}>incomplet</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#86868B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.job_title || "—"} · {t.sector || "—"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <span style={{
                        padding: "2px 8px", fontSize: 10, fontWeight: 600, borderRadius: 980,
                        background: "#f5f5f7", color: "#6e6e73",
                      }}>
                        {t.digital_level || "?"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLONNE 2 : assignés au projet */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>
              Mes testeurs
              <span style={{ fontSize: 12, fontWeight: 400, color: "#86868B", marginLeft: 8 }}>
                {assigned.length} assigné{assigned.length > 1 ? "s" : ""}
              </span>
            </h3>
          </div>

          <div style={{
            background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)",
            overflow: "hidden", maxHeight: 620, overflowY: "auto",
          }}>
            {assigned.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#86868B", fontSize: 13 }}>
                Aucun testeur assigné. Sélectionnez-en dans le catalogue à gauche puis cliquez sur <strong>Inviter au projet</strong>.
              </div>
            ) : (
              STATUS_GROUPS.map((grp) => {
                const items = grouped[grp.id];
                if (!items || items.length === 0) return null;

                return (
                  <div key={grp.id} style={{ borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
                    <div style={{
                      padding: "10px 14px", background: "#fafafa",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      fontSize: 11, fontWeight: 700, color: "#86868B",
                      textTransform: "uppercase", letterSpacing: "0.04em",
                    }}>
                      <span>{grp.label} · {items.length}</span>
                      {grp.id === "pending_nda" && items.length > 0 && (
                        <button
                          onClick={() => handleNdaSendForSelected(items.map((i) => i.tester_id))}
                          disabled={submitting}
                          style={{
                            padding: "4px 10px", fontSize: 10, fontWeight: 700,
                            color: "#fff", background: "#0A7A5A",
                            border: "none", borderRadius: 980, cursor: submitting ? "wait" : "pointer",
                            fontFamily: "inherit", textTransform: "none", letterSpacing: 0,
                          }}
                        >
                          Envoyer NDA à tous
                        </button>
                      )}
                    </div>
                    {items.map((a) => {
                      const t = a.tester;
                      const ndaInfo = NDA_LABELS[a.status] || NDA_LABELS.selected;
                      const dateText = a.completed_at
                        ? `Terminé le ${new Date(a.completed_at).toLocaleDateString("fr-FR")}`
                        : a.nda_signed_at
                        ? `Signé le ${new Date(a.nda_signed_at).toLocaleDateString("fr-FR")}`
                        : a.nda_sent_at
                        ? `Envoyé le ${new Date(a.nda_sent_at).toLocaleDateString("fr-FR")}`
                        : "";
                      return (
                        <div
                          key={a.id}
                          onClick={() => setDrawerId(a.tester_id)}
                          style={{
                            display: "grid", gridTemplateColumns: "1fr auto auto",
                            gap: 10, padding: "10px 14px",
                            borderTop: "0.5px solid rgba(0,0,0,0.04)",
                            cursor: "pointer", alignItems: "center",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {t?.first_name} {t?.last_name}
                            </div>
                            <div style={{ fontSize: 11, color: "#86868B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {t?.email}{dateText && ` · ${dateText}`}
                            </div>
                          </div>
                          <span style={{
                            padding: "3px 10px", fontSize: 10, fontWeight: 600, borderRadius: 980,
                            color: ndaInfo.color, background: ndaInfo.bg, whiteSpace: "nowrap",
                          }}>
                            {ndaInfo.label}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemove(a.tester_id); }}
                            style={{
                              background: "none", border: "none", color: "#e53e3e",
                              cursor: "pointer", fontSize: 16, padding: "2px 6px",
                            }}
                            title="Retirer"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <TesterDrawer testerId={drawerId} onClose={() => setDrawerId(null)} />
      <ConfirmModal />
    </div>
  );
}
