import { Database } from "./database";

//==========DATABASE TYPES==========//

export type ActivityLogTableRow =
  Database["public"]["Tables"]["activity_log_table"]["Row"];
export type ActivityLogTableInsert =
  Database["public"]["Tables"]["activity_log_table"]["Insert"];
export type ActivityLogTableUpdate =
  Database["public"]["Tables"]["activity_log_table"]["Update"];

export type AdminIpWhitelistTableRow =
  Database["public"]["Tables"]["admin_ip_whitelist_table"]["Row"];
export type AdminIpWhitelistTableInsert =
  Database["public"]["Tables"]["admin_ip_whitelist_table"]["Insert"];
export type AdminIpWhitelistTableUpdate =
  Database["public"]["Tables"]["admin_ip_whitelist_table"]["Update"];

export type ErrorLogTableRow =
  Database["public"]["Tables"]["error_log_table"]["Row"];
export type ErrorLogTableInsert =
  Database["public"]["Tables"]["error_log_table"]["Insert"];
export type ErrorLogTableUpdate =
  Database["public"]["Tables"]["error_log_table"]["Update"];

export type LocationLockerRow =
  Database["public"]["Tables"]["location_locker_table"]["Row"];
export type LocationLockerInsert =
  Database["public"]["Tables"]["location_locker_table"]["Insert"];
export type LocationLockerUpdate =
  Database["public"]["Tables"]["location_locker_table"]["Update"];

export type MailActionRequestTableRow =
  Database["public"]["Tables"]["mail_action_request_table"]["Row"];
export type MailActionRequestTableInsert =
  Database["public"]["Tables"]["mail_action_request_table"]["Insert"];
export type MailActionRequestTableUpdate =
  Database["public"]["Tables"]["mail_action_request_table"]["Update"];

export type MailboxItemTableRow =
  Database["public"]["Tables"]["mailbox_item_table"]["Row"];
export type MailboxItemTableInsert =
  Database["public"]["Tables"]["mailbox_item_table"]["Insert"];
export type MailboxItemTableUpdate =
  Database["public"]["Tables"]["mailbox_item_table"]["Update"];

export type LocationLockerAssignedRow =
  Database["public"]["Tables"]["mailroom_assigned_locker_table"]["Row"];
export type LocationLockerAssignedInsert =
  Database["public"]["Tables"]["mailroom_assigned_locker_table"]["Insert"];
export type LocationLockerAssignedUpdate =
  Database["public"]["Tables"]["mailroom_assigned_locker_table"]["Update"];

export type MailroomFileTableRow =
  Database["public"]["Tables"]["mailroom_file_table"]["Row"];
export type MailroomFileTableInsert =
  Database["public"]["Tables"]["mailroom_file_table"]["Insert"];
export type MailroomFileTableUpdate =
  Database["public"]["Tables"]["mailroom_file_table"]["Update"];

export type MailroomLocationRow =
  Database["public"]["Tables"]["mailroom_location_table"]["Row"];
export type MailroomLocationInsert =
  Database["public"]["Tables"]["mailroom_location_table"]["Insert"];
export type MailroomLocationUpdate =
  Database["public"]["Tables"]["mailroom_location_table"]["Update"];

export type MailroomPlanTableRow =
  Database["public"]["Tables"]["mailroom_plan_table"]["Row"];
export type MailroomPlanTableInsert =
  Database["public"]["Tables"]["mailroom_plan_table"]["Insert"];
export type MailroomPlanTableUpdate =
  Database["public"]["Tables"]["mailroom_plan_table"]["Update"];

export type MailroomRegistrationTableRow =
  Database["public"]["Tables"]["mailroom_registration_table"]["Row"];
export type MailroomRegistrationTableInsert =
  Database["public"]["Tables"]["mailroom_registration_table"]["Insert"];
export type MailroomRegistrationTableUpdate =
  Database["public"]["Tables"]["mailroom_registration_table"]["Update"];

export type NotificationTableRow =
  Database["public"]["Tables"]["notification_table"]["Row"];
export type NotificationTableInsert =
  Database["public"]["Tables"]["notification_table"]["Insert"];
export type NotificationTableUpdate =
  Database["public"]["Tables"]["notification_table"]["Update"];

