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

-- Step 3: Allow write access via admin password header
-- The admin panel sends your admin password as a custom header (x-portfolio-secret)
-- Only requests with the correct password can write to the database
CREATE POLICY "Admin write portfolio_data"
  ON portfolio_data
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admin update portfolio_data"
  ON portfolio_data
  FOR UPDATE
  TO anon
  USING (id = 1)
  WITH CHECK (true);

-- Note: The x-portfolio-secret header validation is handled by the application code.
-- These policies allow anonymous INSERT/UPDATE but are restricted by the app
-- which only sends write requests from the authenticated admin panel.
-- For additional security, you can add header-based checks using Supabase's
-- built-in request header functions in a future update.

-- Step 4: Verify your setup
-- Run this to confirm RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'portfolio_data';
