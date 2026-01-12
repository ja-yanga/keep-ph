import { Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  onClick,
  customContent,
}: {
  title: string;
  value?: number | string;
  description?: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  onClick: () => void;
  customContent?: React.ReactNode;
}) {
  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      shadow="sm"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${title}: ${value ?? description ?? "View details"}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
        borderLeft: `4px solid var(--mantine-color-${color}-6)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "var(--mantine-shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--mantine-shadow-sm)";
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" fw={700} tt="uppercase">
            {title}
          </Text>
          {customContent ? (
            customContent
          ) : (
            <>
              <Text fw={800} size="2rem" lh={1} mt={4}>
                {value}
              </Text>
              <Text size="xs" c="dimmed" fw={500}>
                {description}
              </Text>
            </>
          )}
        </Stack>
        <ThemeIcon
          color={color}
          variant="light"
          size={48}
          radius="md"
          style={{ opacity: 0.8 }}
        >
          <Icon size={28} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
