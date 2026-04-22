"use client";

import { useEffect, useRef } from "react";

export function useScrollReveal<T extends HTMLElement>(staggerDelay = 0.06) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const children = container.children;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "none";
          }
        });
      },
      { threshold: 0.1 }
    );

    Array.from(children).forEach((el, i) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.opacity = "0";
      htmlEl.style.transform = "translateY(14px)";
      htmlEl.style.transition = `opacity 0.5s ${i * staggerDelay}s ease, transform 0.5s ${i * staggerDelay}s ease`;
      observer.observe(htmlEl);
    });

    return () => observer.disconnect();
  }, [staggerDelay]);

  return containerRef;
}
