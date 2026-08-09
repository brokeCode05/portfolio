(function () {
  'use strict';
  var form = document.getElementById('contact-form');
  if (!form) return;

  var fields = {
    name: document.getElementById('contact-name'),
    email: document.getElementById('contact-email'),
    subject: document.getElementById('contact-subject'),
    message: document.getElementById('contact-message')
  };
  var errors = {
    name: document.getElementById('contact-name-error'),
    email: document.getElementById('contact-email-error'),
    subject: document.getElementById('contact-subject-error'),
    message: document.getElementById('contact-message-error')
  };
  var submitBtn = document.getElementById('contact-submit');
  var submitLabel = document.getElementById('contact-submit-label');
  var statusEl = document.getElementById('contact-form-status');
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ---- Spam protection: client-side rate limiter ----
  var RATE_KEY = 'portfolio_contact_rate';
  var RATE_MIN_MS = 60000; // minimum 60s between sends
  var RATE_DAILY_CAP = 5; // maximum 5 sends per calendar day
  function rateTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }
  function getRateState() {
    try {
      var s = JSON.parse(localStorage.getItem(RATE_KEY) || 'null');
      if (s && s.day === rateTodayKey()) return s;
    } catch (e) {}
    return { day: rateTodayKey(), last: 0, count: 0 };
  }
  function checkRateLimit() {
    var s = getRateState();
    var now = Date.now();
    if (now - s.last < RATE_MIN_MS) {
      return { ok: false, wait: Math.ceil((RATE_MIN_MS - (now - s.last)) / 1000) };
    }
    if (s.count >= RATE_DAILY_CAP) {
      return { ok: false, daily: true };
    }
    return { ok: true, state: s };
  }
  function stampRateLimit() {
    var s = getRateState();
    s.last = Date.now();
    s.count += 1;
    try {
      localStorage.setItem(RATE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  // ---- Spam protection: Cloudflare Turnstile (optional) ----
  // Paste your Cloudflare Turnstile site key here to enable the invisible
  // challenge. Leave empty to skip it — rate limit + honeypot still apply.
  // Cloudflare Turnstile — the server-verified spam gate. The site key is
  // public by design (it ships in the page source); the matching SECRET key
  // lives only in Supabase secrets and is used by the contact-submit edge
  // function to verify the token. Leave empty to skip the challenge.
  var CONTACT_TURNSTILE_SITEKEY = '0x4AAAAAAEJ-Y7jYR6izoEbV';
  var turnstileToken = '';
  function turnstileError(text) {
    var err = document.getElementById('contact-captcha-error');
    if (err) err.textContent = text;
  }
  function initTurnstile() {
    var holder = document.getElementById('contact-turnstile');
    var field = document.getElementById('contact-captcha-field');
    if (!CONTACT_TURNSTILE_SITEKEY || !holder) return;
    if (typeof window.turnstile === 'undefined') return;
    try {
      if (field) field.classList.add('is-active');
      window.turnstile.render(holder, {
        sitekey: CONTACT_TURNSTILE_SITEKEY,
        theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
        callback: function (token) {
          turnstileToken = token;
        },
        'expired-callback': function () {
          turnstileToken = '';
        },
        'error-callback': function () {
          turnstileToken = '';
          turnstileError('Security check unavailable — please try again.');
        }
      });
    } catch (e) {
      turnstileToken = '';
      turnstileError('Security check unavailable — please try again.');
    }
  }
  if (CONTACT_TURNSTILE_SITEKEY) {
    var ts = document.createElement('script');
    ts.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    ts.async = true;
    ts.onload = initTurnstile;
    ts.onerror = function () {
      turnstileError('Security check unavailable — use the email link instead.');
    };
    document.head.appendChild(ts);
    // If no token arrives within 10s (script blocked/offline), block the send
    // with an honest message instead of silently submitting unverified.
    setTimeout(function () {
      if (!turnstileToken) {
        turnstileError('Security check unavailable — use the email link instead.');
      }
    }, 10000);
  }

  function setError(name, message) {
    var input = fields[name];
    var error = errors[name];
    if (message) {
      error.textContent = message;
      input.setAttribute('aria-invalid', 'true');
      input.classList.add('is-invalid');
    } else {
      error.textContent = '';
      input.removeAttribute('aria-invalid');
      input.classList.remove('is-invalid');
    }
  }

  function validateField(name) {
    var input = fields[name];
    if (!input) return '';
    var val = (input.value || '').trim();
    if (name === 'email') {
      if (!val) return 'Please enter your email address.';
      if (!EMAIL_RE.test(val)) return "That email address doesn't look right.";
      return '';
    }
    return val ? '' : 'Please fill in this field.';
  }

  function validateAll() {
    var ok = true;
    Object.keys(fields).forEach(function (name) {
      var msg = validateField(name);
      setError(name, msg);
      if (msg) ok = false;
    });
    return ok;
  }

  // Clear/re-validate a field as the visitor types
  Object.keys(fields).forEach(function (name) {
    fields[name].addEventListener('input', function () {
      if (errors[name].textContent) {
        setError(name, validateField(name));
      }
    });
  });

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Terminal log: types out [ OK ]/[ ERR ] lines with a block cursor
  var logTimer = null;
  function writeLog(lines) {
    if (logTimer) clearInterval(logTimer);
    statusEl.innerHTML = '';
    statusEl.className = 'form-status terminal-log';
    var li = 0;
    function typeLine() {
      if (li >= lines.length) return;
      var line = lines[li++];
      var div = document.createElement('div');
      div.className = 'log-line';
      var tag = document.createElement('span');
      tag.className = line.cls;
      tag.textContent = line.tag + ' ';
      var text = document.createElement('span');
      var cursor = document.createElement('span');
      cursor.className = 'log-cursor';
      div.appendChild(tag);
      div.appendChild(text);
      div.appendChild(cursor);
      statusEl.appendChild(div);
      if (reducedMotion) {
        text.textContent = line.text;
        cursor.remove();
        typeLine();
        return;
      }
      var i = 0;
      var timer = setInterval(function () {
        logTimer = timer;
        i++;
        text.textContent = line.text.substring(0, i);
        if (i >= line.text.length) {
          clearInterval(timer);
          logTimer = null;
          cursor.remove();
          setTimeout(typeLine, 180);
        }
      }, 12);
    }
    typeLine();
  }

  // Message character counter
  var msgField = fields.message;
  var countEl = document.getElementById('contact-message-count');
  function updateCharCount() {
    if (countEl) countEl.textContent = 'characters: ' + msgField.value.length + '/5000';
  }
  if (msgField && countEl) {
    msgField.addEventListener('input', updateCharCount);
    updateCharCount();
  }

  // Prompt typewriter — types the command when the terminal scrolls into view
  (function () {
    var terminal = document.getElementById('contact-terminal');
    var cmdEl = document.getElementById('contact-cmd');
    var cursorEl = document.getElementById('contact-cursor');
    if (!terminal || !cmdEl || !cursorEl) return;
    // Data-driven recipient — keep the terminal command in sync with the
    // admin-editable contact email instead of a hardcoded address.
    (function () {
      var email = '';
      var pd = typeof getPortfolioData === 'function' ? getPortfolioData() : null;
      var links =
        pd && pd.contactLinks && pd.contactLinks.length
          ? pd.contactLinks
          : typeof DEFAULT_CONTACT_LINKS !== 'undefined'
            ? DEFAULT_CONTACT_LINKS
            : [];
      for (var i = 0; i < links.length; i++) {
        if ((links[i].label || '').toLowerCase() === 'email' && links[i].value) {
          email = links[i].value;
          break;
        }
      }
      if (email) cmdEl.textContent = './send_message.sh --to=' + email;
    })();
    var full = cmdEl.textContent;
    var started = false;
    function type() {
      if (started) return;
      started = true;
      if (reducedMotion) return;
      cmdEl.textContent = '';
      var i = 0;
      var timer = setInterval(function () {
        i++;
        cmdEl.textContent = full.substring(0, i);
        if (i >= full.length) clearInterval(timer);
      }, 32);
    }
    if (!reducedMotion && 'IntersectionObserver' in window) {
      var obs = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              obs.disconnect();
              type();
            }
          });
        },
        { threshold: 0.25 }
      );
      obs.observe(terminal);
    } else {
      type();
    }
  })();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitBtn.classList.remove('is-success');
    submitBtn.classList.remove('is-error');
    statusEl.textContent = '';
    statusEl.className = 'form-status';

    if (!validateAll()) {
      submitBtn.classList.add('is-error');
      var missing = Object.keys(fields).filter(function (n) {
        return fields[n].classList.contains('is-invalid');
      });
      var errLines = [{ tag: '$', cls: 'log-cmd', text: './send_message.sh --check' }];
      if (missing.length) {
        errLines.push({
          tag: '[ERR]',
          cls: 'log-err',
          text: missing.length + ' required field' + (missing.length > 1 ? 's' : '') + ' missing'
        });
        missing.forEach(function (n) {
          errLines.push({ tag: ' -', cls: 'log-dim', text: n });
        });
      }
      writeLog(errLines);
      var firstInvalid = form.querySelector('.is-invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Honeypot: bots fill hidden fields — silently ignore the submission
    var hpField = document.getElementById('contact-website');
    if (hpField && hpField.value && hpField.value.trim() !== '') {
      submitBtn.classList.add('is-success');
      writeLog([
        { tag: '$', cls: 'log-cmd', text: './send_message.sh --send' },
        { tag: '[ OK ]', cls: 'log-ok', text: 'message delivered — thanks!' }
      ]);
      return;
    }

    // Rate limit: block rapid-fire or excessive sends
    var rate = checkRateLimit();
    if (!rate.ok) {
      submitBtn.classList.add('is-error');
      writeLog([
        { tag: '$', cls: 'log-cmd', text: './send_message.sh --send' },
        {
          tag: '[ERR]',
          cls: 'log-err',
          text: rate.daily
            ? 'daily send limit reached — please try again tomorrow'
            : 'please wait ' + rate.wait + 's before sending again'
        },
        { tag: '[..]', cls: 'log-dim', text: 'nothing was sent — spam guard active' }
      ]);
      return;
    }

    // Turnstile: if configured and working, a valid challenge token is required.
    // Falls back gracefully if the challenge can't complete (script blocked).
    if (CONTACT_TURNSTILE_SITEKEY && !turnstileToken) {
      submitBtn.classList.add('is-error');
      writeLog([
        { tag: '$', cls: 'log-cmd', text: './send_message.sh --send' },
        { tag: '[ERR]', cls: 'log-err', text: 'security check pending — please try again' },
        { tag: '[..]', cls: 'log-dim', text: 'the invisible challenge has not completed yet' }
      ]);
      return;
    }

    // Send to Supabase (Phase 3) — honest fallback if not configured
    submitBtn.classList.add('is-sending');
    submitBtn.disabled = true;
    submitLabel.textContent = 'Sending...';

    var payload = {
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      subject: fields.subject.value.trim(),
      message: fields.message.value.trim(),
      turnstile_token: turnstileToken || null
    };

    var sendPromise =
      typeof submitContactMessage === 'function' ? submitContactMessage(payload) : Promise.resolve(false);

    sendPromise.then(function (ok) {
      submitBtn.classList.remove('is-sending');
      submitBtn.classList.add(ok ? 'is-success' : 'is-error');
      submitBtn.disabled = false;
      submitLabel.textContent = 'Send Message';
      if (ok) {
        stampRateLimit();
        form.reset();
        Object.keys(fields).forEach(function (n) {
          setError(n, '');
        });
        if (typeof updateCharCount === 'function') updateCharCount();
        writeLog([
          { tag: '$', cls: 'log-cmd', text: './send_message.sh --send' },
          { tag: '[ OK ]', cls: 'log-ok', text: 'message delivered — thanks!' },
          { tag: '[..]', cls: 'log-dim', text: 'I usually reply within a day or two.' }
        ]);
      } else {
        writeLog([
          { tag: '$', cls: 'log-cmd', text: './send_message.sh --send' },
          { tag: '[ERR]', cls: 'log-err', text: 'delivery failed — is the contact table set up?' },
          { tag: '[..]', cls: 'log-dim', text: 'no table created or no network — nothing was sent' }
        ]);
      }
    });
  });
})();
