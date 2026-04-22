"use client";
import { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqAccordionProps {
  eyebrow: string;
  title: string;
  items: FaqItem[];
}

export default function FaqAccordion({ eyebrow, title, items }: FaqAccordionProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  function toggle(idx: number) {
    setOpenIdx(openIdx === idx ? null : idx);
  }

  return (
    <section className="faq" id="faq">
      <div className="faq-inner">
        <div className="sec-eye">{eyebrow}</div>
        <div className="sec-title">{title}</div>
        <div className="faq-list">
          {items.map((item, i) => (
            <div key={i} className={`faq-item${openIdx === i ? " open" : ""}`}>
              <div className="faq-q" onClick={() => toggle(i)}>
                <h4>{item.q}</h4>
                <div className="faq-toggle">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
              </div>
              <div className="faq-a">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
