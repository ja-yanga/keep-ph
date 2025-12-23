export type UserKycStatusEnum = "SUBMITTED" | "VERIFIED" | "REJECTED";

export type MailroomPlan = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  storageLimit: number | null;
  canReceiveMail: boolean;
  canReceiveParcels: boolean;
  canDigitize: boolean;
};

export type ReferralRow = {
  referral_id?: string;
  referrals_id?: string;
  id?: string;
  referral_service_type?: string | null;
  referrals_service_type?: string | null;
  service_type?: string | null;
  referrals_referred_email?: string | null;
  referral_referred_email?: string | null;
  referral_referred_user_email?: string | null;
  referred_email?: string | null;
  referral_referred_user_id?: string | number | null;
  referral_date_created?: string | null;
  referrals_date_created?: string | null;
  date_created?: string | null;
  created_at?: string | null;
};

export type ClaimRow = {
  id?: string;
  amount?: number | null;
  payment_method?: string | null;
  account_details?: string | null;
  status?: string | null;
  referral_count?: number | null;
  created_at?: string | null;
  processed_at?: string | null;
  proof_path?: string | null;
  proof_url?: string | null;
};

export type RpcClaim = Record<string, unknown>;

export type ClaimWithUrl = {
  id: string;
  user_id: string;
  payment_method: string | null;
  account_details: string | null;
  amount: number | null;
  status: string | null;
  referral_count: number | null;
  created_at: string | null;
  processed_at: string | null;
  proof_path: string | null;
  proof_url: string | null;
};

export type RewardsStatusResult = {
  threshold: number;
  amount: number;
  referralCount: number;
  eligible: boolean;
  hasClaim: boolean;
  claims: ClaimWithUrl[];
};

export type RewardClaimModalProps = {
  opened: boolean;
  onCloseAction: () => void;
  userId?: string | null;
  onSuccessAction?: () => void;
  isLoading?: boolean;
};

export type RpcClaimResponse = {
  ok?: boolean;
  claim?: unknown;
  error?: string;
  status?: number;
};

export type RequestRewardClaimArgs = {
  userId: string;
  paymentMethod: string;
  accountDetails: string;
};

export type NormalizedReferral = {
  id: string;
  service: string;
  email: string;
  dateText: string;
  status: string;
};

export type ReferralsTableProps = {
  records: ReferralRow[];
  loading?: boolean;
};

export type AdminRewardUser = {
  id?: string | null;
  email?: string | null;
  referral_code?: string | null;
};

export type RpcAdminClaim = {
  id: string;
  user_id: string;
  payment_method: string | null;
  account_details: string | null;
  amount: number | null;
  status: string | null;
  referral_count: number | null;
  created_at: string | null;
  processed_at: string | null;
  proof_path: string | null;
  user?: AdminRewardUser | null;
};

export type AdminClaim = ClaimWithUrl & {
  user: AdminRewardUser | null;
};

export type AdminUpdateClaimResponse = {
  ok: boolean;
  claim?: RpcAdminClaim;
  error?: string;
};

export type AdminUser = {
  email?: string | null;
  users_email?: string | null;
  // first_name?: string | null;
  // last_name?: string | null;
};

export type AdminClaimApprove = {
  id: string;
  user_id?: string | null;
  user?: AdminUser | null;
  referral_count?: number | null;
  amount?: number | null;
  payment_method?: string | null;
  account_details?: string | null;
  status?: "PENDING" | "PROCESSING" | "PAID" | string;
  created_at?: string | null;
  proof_url?: string | null;
  proof_path?: string | null;
};

export type ConfirmTarget = {
  id: string;
  status: "PROCESSING" | "PAID";
} | null;
export type ClaimStatusTab = "PENDING" | "PAID";

export type RewardDbRow = {
  rewards_claim_id: string;
  user_id: string;
  rewards_claim_payment_method?: string | null;
  rewards_claim_account_details?: string | null;
  rewards_claim_amount?: number | null;
  rewards_claim_status?: string | null;
  rewards_claim_referral_count?: number | null;
  rewards_claim_created_at?: string | null;
  rewards_claim_processed_at?: string | null;
  rewards_claim_proof_path?: string | null;
};
