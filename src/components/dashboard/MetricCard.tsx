interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number;
}

export default function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 20,
      border: "0.5px solid rgba(0,0,0,0.08)",
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <p style={{
        fontSize: 12,
        color: "#86868B",
        margin: 0,
        fontWeight: 500,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 28,
        fontWeight: 700,
        color: "#1d1d1f",
        margin: 0,
        letterSpacing: "-0.04em",
      }}>
        {value}
      </p>
    </div>
  );
}
