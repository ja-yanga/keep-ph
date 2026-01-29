# Cron Job Setup Options

You can run cron jobs for subscription reminders using either **Supabase pg_cron** or **Vercel Cron**. Both options work, but have different approaches.

## Option 1: Vercel Cron (Recommended for Next.js API Routes)

Vercel Cron is the simplest option if you're already deploying on Vercel. It directly calls your Next.js API routes.

### Setup

1. **Create `vercel.json` in your project root** (if it doesn't exist):

```json
{
  "crons": [
    {
      "path": "/api/admin/mailroom/subscription-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Schedule format**: `"0 9 * * *"` means:

- `0` - minute (0)
- `9` - hour (9 AM)
- `*` - every day of month
- `*` - every month
- `*` - every day of week

**Common schedules**:

- `"0 9 * * *"` - Daily at 9 AM
- `"0 */6 * * *"` - Every 6 hours
- `"0 9 * * 1"` - Every Monday at 9 AM

2. **Deploy to Vercel** - The cron job will be automatically configured.

3. **Monitor in Vercel Dashboard**:
   - Go to your project → Settings → Cron Jobs
   - View execution history and logs

### Pros

- ✅ Simple setup (just add to `vercel.json`)
- ✅ Directly calls Next.js API routes
- ✅ Built-in monitoring in Vercel dashboard
- ✅ No database configuration needed
- ✅ Works with all Next.js features (env vars, libraries, etc.)

### Cons

- ❌ Requires Vercel deployment
- ❌ Limited to Vercel's cron schedule options

---

## Option 2: Supabase pg_cron (Database-Level Cron)

Supabase supports cron jobs via the `pg_cron` extension. This runs at the database level and can make HTTP requests to your API.

### Setup

1. **Enable pg_cron extension** (if not already enabled):

```sql
-- Run this in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2. **Create a cron job that calls your API endpoint**:

```sql
-- Schedule daily at 9 AM (UTC)
SELECT cron.schedule(
  'subscription-reminders',           -- Job name
  '0 9 * * *',                        -- Schedule: Daily at 9 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://your-domain.com/api/admin/mailroom/subscription-reminders',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Note**: Replace `https://your-domain.com` with your actual domain.

3. **View cron jobs**:

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- View job execution history
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'subscription-reminders')
ORDER BY start_time DESC
LIMIT 10;
```

4. **Update/Delete cron job**:

```sql
-- Update schedule
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'subscription-reminders'),
  schedule := '0 10 * * *'  -- Change to 10 AM
);

-- Delete cron job
SELECT cron.unschedule('subscription-reminders');
```

### Pros

- ✅ Works independently of hosting platform
- ✅ Can run even if Vercel is down (if you have backup hosting)
- ✅ Database-level scheduling (no external dependencies)
- ✅ Can also run SQL functions directly (no HTTP needed)

### Cons

- ❌ Requires enabling pg_cron extension
- ❌ More complex setup
- ❌ Need to handle HTTP requests from database
- ❌ Monitoring requires SQL queries
- ❌ Limited to 8 concurrent jobs (Supabase limit)

---

## Option 3: Supabase pg_cron with Database Function (No HTTP)

Instead of making HTTP requests, you can create a database function that does the work directly in PostgreSQL.

### Setup

1. **Create a database function**:

```sql
-- Create function to send subscription reminders
CREATE OR REPLACE FUNCTION send_subscription_reminders()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sent_count INTEGER := 0;
  sub_record RECORD;
  user_record RECORD;
