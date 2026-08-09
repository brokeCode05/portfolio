// Supabase Edge Function: secure portfolio_data sync (admin panel → cloud).
//
// WHY THIS EXISTS
// The old design posted straight to the REST API with the public anon key and
// an "x-portfolio-secret" header that the database NEVER validated — the RLS
// policies were open (WITH CHECK true to anon), so anyone with the public key
// could overwrite the live portfolio. This function is the ONLY write path:
// it compares the admin password against a server-side secret (never in the
// browser) and inserts/upserts via the service role, bypassing RLS.
//
// Deploy (from repo root):
//   npx supabase login
//   npx supabase link --project-ref YOUR_PROJECT_REF
//   npx supabase secrets set PORTFOLIO_SYNC_SECRET=the_same_password_you_type_in_admin
//   npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
//   npx supabase functions deploy portfolio-sync --no-verify-jwt
//
// IMPORTANT: deploy with --no-verify-jwt (browsers call it without a JWT). The
// PORTFOLIO_SYNC_SECRET comparison is the actual gate.
//
// Then close the old open policies (idempotent):
//   DROP POLICY IF EXISTS "Admin write portfolio_data" ON portfolio_data;
//   DROP POLICY IF EXISTS "Admin update portfolio_data" ON portfolio_data;
// (Public SELECT stays, so the site can still read.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portfolio-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // Browser preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  // ── The gate: the admin password must match the server-side secret. ──
  const expected = Deno.env.get('PORTFOLIO_SYNC_SECRET')
  if (!expected) {
    return json({ error: 'sync not configured' }, 500)
  }
  const got = req.headers.get('x-portfolio-secret') || ''
  // Constant-time-ish compare (crypto.subtle would be async-overkill here; a
  // simple length + equality check is fine for this low-value secret).
  if (!got || got.length !== expected.length || got !== expected) {
    return json({ error: 'unauthorized' }, 401)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const jsonData = body.json_data ?? null
  if (!jsonData || typeof jsonData !== 'object' || Array.isArray(jsonData)) {
    return json({ error: 'missing json_data' }, 400)
  }

  const now = String(body.updated_at || new Date().toISOString())
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  )

  const { error } = await supabase
    .from('portfolio_data')
    .upsert(
      { id: 1, json_data: jsonData, updated_at: now },
      { onConflict: 'id' }
    )

  if (error) {
    console.error('portfolio-sync upsert failed:', error.message)
    return json({ error: 'db error' }, 500)
  }

  return json({ ok: true }, 200)
})
