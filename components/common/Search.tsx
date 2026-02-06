import { memo } from "react";
import { TextInput, Group, ActionIcon } from "@mantine/core";
import { IconSearch, IconX, IconArrowRight } from "@tabler/icons-react";

export const Search = memo(
  ({
    searchInput,
    setSearchInput,
    handleClearSearch,
    handleSearchSubmit,
    handleSearchKeyPress,
    placeholder = "Search...",
  }: {
    searchInput: string;
    setSearchInput: (v: string) => void;
    handleClearSearch: () => void;
    handleSearchSubmit: () => void;
    handleSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => (
    <TextInput
      placeholder={placeholder}
      aria-label="Search"
      data-testid="search-input"
      leftSection={<IconSearch size={16} aria-hidden="true" />}
      rightSectionWidth={searchInput ? 70 : 42}
      rightSection={
        searchInput ? (
          <Group gap={4}>
            <ActionIcon
              size="sm"
              variant="transparent"
              c="gray.7"
              onClick={handleClearSearch}
              aria-label="Clear search"
              title="Clear search"
              data-testid="clear-search-button"
            >
              <IconX size={16} aria-hidden="true" />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="transparent"
              c="indigo"
              onClick={handleSearchSubmit}
              aria-label="Submit search"
              title="Submit search"
              data-testid="submit-search-button"
            >
              <IconArrowRight size={16} aria-hidden="true" />
            </ActionIcon>
          </Group>
        ) : (
          <ActionIcon
            size="sm"
            variant="transparent"
            c="gray.7"
            onClick={handleSearchSubmit}
            aria-label="Submit search"
            title="Submit search"
            data-testid="submit-search-button"
          >
            <IconArrowRight size={16} aria-hidden="true" />
          </ActionIcon>
        )
      }
      value={searchInput}
      onChange={(e) => setSearchInput(e.currentTarget.value)}
      onKeyDown={handleSearchKeyPress}
      style={{ flex: "1 1 300px" }}
    />
  ),
);

Search.displayName = "Search";
