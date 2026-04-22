"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Tester } from "@/types/tester";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import Step1Personal from "@/components/onboarding/Step1Personal";
import Step2Professional from "@/components/onboarding/Step2Professional";
import Step3Tools from "@/components/onboarding/Step3Tools";
import Step4Technical from "@/components/onboarding/Step4Technical";
import Step5Availability from "@/components/onboarding/Step5Availability";
import Toast from "@/components/ui/Toast";

const STEP_TITLES = [
  { title: "Informations personnelles", subtitle: "Quelques infos de base pour commencer" },
  { title: "Profil professionnel", subtitle: "Pour mieux vous associer aux bons produits" },
  { title: "Logiciels utilisés", subtitle: "Quels outils utilisez-vous au quotidien ?" },
  { title: "Configuration technique", subtitle: "Vos appareils et votre connexion" },
  { title: "Disponibilités", subtitle: "Pour vous envoyer les bonnes missions au bon moment" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [tester, setTester] = useState<Partial<Tester>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: "" });

  useEffect(() => {
    fetch("/api/testers/me")
      .then((r) => r.json())
      .then((data) => {
        setTester(data);
        setCurrentStep(data.profile_step || 1);
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  const hideToast = useCallback(() => setToast({ visible: false, message: "" }), []);

  async function saveStep(step: number, data: Partial<Tester>) {
    setLoading(true);
    try {
      const res = await fetch("/api/testers/onboarding/step", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, data }),
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      setTester((prev) => ({ ...prev, ...data, profile_step: step }));

      if (result.redirect) {
        router.push(result.redirect);
        return;
      }

      setToast({ visible: true, message: "Étape sauvegardée ✓" });
      setCurrentStep(step + 1);
    } catch (err) {
      setToast({ visible: true, message: `Erreur: ${err instanceof Error ? err.message : "Réessayez"}` });
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f7",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      }}>
        <p style={{ color: "#86868B", fontSize: 15 }}>Chargement…</p>
      </div>
    );
  }

  const { title, subtitle } = STEP_TITLES[currentStep - 1];

  return (
    <>
      <OnboardingLayout
        step={currentStep}
        totalSteps={5}
        title={title}
        subtitle={subtitle}
        onBack={() => setCurrentStep((s) => Math.max(1, s - 1))}
        showBack={currentStep > 1}
      >
        {currentStep === 1 && (
          <Step1Personal data={tester} onNext={(d) => saveStep(1, d)} loading={loading} />
        )}
        {currentStep === 2 && (
          <Step2Professional data={tester} onNext={(d) => saveStep(2, d)} loading={loading} />
        )}
        {currentStep === 3 && (
          <Step3Tools data={tester} onNext={(d) => saveStep(3, d)} loading={loading} />
        )}
        {currentStep === 4 && (
          <Step4Technical data={tester} onNext={(d) => saveStep(4, d)} loading={loading} />
        )}
        {currentStep === 5 && (
          <Step5Availability data={tester} onNext={(d) => saveStep(5, d)} loading={loading} />
        )}
      </OnboardingLayout>
      <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
    </>
  );
}
