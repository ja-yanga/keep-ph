# PayMongo Subscriptions Setup

## "Subscriptions is not yet configured for this organization"

This error means **PayMongo has not enabled the Subscriptions feature for your organization**. Plan and subscription API calls will fail until it is enabled.

**What to do:**

1. Contact PayMongo to request Subscriptions configuration:
   - Email: **[support@paymongo.com](mailto:support@paymongo.com)** (or the contact from [PayMongo Subscriptions](https://developers.paymongo.com/docs/subscriptions-api))
   - Request that **Subscriptions** be enabled for your account
   - They may need to review your use case before enabling

2. After Subscriptions is enabled, you can:
   - **Option A**: Let the app create a PayMongo plan on each registration (current behavior when no `paymongo_plan_id` is provided)
   - **Option B**: Seed plans once and reuse them (recommended): run the seed to create PayMongo plans from your mailroom plans, then registrations will use those plan IDs

---

## Seeding PayMongo Plans (recommended after Subscriptions is enabled)

Seeding creates one **monthly** and one **annual** PayMongo plan per mailroom plan and stores their IDs in `mailroom_plan_table`. The registration flow then reuses these plans instead of creating a new plan every time.

### Prerequisites

- PayMongo **Subscriptions** enabled for your organization
- `PAYMONGO_SECRET_KEY` set in your environment
- Mailroom plans already exist in `mailroom_plan_table`

### How to seed

1. **Call the seed API** (admin-only; ensure the request is authenticated as admin):

   ```bash
   POST /api/admin/payments/seed-paymongo-plans
   ```

   Or run from an admin UI that calls this endpoint.

2. The endpoint will:
   - Load all mailroom plans
   - For each plan, create two PayMongo plans:
     - **Monthly**: amount = plan price in PHP × 100 (centavos), interval `monthly`
     - **Annual**: amount = plan price × 12 × 0.8 × 100 (20% discount), interval `yearly`
   - Update `mailroom_plan_table` with `paymongo_plan_id_monthly` and `paymongo_plan_id_annual`

3. **After seeding**, the mailroom registration flow will send the stored PayMongo plan ID in `metadata.paymongo_plan_id` when the user selects that plan and billing cycle, so `create-subscription` will skip plan creation and use the existing plan.

### When to re-run seed

- When you add new mailroom plans
- When you change plan prices and want PayMongo plans to match (create new PayMongo plans and update the IDs; the seed overwrites the stored IDs for existing mailroom plans)

### Manual plan creation

You can also create plans via **POST** `/api/payments/plans` and store the returned plan IDs yourself (e.g. in env or DB). The create-subscription flow accepts `metadata.paymongo_plan_id`; if present, it skips creating a plan and uses that ID.
