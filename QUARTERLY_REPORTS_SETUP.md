# Quarterly Reports Setup Guide

This document explains how to set up and configure the automated quarterly reporting system.

## Overview

The quarterly reporting system automatically generates and emails AI-powered progress reports to students on the 1st of each quarter (Jan 1, Apr 1, Jul 1, Oct 1). Reports include:
- Classes completed during the quarter (3 months of data)
- Content covered and homework assigned
- Tutor notes
- AI-generated recommendations for improvement (leveraging 3 months of data for better pattern recognition)

## Components

1. **Database Table**: `monthly_reports_sent` - Tracks sent reports (reused for quarterly)
2. **Edge Function**: `generate-quarterly-report` - Generates and sends reports
3. **Edge Function**: `cron-quarterly-reports` - Cron wrapper for automation
4. **Admin UI**: Quarterly Reports tab in admin dashboard

## Setup Instructions

### 1. Database Table (Already Complete)
The `monthly_reports_sent` table is reused for quarterly reports with RLS policies.

### 2. Edge Functions (Already Deployed)
Both edge functions are deployed automatically and configured in `supabase/config.toml`.

### 3. Cron Job Setup (Manual Step Required)

To enable automatic quarterly report generation, you need to set up a pg_cron job in Supabase:

**Steps:**
1. Go to the Supabase SQL Editor: https://supabase.com/dashboard/project/lnhtlbatcufmsyoujuqh/sql/new
2. Copy and paste the following SQL:

```sql
-- Schedule quarterly reports to run on Jan 1, Apr 1, Jul 1, Oct 1 at 9:00 AM UTC
SELECT
  cron.schedule(
    'quarterly-reports-generation',
    '0 9 1 1,4,7,10 *',
    $$
    SELECT
      net.http_post(
        url:='https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/cron-quarterly-reports',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaHRsYmF0Y3VmbXN5b3VqdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTgyMTIsImV4cCI6MjA1OTg5NDIxMn0.6bxo3bNzkDWvyFMQPudYw5_3mVrxge-CfkChX2aDy9E"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
      ) as request_id;
    $$
  );
```

3. Execute the query

**Schedule Details:**
- Runs every Jan 1, Apr 1, Jul 1, Oct 1 at 9:00 AM UTC
- Generates reports for the previous quarter (3 months of data)
- Sends emails to all active students

### 4. Remove Old Monthly Cron Job (If Exists)

If you had the monthly cron job set up, remove it:

```sql
SELECT cron.unschedule('monthly-reports-generation');
```

### 5. Verify Cron Job

To check if the cron job is scheduled:

```sql
SELECT * FROM cron.job WHERE jobname = 'quarterly-reports-generation';
```

### 6. Test the System

You can manually trigger report generation from the Admin Dashboard:
1. Navigate to Admin Dashboard
2. Click the "Reports" tab
3. Select a student and quarter
4. Click "Generate & Send Report"

Or test the edge function directly:

```sql
SELECT
  net.http_post(
    url:='https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/cron-quarterly-reports',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaHRsYmF0Y3VmbXN5b3VqdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTgyMTIsImV4cCI6MjA1OTg5NDIxMn0.6bxo3bNzkDWvyFMQPudYw5_3mVrxge-CfkChX2aDy9E"}'::jsonb,
    body:='{"test": true}'::jsonb
  ) as request_id;
```

## Admin Dashboard Usage

### Sending Reports

1. **Select Student**: Choose a specific student or "All Students"
2. **Select Quarter**: Choose which quarter to generate the report for (last 4 quarters available)
3. **Click "Generate & Send Report"**: Reports are generated and emailed immediately

### View Report History

The "Report History" section shows:
- All previously sent reports
- Student names and emails
- Report quarters
- Send dates and times
- Status (Sent)

## Monitoring

### Edge Function Logs

View logs for troubleshooting:
- `generate-quarterly-report`: https://supabase.com/dashboard/project/lnhtlbatcufmsyoujuqh/functions/generate-quarterly-report/logs
- `cron-quarterly-reports`: https://supabase.com/dashboard/project/lnhtlbatcufmsyoujuqh/functions/cron-quarterly-reports/logs

### Check Sent Reports

Query the database:

```sql
SELECT 
  r.report_month,
  p.email,
  p.first_name,
  p.last_name,
  r.sent_at
FROM monthly_reports_sent r
JOIN profiles p ON r.student_id = p.id
ORDER BY r.sent_at DESC;
```

## Unscheduling (If Needed)

To stop automatic report generation:

```sql
SELECT cron.unschedule('quarterly-reports-generation');
```

## Customization

### Change Schedule

To modify when reports are sent, update the cron expression:
- `'0 9 1 1,4,7,10 *'` = 9:00 AM UTC on Jan 1, Apr 1, Jul 1, Oct 1
- The format is: minute hour day month day-of-week

### Customize Email Content

Edit the `generateReportHTML` function in `supabase/functions/generate-quarterly-report/index.ts`

### Adjust AI Recommendations

Modify the prompt in the `generateAIRecommendations` function in `supabase/functions/generate-quarterly-report/index.ts`

## Troubleshooting

**No emails received:**
1. Check edge function logs for errors
2. Verify RESEND_API_KEY is configured
3. Ensure student has classes in the target quarter
4. Check spam/junk folders

**Duplicate reports:**
The system prevents duplicates by checking `monthly_reports_sent` table before sending.

**AI recommendations unavailable:**
1. Verify LOVABLE_API_KEY is configured
2. Check edge function logs for AI API errors
3. Reports will still send without AI recommendations if generation fails

## Benefits of Quarterly vs Monthly

- **More data for AI analysis**: 3 months of classes allows for better pattern recognition
- **More meaningful recommendations**: AI can identify trends, improvements, and areas needing focus
- **Subject mastery assessment**: Enough data to evaluate progress across different subjects
- **Less email fatigue**: Students receive fewer but more comprehensive reports

## Support

For issues or questions:
1. Check edge function logs
2. Review database table for sent reports
3. Test manual report generation via admin UI