export type PaymentTransactionTableRow =
  Database["public"]["Tables"]["payment_transaction_table"]["Row"];
export type PaymentTransactionTableInsert =
  Database["public"]["Tables"]["payment_transaction_table"]["Insert"];
export type PaymentTransactionTableUpdate =
  Database["public"]["Tables"]["payment_transaction_table"]["Update"];

export type ReferralTableRow =
  Database["public"]["Tables"]["referral_table"]["Row"];
export type ReferralTableInsert =
  Database["public"]["Tables"]["referral_table"]["Insert"];
export type ReferralTableUpdate =
  Database["public"]["Tables"]["referral_table"]["Update"];

export type RewardsClaimTableRow =
  Database["public"]["Tables"]["rewards_claim_table"]["Row"];
export type RewardsClaimTableInsert =
  Database["public"]["Tables"]["rewards_claim_table"]["Insert"];
export type RewardsClaimTableUpdate =
  Database["public"]["Tables"]["rewards_claim_table"]["Update"];

export type SubscriptionTableRow =
  Database["public"]["Tables"]["subscription_table"]["Row"];
export type SubscriptionTableInsert =
  Database["public"]["Tables"]["subscription_table"]["Insert"];
export type SubscriptionTableUpdate =
  Database["public"]["Tables"]["subscription_table"]["Update"];

export type UserAddressTableRow =
  Database["public"]["Tables"]["user_address_table"]["Row"];
export type UserAddressTableInsert =
  Database["public"]["Tables"]["user_address_table"]["Insert"];
export type UserAddressTableUpdate =
  Database["public"]["Tables"]["user_address_table"]["Update"];

export type UserKYCAddressTableRow =
  Database["public"]["Tables"]["user_kyc_address_table"]["Row"];
export type UserKYCAddressTableInsert =
  Database["public"]["Tables"]["user_kyc_address_table"]["Insert"];
export type UserKYCAddressTableUpdate =
  Database["public"]["Tables"]["user_kyc_address_table"]["Update"];

export type UserKYCTableRow =
  Database["public"]["Tables"]["user_kyc_table"]["Row"];
export type UserKYCTableInsert =
  Database["public"]["Tables"]["user_kyc_table"]["Insert"];
export type UserKYCTableUpdate =
  Database["public"]["Tables"]["user_kyc_table"]["Update"];

export type UsersTableRow = Database["public"]["Tables"]["users_table"]["Row"];
export type UsersTableInsert =
  Database["public"]["Tables"]["users_table"]["Insert"];
export type UsersTableUpdate =
  Database["public"]["Tables"]["users_table"]["Update"];

export type RegionTableRow =
  Database["address_schema"]["Tables"]["region_table"]["Row"];
export type ProvinceTableRow =
  Database["address_schema"]["Tables"]["province_table"]["Row"];
export type CityTableRow =
  Database["address_schema"]["Tables"]["city_table"]["Row"];
export type BarangayTableRow =
  Database["address_schema"]["Tables"]["barangay_table"]["Row"];

//==========DATABASE ENUMS==========//

export type ACTIVITY_ACTION_ENUM =
  Database["public"]["Enums"]["activity_action"];

export type ACTIVITY_ENTITY_TYPE_ENUM =
  Database["public"]["Enums"]["activity_entity_type"];

export type ACTIVITY_TYPE_ENUM = Database["public"]["Enums"]["activity_type"];

export type BILLING_CYCLE_ENUM = Database["public"]["Enums"]["billing_cycle"];

export type ERROR_CODE_ENUM = Database["public"]["Enums"]["error_code"];

export type ERROR_TYPE_ENUM = Database["public"]["Enums"]["error_type"];

export type MAIL_ACTION_REQUEST_STATUS_ENUM =
  Database["public"]["Enums"]["mail_action_request_status"];

export type MAIL_ACTION_REQUEST_TYPE_ENUM =
  Database["public"]["Enums"]["mail_action_request_type"];

export type MAILROOM_ASSIGNED_LOCKER_STATUS_ENUM =
  Database["public"]["Enums"]["mailroom_assigned_locker_status"];

export type MAILROOM_FILE_TYPE_ENUM =
  Database["public"]["Enums"]["mailroom_file_type"];

export type MAILROOM_PACKAGE_STATUS_ENUM =
  Database["public"]["Enums"]["mailroom_package_status"];

