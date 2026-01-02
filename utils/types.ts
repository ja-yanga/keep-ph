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

export type MailboxItem = {
  mailbox_item_id?: string;
  mailbox_item_status?: string | null;
};

export type LocationObj = {
  mailroom_location_name?: string | null;
  mailroom_location_city?: string | null;
  mailroom_location_region?: string | null;
  mailroom_location_barangay?: string | null;
  mailroom_location_zip?: string | null;
  formatted_address?: string | null;
  address_line?: string | null;
  line1?: string | null;
  [key: string]: unknown;
};

export type PlanObj = {
  mailroom_plan_name?: string | null;
  mailroom_plan_price?: number | null;
  [key: string]: unknown;
};

export type SubscriptionObj = {
  subscription_id?: string;
  subscription_expires_at?: string | null;
  subscription_auto_renew?: boolean | null;
  subscription_started_at?: string | null;
  [key: string]: unknown;
};

export type UserKyc = {
  user_kyc_first_name?: string | null;
  user_kyc_last_name?: string | null;
  user_kyc_status?: string | null;
  [key: string]: unknown;
};

export type UsersObj = {
  users_id?: string;
  users_email?: string | null;
  users_avatar_url?: string | null;
  mobile_number?: string | null;
  user_kyc_table?: UserKyc | null;
  [key: string]: unknown;
};

export type RawRow = {
  mailroom_registration_id?: string;
  mailroom_registration_code?: string | null;
  mailroom_registration_created_at?: string | null;
  mailroom_registration_status?: boolean | null;
  mailroom_location_table?: LocationObj | null;
  mailroom_plan_table?: PlanObj | null;
  mailbox_item_table?: MailboxItem[] | null;
  subscription_table?: SubscriptionObj | null;
  users_table?: UsersObj | null;
  user_id?: string;
  [key: string]: unknown;
};

export type AdminUserKyc = {
  user_kyc_id: string;
  user_id: string;
  user_kyc_status: string | null;
  user_kyc_id_document_type: string | null;
  user_kyc_id_front_url: string | null;
  user_kyc_id_back_url: string | null;
  user_kyc_first_name: string | null;
  user_kyc_last_name: string | null;
  user_kyc_submitted_at: string | null;
  user_kyc_verified_at: string | null;
  user_kyc_created_at: string | null;
  user_kyc_updated_at: string | null;
  address: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    region?: string | null;
    postal?: number | string | null;
  } | null;
};

export type UpdateRewardClaimArgs = {
  claimId: string;
  status: "PROCESSING" | "PAID";
  proofPath?: string | null;
};

export type UpdateUserKycStatusArgs = {
  userId: string;
  status: "VERIFIED" | "REJECTED";
};

export type UserAddressRow = {
  user_address_id: string;
  user_id: string;
  user_address_label: string | null;
  user_address_line1: string;
  user_address_line2: string | null;
  user_address_city: string | null;
  user_address_region: string | null;
  user_address_postal: string | null;
  user_address_is_default: boolean;
  user_address_created_at: string | null;
};

export type RpcMailroomPlan = {
  mailroom_plan_id: string;
  mailroom_plan_name: string;
  mailroom_plan_price: number;
  mailroom_plan_description: string | null;
  mailroom_plan_storage_limit: number | null;
  mailroom_plan_can_receive_mail: boolean;
  mailroom_plan_can_receive_parcels: boolean;
  mailroom_plan_can_digitize: boolean;
};

export type CreateUserAddressArgs = {
  user_id: string;
  label?: string;
  line1: string;
  line2?: string;
  city?: string;
  region?: string;
  postal?: string;
  is_default?: boolean;
};

export type UpdateUserAddressArgs = {
  address_id: string;
  label?: string;
  line1: string;
  line2?: string;
  city?: string;
  region?: string;
  postal?: string;
  is_default?: boolean;
};

export type Address = {
  id: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal: string;
  is_default: boolean;
  user_id?: string;
};

export type AdminDashboardStats = {
  pendingRequests: number;
  storedPackages: number;
  totalSubscribers: number;
  lockerStats: {
    total: number;
    assigned: number;
  };
  recentPackages: Array<{
    id: string;
    package_name?: string | null;
    package_type?: string | null;
    status?: string | null;
    received_at?: string | null;
    registration?: {
      full_name?: string | null;
    } | null;
  }>;
};

