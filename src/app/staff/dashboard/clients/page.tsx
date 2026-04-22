"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { B2BClientWithCount, B2BClientInput } from "@/types/client";

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "archived", label: "Archivés" },
];

export default function StaffClientsPage() {
  const [clients, setClients] = useState<B2BClientWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("active");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/clients?status=${filter}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
      }
      setClients(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function createClient(payload: B2BClientInput) {
    const res = await fetch("/api/staff/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
    }
    setShowModal(false);
    await load();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.04em", margin: 0 }}>
            Clients B2B
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#86868B" }}>
            Entreprises donneuses d&apos;ordre. Un client peut être rattaché à plusieurs projets.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "12px 24px", fontSize: 14, fontWeight: 700,
            color: "#fff", background: "#0A7A5A",
            border: "none", borderRadius: 980, cursor: "pointer",
          }}
        >
          + Nouveau client
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {FILTERS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            style={{
              padding: "7px 16px", fontSize: 13,
              fontWeight: filter === opt.value ? 600 : 400,
              color: filter === opt.value ? "#0A7A5A" : "#6e6e73",
              background: filter === opt.value ? "#f0faf5" : "transparent",
              border: filter === opt.value ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)",
              borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#b91c1c", fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#86868B" }}>Chargement…</div>
      ) : clients.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.08)", padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", margin: "0 0 6px" }}>
            Aucun client B2B
          </h2>
          <p style={{ fontSize: 14, color: "#86868B", margin: "0 auto 18px", maxWidth: 480, lineHeight: 1.55 }}>
            Créez votre premier client pour le rattacher ensuite à des projets.
          </p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "10px 18px", fontSize: 13, fontWeight: 600,
              color: "#fff", background: "#0A7A5A",
              border: "none", borderRadius: 980, cursor: "pointer",
            }}
          >
            Créer un client
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/staff/dashboard/clients/${c.id}`}
              style={{
                display: "block", background: "#fff", borderRadius: 16,
                border: "0.5px solid rgba(0,0,0,0.08)", padding: "20px 24px",
                textDecoration: "none", color: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: 0, letterSpacing: "-0.02em" }}>
                      {c.company_name}
                    </h3>
                    {c.status === "archived" && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 980, background: "#f5f5f7", color: "#6e6e73" }}>
                        Archivé
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#86868B", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {c.sector && <span>{c.sector}</span>}
                    {c.company_size && (<><span style={{ opacity: 0.4 }}>·</span><span>{c.company_size}</span></>)}
                    {(c.contact_first_name || c.contact_last_name) && (
                      <>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <span>{`${c.contact_first_name ?? ""} ${c.contact_last_name ?? ""}`.trim()}</span>
                      </>
                    )}
                    {c.contact_email && (<><span style={{ opacity: 0.4 }}>·</span><span>{c.contact_email}</span></>)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#0A7A5A", fontVariantNumeric: "tabular-nums" }}>
                    {c.project_count}
                  </div>
                  <div style={{ fontSize: 11, color: "#86868B", textTransform: "uppercase", letterSpacing: 0.4 }}>
                    Projet{c.project_count > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <ClientModal
          onClose={() => setShowModal(false)}
          onSubmit={createClient}
        />
      )}
    </div>
  );
}

function ClientModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (payload: B2BClientInput) => Promise<void>;
}) {
  const [form, setForm] = useState<B2BClientInput>({ company_name: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof B2BClientInput>(key: K, v: B2BClientInput[K]) {
    setForm((f) => ({ ...f, [key]: v }));
  }

  async function save() {
    setErr(null);
    if (!form.company_name?.trim()) {
      setErr("Nom de l'entreprise obligatoire");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(form);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#6e6e73", marginBottom: 4, display: "block" };
  const input: React.CSSProperties = {
    width: "100%", padding: "9px 12px", fontSize: 13,
    borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)",
    fontFamily: "inherit", background: "#fff", boxSizing: "border-box",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, padding: 28,
          width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1d1d1f", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Nouveau client B2B
        </h2>
        <p style={{ fontSize: 13, color: "#86868B", margin: "0 0 20px" }}>
          Seul le nom de l&apos;entreprise est obligatoire. Vous pourrez compléter plus tard.
        </p>

        {err && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "#b91c1c", fontSize: 13 }}>
            {err}
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={label}>Nom de l&apos;entreprise *</label>
            <input style={input} value={form.company_name || ""} onChange={(e) => set("company_name", e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Secteur</label>
              <input style={input} value={form.sector || ""} onChange={(e) => set("sector", e.target.value)} placeholder="SaaS, Fintech…" />
            </div>
            <div>
              <label style={label}>Taille</label>
              <select style={input} value={form.company_size || ""} onChange={(e) => set("company_size", e.target.value)}>
                <option value="">—</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-1000">201-1000</option>
                <option value="1000+">1000+</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Site web</label>
              <input style={input} value={form.website || ""} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <label style={label}>N° TVA</label>
              <input style={input} value={form.vat_number || ""} onChange={(e) => set("vat_number", e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 4, paddingTop: 10, borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#86868B", marginBottom: 10 }}>
              Contact principal
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={label}>Prénom</label>
                <input style={input} value={form.contact_first_name || ""} onChange={(e) => set("contact_first_name", e.target.value)} />
              </div>
              <div>
                <label style={label}>Nom</label>
                <input style={input} value={form.contact_last_name || ""} onChange={(e) => set("contact_last_name", e.target.value)} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div>
                <label style={label}>Email</label>
                <input style={input} type="email" value={form.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} />
              </div>
              <div>
                <label style={label}>Téléphone</label>
                <input style={input} value={form.contact_phone || ""} onChange={(e) => set("contact_phone", e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={label}>Rôle</label>
              <input style={input} value={form.contact_role || ""} onChange={(e) => set("contact_role", e.target.value)} placeholder="PM, CPO, Directeur…" />
            </div>
          </div>

          <div>
            <label style={label}>Notes internes</label>
            <textarea rows={3} style={{ ...input, resize: "vertical" }} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "#6e6e73", background: "transparent", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980, cursor: "pointer" }}
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={busy}
            style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "#fff", background: busy ? "#86868B" : "#0A7A5A", border: "none", borderRadius: 980, cursor: busy ? "default" : "pointer" }}
          >
            {busy ? "Création…" : "Créer le client"}
          </button>
        </div>
      </div>
    </div>
  );
}
