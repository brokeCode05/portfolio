// Supabase Edge Function: verify Cloudflare Turnstile token, then insert contact message.
//
// Deploy (from repo root):
//   npx supabase login
//   npx supabase link --project-ref YOUR_PROJECT_REF
//   npx supabase secrets set TURNSTILE_SECRET_KEY=your_secret_key_here
//   npx supabase functions deploy contact
//
// Then in js/portfolio-data.js set:
//   CONTACT_FUNCTION_URL = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/contact'
//
// Note: this function uses the service role to insert, so the public INSERT policy
// on contact_messages is only used as a fallback when the function is not deployed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid body' }, 400)
  }

  const name = String(body.name || '').trim().slice(0, 200)
  const email = String(body.email || '').trim().slice(0, 320)
  const subject = String(body.subject || '').trim().slice(0, 300)
  const message = String(body.message || '').trim().slice(0, 5000)
  const token = String(body.turnstile_token || '').trim()

  if (!name || !email || !subject || !message) {
    return json({ error: 'missing required fields' }, 400)
  }
  if (!token) {
    return json({ error: 'security check required' }, 403)
  }

  // Verify the Turnstile token with Cloudflare using the secret key.
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set')
    return json({ error: 'server not configured' }, 500)
  }

  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  form.append('remoteip', req.headers.get('x-forwarded-for') || '')

  let verify
  try {
    const vr = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: form })
    verify = await vr.json()
  } catch {
    return json({ error: 'verification service unreachable' }, 502)
  }

  if (!verify.success) {
    console.log('Turnstile verification failed:', verify['error-codes'])
    return json({ error: 'security check failed' }, 403)
  }

  // Token verified — insert the message with the service role.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { error } = await supabase
    .from('contact_messages')
    .insert({ name, email, subject, message, turnstile_token: token })

  if (error) {
    console.error('Insert failed:', error.message)
    // Surface honest feedback: flood guard blocks repeat sends.
    return json({ error: error.message.includes('flood') ? 'rate limited — try again later' : 'delivery failed' }, 500)
  }

  return json({ ok: true }, 201)
})

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