BEGIN
  -- Query subscriptions expiring in 7, 3, or 1 days
  FOR sub_record IN
    SELECT
      s.subscription_id,
      s.mailroom_registration_id,
      s.subscription_expires_at,
      r.user_id,
      p.mailroom_plan_name,
      p.mailroom_plan_price
    FROM subscription_table s
    INNER JOIN mailroom_registration_table r ON s.mailroom_registration_id = r.mailroom_registration_id
    INNER JOIN mailroom_plan_table p ON r.mailroom_plan_id = p.mailroom_plan_id
    WHERE s.subscription_auto_renew = true
      AND s.subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      AND EXTRACT(DAY FROM (s.subscription_expires_at - NOW())) IN (1, 3, 7)
  LOOP
    -- Get user email
    SELECT users_email, users_first_name, users_last_name
    INTO user_record
    FROM users_table
    WHERE users_id = sub_record.user_id;

    IF user_record.users_email IS NOT NULL THEN
      -- Call your email API (you'll need to use a PostgreSQL HTTP extension like http or pg_net)
      -- Or insert into a notifications table that triggers emails
      -- For now, we'll just log it
      RAISE NOTICE 'Would send reminder to %', user_record.users_email;
      sent_count := sent_count + 1;
    END IF;
  END LOOP;

  RETURN json_build_object('sent', sent_count);
END;
$$;
```

2. **Schedule the function**:

```sql
SELECT cron.schedule(
  'subscription-reminders-db',
  '0 9 * * *',
  $$SELECT send_subscription_reminders();$$
);
```

**Note**: This approach requires either:

- A PostgreSQL HTTP extension (like `http` or `pg_net`) to call your email API
- Or a notification queue table that your application polls
- Or Supabase Edge Functions (which can be called via HTTP)

### Pros

- ✅ No external HTTP calls needed
- ✅ Runs entirely in database
- ✅ Faster (no network latency)

### Cons

- ❌ More complex to implement email sending from database
- ❌ Requires PostgreSQL extensions for HTTP calls
- ❌ Harder to debug
- ❌ Limited access to Node.js libraries

---

## Recommendation

**Use Vercel Cron** (Option 1) if:

- ✅ You're already deploying on Vercel
- ✅ You want the simplest setup
- ✅ You need access to Next.js features and libraries

**Use Supabase pg_cron** (Option 2) if:

- ✅ You want database-level scheduling
- ✅ You're not using Vercel
- ✅ You want independence from hosting platform

---

## Testing Cron Jobs

### Test Vercel Cron Locally

You can't test Vercel Cron locally, but you can manually call the endpoint:

```bash
curl -X POST http://localhost:3000/api/admin/mailroom/subscription-reminders
```

### Test Supabase pg_cron

```sql
-- Manually trigger the job
SELECT cron.schedule(
  'test-reminders',
  '*/1 * * * *',  -- Every minute (for testing)
  $$
  SELECT net.http_post(
    url := 'https://your-domain.com/api/admin/mailroom/subscription-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);

-- Check results
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'test-reminders')
ORDER BY start_time DESC;

-- Clean up test job
SELECT cron.unschedule('test-reminders');
```

---

## Monitoring

### Vercel

- Dashboard → Project → Settings → Cron Jobs
- View execution history, logs, and success/failure rates

### Supabase

```sql
-- View all cron jobs
SELECT * FROM cron.job;

-- View execution history
SELECT
  j.jobname,
  j.schedule,
  j.active,
  d.runid,
  d.start_time,
  d.end_time,
  d.status,
  d.return_message
FROM cron.job j
LEFT JOIN cron.job_run_details d ON j.jobid = d.jobid
WHERE j.jobname = 'subscription-reminders'
ORDER BY d.start_time DESC
LIMIT 20;
```

---

## Security Considerations

### Vercel Cron

- ✅ Automatically secured (only Vercel can trigger)
- ✅ Uses your API route authentication if needed

### Supabase pg_cron

- ⚠️ Add authentication to your API endpoint
- ⚠️ Consider using a secret token in the request:

```sql
SELECT cron.schedule(
  'subscription-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-domain.com/api/admin/mailroom/subscription-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SECRET_TOKEN'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Then verify the token in your API route:

```typescript
// app/api/admin/mailroom/subscription-reminders/route.ts
export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest of your code
}
```
