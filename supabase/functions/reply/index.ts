// Supabase Edge Function: reply to a contact message from the admin dashboard.
//
// - Verifies the admin's Supabase Auth session (the OTP access token sent as
//   `Authorization: Bearer <token>`) — only the signed-in admin can send replies.
// - Sends the reply email to the visitor via EmailJS (delivers through the
//   account owner's connected Gmail — no domain verification needed).
// - Stores the reply in contact_replies (service role) and stamps
//   contact_messages.replied_at so the inbox shows which messages you answered.
//
// Deploy (from repo root):
//   npx supabase login
//   npx supabase link --project-ref YOUR_PROJECT_REF
//   npx supabase secrets set EMAILJS_SERVICE_ID=service_xxx
//   npx supabase secrets set EMAILJS_TEMPLATE_REPLY=template_xxx
//   npx supabase secrets set EMAILJS_PUBLIC_KEY=your_public_key
//   npx supabase secrets set EMAILJS_PRIVATE_KEY=your_private_key
//   npx supabase secrets set ADMIN_EMAIL=jhnbryn05@gmail.com
//   npx supabase functions deploy reply
//
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically for CLI-deployed functions — no secrets to set for those.
//
// In admin.html set REPLY_FUNCTION_URL (see the Messages section) to
//   https://YOUR_PROJECT_REF.supabase.co/functions/v1/reply
//
// Requires Step 14 in docs/supabase-rls.sql (contact_replies table).
//
// EmailJS 'reply' template should use these template params:
//   To:        {{to_email}}   (the visitor)
//   Reply-To:  {{reply_to}}   (your admin email, so their reply comes back to you)
//   Subject:   {{subject}}    (Re: <original subject>)
//   Body:      {{reply}} with the quoted {{original}} message

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send'

// Browser calls come from brokeCode05.github.io — allow cross-origin requests
// from any origin (the function itself checks the admin JWT, so an open CORS
// policy only controls who can reach the endpoint, not who can use it).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Answer the browser's preflight OPTIONS request so fetch() from the admin
  // panel isn't blocked before it reaches this function.
  if (req.method === 'OPTIONS') {
    // Return 200, not 204: constructing a Response with status 204 and a body
    // throws a TypeError in Deno, which turns the preflight into a 500.
    return new Response('ok', { status: 200, headers: CORS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  // 1. Verify the caller is the signed-in admin (OTP session).
  const anonClient = createClient(supabaseUrl, anonKey)
  const authHeader = req.headers.get('Authorization') || ''
  const { data: userData, error: userError } = await anonClient.auth.getUser(
    authHeader.replace(/^Bearer\s+/i, ''),
  )
  if (userError || !userData?.user) {
    return json({ error: 'unauthorized — please sign in' }, 401)
  }
  const expectedAdmin = Deno.env.get('ADMIN_EMAIL') || 'jhnbryn05@gmail.com'
  if (userData.user.email !== expectedAdmin) {
    console.log(`Rejected reply from non-admin: ${userData.user.email}`)
    return json({ error: 'forbidden' }, 403)
  }

  // 2. Parse the request.
  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid body' }, 400)
  }
  const messageId = String(body.message_id || '').trim()
  const replyBody = String(body.body || '').trim().slice(0, 10000)
  if (!messageId || !replyBody) {
    return json({ error: 'missing required fields' }, 400)
  }

  // 3. Load the original message (incl. full text for the email quote) with the service role.
  const admin = createClient(supabaseUrl, serviceKey)
  const { data: msg, error: msgErr } = await admin
    .from('contact_messages')
    .select('id, name, email, subject, message')
    .eq('id', messageId)
    .maybeSingle()
  if (msgErr || !msg) {
    return json({ error: 'message not found' }, 404)
  }

  // 4. Store the reply + stamp replied_at FIRST so the admin thread is accurate
  // even if the email send fails. Service role bypasses RLS.
  // Idempotency guard: if the exact same reply was already stored in the last
  // 10 minutes (e.g. a retry after an email failure), don't duplicate it.
  const { data: existing } = await admin
    .from('contact_replies')
    .select('id')
    .eq('message_id', messageId)
    .eq('body', replyBody)
    .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .limit(1)
  if (!existing || !existing.length) {
    const { error: replyErr } = await admin
      .from('contact_replies')
      .insert({ message_id: messageId, body: replyBody })
    if (replyErr) {
      console.error('Reply store failed:', replyErr.message)
      return json({ error: 'reply could not be stored' }, 500)
    }
  }
  await admin
    .from('contact_messages')
    .update({ replied_at: new Date().toISOString() })
    .eq('id', messageId)

  // 5. Send the reply email via EmailJS (delivers through your connected Gmail —
  // no domain needed). The 'reply' template renders the email from these params.
  const serviceId = Deno.env.get('EMAILJS_SERVICE_ID')
  const templateId = Deno.env.get('EMAILJS_TEMPLATE_REPLY')
  const publicKey = Deno.env.get('EMAILJS_PUBLIC_KEY')
  const privateKey = Deno.env.get('EMAILJS_PRIVATE_KEY')

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.error('EmailJS secrets are not fully set')
    return json({ error: 'server not configured — EmailJS secrets missing' }, 500)
  }

  const res = await fetch(EMAILJS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        to_email: msg.email,
        reply_to: expectedAdmin,
        subject: `Re: ${msg.subject || '(no subject)'}`,
        name: msg.name,
        reply: replyBody,
        original: msg.message || '',
      },
    }),
  })

  const emailjsData = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('EmailJS error:', res.status, JSON.stringify(emailjsData))
    // Reply is stored but the email failed — surface EmailJS's reason so the
    // admin knows exactly what to fix.
    const why = emailjsData && emailjsData.message ? ' ' + emailjsData.message : ''
    return json({ error: 'email failed to send — reply saved.' + why }, 502)
  }

  console.log(`Reply sent to ${msg.email} for message ${messageId}`)
  return json({ ok: true }, 200)
})

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}
