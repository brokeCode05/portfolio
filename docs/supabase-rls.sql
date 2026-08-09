/* ===================================================
   Supabase RLS Security Setup
   Run this in your Supabase Dashboard → SQL Editor
   One-time setup — enables secure cloud sync
   =================================================== */

-- Step 1: Enable Row Level Security on your portfolio_data table
-- This prevents unauthorized access to your data
ALTER TABLE portfolio_data ENABLE ROW LEVEL SECURITY;

-- Step 2: Allow public read access
-- Anyone can view your portfolio (this is intentional — it's a public portfolio!)
CREATE POLICY "Public read portfolio_data"
  ON portfolio_data
  FOR SELECT
  TO anon
  USING (true);

-- Step 3: WRITES ARE FUNCTION-ONLY (security fix).
-- The old policies below were a vulnerability: they allowed anonymous
-- INSERT/UPDATE with WITH CHECK (true), and the x-portfolio-secret header was
-- NEVER validated by the database — anyone with the public anon key (which
-- ships in the page source) could overwrite the live portfolio.
--
-- The write path now goes through the portfolio-sync edge function
-- (supabase/functions/portfolio-sync), which compares the admin password
-- against the PORTFOLIO_SYNC_SECRET server-side secret and upserts via the
-- service role (bypasses RLS). Run these two DROPs to close the old hole
-- (idempotent — safe to run anytime):

DROP POLICY IF EXISTS "Admin write portfolio_data" ON portfolio_data;
DROP POLICY IF EXISTS "Admin update portfolio_data" ON portfolio_data;

-- Deploy the function first (from repo root):
--   npx supabase link --project-ref YOUR_PROJECT_REF
--   npx supabase secrets set PORTFOLIO_SYNC_SECRET=the_same_password_you_type_in_admin
--   npx supabase functions deploy portfolio-sync --no-verify-jwt
--
-- Public SELECT (Step 2) stays open so visitors can still read the portfolio.

-- Step 4: Verify your setup
-- Run this to confirm RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'portfolio_data';

/* ===================================================
   Contact Messages (Phase 3)
   Run this in your Supabase Dashboard → SQL Editor
   =================================================== */

-- Step 5: Create the contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false,
  CONSTRAINT contact_messages_length_check CHECK (
    char_length(name) <= 200 AND
    char_length(email) <= 320 AND
    char_length(subject) <= 300 AND
    char_length(message) <= 5000
  )
);

-- Step 6: Enable RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Step 7: NO public insert — contact messages are function-only.
-- The contact-submit edge function (supabase/functions/contact-submit) verifies
-- a Cloudflare Turnstile token server-side (TURNSTILE_SECRET_KEY), then inserts
-- via the service role (bypasses RLS). Keeping the anon INSERT policy closed is
-- what stops bots from writing straight to the table with the public key.
--
-- Deploy the function first (see the deploy notes at the top of
-- supabase/functions/contact-submit/index.ts), then run this:
DROP POLICY IF EXISTS "Public insert contact_messages" ON contact_messages;

-- Step 8: Only the signed-in admin (Supabase Auth OTP session) can read messages
CREATE POLICY "Admin read contact_messages"
  ON contact_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 9: Only the signed-in admin can mark messages read/unread
CREATE POLICY "Admin update contact_messages"
  ON contact_messages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 10: Only the signed-in admin can delete messages
CREATE POLICY "Admin delete contact_messages"
  ON contact_messages
  FOR DELETE
  TO authenticated
  USING (true);

-- ===================================================
--   Contact Messages — Spam Protection (Phase 3.1)
--   Run this section after Steps 5-10
--   ===================================================

-- Step 11: Store the Turnstile challenge token on each message (for audit).
-- The contact-submit edge function verifies the token with Cloudflare
-- siteverify before inserting; the token is kept here as a record of that
-- verification. There is no direct REST insert path anymore (Step 7).
ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS turnstile_token text;

-- Step 12: Flood guard — block repeat sends from the same email within 10 minutes.
-- This is enforced by the database itself, so it works even if a bot clears
-- browser storage or posts directly to the REST API.
CREATE OR REPLACE FUNCTION contact_messages_flood_guard()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM contact_messages
    WHERE email = NEW.email
      AND created_at > now() - interval '10 minutes'
  ) THEN
    RAISE EXCEPTION 'Too many messages from this email recently';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contact_messages_flood_guard_trigger ON contact_messages;
CREATE TRIGGER contact_messages_flood_guard_trigger
  BEFORE INSERT ON contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION contact_messages_flood_guard();

-- ===================================================
--   Contact Messages — Email Notifications (Phase 3.2)
--   Run this section after Steps 5-12
--   ===================================================

