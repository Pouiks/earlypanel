"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { B2BClient } from "@/types/client";
import { useConfirm } from "@/components/ui/ConfirmModal";

interface LinkedProject {
  id: string;
  title: string;
  status: string;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
}

type ClientDetail = B2BClient & { projects: LinkedProject[] };

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  active: "Actif",
  closed: "Terminé",
  archived: "Archivé",
};
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  draft: { bg: "#f5f5f7", fg: "#86868B" },
  active: { bg: "#f0faf5", fg: "#0A7A5A" },
  closed: { bg: "#fef2f2", fg: "#e53e3e" },
  archived: { bg: "#f5f5f7", fg: "#6e6e73" },
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<B2BClient>>({});
  const [busy, setBusy] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    load();
  }, [params.id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/clients/${params.id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
      }
      const data = (await res.json()) as ClientDetail;
      setClient(data);
      setForm(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/clients/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
      }
      setEditing(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: "Supprimer ce client ?",
      message: "Les projets liés seront détachés (non supprimés).",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/clients/${params.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
      }
      router.push("/staff/dashboard/clients");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBusy(false);
    }
  }

  function set<K extends keyof B2BClient>(key: K, v: B2BClient[K]) {
    setForm((f) => ({ ...f, [key]: v }));
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#86868B" }}>Chargement…</div>;
  if (!client) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#b91c1c" }}>
        {error || "Client introuvable"}
      </div>
    );
  }

  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#6e6e73", marginBottom: 4, display: "block" };
  const input: React.CSSProperties = {
    width: "100%", padding: "9px 12px", fontSize: 13,
    borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)",
    fontFamily: "inherit", background: "#fff", boxSizing: "border-box",
  };
  const staticVal: React.CSSProperties = { fontSize: 14, color: "#1d1d1f", padding: "8px 0" };

  return (
    <div>
      <Link href="/staff/dashboard/clients" style={{ fontSize: 13, color: "#0A7A5A", textDecoration: "none", marginBottom: 16, display: "inline-block" }}>
        ← Tous les clients
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.04em", margin: 0 }}>
            {client.company_name}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#86868B" }}>
            Client depuis le {new Date(client.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "#0A7A5A", background: "#f0faf5", border: "1px solid #0A7A5A", borderRadius: 980, cursor: "pointer" }}
              >
                Modifier
              </button>
              <button
                onClick={remove}
                disabled={busy}
                style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "#b91c1c", background: "#fff", border: "1px solid #fecaca", borderRadius: 980, cursor: "pointer" }}
              >
                Supprimer
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setEditing(false); setForm(client); }}
                style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "#6e6e73", background: "transparent", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980, cursor: "pointer" }}
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={busy}
                style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "#fff", background: busy ? "#86868B" : "#0A7A5A", border: "none", borderRadius: 980, cursor: busy ? "default" : "pointer" }}
              >
                {busy ? "Enregistrement…" : "Enregistrer"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#b91c1c", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 16, border: "0.5px solid rgba(0,0,0,0.08)", padding: 24, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Nom de l'entreprise" editing={editing} value={form.company_name ?? ""} onChange={(v) => set("company_name", v)} inputStyle={input} labelStyle={label} staticStyle={staticVal} />
          <Field label="Secteur" editing={editing} value={form.sector ?? ""} onChange={(v) => set("sector", v)} inputStyle={input} labelStyle={label} staticStyle={staticVal} />
          <Field label="Taille" editing={editing} value={form.company_size ?? ""} onChange={(v) => set("company_size", v)} select={["", "1-10", "11-50", "51-200", "201-1000", "1000+"]} inputStyle={input} labelStyle={label} staticStyle={staticVal} />
          <Field label="Statut" editing={editing} value={form.status ?? "active"} onChange={(v) => set("status", v as B2BClient["status"])} select={["active", "archived"]} inputStyle={input} labelStyle={label} staticStyle={staticVal} />
          <Field label="Site web" editing={editing} value={form.website ?? ""} onChange={(v) => set("website", v)} inputStyle={input} labelStyle={label} staticStyle={staticVal} />
          <Field label="N° TVA" editing={editing} value={form.vat_number ?? ""} onChange={(v) => set("vat_number", v)} inputStyle={input} labelStyle={label} staticStyle={staticVal} />
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Adresse de facturation" editing={editing} value={form.billing_address ?? ""} onChange={(v) => set("billing_address", v)} textarea inputStyle={input} labelStyle={label} staticStyle={staticVal} />
          </div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "0.5px solid rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#86868B", marginBottom: 12 }}>
            Contact principal
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Prénom" editing={editing} value={form.contact_first_name ?? ""} onChange={(v) => set("contact_first_name", v)} inputStyle={input} labelStyle={label} staticStyle={staticVal} />
            <Field label="Nom" editing={editing} value={form.contact_last_name ?? ""} onChange={(v) => set("contact_last_name", v)} inputStyle={input} labelStyle={label} staticStyle={staticVal} />
            <Field label="Email" editing={editing} value={form.contact_email ?? ""} onChange={(v) => set("contact_email", v)} inputStyle={input} labelStyle={label} staticStyle={staticVal} />
            <Field label="Téléphone" editing={editing} value={form.contact_phone ?? ""} onChange={(v) => set("contact_phone", v)} inputStyle={input} labelStyle={label} staticStyle={staticVal} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Rôle" editing={editing} value={form.contact_role ?? ""} onChange={(v) => set("contact_role", v)} inputStyle={input} labelStyle={label} staticStyle={staticVal} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "0.5px solid rgba(0,0,0,0.08)" }}>
          <Field label="Notes internes" editing={editing} value={form.notes ?? ""} onChange={(v) => set("notes", v)} textarea inputStyle={input} labelStyle={label} staticStyle={staticVal} />
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, border: "0.5px solid rgba(0,0,0,0.08)", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", margin: 0, letterSpacing: "-0.02em" }}>
            Projets rattachés ({client.projects.length})
          </h2>
          <Link
            href={`/staff/dashboard/projects/new?client_id=${client.id}`}
            style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#fff", background: "#0A7A5A", borderRadius: 980, textDecoration: "none" }}
          >
            + Nouveau projet pour ce client
          </Link>
        </div>
        {client.projects.length === 0 ? (
          <p style={{ fontSize: 13, color: "#86868B", margin: 0 }}>Aucun projet rattaché à ce client.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {client.projects.map((p) => {
              const c = STATUS_COLORS[p.status] ?? STATUS_COLORS.draft;
              return (
                <Link
                  key={p.id}
                  href={`/staff/dashboard/projects/${p.id}`}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 18px", background: "#fafafa",
                    border: "0.5px solid rgba(0,0,0,0.06)", borderRadius: 12,
                    textDecoration: "none", color: "inherit", gap: 12, flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: "#86868B", marginTop: 2 }}>
                      Créé le {new Date(p.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <span style={{ padding: "4px 12px", fontSize: 11, fontWeight: 600, borderRadius: 980, background: c.bg, color: c.fg }}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmModal />
    </div>
  );
}

function Field({
  label, editing, value, onChange, textarea, select,
  inputStyle, labelStyle, staticStyle,
}: {
  label: string;
  editing: boolean;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  select?: string[];
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  staticStyle: React.CSSProperties;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {editing ? (
        select ? (
          <select style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)}>
            {select.map((s) => (
              <option key={s} value={s}>{s || "—"}</option>
            ))}
          </select>
        ) : textarea ? (
          <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} />
        )
      ) : (
        <div style={staticStyle}>{value || <span style={{ color: "#86868B" }}>—</span>}</div>
      )}
    </div>
  );
}
