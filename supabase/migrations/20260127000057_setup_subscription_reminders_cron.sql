-- Setup Supabase pg_cron for subscription reminders
-- This is an alternative to Vercel Cron
-- 
-- Prerequisites:
-- 1. Enable pg_cron extension (if not already enabled)
-- 2. Set CRON_SECRET_TOKEN environment variable in your Next.js app
-- 3. Replace 'https://your-domain.com' with your actual domain

-- Enable pg_cron extension (run this first if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule subscription reminders cron job
-- Runs daily at 9 AM UTC (adjust timezone as needed)
-- Note: Replace 'YOUR_DOMAIN' and 'YOUR_SECRET_TOKEN' with actual values
SELECT cron.schedule(
  'subscription-reminders',           -- Job name (unique identifier)
  '0 9 * * *',                        -- Schedule: Daily at 9 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_DOMAIN.com/api/admin/mailroom/subscription-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SECRET_TOKEN'
      )::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- View the scheduled job
-- SELECT * FROM cron.job WHERE jobname = 'subscription-reminders';

-- View job execution history
-- SELECT 
--   runid,
--   jobid,
--   job_pid,
--   database,
--   username,
--   command,
--   status,
--   return_message,
--   start_time,
--   end_time
-- FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'subscription-reminders')
-- ORDER BY start_time DESC 
-- LIMIT 20;

-- To update the schedule:
-- SELECT cron.alter_job(
--   job_id := (SELECT jobid FROM cron.job WHERE jobname = 'subscription-reminders'),
--   schedule := '0 10 * * *'  -- Change to 10 AM
-- );

-- To unschedule/delete the job:
-- SELECT cron.unschedule('subscription-reminders');
