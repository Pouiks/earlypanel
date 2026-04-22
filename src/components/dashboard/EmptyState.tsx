interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  extra?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, extra }: EmptyStateProps) {
  return (
    <div style={{
      textAlign: "center",
      padding: "48px 24px",
      background: "#fff",
      borderRadius: 20,
      border: "0.5px solid rgba(0,0,0,0.08)",
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "#f5f5f7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 16px",
        fontSize: 24,
      }}>
        {icon}
      </div>
      <p style={{
        fontSize: 16,
        fontWeight: 600,
        color: "#1d1d1f",
        margin: "0 0 6px",
      }}>
        {title}
      </p>
      <p style={{
        fontSize: 14,
        color: "#86868B",
        margin: 0,
        lineHeight: 1.5,
        maxWidth: 360,
        marginLeft: "auto",
        marginRight: "auto",
      }}>
        {description}
      </p>
      {extra && <div style={{ marginTop: 16 }}>{extra}</div>}
    </div>
  );
}
