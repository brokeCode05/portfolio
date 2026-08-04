// Supabase Edge Function: email the site owner when a new contact message arrives.
//
// This function is called by a Postgres trigger (pg_net) on every INSERT into
// contact_messages, so it works for BOTH insert paths: the direct REST insert
// (current default) and the optional `contact` edge function.
//
// Deploy (from repo root):
//   npx supabase login
//   npx supabase link --project-ref YOUR_PROJECT_REF
//   npx supabase secrets set RESEND_API_KEY=re_xxx
//   npx supabase secrets set NOTIFY_SECRET=generate_a_long_random_string
//   npx supabase secrets set NOTIFY_EMAIL=jhnbryn05@gmail.com
//   npx supabase secrets set RESEND_FROM="Portfolio <onboarding@resend.dev>"
//   npx supabase functions deploy notify
//
// Then run Step 13 in docs/supabase-rls.sql to create the trigger that calls it.
//
// Note: the trigger sends the SAME NOTIFY_SECRET in the x-notify-secret header.
// The secret keeps random people from spamming your inbox via this endpoint.
//
// Important: the default RESEND_FROM uses Resend's sandbox sender
// (onboarding@resend.dev), which only delivers to the email you used to create
// the Resend account. For production, verify a domain in Resend and set
// RESEND_FROM to your own verified sender.

const RESEND_URL = 'https://api.resend.com/emails'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  // Require the shared secret so strangers can't trigger emails to you.
  const secret = Deno.env.get('NOTIFY_SECRET')
  const got = req.headers.get('x-notify-secret')
  if (!secret || !got || got !== secret) {
    return json({ error: 'unauthorized' }, 401)
  }

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid body' }, 400)
  }

  const name = String(body.name || 'Unknown').trim().slice(0, 200)
  const email = String(body.email || '').trim().slice(0, 320)
  const subject = String(body.subject || '(no subject)').trim().slice(0, 300)
  const message = String(body.message || '').trim().slice(0, 5000)
  const createdAt = String(body.created_at || '')

  if (!email || !message) {
    return json({ error: 'missing required fields' }, 400)
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const to = Deno.env.get('NOTIFY_EMAIL') || 'jhnbryn05@gmail.com'
  const from = Deno.env.get('RESEND_FROM') || 'Portfolio <onboarding@resend.dev>'

  if (!apiKey) {
    console.error('RESEND_API_KEY is not set')
    return json({ error: 'server not configured' }, 500)
  }

  const html = buildEmailHtml({ name, email, subject, message, createdAt })

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `New contact message: ${subject}`,
      html,
      reply_to: email,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('Resend error:', res.status, JSON.stringify(data))
    return json({ error: 'email failed to send' }, 502)
  }

  console.log(`Notification email queued for ${to} (message from ${email})`)
  return json({ ok: true }, 200)
})

function buildEmailHtml({ name, email, subject, message, createdAt }) {
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #16a34a; margin-bottom: 4px;">New contact message</h2>
      <p style="margin-top: 0; color: #6b7280; font-size: 13px;">${esc(createdAt) || ''}</p>
      <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280; width: 90px; vertical-align: top;">From</td>
          <td style="padding: 6px 0; font-weight: 600;">${esc(name)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; vertical-align: top;">Email</td>
          <td style="padding: 6px 0;"><a href="mailto:${esc(email)}" style="color: #16a34a;">${esc(email)}</a></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; vertical-align: top;">Subject</td>
          <td style="padding: 6px 0; font-weight: 600;">${esc(subject)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; vertical-align: top;">Message</td>
          <td style="padding: 6px 0; white-space: pre-wrap;">${esc(message)}</td>
        </tr>
      </table>
      <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
        Reply directly to this email to answer ${esc(name)}. Manage messages in your
        <a href="https://brokeCode05.github.io/portfolio/admin.html" style="color: #16a34a;">admin panel</a>.
      </p>
    </div>
  `
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
