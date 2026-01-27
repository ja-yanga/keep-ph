import {
  type T_Transaction,
  type T_CustomerTransaction,
  type T_TransactionSubscription,
  type T_TransactionPlan,
} from "../types/transaction";

/**
 * Raw transaction data structure from the database RPC
 */
export type T_RawTransaction = {
  payment_transaction_id: string;
  mailroom_registration_id?: string | null;
  user_id?: string | null;
  payment_transaction_amount: number;
  payment_transaction_status: string;
  payment_transaction_date: string;
  payment_transaction_method?: string | null;
  payment_transaction_type?: string | null;
  payment_transaction_reference_id?: string | null;
  payment_transaction_channel?: string | null;
  payment_transaction_reference?: string | null;
  payment_transaction_order_id?: string | null;
  payment_transaction_created_at?: string | null;
  payment_transaction_updated_at?: string | null;
  user_name?: string | null;
  users_email?: string | null;
  mobile_number?: string | null;
  subscription?: T_RawTransactionSubscription | null;
  plan?: T_RawTransactionPlan | null;
};

/**
 * Raw subscription data structure from the database
 */
export type T_RawTransactionSubscription = {
  subscription_id?: string | null;
  subscription_billing_cycle?: string | null;
  subscription_auto_renew?: boolean | null;
  subscription_started_at?: string | null;
  subscription_expires_at?: string | null;
  subscription_created_at?: string | null;
  subscription_updated_at?: string | null;
};

/**
 * Raw plan data structure from the database
 */
export type T_RawTransactionPlan = {
  mailroom_plan_id?: string | null;
  mailroom_plan_name?: string | null;
  mailroom_plan_price?: number | null;
  mailroom_plan_description?: string | null;
  mailroom_plan_storage_limit?: number | null;
  mailroom_plan_can_receive_mail?: boolean | null;
  mailroom_plan_can_receive_parcels?: boolean | null;
  mailroom_plan_can_digitize?: boolean | null;
};

/**
 * Transform raw subscription data to normalized subscription type
 */
const transformSubscription = (
  data: T_RawTransactionSubscription | null | undefined,
): T_TransactionSubscription | null => {
  if (!data) return null;

  return {
    id: data.subscription_id || null,
    billing_cycle: data.subscription_billing_cycle || null,
    auto_renew: data.subscription_auto_renew ?? null,
    started_at: data.subscription_started_at || null,
    expires_at: data.subscription_expires_at || null,
    created_at: data.subscription_created_at || null,
    updated_at: data.subscription_updated_at || null,
  };
};

/**
 * Transform raw plan data to normalized plan type
 */
const transformPlan = (
  data: T_RawTransactionPlan | null | undefined,
): T_TransactionPlan | null => {
  if (!data) return null;

  return {
    id: data.mailroom_plan_id || null,
    name: data.mailroom_plan_name || null,
    price: data.mailroom_plan_price ?? null,
    description: data.mailroom_plan_description || null,
    storage_limit: data.mailroom_plan_storage_limit ?? null,
    can_receive_mail: data.mailroom_plan_can_receive_mail ?? null,
    can_receive_parcels: data.mailroom_plan_can_receive_parcels ?? null,
    can_digitize: data.mailroom_plan_can_digitize ?? null,
  };
};

/**
 * Transform raw transaction data to normalized transaction type (admin view)
 */
export const transformTransaction = (data: T_RawTransaction): T_Transaction => {
  return {
    id: data.payment_transaction_id || "",
    mailroom_registration_id: data.mailroom_registration_id || null,
    user_id: data.user_id || null,
    amount: data.payment_transaction_amount || 0,
    status: data.payment_transaction_status || "",
    date: data.payment_transaction_date || "",
    method: data.payment_transaction_method || null,
    type: data.payment_transaction_type || null,
    reference_id: data.payment_transaction_reference_id || null,
    channel: data.payment_transaction_channel || null,
    reference: data.payment_transaction_reference || null,
    order_id: data.payment_transaction_order_id || null,
    created_at: data.payment_transaction_created_at || null,
    updated_at: data.payment_transaction_updated_at || null,
    name: data.user_name || null,
    email: data.users_email || null,
    mobile_number: data.mobile_number || null,
    subscription: transformSubscription(data.subscription),
    plan: transformPlan(data.plan),
  };
};

/**
 * Transform raw transaction data to normalized customer transaction type
 * (customer view - excludes user details like name, email, mobile_number)
 */
export const transformCustomerTransaction = (
  data: T_RawTransaction,
): T_CustomerTransaction => {
  return {
    id: data.payment_transaction_id || "",
    mailroom_registration_id: data.mailroom_registration_id || null,
    user_id: data.user_id || null,
    amount: data.payment_transaction_amount || 0,
    status: data.payment_transaction_status || "",
    date: data.payment_transaction_date || "",
    method: data.payment_transaction_method || null,
    type: data.payment_transaction_type || null,
    reference_id: data.payment_transaction_reference_id || null,
    channel: data.payment_transaction_channel || null,
    reference: data.payment_transaction_reference || null,
    order_id: data.payment_transaction_order_id || null,
    created_at: data.payment_transaction_created_at || null,
    updated_at: data.payment_transaction_updated_at || null,
    subscription: transformSubscription(data.subscription),
    plan: transformPlan(data.plan),
  };
};
