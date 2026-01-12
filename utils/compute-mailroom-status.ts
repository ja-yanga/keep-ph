import { MailroomStatus } from "./types";

/**
 * Computes mailroom status based on expiry date and auto-renew setting
 */
export const computeMailroomStatus = (
  expiry: string | null,
  autoRenew: boolean,
  registrationStatus: boolean | null,
): MailroomStatus => {
  if (expiry) {
    const expiryDate = new Date(expiry);
    const diff = expiryDate.getTime() - Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    if (diff <= 0) {
      return autoRenew ? "ACTIVE" : "INACTIVE";
    }
    if (diff <= sevenDaysInMs) {
      return autoRenew ? "ACTIVE" : "EXPIRING";
    }
    return "ACTIVE";
  }
  return registrationStatus ? "ACTIVE" : "INACTIVE";
};
