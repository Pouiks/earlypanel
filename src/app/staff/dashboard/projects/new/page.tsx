"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ProjectForm from "@/components/staff/ProjectForm";
import type { ProjectFormData } from "@/components/staff/ProjectForm";
import { useConfirm } from "@/components/ui/ConfirmModal";

function NewProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("client_id");
  const { notify, ConfirmModal } = useConfirm();

  async function handleCreate(data: ProjectFormData) {
    const res = await fetch("/api/staff/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      await notify({ title: "Erreur", message: err.error || "Erreur lors de la création" });
      return;
    }

    router.push("/staff/dashboard");
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/staff/dashboard"
          style={{
            fontSize: 13,
            color: "#86868B",
            textDecoration: "none",
            transition: "color 150ms",
          }}
        >
          &larr; Retour aux projets
        </Link>
      </div>

      <h1 style={{
        fontSize: 26,
        fontWeight: 700,
        color: "#1d1d1f",
        letterSpacing: "-0.04em",
        marginBottom: 28,
      }}>
        Nouveau projet
      </h1>

      <ProjectForm onSubmit={handleCreate} submitLabel="Créer le projet" initialClientId={initialClientId} />
      <ConfirmModal />
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#86868B" }}>Chargement…</div>}>
      <NewProjectContent />
    </Suspense>
  );
}
