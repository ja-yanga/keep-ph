// Form titles
export const FORM_NAME = {
  first_name: "First name",
  last_name: "Last name",
  date_of_birth: "Date of birth",
  address_line_one: "Address line 1",
  address_line_two: "Address line 2 (Optional)",
  city: "City",
  region: "Region",
  postal: "Postal Code",
  front: "Front of ID",
  back: "Back of ID",
};

// Identity Verification (KYC)
export const IDENTITY_VERIFICATION_KYC = {
  section_header: {
    title: "Identity Verification (KYC)",
    sub_title:
      "Before you can register for our mailroom service, wer'e need to verify your identity. This helps keep everyon's parcels secure.",
    status: "Current status",
  },
  section_form: {
    section_header: {
      title: "Submit Identity Documents",
      alert_title: "Required Information",
      alert_description:
        "Please ensure the Name and Address entered below **exactly match** the details on your uploaded ID. This information is required for compliance and mailroom registration.",
    },
    section_form_title: {
      details: "1. Document Details",
      personal: "2. Personal Details Snapshot",
      upload_id: "3. Upload ID Images",
      previews: "4. Photo Previews (Click to zoom)",
    },
  },
};

export const LANDING_PAGE = {
  pricing: {
    sectionId: "pricing",
    background: "#F1F3F5",
    heading: "Simple, Transparent Pricing",
    subheading: "Choose the plan that best fits your needs.",
    segmentedControl: {
      defaultValue: "monthly",
      options: [
        { label: "Monthly Billing", value: "monthly" },
        { label: "Annual Billing (-20%)", value: "annual" },
      ],
      annualDiscountRate: 0.2,
    },
    featuredPlanName: "Personal",
    button: {
      label: "I'm Interested",
      href: "/signup",
    },
    fallback: {
      loading: "Loading plans...",
      error: "Unable to load plans. Please try again later.",
      emptyTitle: "Plans unavailable",
      emptyDescription: "We're updating our pricing. Please check back soon.",
    },
    features: {
      storageLimit: "Storage limit",
      storageUnitSuffix: "GB Storage",
      unlimitedStorageLabel: "Unlimited storage",
      canReceiveMail: "Mail receiving",
      canReceiveParcels: "Parcel handling",
      canDigitize: "Digital scans",
    },
    priceSuffix: "/mo",
    annualBilling: {
      prefix: "Billed",
      suffix: "yearly",
    },
    descriptionFallback: "A flexible plan built for modern mail handling.",
  },
};

export const REFERRALS_UI = {
  threshold: 10,
  rewardAmount: 500,
  hero: {
    title: "Refer & Earn Rewards",
    description:
      "Share your unique code below. Refer {threshold} friends to unlock a cash reward!",
  },
  summaryCard: {
    title: "Reward Claim",
    description: "You already requested a reward. See the claim details below.",
    labels: {
      amount: "Amount:",
      method: "Method:",
      account: "Account:",
      requested: "Requested:",
    },
    buttons: {
      viewPaid: "View Payout — Paid",
      viewProcessing: "View Claim — Processing",
      viewClaim: "View Claim",
    },
  },
  progressCard: {
    unlockedTitle: "Reward Unlocked! - ",
    progressTitle: "Referral Progress",
    unlockedDescription:
      "Click the Claim Reward button to claim your cash reward now!",
    progressDescription:
      "You need {remaining} more referrals to claim your reward.",
    buttons: {
      claim: "Claim Reward",
      keepReferring: "Keep Referring",
    },
  },
  codeCard: {
    heading: "Your Unique Referral Code",
    copyDefault: "Copy Code",
    copySuccess: "Copied to Clipboard",
  },
  table: {
    heading: "Referral History",
    headingColor: "#313131",
  },
  datatable: {
    columns: {
      service: "Service Type",
      email: "Referred",
      dateJoined: "Date Joined",
      status: "Status",
    },
    statusComplete: "Completed",
    defaultService: "General Referral",
    userPrefix: "User: ",
    fallbackEmail: "N/A",
    fallbackDate: "—",
    empty: "No referrals yet",
  },
  modal: {
    title: "Submit Reward Payout Request",
    description:
      "Congratulations! Provide your payout details below. Requests are typically processed within 24–48 hours.",
    rewardLabel: "Reward: PHP {amount}.00",
    fieldLabelTemplate: "Your {method} Mobile Number / Account",
    placeholder: "e.g., 0917XXXXXXX",
    submitButton: "Submit Payout Request",
    terms: "By submitting, you agree to the payout terms.",
    alertTitle: "Invalid number",
  },
  notifications: {
    requiredTitle: "Required",
    requiredMessage: "Please enter your {method} account.",
    invalidNumber:
      "Mobile number must start with 09 and be 11 digits (e.g. 09121231234).",
    notSignedInTitle: "Not signed in",
    notSignedInMessage: "You must be signed in to claim rewards.",
    claimFailedTitle: "Claim Failed",
    claimFailedDefault: "Failed to submit claim",
    claimSubmittedTitle: "Claim Submitted",
    claimSubmittedMessage:
      "Your reward request is submitted and will be processed.",
    errorTitle: "Error",
    errorMessage: "Network error. Please try again later.",
  },
  paymentMethods: {
    gcash: "GCash",
    maya: "Maya",
  },
};

export const ENTITY_TYPES = [
  { label: "All Entities", value: "" },
  { label: "Mail Action Request", value: "MAIL_ACTION_REQUEST" },
  { label: "User KYC", value: "USER_KYC" },
  { label: "Payment Transaction", value: "PAYMENT_TRANSACTION" },
  { label: "Subscription", value: "SUBSCRIPTION" },
  { label: "Mailbox Item", value: "MAILBOX_ITEM" },
  { label: "Mailroom Registration", value: "MAILROOM_REGISTRATION" },
  { label: "User Address", value: "USER_ADDRESS" },
  { label: "Rewards Claim", value: "REWARDS_CLAIM" },
  { label: "Referral", value: "REFERRAL" },
  { label: "Notification", value: "NOTIFICATION" },
  { label: "Mailroom File", value: "MAILROOM_FILE" },
  { label: "Mailroom Assigned Locker", value: "MAILROOM_ASSIGNED_LOCKER" },
  { label: "User", value: "USER" },
  { label: "Admin IP Whitelist", value: "ADMIN_IP_WHITELIST" },
] as const;

export const ACTIONS = [
  { label: "All Actions", value: "" },
  { label: "Login", value: "LOGIN" },
  { label: "Logout", value: "LOGOUT" },
  { label: "Register", value: "REGISTER" },
  { label: "Password Change", value: "PASSWORD_CHANGE" },
  { label: "Reset Request", value: "RESET_REQUEST" },
  { label: "Store", value: "STORE" },
  { label: "Create", value: "CREATE" },
  { label: "Update", value: "UPDATE" },
  { label: "Delete", value: "DELETE" },
  { label: "View", value: "VIEW" },
  { label: "Submit", value: "SUBMIT" },
  { label: "Approve", value: "APPROVE" },
  { label: "Reject", value: "REJECT" },
  { label: "Process", value: "PROCESS" },
  { label: "Complete", value: "COMPLETE" },
  { label: "Cancel", value: "CANCEL" },
  { label: "Verify", value: "VERIFY" },
  { label: "Pay", value: "PAY" },
  { label: "Refund", value: "REFUND" },
  { label: "Claim", value: "CLAIM" },
  { label: "Release", value: "RELEASE" },
  { label: "Dispose", value: "DISPOSE" },
  { label: "Scan", value: "SCAN" },
  { label: "Purchase", value: "PURCHASE" },
] as const;
