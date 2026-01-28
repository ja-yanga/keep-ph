import { T_RawKycDetails } from "../transform/kyc-details";

// Avoid using 'as' whenever possible. Prefer type guards and explicit runtime validation.
function isRawKycDetails(obj: unknown): obj is T_RawKycDetails {
  // You may need to tune this to your T_RawKycDetails fields.
  return (
    typeof obj === "object" &&
    obj !== null &&
    ("firstName" in obj || "lastName" in obj || "user" in obj)
  );
}

export const normalizeKycData = (payload: unknown): T_RawKycDetails | null => {
  if (!payload) return null;

  if (Array.isArray(payload) && payload.length > 0) {
    if (isRawKycDetails(payload[0])) {
      return payload[0];
    }
    return null;
  }

  if (typeof payload !== "object" || payload === null) return null;

  const obj = payload as Record<string, unknown>;

  if (typeof obj.kyc === "object" && obj.kyc !== null) {
    if (isRawKycDetails(obj.kyc)) {
      return obj.kyc;
    }
  }

  if (typeof obj.data === "object" && obj.data !== null) {
    const pdata = obj.data as Record<string, unknown>;
    if (typeof pdata.kyc === "object" && pdata.kyc !== null) {
      if (isRawKycDetails(pdata.kyc)) {
        return pdata.kyc;
      }
    }
    if (isRawKycDetails(pdata)) {
      return pdata;
    }
    return null;
  }

  if (isRawKycDetails(obj)) {
    return obj;
  }

  return null;
};
