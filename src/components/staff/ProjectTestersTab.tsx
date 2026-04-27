"use client";

import { useState, useEffect, useCallback } from "react";
import type { Tester } from "@/types/tester";
import TesterDrawer from "./TesterDrawer";
import { useConfirm } from "@/components/ui/ConfirmModal";

interface AssignedTester {
  id: string;
  tester_id: string;
  status: string;
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
      { value: "Android", label: "Android" },
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
  {
    key: "sector",
    label: "Secteur",
    options: [
      { value: "Tech / IT", label: "Tech / IT" },
      { value: "Finance / Banque", label: "Finance / Banque" },
      { value: "Santé", label: "Santé" },
      { value: "Commerce / Retail", label: "Commerce / Retail" },
      { value: "Éducation", label: "Éducation" },
      { value: "Industrie", label: "Industrie" },
      { value: "Médias / Communication", label: "Médias / Communication" },
      { value: "Juridique", label: "Juridique" },
      { value: "Ressources humaines", label: "Ressources humaines" },
      { value: "Autre", label: "Autre" },
    ],
  },
];

const NDA_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  selected: { label: "Sélectionné", color: "#86868B", bg: "#f5f5f7" },
  nda_sent: { label: "NDA envoyé", color: "#b45309", bg: "#fef3c7" },
  nda_signed: { label: "NDA signé", color: "#0A7A5A", bg: "#f0faf5" },
  invited: { label: "Invité", color: "#1d4ed8", bg: "#eff6ff" },
  in_progress: { label: "En cours", color: "#7c3aed", bg: "#f5f3ff" },
  completed: { label: "Terminé", color: "#0A7A5A", bg: "#f0faf5" },
};

const cellStyle: React.CSSProperties = {
  padding: "10px 12px", fontSize: 13, color: "#1d1d1f", whiteSpace: "nowrap",
  overflow: "hidden", textOverflow: "ellipsis", textAlign: "left",
};

const thStyle: React.CSSProperties = {
  ...cellStyle, fontWeight: 600, color: "#86868B", fontSize: 11,
  textTransform: "uppercase", letterSpacing: "0.04em",
  borderBottom: "1px solid rgba(0,0,0,0.08)", position: "sticky", top: 0,
  background: "#fff", zIndex: 1, textAlign: "left",
};

