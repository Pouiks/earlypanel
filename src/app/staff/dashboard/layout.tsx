"use client";

import { useState, useEffect, createContext, useContext } from "react";
import type { StaffMember } from "@/types/staff";
import StaffSidebar from "@/components/staff/StaffSidebar";
import StaffHeader from "@/components/staff/StaffHeader";

interface StaffContextValue {
  staff: StaffMember | null;
  refreshStaff: () => Promise<void>;
}

const StaffContext = createContext<StaffContextValue>({
  staff: null,
  refreshStaff: async () => {},
});

export function useStaff() {
  return useContext(StaffContext);
}

export default function StaffDashboardLayout({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<StaffMember | null>(null);

  async function fetchStaff() {
    try {
      const res = await fetch("/api/staff/me");
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch {
      // retry on next refresh
    }
  }

  useEffect(() => {
    fetchStaff();
  }, []);

  return (
    <StaffContext.Provider value={{ staff, refreshStaff: fetchStaff }}>
      <div style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
        background: "#f5f5f7",
        minHeight: "100vh",
      }}>
        <div className="staff-sidebar-desktop">
          <StaffSidebar />
        </div>

        <div className="staff-content">
          <StaffHeader
            firstName={staff?.first_name ?? null}
            lastName={staff?.last_name ?? null}
          />
          {children}
        </div>
      </div>

      <style jsx>{`
        .staff-sidebar-desktop {
          display: block;
        }
        .staff-content {
          margin-left: 240px;
          padding: 0 40px 40px;
          min-height: 100vh;
        }
        @media (max-width: 768px) {
          .staff-sidebar-desktop {
            display: none;
          }
          .staff-content {
            margin-left: 0;
            padding: 0 20px 40px;
          }
        }
      `}</style>
    </StaffContext.Provider>
  );
}
