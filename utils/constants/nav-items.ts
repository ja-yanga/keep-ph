export const NAV_ITMES: Record<
  string,
  Array<{ path: string; key: string; title: string }>
> = {
  user: [
    { path: "/dashboard", key: "dashboard", title: "Dashboard" },
    {
      path: "/mailroom/register",
      key: "register-mail-service",
      title: "Register Mail Service",
    },
    { path: "/referrals", key: "referrals", title: "Referrals" },
    { path: "/storage", key: "storage", title: "Storage" },
  ],
  admin: [
    { path: "/admin/dashboard", key: "dashboard", title: "Dashboard" },
    { path: "/admin/kyc", key: "kyc", title: "KYC" },
    { path: "/admin/locations", key: "locations", title: "Locations" },
    { path: "/admin/lockers", key: "lockers", title: "Lockers" },
    { path: "/admin/mailrooms", key: "mailrooms", title: "Mailrooms" },
    { path: "/admin/packages", key: "packages", title: "Packages" },
    { path: "/admin/plans", key: "plans", title: "Plans" },
    { path: "/admin/rewards", key: "rewards", title: "Rewards" },
    { path: "/admin/stats", key: "stats", title: "Stats" },
  ],
};