const COL_WIDTHS = {
  checkbox: "36px",
  name: "22%",
  email: "28%",
  devices: "18%",
  level: "14%",
  sector: "14%",
  nda: "14%",
  action: "40px",
};

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
      width: 220, minWidth: 220, background: "#fff", borderRadius: 16,
      border: "0.5px solid rgba(0,0,0,0.08)", padding: "16px 0",
      alignSelf: "flex-start", position: "sticky", top: 0,
      maxHeight: "calc(100vh - 280px)", overflowY: "auto",
    }}>
      <div style={{
        padding: "0 16px 12px", display: "flex", alignItems: "center",
        justifyContent: "space-between", borderBottom: "0.5px solid rgba(0,0,0,0.06)",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f" }}>
          Filtres
        </span>
        {activeCount > 0 && (
          <button
            onClick={() => setFilters({})}
            style={{
              fontSize: 11, color: "#e53e3e", background: "none", border: "none",
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
                width: "100%", padding: "10px 16px", background: "none", border: "none",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f" }}>
                {section.label}
                {activeInSection > 0 && (
                  <span style={{
                    marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#fff",
                    background: "#0A7A5A", borderRadius: 980, padding: "1px 6px",
                  }}>
                    {activeInSection}
                  </span>
                )}
              </span>
              <span style={{
                fontSize: 10, color: "#86868B",
                transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                transition: "transform 200ms",
              }}>
                ▼
              </span>
            </button>

            {!isCollapsed && (
              <div style={{ padding: "0 16px 10px" }}>
                {section.options.map((opt) => {
                  const checked = filters[section.key]?.has(opt.value) || false;
                  return (
                    <label
                      key={opt.value}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "4px 0", cursor: "pointer", fontSize: 12, color: "#1d1d1f",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFilter(section.key, opt.value)}
                        style={{ accentColor: "#0A7A5A", width: 14, height: 14 }}
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
  const [showAssigned, setShowAssigned] = useState(false);
  const [sortKey, setSortKey] = useState<string>("last_name");
  const [sortAsc, setSortAsc] = useState(true);
  const { notify, ConfirmModal } = useConfirm();

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

  function sortList<T>(list: T[], key: string, asc: boolean): T[] {
    return [...list].sort((a, b) => {
      const va = (a as Record<string, unknown>)[key] as string || "";
      const vb = (b as Record<string, unknown>)[key] as string || "";
      return asc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  function handleSort(key: string) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  function sortIndicator(key: string) {
    if (sortKey !== key) return "";
    return sortAsc ? " ↑" : " ↓";
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll(list: { id: string }[]) {
    const ids = list.map((t) => t.id);
    const allSel = ids.every((id) => selected.has(id));
    if (allSel) {
      setSelected((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
    } else {
      setSelected((prev) => new Set([...prev, ...ids]));
    }
  }

  async function handleAssign() {
    const ids = [...selected].filter((id) => !assignedTesterIds.has(id));
    if (ids.length === 0) return;
    await fetch(`/api/staff/projects/${projectId}/testers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tester_ids: ids }),
    });
    setSelected(new Set());
    await Promise.all([fetchAssigned(), fetchTesters()]);
  }

  async function handleRemove(testerId: string) {
    await fetch(`/api/staff/projects/${projectId}/testers/${testerId}`, { method: "DELETE" });
    await fetchAssigned();
  }

  async function handleNdaSend() {
    const ids = [...selected].filter((id) => assignedTesterIds.has(id));
    if (ids.length === 0) return;

    const eligible = ids.filter((id) => {
      const a = assigned.find((a) => a.tester_id === id);
      return a && a.status === "selected";
    });

    if (eligible.length === 0) {
      await notify({
        title: "Aucun testeur éligible",
        message: "Seuls les testeurs en statut « Sélectionné » peuvent recevoir le NDA.",
      });
      return;
    }

    const res = await fetch(`/api/staff/projects/${projectId}/nda/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tester_ids: eligible }),
    });

    if (!res.ok) {
      const err = await res.json();
      await notify({ title: "Erreur", message: err.error || "Erreur lors de l'envoi" });
      return;
    }

    const result = await res.json();
    await notify({
      title: "NDA envoyé",
      message: `NDA envoyé à ${result.sent}/${result.total} testeur(s).`,
    });

    setSelected(new Set());
    await fetchAssigned();
  }

  const filteredTesters = applyClientFilters(allTesters).filter((t) => !assignedTesterIds.has(t.id));
  const sortedTesters = sortList(filteredTesters, sortKey, sortAsc);
  const selectedUnassigned = [...selected].filter((id) => !assignedTesterIds.has(id)).length;
  const selectedAssigned = [...selected].filter((id) => assignedTesterIds.has(id)).length;

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px 0", color: "#86868B", fontSize: 14 }}>Chargement…</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setShowAssigned(false)} style={{
          padding: "8px 18px", fontSize: 13, fontWeight: !showAssigned ? 600 : 400,
          color: !showAssigned ? "#0A7A5A" : "#6e6e73",
          background: !showAssigned ? "#f0faf5" : "transparent",
          border: !showAssigned ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)",
          borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
        }}>Rechercher testeurs</button>
        <button onClick={() => setShowAssigned(true)} style={{
          padding: "8px 18px", fontSize: 13, fontWeight: showAssigned ? 600 : 400,
          color: showAssigned ? "#0A7A5A" : "#6e6e73",
          background: showAssigned ? "#f0faf5" : "transparent",
          border: showAssigned ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)",
          borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
        }}>Assignés ({assigned.length})</button>
      </div>

      {!showAssigned ? (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <FilterSidebar filters={filters} setFilters={setFilters} collapsed={collapsed} setCollapsed={setCollapsed} />

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Search bar */}
            <div style={{ marginBottom: 12 }}>
              <input
                type="text" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou email…"
                style={{
                  width: "100%", padding: "10px 14px", fontSize: 13,
                  border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10,
                  outline: "none", background: "#fff", fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
                onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
              />
            </div>

            {/* Action bar */}
            {selectedUnassigned > 0 && (
              <div style={{
                background: "#f0faf5", border: "1.5px solid #0A7A5A", borderRadius: 12,
                padding: "10px 16px", marginBottom: 12,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0A7A5A" }}>
                  {selectedUnassigned} testeur{selectedUnassigned > 1 ? "s" : ""} sélectionné{selectedUnassigned > 1 ? "s" : ""}
                </span>
                <button onClick={handleAssign} style={{
                  padding: "7px 18px", fontSize: 13, fontWeight: 700, color: "#fff",
                  background: "#0A7A5A", border: "none", borderRadius: 980,
                  cursor: "pointer", fontFamily: "inherit",
                }}>Ajouter au projet</button>
              </div>
            )}

            {/* Results count */}
            <div style={{ fontSize: 12, color: "#86868B", marginBottom: 8 }}>
              {sortedTesters.length} testeur{sortedTesters.length > 1 ? "s" : ""} trouvé{sortedTesters.length > 1 ? "s" : ""}
            </div>

            {/* Table */}
            <div style={{
              background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}>
              <div style={{ overflowX: "auto", maxHeight: 520 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: COL_WIDTHS.checkbox }} />
                    <col style={{ width: COL_WIDTHS.name }} />
                    <col style={{ width: COL_WIDTHS.email }} />
                    <col style={{ width: COL_WIDTHS.devices }} />
                    <col style={{ width: COL_WIDTHS.level }} />
                    <col style={{ width: COL_WIDTHS.sector }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={thStyle}>
                        <input type="checkbox"
                          checked={sortedTesters.length > 0 && sortedTesters.every((t) => selected.has(t.id))}
                          onChange={() => toggleAll(sortedTesters)}
                          style={{ accentColor: "#0A7A5A" }} />
                      </th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleSort("last_name")}>
                        Nom{sortIndicator("last_name")}
                      </th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleSort("email")}>
                        Email{sortIndicator("email")}
                      </th>
                      <th style={thStyle}>Appareils</th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleSort("digital_level")}>
                        Niveau{sortIndicator("digital_level")}
                      </th>
                      <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleSort("sector")}>
                        Secteur{sortIndicator("sector")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTesters.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ ...cellStyle, textAlign: "center", color: "#86868B", padding: "30px" }}>
                          Aucun testeur actif trouvé
                        </td>
                      </tr>
                    ) : sortedTesters.map((t) => {
                      // Defense en profondeur cote UI : meme si l'API /api/staff/testers
                      // filtre deja sur profile_completed=true, on bloque la checkbox
                      // si la donnee chargee indique un profil incomplet (regression
                      // potentielle de l'API ou cache periment).
                      const eligible = t.status === "active" && t.profile_completed === true;
                      return (
                      <tr key={t.id}
                        style={{
                          borderBottom: "0.5px solid rgba(0,0,0,0.04)",
                          cursor: "pointer",
                          transition: "background 100ms",
                          opacity: eligible ? 1 : 0.55,
                        }}
                        onClick={() => setDrawerId(t.id)}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={cellStyle} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(t.id)}
                            onChange={() => toggleSelect(t.id)}
                            disabled={!eligible}
                            title={eligible ? undefined : "Profil incomplet : ce testeur n'est pas eligible aux invitations"}
                            style={{ accentColor: "#0A7A5A", cursor: eligible ? "pointer" : "not-allowed" }}
                          />
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 600 }}>
                          {t.first_name} {t.last_name}
                          {!eligible && (
                            <span title="Profil incomplet" style={{
                              marginLeft: 6, fontSize: 11, fontWeight: 600,
                              padding: "1px 8px", borderRadius: 980,
                              background: "#fef3c7", color: "#92400e",
                            }}>
                              incomplet
                            </span>
                          )}
                        </td>
                        <td style={{ ...cellStyle, color: "#6e6e73" }}>{t.email}</td>
                        <td style={cellStyle}>{t.devices?.slice(0, 2).join(", ") || "–"}</td>
                        <td style={cellStyle}>
                          <span style={{
                            padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 980,
                            background: "#f5f5f7", color: "#6e6e73",
                          }}>{t.digital_level || "–"}</span>
                        </td>
                        <td style={{ ...cellStyle, color: "#6e6e73" }}>{t.sector || "–"}</td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* NDA status summary */}
          {assigned.length > 0 && (
            <div style={{
              display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap",
            }}>
              {(["selected", "nda_sent", "nda_signed"] as const).map((s) => {
                const count = assigned.filter((a) => a.status === s).length;
                if (count === 0) return null;
                const info = NDA_LABELS[s];
                return (
                  <span key={s} style={{
                    padding: "5px 14px", fontSize: 12, fontWeight: 600,
                    color: info.color, background: info.bg, borderRadius: 980,
                  }}>
                    {info.label} : {count}
                  </span>
                );
              })}
            </div>
          )}

          {selectedAssigned > 0 && (
            <div style={{
              background: "#f0faf5", border: "1.5px solid #0A7A5A", borderRadius: 12,
              padding: "10px 16px", marginBottom: 12,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0A7A5A" }}>
                {selectedAssigned} sélectionné{selectedAssigned > 1 ? "s" : ""}
              </span>
              <button onClick={handleNdaSend} style={{
                padding: "7px 18px", fontSize: 13, fontWeight: 700, color: "#fff",
                background: "#0A7A5A", border: "none", borderRadius: 980,
                cursor: "pointer", fontFamily: "inherit",
              }}>Envoyer NDA</button>
            </div>
          )}

          <div style={{
            background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}>
            <div style={{ overflowX: "auto", maxHeight: 520 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: COL_WIDTHS.checkbox }} />
                  <col style={{ width: COL_WIDTHS.name }} />
                  <col style={{ width: COL_WIDTHS.email }} />
                  <col style={{ width: COL_WIDTHS.devices }} />
                  <col style={{ width: COL_WIDTHS.level }} />
                  <col style={{ width: COL_WIDTHS.nda }} />
                  <col style={{ width: COL_WIDTHS.action }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thStyle}>
                      <input type="checkbox"
                        checked={assigned.length > 0 && assigned.every((a) => selected.has(a.tester_id))}
                        onChange={() => toggleAll(assigned.map((a) => ({ id: a.tester_id })))}
                        style={{ accentColor: "#0A7A5A" }} />
                    </th>
                    <th style={thStyle}>Nom</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Appareils</th>
                    <th style={thStyle}>Niveau</th>
                    <th style={thStyle}>Statut NDA</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {assigned.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ ...cellStyle, textAlign: "center", color: "#86868B", padding: "30px" }}>
                        Aucun testeur assigné à ce projet
                      </td>
                    </tr>
                  ) : assigned.map((a) => {
                    const t = a.tester;
                    const ndaInfo = NDA_LABELS[a.status] || NDA_LABELS.selected;
                    return (
                      <tr key={a.id}
                        style={{ borderBottom: "0.5px solid rgba(0,0,0,0.04)", cursor: "pointer", transition: "background 100ms" }}
                        onClick={() => setDrawerId(a.tester_id)}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={cellStyle} onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(a.tester_id)}
                            onChange={() => toggleSelect(a.tester_id)} style={{ accentColor: "#0A7A5A" }} />
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 600 }}>{t?.first_name} {t?.last_name}</td>
                        <td style={{ ...cellStyle, color: "#6e6e73" }}>{t?.email}</td>
                        <td style={cellStyle}>{t?.devices?.slice(0, 2).join(", ") || "–"}</td>
                        <td style={cellStyle}>
                          <span style={{
                            padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 980,
                            background: "#f5f5f7", color: "#6e6e73",
                          }}>{t?.digital_level || "–"}</span>
                        </td>
                        <td style={cellStyle}>
                          <span style={{
                            padding: "4px 12px", fontSize: 11, fontWeight: 600,
                            color: ndaInfo.color, background: ndaInfo.bg, borderRadius: 980,
                          }}>{ndaInfo.label}</span>
                        </td>
                        <td style={cellStyle} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleRemove(a.tester_id)} style={{
                            background: "none", border: "none", color: "#e53e3e",
                            cursor: "pointer", fontSize: 16, padding: "2px 6px",
                          }} title="Retirer">&times;</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <TesterDrawer testerId={drawerId} onClose={() => setDrawerId(null)} />
      <ConfirmModal />
    </div>
  );
}
