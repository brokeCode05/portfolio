// Supabase Edge Function: reply to a contact message from the admin dashboard.
//
// - Verifies the admin's Supabase Auth session (the OTP access token sent as
//   `Authorization: Bearer <token>`) — only the signed-in admin can send replies.
// - Sends the reply email to the visitor via Resend (same provider as notify).
// - Stores the reply in contact_replies (service role) and stamps
//   contact_messages.replied_at so the inbox shows which messages you answered.
//
// Deploy (from repo root):
//   npx supabase login
//   npx supabase link --project-ref YOUR_PROJECT_REF
//   npx supabase secrets set RESEND_API_KEY=re_xxx
//   npx supabase secrets set ADMIN_EMAIL=jhnbryn05@gmail.com
//   npx supabase secrets set RESEND_FROM="Portfolio <onboarding@resend.dev>"
//   npx supabase functions deploy reply
//
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically for CLI-deployed functions — no secrets to set for those.
//
// In admin.html set REPLY_FUNCTION_URL (see the Messages section) to
//   https://YOUR_PROJECT_REF.supabase.co/functions/v1/reply
//
// Requires Step 14 in docs/supabase-rls.sql (contact_replies table).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_URL = 'https://api.resend.com/emails'

Deno.serve(async (req) => {
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

  // 5. Send the reply email via Resend.
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM') || 'Portfolio <onboarding@resend.dev>'
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set')
    return json({ error: 'server not configured' }, 500)
  }

  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="white-space: pre-wrap; line-height: 1.6;">${esc(replyBody)}</div>
      ${msg.message ? `
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
      <p style="color:#6b7280; font-size:13px;">Your original message:</p>
      <blockquote style="margin:0;padding-left:12px;border-left:3px solid #d1d5db;color:#6b7280;font-size:13px;white-space:pre-wrap;">${esc(msg.message)}</blockquote>` : ''}
    </div>
  `

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [msg.email],
      subject: `Re: ${msg.subject || '(no subject)'}`,
      html,
      reply_to: expectedAdmin,
    }),
  })
  const resendData = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('Resend error:', res.status, JSON.stringify(resendData))
    // Reply is stored but the email failed — tell the admin so they can retry.
    return json({ error: 'email failed to send — reply saved, please retry' }, 502)
  }

  console.log(`Reply sent to ${msg.email} for message ${messageId}`)
  return json({ ok: true }, 200)
})

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
