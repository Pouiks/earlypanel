"use client";

interface NotificationBadgeProps {
  count: number;
  type?: "alert" | "info";
}

export default function NotificationBadge({ count, type = "alert" }: NotificationBadgeProps) {
  if (count <= 0) return null;

  const bg = type === "alert" ? "#ef4444" : "#0A7A5A";

  return (
    <span style={{
      minWidth: 18,
      height: 18,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 980,
      background: bg,
      color: "#fff",
      fontSize: 10,
      fontWeight: 700,
      padding: "0 5px",
      lineHeight: 1,
    }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
