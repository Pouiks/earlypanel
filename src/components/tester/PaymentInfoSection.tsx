"use client";

import { useEffect, useState } from "react";
import { FISCAL_RESIDENCE_COUNTRIES, formatIban, validateIban } from "@/lib/iban";

interface PaymentInfo {
  configured: boolean;
  iban_last4?: string;
  iban_country?: string;
  bic?: string | null;
  account_holder_name?: string;
  fiscal_residence_country?: string;
  cgu_signed_at?: string;
  cgu_version?: string;
  cgu_current_version?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  fontSize: 15,
  border: "0.5px solid rgba(0,0,0,0.12)",
  borderRadius: 12,
  outline: "none",
  background: "#f5f5f7",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#1d1d1f",
  marginBottom: 6,
};

const sectionStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  border: "0.5px solid rgba(0,0,0,0.08)",
  padding: "24px",
  marginBottom: 16,
};

export default function PaymentInfoSection() {
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form state
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [holder, setHolder] = useState("");
  const [fiscalCountry, setFiscalCountry] = useState("FR");
  const [acceptCgu, setAcceptCgu] = useState(false);

  // CGU modal
  const [cguOpen, setCguOpen] = useState(false);
  const [cguText, setCguText] = useState<string | null>(null);
  const [cguVersion, setCguVersion] = useState<string>("");

  async function fetchInfo() {
    setLoading(true);
    try {
      const res = await fetch("/api/testers/me/payment-info");
      if (res.ok) {
        const data = (await res.json()) as PaymentInfo;
        setInfo(data);
        if (!data.configured) {
          setEditing(true);
        }
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInfo();
  }, []);

  async function openCgu() {
    if (!cguText) {
      try {
        const res = await fetch("/api/testers/me/payment-info/cgu");
        if (res.ok) {
          const data = await res.json();
          setCguText(data.text);
          setCguVersion(data.version);
        }
      } catch {
        /* noop */
      }
    }
    setCguOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const ibanCheck = validateIban(iban);
    if (!ibanCheck.valid) {
      setErrorMsg(ibanCheck.reason);
      return;
    }
    if (!holder.trim()) {
      setErrorMsg("Le nom du titulaire est requis.");
      return;
    }
    if (!acceptCgu) {
      setErrorMsg("Vous devez accepter les CGU testeur pour continuer.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/testers/me/payment-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iban: ibanCheck.clean,
          bic: bic.trim() || undefined,
          account_holder_name: holder.trim(),
          fiscal_residence_country: fiscalCountry,
          accept_cgu: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'enregistrement");
      }
      setSuccessMsg("Informations bancaires enregistrees.");
      setIban("");
      setBic("");
      setAcceptCgu(false);
      setEditing(false);
      await fetchInfo();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer votre IBAN ? Vous ne pourrez plus recevoir de paiements tant qu'un nouvel IBAN n'aura pas ete renseigne.")) {
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/testers/me/payment-info", {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la suppression");
      }
      setSuccessMsg("IBAN supprime.");
      setEditing(true);
      setHolder("");
      setIban("");
      setBic("");
      setFiscalCountry("FR");
      await fetchInfo();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={sectionStyle}>
        <div style={{ color: "#86868B", fontSize: 14 }}>Chargement…</div>
      </div>
    );
  }

  // Vue "configured" : on n'affiche jamais l'IBAN clair, seulement le last4.
  if (info?.configured && !editing) {
    return (
      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>
            Informations bancaires
          </h2>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#0A7A5A",
            background: "#f0faf5",
            padding: "4px 10px",
            borderRadius: 980,
          }}>
            ✓ Configure
          </span>
        </div>

        <div style={{
          background: "#f5f5f7",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 16,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>IBAN</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f", fontFamily: "monospace" }}>
                {info.iban_country} •••• •••• ••{info.iban_last4}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Titulaire</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>
                {info.account_holder_name}
              </div>
            </div>
          </div>
          {info.bic && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>BIC</div>
              <div style={{ fontSize: 13, color: "#1d1d1f", fontFamily: "monospace" }}>{info.bic}</div>
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 12, color: "#86868B" }}>
            CGU signees le {info.cgu_signed_at ? new Date(info.cgu_signed_at).toLocaleDateString("fr-FR") : "—"} (version {info.cgu_version})
            {info.cgu_current_version && info.cgu_version !== info.cgu_current_version && (
              <span style={{ display: "block", color: "#92400e", marginTop: 4, fontWeight: 600 }}>
                Une nouvelle version des CGU est disponible. Mettez a jour votre IBAN pour resigner.
              </span>
            )}
          </div>
        </div>

        {successMsg && (
          <div style={{ fontSize: 13, color: "#0A7A5A", marginBottom: 12 }}>{successMsg}</div>
        )}
        {errorMsg && (
          <div style={{ fontSize: 13, color: "#e53e3e", marginBottom: 12 }}>{errorMsg}</div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { setEditing(true); setHolder(info.account_holder_name || ""); setFiscalCountry(info.fiscal_residence_country || "FR"); }}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 700,
              background: "#0A7A5A",
              color: "#fff",
              border: "none",
              borderRadius: 980,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Modifier
          </button>
          <button
            onClick={handleDelete}
            disabled={submitting}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 700,
              background: "#fff",
              color: "#e53e3e",
              border: "1.5px solid #e53e3e",
              borderRadius: 980,
              cursor: submitting ? "wait" : "pointer",
              fontFamily: "inherit",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Supprimer
          </button>
        </div>
      </div>
    );
  }

  // Vue "edit" : formulaire de saisie (initial ou modification).
  return (
    <div style={sectionStyle}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: "0 0 6px" }}>
        Informations bancaires
      </h2>
      <p style={{ fontSize: 13, color: "#6e6e73", margin: "0 0 16px", lineHeight: 1.5 }}>
        Renseignez votre IBAN pour être payé par virement SEPA après chaque mission validée.
      </p>

      <div style={{
        background: "#f0faf5",
        borderRadius: 12,
        padding: "12px 16px",
        marginBottom: 20,
        border: "1px solid #c8e6d4",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}>
        <div style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#0A7A5A",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
        }}>i</div>
        <p style={{ fontSize: 12, color: "#0A7A5A", margin: 0, lineHeight: 1.5 }}>
          Cet IBAN nous sert uniquement à vous verser vos paiements après mission. Il ne permet aucun prélèvement de votre compte. Vous pouvez le modifier ou le supprimer à tout moment.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Nom du titulaire du compte *</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="Tel qu'il apparait sur votre RIB"
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
            maxLength={100}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>IBAN *</label>
          <input
            style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.05em" }}
            type="text"
            placeholder="FR76 1234 5678 9012 3456 7890 123"
            value={formatIban(iban)}
            onChange={(e) => setIban(e.target.value)}
            autoComplete="off"
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>BIC <span style={{ color: "#86868B", fontWeight: 400 }}>(optionnel)</span></label>
          <input
            style={{ ...inputStyle, fontFamily: "monospace" }}
            type="text"
            placeholder="Souvent pre-rempli automatiquement par votre banque"
            value={bic}
            onChange={(e) => setBic(e.target.value.toUpperCase())}
            maxLength={11}
            autoComplete="off"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Pays de residence fiscale *</label>
          <select
            style={{ ...inputStyle, appearance: "none" as const }}
            value={fiscalCountry}
            onChange={(e) => setFiscalCountry(e.target.value)}
            required
          >
            {FISCAL_RESIDENCE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        <div style={{
          background: "#f5f5f7",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 16,
        }}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={acceptCgu}
              onChange={(e) => setAcceptCgu(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: "#1d1d1f", lineHeight: 1.5 }}>
              J&apos;accepte les{" "}
              <button
                type="button"
                onClick={openCgu}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0A7A5A",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "inherit",
                  fontSize: 13,
                  textDecoration: "underline",
                }}
              >
                conditions generales testeur
              </button>
              {" "}et j&apos;autorise earlypanel à effectuer des virements SEPA vers cet IBAN pour le paiement de mes missions de test.
            </span>
          </label>
        </div>

        {errorMsg && (
          <div style={{
            fontSize: 13,
            color: "#e53e3e",
            background: "#fef2f2",
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 12,
          }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 700,
              background: "#0A7A5A",
              color: "#fff",
              border: "none",
              borderRadius: 980,
              cursor: submitting ? "wait" : "pointer",
              fontFamily: "inherit",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Enregistrement…" : info?.configured ? "Mettre a jour" : "Enregistrer"}
          </button>
          {info?.configured && (
            <button
              type="button"
              onClick={() => { setEditing(false); setErrorMsg(""); }}
              disabled={submitting}
              style={{
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 700,
                background: "#fff",
                color: "#1d1d1f",
                border: "1.5px solid rgba(0,0,0,0.15)",
                borderRadius: 980,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      {cguOpen && (
        <div
          onClick={() => setCguOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 28,
              maxWidth: 640,
              width: "100%",
              maxHeight: "85vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>
                Conditions generales testeur ({cguVersion})
              </h3>
              <button
                onClick={() => setCguOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  color: "#86868B",
                  cursor: "pointer",
                  padding: 0,
                  width: 32,
                  height: 32,
                }}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <pre style={{
              fontFamily: "inherit",
              fontSize: 13,
              color: "#1d1d1f",
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
              margin: 0,
            }}>
              {cguText || "Chargement…"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
