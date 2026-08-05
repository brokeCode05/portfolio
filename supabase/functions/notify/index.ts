// Supabase Edge Function: email the site owner when a new contact message arrives.
//
// This function is called by a Postgres trigger (pg_net) on every INSERT into
// contact_messages, so it works for BOTH insert paths: the direct REST insert
// (current default) and the optional `contact` edge function.
//
// It sends via EmailJS (https://www.emailjs.com), which delivers through the
// account owner's connected Gmail — no domain verification needed.
//
// Deploy (from repo root):
//   npx supabase login
//   npx supabase link --project-ref YOUR_PROJECT_REF
//   npx supabase secrets set EMAILJS_SERVICE_ID=service_xxx
//   npx supabase secrets set EMAILJS_TEMPLATE_NOTIFY=template_xxx
//   npx supabase secrets set EMAILJS_PUBLIC_KEY=your_public_key
//   npx supabase secrets set EMAILJS_PRIVATE_KEY=your_private_key
//   npx supabase secrets set NOTIFY_SECRET=generate_a_long_random_string
//   npx supabase secrets set NOTIFY_EMAIL=jhnbryn05@gmail.com
//   npx supabase functions deploy notify --no-verify-jwt
//
// IMPORTANT: deploy with --no-verify-jwt — the DB trigger calls this function
// with only the x-notify-secret header (no JWT), and the secret check below is
// what protects the endpoint.
//
// Then run Step 13 in docs/supabase-rls.sql to create the trigger that calls it.
//
// The trigger sends the SAME NOTIFY_SECRET in the x-notify-secret header, which
// keeps random people from spamming your inbox via this endpoint.
//
// EmailJS 'notify' template should use these template params:
//   To:        {{to_email}}     (your email)
//   Reply-To:  {{email}}        (the visitor, so you can just hit Reply)
//   Subject:   New contact message: {{subject}}
//   Body:      use the *_html variants ({{name_html}}, {{email_html}},
//              {{subject_html}}, {{message_html}}) — EmailJS does not escape
//              params and these values come from visitors. {{created_at}} is safe.
//
// EmailJS does NOT HTML-escape template params, so visitor-controlled values
// are escaped here and passed both raw and as *_html variants.

const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send'

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

  const to = Deno.env.get('NOTIFY_EMAIL') || 'jhnbryn05@gmail.com'
  const serviceId = Deno.env.get('EMAILJS_SERVICE_ID')
  const templateId = Deno.env.get('EMAILJS_TEMPLATE_NOTIFY')
  const publicKey = Deno.env.get('EMAILJS_PUBLIC_KEY')
  const privateKey = Deno.env.get('EMAILJS_PRIVATE_KEY')

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.error('EmailJS secrets are not fully set')
    return json({ error: 'server not configured' }, 500)
  }

  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const res = await fetch(EMAILJS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        to_email: to,
        name,
        email,
        subject,
        message,
        created_at: createdAt,
        name_html: esc(name),
        email_html: esc(email),
        subject_html: esc(subject),
        message_html: esc(message),
      },
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('EmailJS error:', res.status, JSON.stringify(data))
    const why = data && data.message ? ' ' + data.message : ''
    return json({ error: 'email failed to send' + why }, 502)
  }

  console.log(`Notification email queued for ${to} (message from ${email})`)
  return json({ ok: true }, 200)
})

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
