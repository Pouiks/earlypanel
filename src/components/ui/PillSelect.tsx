"use client";

interface PillSelectProps {
  options: string[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
}

export default function PillSelect({ options, value, onChange, multiple = false }: PillSelectProps) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];

  function toggle(option: string) {
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      const next = arr.includes(option)
        ? arr.filter((v) => v !== option)
        : [...arr, option];
      onChange(next);
    } else {
      onChange(option === value ? "" : option);
    }
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            style={{
              padding: "8px 18px",
              fontSize: 14,
              fontWeight: isSelected ? 600 : 400,
              fontFamily: "inherit",
              borderRadius: 980,
              border: isSelected ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.12)",
              background: isSelected ? "#f0faf5" : "#fff",
              color: isSelected ? "#0A7A5A" : "#1d1d1f",
              cursor: "pointer",
              transition: "all 200ms",
              whiteSpace: "nowrap",
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
