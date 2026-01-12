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
  icon: React.ComponentType<{ size?: number; color?: string; stroke?: number }>;
  color: string;
  onClick: () => void;
  customContent?: React.ReactNode;
}) {
  return (
    <Paper
      withBorder
      p="md"
      radius="lg"
      shadow="xs"
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
        borderLeft: `6px solid var(--mantine-color-${color}-filled)`,
        background: `linear-gradient(135deg, var(--mantine-color-white) 0%, var(--mantine-color-gray-0) 100%)`,
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Text size="xs" c="dark.3" fw={700} tt="uppercase" lts="0.05em">
            {title}
          </Text>
          {customContent ? (
            customContent
          ) : (
            <>
              <Text fw={900} size="2.2rem" lh={1} mt={4}>
                {value}
              </Text>
              <Text size="xs" c="dark.3" fw={600}>
                {description}
              </Text>
            </>
          )}
        </Stack>
        <ThemeIcon
          color={color}
          variant="light"
          size={52}
          radius="md"
          style={{
            flexShrink: 0,
          }}
        >
          <Icon size={30} stroke={1.5} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
