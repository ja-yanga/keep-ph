import React from "react";
import {
  Modal,
  Stack,
  Text,
  Select,
  Box,
  Paper,
  Group,
  Badge,
  Checkbox,
  TextInput,
  Button,
} from "@mantine/core";

type AddressOption = {
  id: string;
  label?: string;
  contact_name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postal?: string;
  country?: string;
  contact_phone?: string;
  is_default?: boolean;
  users?: Record<string, unknown> | null;
};

type Props = {
  opened: boolean;
  onClose: () => void;
  actionType: "RELEASE" | "DISPOSE" | "SCAN" | "CONFIRM_RECEIVED" | null;
  selectedPackage: Record<string, unknown> | null;
  addresses: AddressOption[];
  addressSelectData: Array<{ value: string; label: string }>;
  selectedAddressId: string | null;
  setSelectedAddressId: (v: string | null) => void;
  releaseToName: string;
  setReleaseToName: (v: string) => void;
  pickupOnBehalf: boolean;
  setPickupOnBehalf: (v: boolean) => void;
  behalfName: string;
  setBehalfName: (v: string) => void;
  behalfMobile: string;
  setBehalfMobile: (v: string) => void;
  behalfContactMode: "sms" | "viber" | "whatsapp";
  setBehalfContactMode: (v: "sms" | "viber" | "whatsapp") => void;
  isBehalfMobileValid: boolean;
  submitting: boolean;
  submitAction: () => Promise<void>;
};

