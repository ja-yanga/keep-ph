import Link from "next/link";

// StatCard as a pure HTML/CSS Server Component - Zero external dependencies
export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  href,
  customContent,
  "aria-label": ariaLabel,
}: {
  title: string;
  value?: number | string;
  description?: string;
  icon: React.ComponentType<{ size?: number; color?: string; stroke?: number }>;
  color: string;
  href: string;
  customContent?: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={
        ariaLabel || `${title}: ${value ?? description ?? "View details"}`
      }
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        padding: "1rem",
        borderRadius: "1rem",
        border: "1px solid #e9ecef",
        borderLeft: `6px solid var(--mantine-color-${color}-filled)`,
        background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        transition: "transform 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            flex: 1,
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              color: "#495057",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {title}
          </span>
          {customContent ? (
            customContent
          ) : (
            <>
              <span
                style={{
                  fontWeight: 900,
                  fontSize: "2.2rem",
                  lineHeight: 1,
                  marginTop: "4px",
                  display: "block",
                  color: "#212529",
                }}
              >
                {value}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#495057",
                  fontWeight: 600,
                  display: "block",
                }}
              >
                {description}
              </span>
            </>
          )}
        </div>
        <div
          style={{
            backgroundColor: `var(--mantine-color-${color}-light)`,
            color: `var(--mantine-color-${color}-filled)`,
            width: "52px",
            height: "52px",
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={30} stroke={1.5} />
        </div>
      </div>
    </Link>
  );
}
