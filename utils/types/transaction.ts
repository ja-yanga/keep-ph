// ============================================================================
// Types
// ============================================================================

/**
 * Subscription type for transactions
 */
export type T_TransactionSubscription = {
  id?: string | null;
  billing_cycle?: string | null;
  auto_renew?: boolean | null;
  started_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/**
 * Plan type for transactions
 */
export type T_TransactionPlan = {
  id?: string | null;
  name?: string | null;
  price?: number | null;
  description?: string | null;
  storage_limit?: number | null;
  can_receive_mail?: boolean | null;
  can_receive_parcels?: boolean | null;
  can_digitize?: boolean | null;
};

/**
 * Base transaction type (used by admin)
 */
export type T_Transaction = {
  id: string;
  mailroom_registration_id?: string | null;
  user_id?: string | null;
  amount: number;
  status: string;
  date: string;
  method?: string | null;
  type?: string | null;
  reference_id?: string | null;
  channel?: string | null;
  reference?: string | null;
  order_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  name?: string | null;
  email?: string | null;
  mobile_number?: string | null;
  subscription?: T_TransactionSubscription | null;
  plan?: T_TransactionPlan | null;
};

export type T_CustomerTransaction = {
  id: string;
  mailroom_registration_id?: string | null;
  user_id?: string | null;
  amount: number;
  status: string;
  date: string;
  method?: string | null;
  type?: string | null;
  reference_id?: string | null;
  channel?: string | null;
  reference?: string | null;
  order_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  subscription?: T_TransactionSubscription | null;
  plan?: T_TransactionPlan | null;
};

/**
 * Pagination metadata type
 */
export type T_TransactionPaginationMeta = {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

/**
 * Transaction statistics type
 */
export type T_TransactionStats = {
  total_revenue: number;
  total_transactions: number;
  successful_transactions: number;
  avg_transaction: number;
};

/**
 * API response type for transactions
 */
export type T_TransactionsResponse<
  T extends T_Transaction | T_CustomerTransaction =
    | T_Transaction
    | T_CustomerTransaction,
> = {
  data: T[];
  meta: {
    pagination: T_TransactionPaginationMeta;
    stats: T_TransactionStats;
  };
};