export default function PackageActionModal({
  opened,
  onClose,
  actionType,
  selectedPackage,
  addresses,
  addressSelectData,
  selectedAddressId,
  setSelectedAddressId,
  releaseToName,
  setReleaseToName,
  pickupOnBehalf,
  setPickupOnBehalf,
  behalfName,
  setBehalfName,
  behalfMobile,
  setBehalfMobile,
  behalfContactMode,
  setBehalfContactMode,
  isBehalfMobileValid,
  submitting,
  submitAction,
}: Props) {
  // safe extractor for names from various user/KYC shapes
  const getKycName = (obj?: Record<string, unknown> | null): string => {
    if (!obj || typeof obj !== "object") return "";
    const kyc = obj["user_kyc_table"];
    if (kyc && typeof kyc === "object") {
      const fn = String(
        (kyc as Record<string, unknown>)["user_kyc_first_name"] ?? "",
      ).trim();
      const ln = String(
        (kyc as Record<string, unknown>)["user_kyc_last_name"] ?? "",
      ).trim();
      if (fn || ln) return `${fn} ${ln}`.trim();
    }
    const fn = String(
      obj["first_name"] ?? obj["users_first_name"] ?? "",
    ).trim();
    const ln = String(obj["last_name"] ?? obj["users_last_name"] ?? "").trim();
    if (fn || ln) return `${fn} ${ln}`.trim();
    const email = String(obj["users_email"] ?? obj["email"] ?? "").trim();
    if (email) {
      const at = email.indexOf("@");
      return at > 0 ? email.slice(0, at) : email;
    }
    const mobile = String(obj["mobile_number"] ?? "").trim();
    return mobile || "";
  };

  // derive recipient display name from available package/address shapes (no `any`)
  const deriveRecipientName = (): string => {
    if (releaseToName && releaseToName.trim()) return releaseToName.trim();

    // selected address first (if it contains a users object or contact_name)
    if (selectedAddressId) {
      const sel = addresses.find((a) => a.id === selectedAddressId);
      if (sel) {
        if (typeof sel.contact_name === "string" && sel.contact_name.trim())
          return sel.contact_name.trim();
        const nameFromAddrUser = getKycName(sel.users ?? null);
        if (nameFromAddrUser) return nameFromAddrUser;
      }
    }

    // package snapshot
    if (selectedPackage && typeof selectedPackage === "object") {
      const pkg = selectedPackage as Record<string, unknown>;
      const snap = pkg["release_to_name"] ?? pkg["releaseToName"];
      if (typeof snap === "string" && snap.trim()) return snap.trim();
      // check nested user shapes returned by server
      let userCandidate: Record<string, unknown> | null = null;
      if (pkg["users_table"] && typeof pkg["users_table"] === "object") {
        userCandidate = pkg["users_table"] as Record<string, unknown>;
      } else if (pkg["users"] && typeof pkg["users"] === "object") {
        userCandidate = pkg["users"] as Record<string, unknown>;
      } else if (pkg["user"] && typeof pkg["user"] === "object") {
        userCandidate = pkg["user"] as Record<string, unknown>;
      } else {
        userCandidate = null;
      }
      const nameFromPkgUser = getKycName(
        userCandidate ?? (pkg as Record<string, unknown>),
      );
      if (nameFromPkgUser) return nameFromPkgUser;
    }

    return "";
  };

  const recipientName = deriveRecipientName();

  // removed unused `recipientDisplay` to satisfy ESLint (use `recipientName` / `releaseToName` where needed)

  // avoid nested ternary usage by computing values up-front
  let titleText = "";
  if (actionType === "CONFIRM_RECEIVED") {
    titleText = "Confirm Receipt";
  } else if (actionType) {
    titleText = `Request ${actionType.replace(/_/g, " ")}`;
  }

  let descriptionText = "";
  if (actionType === "CONFIRM_RECEIVED") {
    descriptionText =
      "Are you sure you have received this package? This will mark it as RETRIEVED.";
  } else if (actionType) {
    descriptionText = `Are you sure you want to request to ${actionType.toLowerCase()} this package?`;
  }

  // safe extractor for nested user object shapes
  const safeGetUser = (
    pkg: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> => {
    if (!pkg || typeof pkg !== "object") return {};
    const candidate =
      (pkg as Record<string, unknown>)["user"] ??
      (pkg as Record<string, unknown>)["users"] ??
      (pkg as Record<string, unknown>)["user_data"] ??
      null;
    return candidate && typeof candidate === "object"
      ? (candidate as Record<string, unknown>)
      : {};
  };

  const addressesAvailable = addresses.length > 0;
  const userName = getUsername(safeGetUser(selectedPackage));

  const releaseMissingRecipient =
    actionType === "RELEASE" &&
    !pickupOnBehalf &&
    addressesAvailable &&
    !selectedAddressId &&
    !releaseToName &&
    !selectedPackage?.release_to_name &&
    !userName;

  const pickupInvalid =
    actionType === "RELEASE" &&
    pickupOnBehalf &&
    (!behalfName || !isBehalfMobileValid);

  const confirmDisabled =
    actionType === "RELEASE" ? releaseMissingRecipient || pickupInvalid : false;

  // Avoid nested ternary in JSX by extracting address preview renderer
  const renderAddressPreview = (): React.ReactNode => {
    // normalize possibly-unknown package fields to strings to satisfy JSX/ReactNode typing
    const releaseAddressStr =
      selectedPackage && selectedPackage.release_address !== undefined
        ? String(
            (selectedPackage as Record<string, unknown>).release_address ?? "",
          )
        : "";
    const releaseToNameStr =
      selectedPackage && selectedPackage.release_to_name !== undefined
        ? String(
            (selectedPackage as Record<string, unknown>).release_to_name ?? "",
          )
        : "";

    if (selectedAddressId) {
      const sel = addresses.find((a) => a.id === selectedAddressId);
      if (!sel) return <Text c="dimmed">Loading address...</Text>;

      return (
        <Paper withBorder p="sm" radius="md" bg="gray.0">
          <Group justify="space-between" align="center">
            <div>
              <Text fw={600} size="sm">
                {sel.label || "Unnamed Address"}
              </Text>
            </div>
            {sel.is_default && (
              <Badge ml="xs" size="xs" color="blue" variant="light">
                Default
              </Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed" mt="8px">
            {sel.line1}
            {sel.line2 ? `, ${sel.line2}` : ""}
          </Text>
          <Text size="sm" c="dimmed">
            {[sel.city, sel.region, sel.postal, sel.country]
              .filter(Boolean)
              .join(", ")}
          </Text>
          {sel.contact_phone && (
            <Text size="xs" c="dimmed" mt="4px">
              Phone: {sel.contact_phone}
            </Text>
          )}
        </Paper>
      );
    }

    if (releaseAddressStr) {
      return (
        <Paper withBorder p="sm" radius="md" bg="gray.0">
          <Text fw={600} size="sm">
            Saved release snapshot
          </Text>
          <Text size="sm" c="dimmed">
            {releaseAddressStr}
          </Text>
          {releaseToNameStr || recipientName ? (
            <Text size="xs" c="dimmed" mt="4px">
              Recipient: {releaseToNameStr || recipientName}
            </Text>
          ) : null}
        </Paper>
      );
    }

    return <Text c="dimmed">No shipping address selected.</Text>;
  };

  return (
    <Modal opened={opened} onClose={onClose} title={titleText} centered>
      <Stack>
        <Text size="sm">{descriptionText}</Text>

        {actionType === "RELEASE" && (
          <>
            <Select
              label="Shipping Address (required)"
              placeholder="Select a saved address for shipping"
              required
              searchable
              clearable={false}
              maxDropdownHeight={320}
              data={addressSelectData}
              value={selectedAddressId}
              onChange={(v) => {
                setSelectedAddressId(v);
                const sel = addresses.find((x) => x.id === v);
                if (sel?.contact_name) setReleaseToName(sel.contact_name);
              }}
              renderOption={({ option }) => {
                const a = addresses.find((addr) => addr.id === option.value);
                if (!a) return null;
                return (
                  <Stack gap={2}>
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <Text
                        fw={600}
                        size="sm"
                        style={{ overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        {a.label || "Unnamed Address"}
                      </Text>
                      {a.is_default && (
                        <Badge variant="light" color="blue" size="sm">
                          DEFAULT
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="gray.7">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}
                    </Text>
                    <Text size="xs" c="gray.7">
                      {[a.city, a.region, a.postal, a.country]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </Stack>
                );
              }}
            />

            <Box mt="md">{renderAddressPreview()}</Box>

            <Group align="center" mt="sm" mb="sm" gap="sm">
              <Checkbox
                checked={pickupOnBehalf}
                onChange={(e) => setPickupOnBehalf(!!e.currentTarget.checked)}
                label="Pickup on behalf"
              />
            </Group>

            {pickupOnBehalf && (
              <Stack>
                <TextInput
                  label="Name of person picking up (required)"
                  placeholder="Full name"
                  value={behalfName}
                  onChange={(e) => setBehalfName(e.currentTarget.value)}
                  required
                />
                <TextInput
                  label="Mobile number (required)"
                  placeholder="0912XXXXXXX"
                  value={behalfMobile}
                  onChange={(e) =>
                    setBehalfMobile(
                      e.currentTarget.value.replace(/\D/g, "").slice(0, 11),
                    )
                  }
                  required
                  maxLength={11}
                  error={
                    behalfMobile.length > 0 && !isBehalfMobileValid
                      ? "Mobile must start with 09 and be 11 digits"
                      : undefined
                  }
                />
                <Select
                  label="Preferred contact method"
                  data={[
                    { value: "sms", label: "SMS" },
                    { value: "viber", label: "Viber" },
                    { value: "whatsapp", label: "WhatsApp" },
                  ]}
                  value={behalfContactMode}
                  onChange={(v) =>
                    setBehalfContactMode(
                      (v || "sms") as "sms" | "viber" | "whatsapp",
                    )
                  }
                />
              </Stack>
            )}
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="blue"
            onClick={() => void submitAction()}
            loading={submitting}
            disabled={confirmDisabled}
          >
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// Derive a readable username from a user record
export function getUsername(user: Record<string, unknown>): string {
  // prefer KYC table object when present
  const kycTable = user.user_kyc_table as
    | {
        user_kyc_status?: string;
        user_kyc_first_name?: string;
        user_kyc_last_name?: string;
      }
    | undefined;

  let firstName: unknown;
  let lastName: unknown;
  let kycStatus: unknown;

  if (kycTable && typeof kycTable === "object") {
    firstName = kycTable.user_kyc_first_name;
    lastName = kycTable.user_kyc_last_name;
    kycStatus = kycTable.user_kyc_status;
  } else {
    firstName = user.user_kyc_first_name ?? user.user_kyc_firstname;
    lastName = user.user_kyc_last_name ?? user.user_kyc_lastname;
    kycStatus = user.user_kyc_status;
  }

  const f = typeof firstName === "string" ? firstName.trim() : "";
  const l = typeof lastName === "string" ? lastName.trim() : "";
  const status = typeof kycStatus === "string" ? kycStatus.toUpperCase() : "";

  if (status === "VERIFIED" && f && l) return `${f} ${l}`;
  if (f && l) return `${f} ${l}`;
  if (f) return f;

  const email =
    typeof user.users_email === "string" ? user.users_email.trim() : "";
  if (email) {
    const at = email.indexOf("@");
    return at > 0 ? email.slice(0, at) : email;
  }

  const mobile =
    typeof user.mobile_number === "string" ? user.mobile_number.trim() : "";
  if (mobile) return mobile;

  return "User";
}

/* Example:
const u = {
  users_id: "f7c73865-d886-4980-82ff-19d5096a7ddf",
  users_email: "jcyanga.test2@gmail.com",
  mobile_number: "09111111111",
  user_kyc_table: { user_kyc_status: "VERIFIED", user_kyc_last_name: "Y", user_kyc_first_name: "Allen" }
 };
getUsername(u); // "Allen Y"
*/
