import { RawRow } from "./types";

/**
 * Extracts subscriber name from KYC data or falls back to location/ID
 */
export const extractSubscriberName = (
  raw: RawRow,
  locationName: string | null,
): string => {
  const userObj = raw.users_table ?? null;
  const kyc = userObj?.user_kyc_table ?? null;
  const first = kyc?.user_kyc_first_name ?? null;
  const last = kyc?.user_kyc_last_name ?? null;

  if (first || last) {
    const parts: string[] = [];
    if (first) parts.push(String(first));
    if (last) parts.push(String(last));
    return parts.join(" ");
  }

  return (
    locationName ??
    `Mailroom #${String(raw.mailroom_registration_id ?? "").slice(0, 8)}`
  );
};
