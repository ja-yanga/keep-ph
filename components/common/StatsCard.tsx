import { startRouteProgress } from "@/lib/route-progress";
import Link from "next/link";

// High-contrast color for secondary text (WCAG AA compliant - 6.2:1 contrast ratio)
const TEXT_SECONDARY_COLOR = "#4A5568";

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
      onClick={() => startRouteProgress()}
      href={href}
      aria-label={
        ariaLabel || `${title}: ${value ?? description ?? "View details"}`
      }
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        padding: "clamp(0.75rem, 2vw, 1rem)",
        borderRadius: "1rem",
        border: "1px solid #e9ecef",
        borderLeft: `6px solid var(--mantine-color-${color}-filled)`,
        background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        transition: "transform 0.2s ease",
        minHeight: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "clamp(0.5rem, 2vw, 1rem)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            flex: 1,
            minWidth: 0, // Allows text to wrap properly
          }}
        >
          <span
            style={{
              fontSize: "clamp(0.625rem, 1.5vw, 0.75rem)",
              color: TEXT_SECONDARY_COLOR,
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
                  fontSize: "clamp(1.25rem, 4vw, 2.2rem)",
                  lineHeight: 1.1,
                  marginTop: "4px",
                  display: "block",
                  color: "#212529",
                  width: "100%",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  hyphens: "auto",
                }}
              >
                {value}
              </span>
              <span
                style={{
                  fontSize: "clamp(0.625rem, 1.5vw, 0.75rem)",
                  color: TEXT_SECONDARY_COLOR,
                  fontWeight: 600,
                  display: "block",
                  marginTop: "2px",
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
            width: "clamp(40px, 8vw, 52px)",
            height: "clamp(40px, 8vw, 52px)",
            minWidth: "clamp(40px, 8vw, 52px)",
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "scale(clamp(0.67, 8vw / 52px, 1))",
              transformOrigin: "center",
            }}
          >
            <Icon size={30} stroke={1.5} />
          </div>
        </div>
      </div>
    </Link>
  );
}
