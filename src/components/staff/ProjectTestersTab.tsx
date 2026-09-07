"use client";

import { useState, useEffect, useCallback } from "react";
import type { Tester } from "@/types/tester";
import TesterDrawer from "./TesterDrawer";
import TesterAdvancedFilters from "./TesterAdvancedFilters";
import { LEGACY_GENDER_MAP, LEGACY_CSP_MAP } from "@/lib/tester-vocab";
import { buildTarget, evaluateTester, requiredServerParams, activeCriteria, type ProjectTarget } from "@/lib/target-match";
import { CRITERION_LABELS } from "@/lib/target-criteria";
import {
  emptyTesterFilters,
  countActiveTesterFilters,
  appendTesterFiltersToParams,
  type TesterAdvancedFilterState,
} from "@/lib/tester-filters";
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

export default function ProjectTestersTab({ projectId }: ProjectTestersTabProps) {
  const [allTesters, setAllTesters] = useState<Tester[]>([]);
  const [assigned, setAssigned] = useState<AssignedTester[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TesterAdvancedFilterState>(() => emptyTesterFilters());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Pre-filtre auto sur le ciblage projet (target_sector, target_csp, target_age_min/max).
  // Si l'utilisateur clique "Voir hors cible", on bypass ce pre-filtre.
  // Cible projet complete (colonnes target_* + target_criteria), cf. target-match.ts.
  // Les obligatoires filtrent (serveur + client), les souhaites notent.
  const [projectTargeting, setProjectTargeting] = useState<ProjectTarget | null>(null);
  const [showOutOfTarget, setShowOutOfTarget] = useState(false);
  const { notify, confirm, ConfirmModal } = useConfirm();

  const assignedTesterIds = new Set(assigned.map((a) => a.tester_id));

  const fetchAssigned = useCallback(async () => {
    const res = await fetch(`/api/staff/projects/${projectId}/testers`);
    if (res.ok) setAssigned(await res.json());
  }, [projectId]);

  const fetchProjectTargeting = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/projects/${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      // Mapping defensif des anciens libelles (projets non migres en 038).
      const mapped = {
        ...data,
        target_gender: Array.isArray(data.target_gender) ? data.target_gender.map((g: string) => LEGACY_GENDER_MAP[g] ?? g) : [],
        target_csp: Array.isArray(data.target_csp) ? data.target_csp.map((c: string) => LEGACY_CSP_MAP[c] ?? c) : [],
      };
      setProjectTargeting(buildTarget(mapped));
    } catch { /* fallback: pas de pre-filtre */ }
  }, [projectId]);

  const fetchTesters = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams();
    // status="all" = active + pending. Permet au staff de voir aussi les
    // inscrits dont le profil n'est pas encore termine (status=pending) pour
    // les relancer. Les non-invitables sont desactives dans l'UI ci-dessous.
    params.set("status", "all");
    if (search) params.set("search", search);
    // 1. Pre-filtre serveur sur le ciblage projet, sauf si "Voir hors cible".
    //    Note : ces params sont APPENDED, donc ils s'AJOUTENT aux filtres
    //    avances du staff. C'est volontaire : si le projet cible Paris ET
    //    le staff ajoute "secteur Tech", on cumule pour affiner.
    //    Seuls les criteres OBLIGATOIRES filtrables cote API sont envoyes ;
    //    les autres obligatoires sont appliques cote client (requiredOk).
    if (projectTargeting && !showOutOfTarget) {
      requiredServerParams(projectTargeting, params);
    }
    // 2. Filtres avances ajoutes par le staff dans le panneau partage.
    appendTesterFiltersToParams(params, filters);
    try {
      const res = await fetch(`/api/staff/testers?${params}`, signal ? { signal } : undefined);
      if (signal?.aborted) return;
      if (res.ok) {
        const data = await res.json();
        if (signal?.aborted) return;
        setAllTesters(data);
      }
    } catch (e) {
      // AbortError = filtre/search a change pendant le fetch, ignore.
      if ((e as Error).name === "AbortError") return;
      throw e;
    }
  }, [search, projectTargeting, showOutOfTarget, filters]);

  // Initial mount + projectId change : fetch les choses qui ne dependent QUE du projet.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([fetchAssigned(), fetchProjectTargeting()]).finally(() => setLoading(false));
  }, [fetchAssigned, fetchProjectTargeting]);

  // Catalogue testeurs : refetch a chaque changement de filtre/search/targeting.
  // Debounce 200ms + AbortController : evite les race conditions ou les comptes
  // oscillent quand l'utilisateur clique plusieurs filtres rapidement.
  useEffect(() => {
    const ac = new AbortController();
    const t = setTimeout(() => fetchTesters(ac.signal), 200);
    return () => {
      ac.abort();
      clearTimeout(t);
    };
  }, [fetchTesters]);

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

  // Evaluation face a la cible : obligatoires -> exclusion (sauf « Voir hors
  // cible »), souhaites -> score. Tri par score decroissant puis nom.
  const evaluated = allTesters
    .filter((t) => !assignedTesterIds.has(t.id))
    .map((t) => ({ t, ev: projectTargeting ? evaluateTester(t, projectTargeting) : null }))
    .filter(({ ev }) => showOutOfTarget || !ev || ev.requiredOk)
    .sort((a, b) => ((b.ev?.score ?? 0) - (a.ev?.score ?? 0)) || (a.t.last_name ?? "").localeCompare(b.t.last_name ?? ""));
  const filteredCatalog = evaluated.map((x) => x.t);
  const evalById = new Map(evaluated.map((x) => [x.t.id, x.ev]));
  const criteriaKeys = projectTargeting ? activeCriteria(projectTargeting) : [];
  const requiredKeys = new Set(projectTargeting?.required ?? []);
  const perfectCount = evaluated.filter(({ ev }) => ev && ev.requiredOk && ev.total > 0 && ev.score === ev.total).length;

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

  const advancedCount = countActiveTesterFilters(filters);

  return (
    <div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

        {/* COLONNE 1 : catalogue */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>
                Catalogue testeurs
                <span style={{ fontSize: 12, fontWeight: 400, color: "#86868B", marginLeft: 8 }}>
                  {filteredCatalog.length} disponible{filteredCatalog.length > 1 ? "s" : ""}
                </span>
              </h3>
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                style={{
                  padding: "6px 14px", fontSize: 12, fontWeight: 600,
                  color: showAdvanced || advancedCount > 0 ? "#0A7A5A" : "#6e6e73",
                  background: showAdvanced || advancedCount > 0 ? "#f0faf5" : "transparent",
                  border: showAdvanced || advancedCount > 0 ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
                }}
                title="Filtres avances : age, sexe, secteur, CSP, equipement, localisation…"
              >
                Filtres avancés{advancedCount > 0 ? ` · ${advancedCount}` : ""}
              </button>
            </div>
            {showAdvanced && (
              <div style={{ marginBottom: 12 }}>
                <TesterAdvancedFilters value={filters} onChange={setFilters} />
              </div>
            )}
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

          {projectTargeting && criteriaKeys.length > 0 && (
            <div style={{
              background: showOutOfTarget ? "#f5f5f7" : "#f0faf5",
              border: "1px solid " + (showOutOfTarget ? "rgba(0,0,0,0.08)" : "rgba(10,122,90,0.2)"),
              borderRadius: 12, padding: "10px 14px", marginBottom: 10,
              fontSize: 12, color: showOutOfTarget ? "#6e6e73" : "#0A7A5A",
              display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 4 }}>
                  <strong style={{ marginRight: 6 }}>{showOutOfTarget ? "Obligatoires désactivés" : "Cible client"} :</strong>
                  {criteriaKeys.map((k) => (
                    <span key={k} title={requiredKeys.has(k) ? "Obligatoire : exclut" : "Souhaité : note"} style={{ display: "inline-block", marginRight: 6, padding: "1px 8px", borderRadius: 980, fontSize: 11, fontWeight: 600, background: requiredKeys.has(k) ? "#fef2f2" : "rgba(255,255,255,0.7)", color: requiredKeys.has(k) ? "#b91c1c" : "inherit", border: "1px solid rgba(0,0,0,0.06)" }}>
                      {CRITERION_LABELS[k]}{requiredKeys.has(k) ? " !" : ""}
                    </span>
                  ))}
                </div>
                <div style={{ color: showOutOfTarget ? "#6e6e73" : "#1d1d1f" }}>
                  <strong>{filteredCatalog.length}</strong> {showOutOfTarget ? "au catalogue" : "remplissent les obligatoires"} · <strong>{perfectCount}</strong> cochent tout
                  {projectTargeting.headcount ? <> · effectif voulu <strong>{projectTargeting.headcount}</strong></> : null}
                </div>
              </div>
              <button
                onClick={() => setShowOutOfTarget((v) => !v)}
                style={{
                  padding: "5px 12px", fontSize: 11, fontWeight: 600,
                  background: "#fff", color: "#1d1d1f",
                  border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {showOutOfTarget ? "Re-filtrer sur la cible" : "Voir hors cible"}
              </button>
            </div>
          )}

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
                        {t.job_title || "Non renseigné"} · {t.sector || "Non renseigné"}
                        {(t as { age?: number | null }).age ? ` · ${(t as { age?: number | null }).age} ans` : ""}
                        {t.city ? ` · ${t.city}` : ""}
                        {t.tier && t.tier !== "standard" ? ` · ${t.tier}` : ""}
                      </div>
                      {(() => {
                        const ev = evalById.get(t.id);
                        if (!ev || ev.details.length === 0) return null;
                        return (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                            {ev.details.map((d) => (
                              <span
                                key={d.key}
                                title={`${d.label} : attendu ${d.expected} · ${d.actual}`}
                                style={{
                                  padding: "1px 7px", fontSize: 10, fontWeight: 600, borderRadius: 980,
                                  background: d.ok ? "#e6f6ef" : d.unknown ? "#f5f5f7" : "#fef2f2",
                                  color: d.ok ? "#0A7A5A" : d.unknown ? "#9a9aa0" : "#b91c1c",
                                  border: d.required ? "1px solid currentColor" : "1px solid transparent",
                                }}
                              >
                                {d.ok ? "✓" : d.unknown ? "?" : "✗"} {d.label}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      {(() => {
                        const ev = evalById.get(t.id);
                        if (!ev || ev.total === 0) return null;
                        const full = ev.score === ev.total;
                        return (
                          <span title="Critères souhaités satisfaits" style={{ padding: "2px 9px", fontSize: 11, fontWeight: 700, borderRadius: 980, background: full ? "#0A7A5A" : "#f0faf5", color: full ? "#fff" : "#0A7A5A" }}>
                            {ev.score} / {ev.total}
                          </span>
                        );
                      })()}
                      <span style={{ padding: "2px 8px", fontSize: 10, fontWeight: 600, borderRadius: 980, background: "#f5f5f7", color: "#6e6e73" }}>
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