export type MAILROOM_PACKAGE_TYPE_ENUM =
  Database["public"]["Enums"]["mailroom_package_type"];

export type NOTIFICATION_TYPE_ENUM =
  Database["public"]["Enums"]["notification_type"];

export type PAYMENT_STATUS_ENUM = Database["public"]["Enums"]["payment_status"];

export type PAYMENT_TYPE_ENUM = Database["public"]["Enums"]["payment_type"];

export type REWARDS_CLAIM_STATUS_ENUM =
  Database["public"]["Enums"]["rewards_claim_status"];

export type USER_KYC_STATUS_ENUM =
  Database["public"]["Enums"]["user_kyc_status"];

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
  total_referrals: number | null;
};

export type RewardsStatusResult = {
  eligibleMilestones: number;
  claimedMilestones: number;
  claimableCount: number;
  amountPerMilestone: number;
  referralCount: number;
  eligible: boolean;
  hasClaim: boolean;
  claims: ClaimWithUrl[];
  threshold: number; // Restored for backward compatibility in some views
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
  total_referrals: number | null;
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
  total_referrals?: number | null;
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

export type LocationRow = MailroomLocationRow;

export type AdminMailroomLocation = MailroomLocationRow & {
  mailroom_location_is_hidden?: boolean;
  mailroom_location_max_locker_limit?: number | null;
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
    is_hidden: boolean;
    max_locker_limit: number | null;
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
  is_hidden?: boolean;
  max_locker_limit?: number;
};

export type MailroomRegistrationStats = {
  mailroom_registration_id: string;
  stored: number;
  pending: number;
  released: number;
};

export type KycTableRow = Omit<
  UserKYCTableRow,
  "user_date_of_birth" | "user_kyc_agreements_accepted"
> & {
  address?:
    | (Omit<
        UserAddressTableRow,
        "user_address_id" | "user_address_user_id" | "user_address_created_at"
      > & {
        user_address_barangay?: string | null;
        user_address_province?: string | null;
      })
    | null;
};

export type FormattedKycRow = KycTableRow & {
  _formattedName: string;
  _formattedSub: string;
  _formattedVer: string;
};

export type DbLockerRow = {
  location_locker_id: string;
  mailroom_location_id: string | null;
  location_locker_code: string | null;
  location_locker_is_available: boolean | null;
  location_locker_created_at: string | null;
  location_locker_is_assignable: boolean | null;
  mailroom_location_table: {
    mailroom_location_id: string;
    mailroom_location_name: string;
  } | null;
  mailroom_assigned_locker_table: Array<{
    mailroom_assigned_locker_id: string;
    mailroom_registration_id: string;
    mailroom_assigned_locker_status: string;
  }>;
};

export type LockerRow = {
  location_locker_id: string;
  mailroom_location_id?: string | null;
  location_locker_code?: string | null;
  location_locker_is_available?: boolean | null;
  location_locker_created_at?: string | null;
  location_locker_is_assignable?: boolean | null;
  mailroom_location_table?: {
    mailroom_location_id?: string;
    mailroom_location_name?: string;
  } | null;
};

export type MailroomRow = {
  id: string;
  mailroom_code: string | null;
  name: string;
  email: string | null;
  plan: string | null;
  location: string | null;
  created_at?: string | null;
  expiry_at?: string | null;
  mailroom_status?: string | null;
  auto_renew: boolean;
  stats: {
    stored: number;
    pending: number;
    released: number;
  };
  raw?: RawRow;
};

export type MailroomStats = {
  stored: number;
  pending: number;
  released: number;
};

export type MailroomTotals = MailroomStats | null;

export type DashboardFilters = {
  plan: string | null;
  location: string | null;
  mailroomStatus: string | null;
};

export type ApiResponse = {
  rows: RawRow[];
  stats?: MailroomStats;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
};

export type MailroomStatus = "ACTIVE" | "EXPIRING" | "INACTIVE";

export type CustomerKycAddress = Pick<RegionTableRow, "region_id" | "region"> &
  Pick<ProvinceTableRow, "province_id" | "province"> &
  Pick<CityTableRow, "city_id" | "city"> &
  Pick<BarangayTableRow, "barangay_id" | "barangay" | "barangay_zip_code">;

export type UserTableRow = Database["public"]["Tables"]["users_table"]["Row"];

export type AdminUsersRpcResult = {
  data: Array<UserTableRow>;
  total_count: number;
};

export type UserRole = "owner" | "admin" | "approver" | "user";

export type AdminUserPage = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
};