export type T_NotificationType =
  | "PACKAGE_ARRIVED"
  | "PACKAGE_RELEASED"
  | "PACKAGE_DISPOSED"
  | "SCAN_READY"
  | "SYSTEM" // optional: reward-specific notification types for clearer UI handling
  | "REWARD_PROCESSING"
  | "REWARD_PAID";

export type LocationRow = {
  mailroom_location_id: string;
  mailroom_location_name: string;
  mailroom_location_region?: string | null;
  mailroom_location_city?: string | null;
  mailroom_location_barangay?: string | null;
  mailroom_location_zip?: string | null;
  mailroom_location_total_lockers?: number | null;
  mailroom_location_prefix?: string | null;
};

export type AdminCreateMailroomLocationArgs = {
  name: string;
  code?: string | null;
  region?: string | null;
  city?: string | null;
  barangay?: string | null;
  zip?: string | null;
  total_lockers?: number | null;
};

export type MailroomPlanRow = {
  mailroom_plan_id: string;
  mailroom_plan_name: string;
  mailroom_plan_price: number;
  mailroom_plan_description?: string | null;
  mailroom_plan_storage_limit?: number | null;
  mailroom_plan_can_receive_mail: boolean;
  mailroom_plan_can_receive_parcels: boolean;
  mailroom_plan_can_digitize: boolean;
};

export type AdminUpdateMailroomPlanArgs = {
  id: string;
  updates: {
    name?: string;
    price?: number;
    description?: string | null;
    storage_limit?: number | null;
    can_receive_mail?: boolean;
    can_receive_parcels?: boolean;
    can_digitize?: boolean;
  };
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  storage_limit?: number | null;
  can_receive_mail: boolean;
  can_receive_parcels: boolean;
  can_digitize: boolean;
};

export type MailroomPackageViewItem = RawRow | null;

export type MailroomPackageViewProps = {
  item: MailroomPackageViewItem;
  loading: boolean;
  error: string | null;
  onRefreshAction?: () => Promise<void> | void;
};

export type RegCounts = { stored: number; pending: number; released: number };

export type MailroomMainContentProps = {
  src: Record<string, unknown> | null;
  expiry: string | null;
  lockerCount: number;
  normalizedLockers: Array<{
    id: string;
    code: string;
    status: string;
    raw: Record<string, unknown>;
  }>;
  selectedLockerId: string | null;
  setSelectedLockerId: React.Dispatch<React.SetStateAction<string | null>>;
  normalizedPackages: Array<{
    id: string;
    locker_id?: string;
    received_at?: string;
    created_at?: string;
    updated_at?: string;
    status?: string;
    package_photo?: string;
    package_files?: Array<{
      id: string;
      name: string;
      url: string;
      size_mb: number;
      mime_type: string;
      type: string;
      uploaded_at: string;
    }>;
    [key: string]: unknown;
  }>;
  plan: {
    can_receive_mail?: boolean;
    can_receive_parcels?: boolean;
    can_digitize?: boolean;
    [key: string]: unknown;
  };
  isStorageFull: boolean;
  handleRefresh: () => Promise<void>;
  scanMap: Record<string, string>;
  scans: Array<{ package_id?: string; file_url?: string }>;
  refreshKey: number;
  mergedScans: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_size_mb: number;
    uploaded_at: string;
    package?: { package_name: string };
    mailbox_item_name?: string;
    mailbox_item_table?: unknown;
  }>;
  scansUsage: {
    used_mb?: number;
    limit_mb?: number;
    percentage?: number;
  } | null;
};

export type ErrorProps = {
  error: string | null;
};

export type MailroomSidebarProps = {
  src: Record<string, unknown> | null;
  fullNameValue: string | null;
  locations: Record<string, unknown> | null;
  plan: Record<string, unknown> & {
    can_receive_mail?: boolean;
    can_receive_parcels?: boolean;
    can_digitize?: boolean;
  };
  expiry: string | null;
};

export type LocationsResponse = {
  data: Array<{
    id: string;
    name: string;
    region: string | null;
    city: string | null;
    barangay: string | null;
    zip: string | null;
  }>;
};

export type AvailabilityResponse = {
  data: Record<string, number>;
};

export type Location = {
  id: string;
  name: string;
  region?: string;
  city?: string;
  barangay?: string;
  zip?: string;
};
