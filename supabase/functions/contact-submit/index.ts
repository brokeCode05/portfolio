// Supabase Edge Function: spam-safe contact form submission.
//
// The browser sends the message + a Cloudflare Turnstile token here instead of
// POSTing straight to the REST API. The token is verified server-side with the
// SECRET key (never exposed to the browser); only a verified submission is
// inserted into contact_messages (via the service role, bypassing RLS).
//
// This lets us close the public anon INSERT policy on contact_messages:
//   DROP POLICY IF EXISTS "Public insert contact_messages" ON contact_messages;
// After that, the ONLY way a message can reach the table is through this
// function — which requires a valid Turnstile token. Bots that skip the widget
// and hit /rest/v1 directly get a 403.
//
// Deploy (from repo root):
//   npx supabase login
//   npx supabase link --project-ref YOUR_PROJECT_REF
//   npx supabase secrets set TURNSTILE_SECRET_KEY=your_secret_key
//   npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
//   npx supabase functions deploy contact-submit --no-verify-jwt
//
// IMPORTANT: deploy with --no-verify-jwt — browsers call it without a JWT. The
// Turnstile verification is the actual gate; unverified calls are rejected.
//
// The DB triggers (flood guard + notify email) still fire on insert, so admin
// notification keeps working unchanged.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

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

  const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secretKey) {
    return json({ error: 'turnstile not configured' }, 500)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim()
  const subject = String(body.subject ?? '').trim()
  const message = String(body.message ?? '').trim()
  const turnstileToken = String(body.turnstile_token ?? '').trim()

  if (!name || !email || !subject || !message) {
    return json({ error: 'missing fields' }, 400)
  }

  // This function is now the only insert gate, so re-validate on the server
  // too — client-side checks are bypassable by direct callers.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!EMAIL_RE.test(email)) {
    return json({ error: 'invalid email' }, 400)
  }

  // Server-side verification — the core spam gate. A missing/forged token
  // cannot pass here, no matter what the client sends.
  let verify
  try {
    const verifyResp = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretKey, response: turnstileToken }),
    })
    verify = await verifyResp.json()
  } catch {
    return json({ error: 'security check unavailable' }, 503)
  }
  if (!verify || !verify.success) {
    return json({ error: 'security check failed' }, 403)
  }

  // Verified — insert via the service role (bypasses RLS). Length caps mirror
  // the contact_messages_length_check constraint in the schema.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  )

  const { error } = await supabase.from('contact_messages').insert({
    name: name.slice(0, 200),
    email: email.slice(0, 320),
    subject: subject.slice(0, 300),
    message: message.slice(0, 5000),
    turnstile_token: turnstileToken || null,
  })

  if (error) {
    return json({ error: 'db error' }, 500)
  }

  return json({ ok: true }, 201)
})