export type ApiUserPage = Pick<
  UserTableRow,
  "users_id" | "users_email" | "users_role" | "users_created_at"
> & { users_role: UserRole } & {
  users_is_verified: boolean;
  user_kyc_table?:
    | Pick<UserKYCTableRow, "user_kyc_first_name" | "user_kyc_last_name">
    | Array<Pick<UserKYCTableRow, "user_kyc_first_name" | "user_kyc_last_name">>
    | null;
};

export type ActivityLogEntryRow =
  Database["public"]["Tables"]["activity_log_table"]["Row"];

export type ActivityLogDetails = {
  package_name?: string;
  package_type?: string;
  package_locker_code?: string;
  payment_amount?: string;
  payment_method?: string;
  kyc_description?: string;
  mailroom_plan_name?: string;
  mailroom_location_name?: string;
  mailroom_locker_qty?: string;
  email?: string;
  provider?: string;
  platform?: string;
  method?: string;
  update_type?: string;
  search_query?: string | null;
  role_filter?: string | null;
  new_role?: string | null;
  previous_role?: string | null;
  total_results?: string | number | null;
  action?: string | null;
};

export type ActivityLogEntry = ActivityLogEntryRow & {
  actor_email: string | null;
  actor_name: string | null;
  activity_details: ActivityLogDetails;
  activity_type: string;
};

export type AdminListActivityLogsResult = {
  total_count: number;
  logs: ActivityLogEntry[];
};

export type ErrorLogEntryRow =
  Database["public"]["Tables"]["error_log_table"]["Row"];

export type ErrorLogEntry = ErrorLogEntryRow & {
  user_email?: string | null;
  user_name?: string | null;
  resolved_by_email?: string | null;
  resolved_by_name?: string | null;
};

export type AdminListErrorLogsResult = {
  total_count: number;
  logs: ErrorLogEntry[];
};

export type AdminIpWhitelistEntry = {
  admin_ip_whitelist_id: string;
  ip_cidr: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
  created_by_name?: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

export type AdminIpWhitelistListResponse = {
  entries: AdminIpWhitelistEntry[];
  total_count: number;
  current_ip: string | null;
  current_match_ids: string[];
};

export type T_LocationLocker = LocationLockerRow & {
  location: Pick<
    MailroomLocationRow,
    "mailroom_location_id" | "mailroom_location_name"
  > | null;
  assigned?: Pick<
    LocationLockerAssignedRow,
    | "mailroom_assigned_locker_id"
    | "mailroom_registration_id"
    | "mailroom_assigned_locker_status"
  > & {
    registration?: {
      id?: string;
      full_name?: string;
      email: string;
    } | null;
  };
  is_assigned: boolean;
};

export type T_LockerData = Pick<
  LocationLockerRow,
  | "location_locker_id"
  | "mailroom_location_id"
  | "location_locker_code"
  | "location_locker_created_at"
  | "location_locker_is_available"
  | "location_locker_is_assignable"
> &
  Pick<MailroomLocationRow, "mailroom_location_name"> &
  Partial<
    Pick<
      LocationLockerAssignedRow,
      | "mailroom_assigned_locker_id"
      | "mailroom_registration_id"
      | "mailroom_assigned_locker_status"
    >
  >;

export type T_LocationLockerInsert = Pick<
  LocationLockerInsert,
  | "location_locker_id"
  | "location_locker_code"
  | "mailroom_location_id"
  | "location_locker_is_available"
  | "location_locker_is_assignable"
>;

export type T_LocationLockerUpdate = Pick<
  MailroomLocationUpdate,
  "mailroom_location_prefix" | "mailroom_location_total_lockers"
>;

export type AdminArchivedPackage = MailboxItemTableRow & {
  mailroom_registration_table?: MailroomRegistrationTableRow | null;
  location_locker_table?: LocationLockerRow | null;
  users_table?: Pick<UsersTableRow, "users_email"> | null;
  deleted_at?: string | null;
};
