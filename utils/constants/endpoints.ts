export const API_ENDPOINTS = {
  // Notifications endpoint
  notifications: "/api/notifications",

  // User endpoints
  user: {
    verificationStatus: "/api/user/verification-status",
    kyc: "/api/user/kyc",
    addresses: (id?: string) =>
      id ? `/api/user/addresses/${id}` : "/api/user/addresses",
    scans: "/api/user/scans",
    packages: (id?: string) =>
      id ? `/api/user/packages/${id}` : "/api/user/packages",
  },

  // Auth endpoints
  auth: {
    signin: "/api/auth/signin",
    signup: "/api/auth/signup",
    signout: "/api/auth/signout",
    updateProfile: "/api/auth/update-profile",
    changePassword: "/api/auth/change-password",
    forgotPassword: "/api/auth/forgot-password",
    resend: "/api/auth/resend",
    callback: {
      google: "/api/auth/callback/google",
    },
  },

  // Session
  session: "/api/session",

  // Mailroom endpoints
  mailroom: {
    plans: "/api/plans",
    locations: "/api/mailroom/locations",
    locationsAvailability: "/api/mailroom/locations/availability",
    registrations: "/api/mailroom/registrations",
    registration: (id: string) => `/api/mailroom/registrations/${id}`,
    lookupByOrder: (orderId: string) =>
      `/api/mailroom/lookup-by-order?order=${encodeURIComponent(orderId)}`,
  },

  // Payments
  payments: {
    create: "/api/payments/create",
    verify: "/api/payments/verify",
    lookupByOrder: "/api/payments/lookup-by-order",
    confirm: "/api/payments/confirm",
  },

  // Referrals
  referrals: {
    generate: "/api/referrals/generate",
    list: "/api/referrals/list",
    validate: "/api/referrals/validate",
  },

  // Rewards
  rewards: {
    status: "/api/rewards/status",
    claim: "/api/rewards/claim",
  },

  // Admin endpoints
  admin: {
    analytics: "/api/admin/analytics",
    stats: "/api/admin/dashboard/stats",
    mailroom: {
      plans: "/api/admin/mailroom/plans",
      plan: (id: string) => `/api/admin/mailroom/plans/${id}`,
      locations: "/api/admin/mailroom/locations",
      location: (id: string) => `/api/admin/mailroom/locations/${id}`,
      lockers: "/api/admin/mailroom/lockers",
      locker: (id: string) => `/api/admin/mailroom/lockers/${id}`,
      packages: "/api/admin/mailroom/packages",
      package: (id: string) => `/api/admin/mailroom/packages/${id}`,
      upload: "/api/admin/mailroom/packages/upload",
      scans: "/api/admin/mailroom/scans",
      release: "/api/admin/mailroom/release",
      assignedLockers: "/api/admin/mailroom/assigned-lockers",
      cron: "/api/admin/mailroom/cron",
      registrations: "/api/admin/mailroom/registrations",
      archive: "/api/admin/mailroom/archive",
      restore: (id: string) => `/api/admin/mailroom/archive/${id}/restore`,
      permanentDelete: (id: string) =>
        `/api/admin/mailroom/archive/${id}/permanent`,
    },
    rewards: {
      list: "/api/admin/rewards",
      reward: (id: string) => `/api/admin/rewards/${id}`,
    },
    userKyc: (userId?: string) =>
      userId ? `/api/admin/user-kyc/${userId}` : `/api/admin/user-kyc`,
  },

  // Onboarding
  onboarding: "/api/onboarding",
} as const;