-- Step 13: Email the owner when a new message arrives.
-- Uses Supabase's built-in pg_net extension so the email fires on ANY insert,
-- whether the message came via the contact-submit edge function or any other
-- verified path. The notify edge function (supabase/functions/notify) does the
-- actual sending via EmailJS (the owner's connected Gmail account).

-- 13a. Enable pg_net (standard Supabase extension).
create extension if not exists pg_net;

-- 13b. Config table holds the notify function URL + shared secret.
--     IMPORTANT: replace the two values below before running!
--       - function_url: your Supabase project ref
--       - secret:       the SAME value you set with `supabase secrets set NOTIFY_SECRET=...`
create table if not exists contact_notify_config (
  id int primary key default 1,
  function_url text not null,
  secret text not null,
  check (id = 1)
);

insert into contact_notify_config (function_url, secret)
values (
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify',
  'REPLACE_WITH_YOUR_NOTIFY_SECRET'
)
on conflict (id) do update
  set function_url = excluded.function_url,
      secret = excluded.secret;

-- 13b2. Lock the config table down: RLS on with no anon/authenticated policies.
-- The notify trigger is SECURITY DEFINER (owner = postgres), so it bypasses RLS
-- and notifications keep working — but the public can no longer read the secret
-- or redirect function_url to an attacker-controlled server.
alter table contact_notify_config enable row level security;

-- 13c. Trigger function: fire-and-forget POST to the notify edge function.
create or replace function contact_messages_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg contact_notify_config%rowtype;
  payload jsonb;
begin
  select * into cfg from contact_notify_config where id = 1;
  if not found then
    return new;
  end if;

  payload := jsonb_build_object(
    'name', new.name,
    'email', new.email,
    'subject', new.subject,
    'message', new.message,
    'created_at', new.created_at
  );

  -- Fire-and-forget: pg_net runs the request in the background; the insert
  -- never blocks or fails because the email is delayed or down.
  perform net.http_post(
    url := cfg.function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', cfg.secret
    ),
    body := payload
  );
  return new;
end;
$$;

-- 13d. Attach the trigger.
drop trigger if exists contact_messages_notify_trigger on contact_messages;
create trigger contact_messages_notify_trigger
  after insert on contact_messages
  for each row
  execute function contact_messages_notify();

-- ===================================================
--   Contact Messages — In-App Replies (Phase 3.3)
--   Run this section after Steps 5-13
--   ===================================================

-- Step 14: Reply threads.
-- The admin replies from the dashboard; the reply edge function
-- (supabase/functions/reply) sends the email via EmailJS AND stores the reply
-- here so the full conversation shows inside the message card.

-- 14a. Timestamp on the message so the inbox shows which ones you answered.
alter table contact_messages
  add column if not exists replied_at timestamptz;

-- 14b. Replies table (thread history), one row per reply you send.
create table if not exists contact_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references contact_messages(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint contact_replies_length_check check (
    char_length(body) between 1 and 10000
  )
);

-- 14c. Fast thread loading.
create index if not exists contact_replies_message_idx
  on contact_replies (message_id, created_at);

-- 14d. RLS: the signed-in admin can read replies to show the thread.
-- Inserts only happen via the reply edge function (service role, bypasses RLS),
-- so no insert policy is needed — this keeps the table locked down.
alter table contact_replies enable row level security;

create policy "Admin read contact_replies"
  on contact_replies
  for select
  to authenticated
  using (true);

-- ===================================================
--   Step 15: Chatbot logs + insights.
-- ===================================================
-- The terminal chat widget (js/chatbot.js) logs every visitor question here
-- (fire-and-forget). The admin "Chat Insights" section reads these rows to show
-- the most asked topics and the unanswered questions that should become FAQ
-- entries. Anyone may insert a log row (public widget); only the admin can read.

-- 15a. Log table.
create table if not exists chat_logs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  question text not null,
  matched_topic text,
  answered boolean not null default false,
  escalated boolean not null default false,
  created_at timestamptz not null default now(),
  constraint chat_logs_question_length check (char_length(question) between 1 and 1000),
  constraint chat_logs_session_length check (char_length(session_id) between 1 and 100)
);

-- 15b. Indexes for the insights queries.
create index if not exists chat_logs_created_at_idx on chat_logs (created_at desc);
create index if not exists chat_logs_question_idx on chat_logs (question text_pattern_ops);

-- 15c. RLS: anon may only insert (the widget), authenticated (admin) may read.
alter table chat_logs enable row level security;

create policy "Anyone can log chatbot conversations"
  on chat_logs
  for insert
  to anon
  with check (true);

create policy "Admin read chat logs"
  on chat_logs
  for select
  to authenticated
  using (true);

create policy "Admin delete chat logs"
  on chat_logs
  for delete
  to authenticated
  using (true);

-- 15d. Light flood guard: drop the same question from the same session within
--      5 minutes ONLY when the previous identical question was NOT answered
--      (the stuck-widget-loop case this guard exists for). Legit repeat
--      questions that WERE answered still log — so re-asking a question shows
--      fresh topics in Chat Insights instead of a stale row hiding behind the
--      flood guard.
create or replace function chat_logs_flood_guard()
returns trigger as $$
begin
  if exists (
    select 1 from chat_logs
    where session_id = new.session_id
      and question = new.question
      and created_at > now() - interval '5 minutes'
      and answered = false
  ) then
    return null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists chat_logs_flood_guard_trigger on chat_logs;
create trigger chat_logs_flood_guard_trigger
  before insert on chat_logs
  for each row
  execute function chat_logs_flood_guard();

-- ===================================================
--   Step 16: Chatbot AI daily usage cap.
-- ===================================================
-- The chat-ai edge function counts AI requests per day here and refuses
-- once the daily limit is reached, so the free Groq quota can't be drained
-- by spam. Only the service role (used by the edge function) can access it.

create table if not exists chat_ai_usage (
  usage_date date not null,
  client_ip text not null default 'unknown',
  request_count integer not null default 0,
  primary key (usage_date, client_ip)
);

-- If you created this table before the per-IP fix, migrate it instead:
--   ALTER TABLE chat_ai_usage DROP CONSTRAINT chat_ai_usage_pkey;
--   ALTER TABLE chat_ai_usage ADD COLUMN IF NOT EXISTS client_ip text NOT NULL DEFAULT 'unknown';
--   ALTER TABLE chat_ai_usage ADD PRIMARY KEY (usage_date, client_ip);

alter table chat_ai_usage enable row level security;
-- No policies: RLS is on with no anon/authenticated access, so only the
-- service role (bypasses RLS) can read or update this table.
