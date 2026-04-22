"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  target: string | Date;
  prefix?: string;
  onExpire?: () => void;
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  expired: boolean;
}

function computeTimeLeft(target: Date): TimeLeft {
  const now = new Date();
  const totalMs = target.getTime() - now.getTime();
  if (totalMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, expired: true };
  }
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const seconds = Math.floor((totalMs / 1000) % 60);
  return { days, hours, minutes, seconds, totalMs, expired: false };
}

export default function CountdownTimer({
  target,
  prefix,
  onExpire,
  compact = false,
}: CountdownTimerProps) {
  const targetDate = typeof target === "string" ? new Date(target) : target;
  const [tl, setTl] = useState<TimeLeft>(() => computeTimeLeft(targetDate));

  useEffect(() => {
    const next = computeTimeLeft(targetDate);
    setTl(next);

    // Si > 24h, mise a jour toutes les minutes ; sinon chaque seconde
    const interval = next.totalMs > 24 * 60 * 60 * 1000 ? 60_000 : 1_000;

    const id = setInterval(() => {
      const t = computeTimeLeft(targetDate);
      setTl(t);
      if (t.expired) {
        clearInterval(id);
        onExpire?.();
      }
    }, interval);

    return () => clearInterval(id);
  }, [targetDate.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  if (tl.expired) {
    return (
      <span style={{ color: "#dc2626", fontWeight: 700, fontSize: compact ? 13 : 14 }}>
        Délai dépassé
      </span>
    );
  }

  const under24h = tl.totalMs <= 24 * 60 * 60 * 1000;
  const urgent = tl.totalMs <= 2 * 60 * 60 * 1000;
  const color = urgent ? "#dc2626" : under24h ? "#d97706" : "#0A7A5A";

  const display = under24h
    ? `${String(tl.hours).padStart(2, "0")}h ${String(tl.minutes).padStart(2, "0")}min ${String(tl.seconds).padStart(2, "0")}s`
    : `${tl.days}j ${tl.hours}h`;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color,
        fontWeight: 700,
        fontSize: compact ? 13 : 14,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {prefix && <span style={{ fontWeight: 500, color: "#6e6e73" }}>{prefix}</span>}
      {display}
    </span>
  );
}
