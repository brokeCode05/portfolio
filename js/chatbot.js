/* Portfolio Terminal Chatbot
 * ─────────────────────────────────────────────────────────────
 * A small terminal-styled chat widget that answers common
 * questions about the portfolio by reading the SAME data that
 * powers the site (js/portfolio-data.js -> loadData()).
 *
 * Every question is logged to Supabase `chat_logs` (anon insert,
 * see Step 15 in docs/supabase-rls.sql) so the admin "Chat
 * Insights" panel can show the most-asked topics and the
 * unanswered questions worth adding to the FAQ below.
 *
 * Unanswered questions escalate: the bot recommends the contact
 * form so the visitor reaches Bryan directly.
 */
(function(global) {
  'use strict';

  // ── AI config ───────────────────────────────────────────────
  // Edge function URL for AI answers (supabase/functions/chat-ai). Set to ''
  // to disable AI — the bot then falls back to escalating to the contact form.
  // Prefilled for the deployed function; the fallback is graceful if it's not
  // deployed yet.
  var CHAT_AI_URL = 'https://mnsgwitzgwhmiccbojck.supabase.co/functions/v1/chat-ai';

  // ── Session id (one per browser) ────────────────────────────
  var SESSION_KEY = 'portfolio_chat_session_v1';
  var sessionId = '';
  try {
    sessionId = global.localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      global.localStorage.setItem(SESSION_KEY, sessionId);
    }
  } catch (e) {
    sessionId = 'anon-' + Date.now().toString(36);
  }

  // ── Helpers ─────────────────────────────────────────────────
  function getData() {
    try { if (typeof loadData === 'function') return loadData(); } catch (e) {}
    return null;
  }

  // ── Admin-editable settings (data.chatConfig from the admin dashboard) ──
  // The admin can set the bot name, greeting, and an on/off switch. Everything
  // else (FAQ, portfolio knowledge) is read live from the same data that
  // powers the site, so there's nothing to duplicate.
  function chatConfig() {
    var d = getData();
    return (d && d.chatConfig) || {};
  }
  function botName() {
    return String(chatConfig().botName || '').trim() || 'bryan-bot';
  }
  function botEnabled() {
    return !(chatConfig().enabled === false);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalize(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // ── Compact portfolio profile sent to the AI as grounding ──
  function buildAiContext() {
    var d = getData() || {};
    var bits = [];
    if (d.about && d.about.bio) bits.push('Bio: ' + String(d.about.bio).slice(0, 400));
    var stack = (d.techStack || []).map(function(s) { return s.name; }).slice(0, 30);
    if (stack.length) bits.push('Skills: ' + stack.join(', '));
    var projs = (d.projects || []).slice(0, 8).map(function(p) {
      return p.title + (p.description ? ' - ' + String(p.description).slice(0, 120) : '');
    });
    if (projs.length) bits.push('Projects: ' + projs.join(' | '));
    var exp = (d.experience || []).slice(0, 5).map(function(x) {
      return (x.role || x.title || '') + (x.company ? ' @ ' + x.company : '') +
        ((x.period || x.date) ? ' (' + (x.period || x.date) + ')' : '');
    });
    if (exp.length) bits.push('Experience: ' + exp.join(' | '));
    var certs = (d.certifications || []).slice(0, 8).map(function(c) {
      var parts = [c.title || c.issuer || 'Certification'];
      if (c.issuer && c.title) parts.push(c.issuer);
      if (c.date) parts.push(c.date);
      return parts.join(' — ');
    });
    if (certs.length) bits.push('Certifications: ' + certs.join(' | '));
    var learn = (d.learning || []).slice(0, 5).map(function(m) {
      return (m.year ? m.year + ' ' : '') + (m.title || 'Milestone');
    });
    if (learn.length) bits.push('Learning: ' + learn.join(' | '));
    var links = (d.contactLinks || []).slice(0, 8).map(function(l) {
      return (l.label || 'Link') + ': ' + (l.value || l.url || '');
    });
    if (links.length) bits.push('Contact: ' + links.join(' | '));
    return bits.join('\n').slice(0, 2200);
  }

  // ── Editable FAQ rules ──────────────────────────────────────
  // Each rule: { topic, keywords[] (substring match) } or a custom `match(nq)`.
  // `answer` is a function(data) -> string. Use [[CONTACT]] in an answer to
  // render the "contact bryan" button, and [label](url) for links.
  var RULES = [
    {
      topic: 'greeting',
      match: function(nq) {
        if (nq.length > 24) return false;
        var t = nq.split(' ').filter(Boolean);
        return t.some(function(w) { return ['hi', 'hello', 'hey', 'yo', 'sup'].indexOf(w) !== -1; }) ||
          nq.indexOf('good morning') !== -1 ||
          nq.indexOf('good afternoon') !== -1 ||
          nq.indexOf('good evening') !== -1;
      },
      answer: function() {
        return 'Hey! I\'m the portfolio assistant. I can answer questions about Bryan\'s skills, projects, experience, certifications, and how to contact him.\n\nType `help` for the full list, or just ask away.';
      }
    },
    {
      topic: 'help',
      keywords: ['help', 'what can you do', 'commands', 'options', 'how do i use', 'how does this work', 'start over'],
      answer: function() {
        return 'Here\'s what I can answer:\n\nskills · projects · experience · certifications · learning\navailability · education · location · resume · contact\n\nJust type a question in plain words — no special commands needed.';
      }
    },
    {
      topic: 'skills',
      keywords: ['skill', 'skills', 'stack', 'tech stack', 'technology', 'technologies', 'programming language', 'languages', 'framework', 'expertise', 'proficient', 'what do you know', 'tools'],
      answer: function() {
        var d = getData();
        var stack = (d && d.techStack) || [];
        if (!stack.length) {
          return 'Bryan hasn\'t listed his tech stack in the data yet — check the Skills section on this page for the live list.';
        }
        var groups = {};
        stack.forEach(function(item) {
          var cat = (item && item.category) || 'Other';
          (groups[cat] = groups[cat] || []).push(item.name);
        });
        var lines = Object.keys(groups).map(function(cat) {
          return cat + ': ' + groups[cat].join(', ');
        });
        return 'Here\'s what Bryan works with:\n\n' + lines.join('\n');
      }
    },
    {
      topic: 'projects',
      keywords: ['project', 'projects', 'portfolio pieces', 'what have you built', 'what did you build', 'built anything', 'showcase', 'work sample', 'github repo', 'repos'],
      answer: function() {
        var d = getData();
        var list = (d && d.projects) || [];
        if (!list.length) {
          return 'No projects are listed in the data yet — the Projects section on this page is the live list.';
        }
        return list.map(function(p) {
          var line = (p.title || 'Untitled') + ' — ' + String(p.description || '').slice(0, 140);
          if (p.links) {
            if (p.links.live) line += ' [Live demo](' + p.links.live + ')';
            if (p.links.repo) line += ' [Code](' + p.links.repo + ')';
          }
          return line;
        }).join('\n\n');
      }
    },
    {
      topic: 'experience',
      keywords: ['experience', 'job', 'jobs', 'work history', 'employment', 'company', 'companies', 'intern', 'internship', 'worked at', 'career', 'professional'],
      answer: function() {
        var d = getData();
        var list = (d && d.experience) || [];
        if (!list.length) {
          return 'Bryan hasn\'t added work experience to the data yet — the Experience section on this page is the live list.';
        }
        return list.map(function(x) {
          var line = (x.role || x.title || 'Role') + (x.company ? ' @ ' + x.company : '');
          if (x.period || x.date) line += ' (' + (x.period || x.date) + ')';
          if (x.description) line += ' — ' + String(x.description).slice(0, 120);
          return line;
        }).join('\n\n');
      }
    },
    {
      topic: 'certs',
      keywords: ['cert', 'certs', 'certification', 'certifications', 'credential', 'credentials', 'training', 'course', 'courses'],
      answer: function() {
        var d = getData();
        var list = (d && d.certifications) || [];
        if (!list.length) {
          return 'No certifications are listed yet — the Certifications section on this page is the live list.';
        }
        return list.map(function(c) {
          var parts = [c.title || c.issuer || 'Certification'];
          if (c.issuer && c.title) parts.push(c.issuer);
          if (c.date) parts.push(c.date);
          return parts.join(' — ');
        }).join('\n');
      }
    },
    {
      topic: 'learning',
      keywords: ['learning', 'currently learning', 'studying', 'roadmap', 'milestone', 'milestones', 'self study'],
      answer: function() {
        var d = getData();
        var list = (d && d.learning) || [];
        if (!list.length) {
          return 'Bryan hasn\'t added learning milestones yet — the Learning Journey section on this page is the live list.';
        }
        return 'Bryan\'s learning journey:\n\n' + list.map(function(m) {
          return (m.year ? m.year + ' — ' : '') + (m.title || 'Milestone') + (m.description ? ': ' + String(m.description).slice(0, 160) : '');
        }).join('\n');
      }
    },
    {
      topic: 'education',
      keywords: ['education', 'school', 'university', 'college', 'degree', 'studied', 'graduate'],
      answer: function() {
        return 'I don\'t have education details in the portfolio data. His Learning Journey section is close — and the contact form is the best way to ask Bryan directly. [[CONTACT]]';
      }
    },
    {
      // Catch-all for "about" questions — placed after the content rules so
      // specific topics ("tell me about your projects") win over "tell me about".
      topic: 'about',
      keywords: ['who are you', 'who is bryan', 'about you', 'about bryan', 'tell me about', 'introduce', 'yourself', 'bio', 'about me'],
      answer: function() {
        var d = getData();
        var bio = d && d.about && (d.about.bio || (d.about.terminal && d.about.terminal.role) || '');
        if (bio) return String(bio).slice(0, 600);
        return 'Bryan is a developer — the About section on this page has the full story.';
      }
    },
    {
      topic: 'availability',
      keywords: ['hire', 'hiring', 'available', 'freelance', 'freelancing', 'contract', 'job offer', 'opportunities', 'collaborate', 'collaboration', 'work together', 'part-time', 'full-time', 'rate', 'pricing', 'how much'],
      answer: function() {
        return 'Bryan is open to opportunities and collaborations. The best way to start a conversation is the contact form — tell him what you have in mind and he\'ll get back to you. [[CONTACT]]';
      }
    },
    {
      topic: 'contact',
      keywords: ['contact', 'email', 'reach', 'get in touch', 'talk to', 'social', 'github', 'linkedin', 'facebook', 'instagram', 'twitter', 'connect', 'message him'],
      answer: function() {
        var d = getData();
        var links = (d && d.contactLinks) || [];
        var lines = links.map(function(l) {
          var label = l.label || 'Link';
          var value = l.value || l.url || '';
          if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) {
            return label + ': [' + value.replace(/^mailto:/i, '').replace(/^https?:\/\//i, '') + '](' + value + ')';
          }
          return label + ': ' + value;
        });
        if (lines.length) return 'You can reach Bryan here:\n\n' + lines.join('\n') + '\n\nOr use the contact form on this page. [[CONTACT]]';
        return 'Use the contact form on this page to reach Bryan directly. [[CONTACT]]';
      }
    },
    {
      topic: 'location',
      keywords: ['where are you', 'location', 'based', 'time zone', 'country', 'city', 'remote'],
      answer: function() {
        return 'Bryan\'s location isn\'t stored in my data — check the About section, or ask him directly via the contact form. [[CONTACT]]';
      }
    },
    {
      topic: 'resume',
      keywords: ['resume', 'cv', 'curriculum', 'download resume', 'download pdf', 'portfolio pdf', 'photo download'],
      answer: function() {
        return 'Bryan\'s resume isn\'t available as a download on this site — but you can ask him directly for a copy (or any other details) via the contact form. [[CONTACT]]';
      }
    },
    {
      topic: 'thanks',
      match: function(nq) {
        if (nq.length > 30) return false;
        var t = nq.split(' ').filter(Boolean);
        return t.some(function(w) { return ['thanks', 'thank', 'thx', 'ty', 'appreciate', 'awesome', 'great', 'cool', 'nice'].indexOf(w) !== -1; });
      },
      answer: function() {
        return 'Happy to help! If you have more questions, just ask — or use the contact form to reach Bryan directly. [[CONTACT]]';
      }
    },
    {
      topic: 'bye',
      match: function(nq) {
        if (nq.length > 24) return false;
        var t = nq.split(' ').filter(Boolean);
        return t.some(function(w) { return ['bye', 'goodbye', 'farewell', 'seeya'].indexOf(w) !== -1; });
      },
      answer: function() {
        return 'Take care! Reopen me anytime from the corner tab.';
      }
    }
  ];

  var UNANSWERED = 'Hmm, that one is beyond my FAQ knowledge — I\'m just the portfolio bot. Let me connect you with Bryan directly. [[CONTACT]]';

  // ── Custom FAQ entries from portfolio data (admin-editable) ──
  // Stored on data.chatFaq as { topic?, keywords: 'a, b, c', answer: '...' }.
  // These are checked BEFORE the built-in rules so the admin's answers win.
  function faqRulesFromData(data) {
    var list = (data && data.chatFaq) || [];
    return list
      .filter(function(f) {
        return f && String(f.keywords || '').trim() && String(f.answer || '').trim();
      })
      .map(function(f) {
        // Keywords are comma-separated (a comma segment can be a multi-word
        // phrase like "how much" — splitting on spaces would break that).
        var kws = String(f.keywords).split(',').map(function(k) { return k.trim().toLowerCase(); }).filter(Boolean);
        return {
          // Topic falls back to the first keyword (or 'custom') so Chat Insights
          // can group untitled entries usefully.
          topic: (f.topic && String(f.topic).trim()) || kws[0] || 'custom',
          keywords: kws,
          answer: String(f.answer)
        };
      });
  }

  // ── Matchers (pure — also exported for tests) ──────────────
  // Admin FAQ entries only (these win over the AI — hand-written answers).
  function matchFaq(text, data) {
    var nq = normalize(text);
    if (!nq) return null;
    var custom = faqRulesFromData(data);
    for (var c = 0; c < custom.length; c++) {
      if (custom[c].keywords.some(function(k) { return nq.indexOf(k) !== -1; })) {
        return { topic: custom[c].topic, answered: true, text: custom[c].answer };
      }
    }
    return null;
  }

  // Built-in rules only — used as the offline fallback when the AI fails.
  function matchRulesOnly(text, data) {
    var nq = normalize(text);
    if (!nq) return null;
    for (var i = 0; i < RULES.length; i++) {
      var rule = RULES[i];
      var hit = rule.match ? rule.match(nq) : rule.keywords.some(function(k) { return nq.indexOf(k) !== -1; });
      if (hit) return { topic: rule.topic, answered: true, text: String(rule.answer(data) || '') };
    }
    return null;
  }

  // Combined FAQ-then-rules matcher (kept for tests / back-compat).
  function matchRule(text, data) {
    return matchFaq(text, data) || matchRulesOnly(text, data) ||
      { topic: null, answered: false, text: UNANSWERED };
  }

  // ── Logging (fire-and-forget → Supabase chat_logs) ──────────
  var logPending = null;
  var logInFlight = false;
  function flushLog() {
    if (!logPending || logInFlight) return;
    logInFlight = true;
    var entry = logPending;
    logPending = null;
    try {
      if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
        logInFlight = false;
        return;
      }
      var headers = {
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      };
      fetch(SUPABASE_URL + '/rest/v1/chat_logs', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(entry)
      }).catch(function() {}).then(function() { logInFlight = false; flushLog(); });
    } catch (e) {
      logInFlight = false;
    }
  }
  function logChat(question, matchedTopic, answered, escalated) {
    logPending = {
      session_id: String(sessionId).slice(0, 100),
      question: String(question || '').slice(0, 1000),
      matched_topic: matchedTopic ? String(matchedTopic).slice(0, 50) : null,
      answered: !!answered,
      escalated: !!escalated
    };
    flushLog();
  }

  // ── Reply feedback: subtle terminal blip + light vibration ─
  // Sound is synthesized with the Web Audio API (no asset files). It only
  // plays after the visitor has interacted (opened the chat / sent a message),
  // which also satisfies browser autoplay policies. A header toggle mutes it.
  var SOUND_KEY = 'portfolio_chat_sound_v1';
  var SOUND_ON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
  var SOUND_OFF_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
  var soundEnabled = true;
  try { soundEnabled = global.localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) {}
  var audioCtx = null;

  // Create/resume the AudioContext inside a user gesture (unlocks audio).
  function ensureAudio() {
    try {
      if (!audioCtx) {
        var AC = global.AudioContext || global.webkitAudioContext;
        if (AC) audioCtx = new AC();
      }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {}
  }

  // Short descending terminal blip — quiet and brief. Skips when the page or
  // the chat window is hidden (a reply may finish typing after the user closes).
  function blip() {
    if (!soundEnabled || !audioCtx) return;
    try {
      if (global.document && global.document.hidden) return;
      var win = global.document.getElementById(WIN_ID);
      if (!win || win.hidden) return;
      var t = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(990, t);
      osc.frequency.exponentialRampToValueAtTime(660, t + 0.09);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch (e) {}
  }

  // Light tap on supporting phones (Android Chrome; iOS ignores it).
  function haptic() {
    if (!soundEnabled) return;
    try {
      if (global.document && global.document.hidden) return;
      var win = global.document.getElementById(WIN_ID);
      if (!win || win.hidden) return;
      if (global.navigator && global.navigator.vibrate) global.navigator.vibrate(10);
    } catch (e) {}
  }

  // ── Widget UI ───────────────────────────────────────────────
  var LAUNCHER_ID = 'chatbot-launcher';
  var WIN_ID = 'chatbot-window';

  // Human-feeling typewriter speed (ms per character). Shorter replies type
  // deliberately (up to ~26ms/char), longer ones pick up the pace, and no
  // single reply takes more than ~3.5s to type out. Exported for tests.
  function typeDelayFor(len) {
    len = Math.max(len || 0, 0);
    var delay = Math.max(10, Math.min(26, 1200 / Math.max(len, 1)));
    if (len > 0 && len * delay > 3500) delay = 3500 / len;
    return delay;
  }

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function(k) { node.setAttribute(k, attrs[k]); });
    if (html != null) node.innerHTML = html;
    return node;
  }

  // Protocol-less domain matcher, e.g. facebook.com/john.bryan.1217.
  // The TLD must be 2+ alpha chars and NOT be followed by another dot-label
  // (so version strings like 2.0.1 and names like john.bryan.1217 never match).
  var BARE_DOMAIN = '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:[a-z]{2,})(?!\\.[0-9])(?!\\w)(?::\\d+)?(?:\\/[^\\s<>()\\[\\]]*)?';
  var BARE_DOMAIN_RE = new RegExp('^' + BARE_DOMAIN + '$', 'i');
  // word.js / app.ts-style tokens are file extensions, not real sites — they
  // are checked against the captured URL in the callbacks below.
  var EXT_DOMAIN_RE = /\.(?:js|ts|jsx|tsx|vue|svelte|css|html|htm|py|rb|sh|md|txt|json|xml)(?:$|\/)/i;
  var BARE_URL_RE = new RegExp('(^|[\\s(>[])((?:https?:\\/\\/|www\\.)[^\\s<>()\\[\\]]+|' + BARE_DOMAIN + ')', 'gi');

  function renderBotText(text) {
    var contactCTA = '<button type="button" class="chat-cta" data-action="contact">[ contact bryan ]</button>';
    var out = esc(text)
      .split('[[CONTACT]]').join(contactCTA)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(m, label, url) {
        url = String(url).trim();
        // label/url are already escaped by the esc(text) above, so inserting
        // them directly is safe and avoids double-escaping (& in URLs).
        if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
          // External / email link — open in a new tab.
          return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
        }
        if (/^(#|[a-z0-9][a-z0-9-]*(\/|$))/i.test(url) && !/^(javascript|data|vbscript):/i.test(url)) {
          // Relative / in-page anchor — jump to a section on this page.
          return '<a href="#' + url.replace(/^#/, '') + '">' + label + '</a>';
        }
        if (BARE_DOMAIN_RE.test(url) && !EXT_DOMAIN_RE.test(url)) {
          // Protocol-less domain — treat as an external link.
          return '<a href="https://' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
        }
        return m;
      })
      .replace(/\n/g, '<br>');

    // Auto-link bare URLs (http/https/www and protocol-less domains like
    // facebook.com/…) so answers pasted without markdown still get clickable
    // links. Existing <a> tags from the markdown step are parked first so
    // nothing gets double-wrapped.
    var anchors = [];
    out = out.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, function(a) {
      anchors.push(a);
      return '\u0000' + (anchors.length - 1) + '\u0000';
    });
    out = out.replace(BARE_URL_RE, function(m, pre, url) {
      url = url.replace(/[.,;:!?]+$/, '');
      // file-extension-looking tokens (node.js, app.ts) are not real sites —
      // leave them as plain text instead of linking to a squatting domain.
      if (!/^https?:\/\//i.test(url) && !/^www\./i.test(url) && EXT_DOMAIN_RE.test(url)) {
        return pre + url;
      }
      var href = /^https?:\/\//i.test(url) ? url : 'https://' + url;
      return pre + '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
    });
    out = out.replace(/\u0000(\d+)\u0000/g, function(m, i) { return anchors[+i] || ''; });
    // One-tap suggestion questions — rendered as clickable terminal lines that
    // send their text when tapped. Done last so the markdown/auto-link steps
    // can't wrap the button contents in nested interactive HTML.
    out = out.replace(/\[\[Q:([\s\S]*?)\]\]/g, function(m, q) {
      return '<button type="button" class="chat-q">$ ' + q + '</button>';
    });
    return out;
  }

  function buildWidget() {
    if (document.getElementById(LAUNCHER_ID)) return;

    var launcher = el('button', {
      'id': LAUNCHER_ID,
      'type': 'button',
      'aria-label': 'Open chat assistant',
      'aria-expanded': 'false',
      'aria-controls': WIN_ID
    }, '<span class="chatbot-launcher-bubble" aria-hidden="true">' +
         '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
         '<i class="chatbot-launcher-dot" aria-hidden="true"></i>' +
       '</span>');

    var windowEl = el('div', { 'id': WIN_ID, 'role': 'dialog', 'aria-label': 'Portfolio chat assistant', 'hidden': 'hidden' });
    windowEl.innerHTML =
      '<div class="chatbot-header">' +
        '<span class="chatbot-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '<span class="chatbot-title">' + botName() + ':~$ ./assistant --help</span>' +
        '<button type="button" id="chatbot-sound" aria-label="Mute reply sound" aria-pressed="true" title="Toggle reply sound">' + SOUND_ON_SVG + '</button>' +
        '<button type="button" id="chatbot-close" aria-label="Close chat">×</button>' +
      '</div>' +
      '<div class="chatbot-body" id="chatbot-body" role="log" aria-live="polite"></div>' +
      '<form class="chatbot-input-row" id="chatbot-form">' +
        '<span class="chatbot-prompt" aria-hidden="true">➜</span>' +
        '<input id="chatbot-input" type="text" autocomplete="off" spellcheck="false" aria-label="Type your question" placeholder="ask me about skills, projects..." />' +
        '<button type="submit" id="chatbot-send" aria-label="Send">↵</button>' +
      '</form>';

    // Dimmed backdrop behind the mobile bottom sheet — tapping it dismisses
    // the chat (desktop keeps the floating panel, so it's hidden there via CSS).
    var backdropEl = el('div', { 'id': 'chatbot-backdrop', 'aria-hidden': 'true' });
    // Intro callout — introduces the assistant shortly after load so visitors
    // notice the chat head (auto-retires, returns on hover / after closing).
    var calloutEl = el('button', {
      'id': 'chatbot-callout',
      'type': 'button',
      'aria-label': 'Open chat assistant'
    }, 'Hey, I\'m online — ask me anything about Bryan' +
       '<span class="chatbot-callout-caret" aria-hidden="true"></span>');
    document.body.appendChild(calloutEl);
    document.body.appendChild(launcher);
    document.body.appendChild(windowEl);

    var bodyEl = document.getElementById('chatbot-body');
    var inputEl = document.getElementById('chatbot-input');
    var openState = false;
    var greeted = false;
    // Set while the exit animation plays; openChat() cancels it for rapid reopen.
    var closeTimer = null;
    // Session conversation (most recent last) — sent to the AI so follow-up
    // questions ("what about projects?") make sense in context.
    var conversation = [];
    // Record a bot reply at DECISION time (not when the typing animation ends)
    // so rapid back-and-forth keeps correct user→bot ordering in history.
    function botRecord(text) {
      conversation.push({ role: 'assistant', content: String(text) });
      if (conversation.length > 20) conversation.splice(0, conversation.length - 20);
    }

    // Keep the on-screen thread bounded — long chats drop the oldest lines
    // instead of growing the DOM forever. (The AI context array above has its
    // own separate cap, so pruning the visual thread never loses context.)
    var MAX_VISIBLE_LINES = 40;
    function pruneChat() {
      var msgs = bodyEl.querySelectorAll('.chat-msg');
      var overflow = msgs.length - MAX_VISIBLE_LINES;
      for (var i = 0; i < overflow; i++) {
        if (msgs[i] && msgs[i].parentNode === bodyEl) bodyEl.removeChild(msgs[i]);
      }
    }

    function addLine(who, html) {
      var line = el('div', { 'class': 'chat-msg ' + who },
        '<span class="chat-prompt" aria-hidden="true">' + (who === 'bot' ? botName() + ':~$' : 'you:~$') + '</span>' +
        '<span class="chat-text">' + html + '</span>');
      bodyEl.appendChild(line);
      bodyEl.scrollTop = bodyEl.scrollHeight;
      pruneChat();
    }

    // Types the reply out character-by-character (speed scaled to length) so
    // the bot feels human. [[CONTACT]] and [label](url) tokens are hidden while
    // typing (rendered button/link only appears at the end) so raw syntax never
    // flashes on screen.
    function typeBot(text, done) {
      var line = el('div', { 'class': 'chat-msg bot' },
        '<span class="chat-prompt" aria-hidden="true">' + botName() + ':~$</span>' +
        '<span class="chat-text"></span>');
      bodyEl.appendChild(line);
      bodyEl.scrollTop = bodyEl.scrollHeight;
      pruneChat();
      var textEl = line.querySelector('.chat-text');
      var raw = String(text == null ? '' : text);

      function render() {
        textEl.innerHTML = renderBotText(raw);
        bodyEl.scrollTop = bodyEl.scrollHeight;
        // Blinking caret ONLY on the most recent message — older replies keep
        // their text but drop the caret so the thread doesn't blink everywhere.
        if (bodyEl.lastElementChild === line) {
          textEl.insertAdjacentHTML('beforeend', '<span class="cursor" aria-hidden="true"></span>');
        }
        blip();
        haptic();
        if (done) done();
      }

      var reduced = false;
      try { reduced = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
      if (reduced || !raw) {
        render();
        return;
      }

      // Plain-text version for the typed phase: CTA and link tokens are masked.
      var masked = raw
        .replace(/\[\[CONTACT\]\]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

      // Short "thinking" pause before typing starts (longer replies pause a beat).
      var startDelay = 200 + Math.min(300, masked.length * 1.2);
      var cursorHTML = '<span class="cursor" aria-hidden="true"></span>';
      setTimeout(function() {
        var i = 0;
        var out = '';
        (function tick() {
          out += esc(masked.charAt(i)); // escape per char so entities never render half-broken
          i++;
          // Caret only while this line is still the latest message (if the
          // visitor sends a new question mid-type, the caret moves on).
          textEl.innerHTML = out + (bodyEl.lastElementChild === line ? cursorHTML : '');
          bodyEl.scrollTop = bodyEl.scrollHeight;
          if (i >= masked.length) { render(); return; }
          var jitter = 0.75 + Math.random() * 0.5;
          setTimeout(tick, typeDelayFor(masked.length) * jitter);
        })();
      }, startDelay);
    }

    // If the AI is unavailable (quota, timeout, network), fall back to the
    // built-in rules before escalating — keeps the bot useful during outages.
    function rulesFallback(text, aiTopic) {
      var rule = matchRulesOnly(text, getData());
      if (rule) {
        logChat(text, rule.topic, true, false);
        botRecord(rule.text);
        typeBot(rule.text);
      } else {
        escalate(text, aiTopic);
      }
    }

    function aiAnswer(text) {
      if (!CHAT_AI_URL) {
        rulesFallback(text, null);
        return;
      }
      // Client throttle: at most one AI call per 5s per visitor (AI-first flow
      // answers most questions, so keep the pause short). The server-side
      // daily cap (chat_ai_usage) is the real quota guard.
      var now = Date.now();
      var last = 0;
      try { last = parseInt(localStorage.getItem('chat_ai_last') || '0', 10) || 0; } catch (e) {}
      if (now - last < 5000) {
        botRecord('Give me a moment — ask again in a few seconds.');
        typeBot('Give me a moment — ask again in a few seconds.');
        return;
      }
      try { localStorage.setItem('chat_ai_last', String(now)); } catch (e) {}

      // Timeout so a slow/hung AI never leaves the typing indicator spinning.
      var controller = new AbortController();
      var timeoutId = setTimeout(function() { controller.abort(); }, 15000);
      // Last ~6 turns as conversation context (markers stripped). Exclude the
      // just-pushed current question (sent separately as `question`) so it
      // isn't duplicated in the prompt.
      var history = conversation.slice(-7, -1).map(function(m) {
        return {
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(m.content || '').replace(/\[\[CONTACT\]\]/g, '').slice(0, 400)
        };
      });
      fetch(CHAT_AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ question: String(text).slice(0, 500), context: buildAiContext(), history: history })
      })
        .then(function(resp) { return resp.json().catch(function() { return {}; }).then(function(data) { return { status: resp.status, ok: resp.ok, data: data }; }); })
        .then(function(result) {
          if (result.ok && result.data && result.data.text) {
            // Topic comes from the AI's own classification (falls back to 'ai').
            var answerText = String(result.data.text).slice(0, 900);
            logChat(text, result.data.topic || 'ai', true, false);
            botRecord(answerText);
            typeBot(answerText);
          } else if (result.status === 429) {
            // Daily AI quota exhausted — log it distinctly so Chat Insights
            // shows why instead of a generic unanswered question.
            rulesFallback(text, 'ai-limit');
          } else {
            rulesFallback(text, null);
          }
        })
        .catch(function(err) {
          if (err && err.name === 'AbortError') {
            rulesFallback(text, 'ai-timeout');
            return;
          }
          rulesFallback(text, null);
        })
        .then(function() { clearTimeout(timeoutId); });
    }

    function escalate(text, topic) {
      logChat(text, topic || null, false, true);
      botRecord(UNANSWERED);
      typeBot(UNANSWERED);
    }

    function send(text) {
      text = String(text || '').trim();
      if (!text) return;
      ensureAudio();
      // The visitor's message becomes the latest — drop the caret from earlier replies.
      bodyEl.querySelectorAll('.chat-msg .chat-text .cursor').forEach(function(c) { c.remove(); });
      addLine('user', esc(text));
      inputEl.value = '';
      conversation.push({ role: 'user', content: text });
      // AI-first: admin FAQ wins (hand-written answers), then the AI, then the
      // built-in rules as offline fallback, then escalate to the contact form.
      var faq = matchFaq(text, getData());
      if (faq) {
        logChat(text, faq.topic, true, false);
        botRecord(faq.text);
        typeBot(faq.text);
      } else {
        aiAnswer(text);
      }
    }

    function openChat() {
      // Respect the admin on/off switch (re-checked here because cloud data can
      // arrive after the widget is built).
      if (!botEnabled()) {
        launcher.style.display = 'none';
        return;
      }
      // Cancel any pending close so a rapid reopen replays the pop cleanly.
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      windowEl.classList.remove('closing');
      // Repaint the header title so an admin bot-name change shows up without
      // a full page reload (prompts already read botName() per message).
      var titleEl = windowEl.querySelector('.chatbot-title');
      if (titleEl) titleEl.textContent = botName() + ':~$ ./assistant --help';
      windowEl.hidden = false;
      hideCallout();
      backdropEl.classList.add('is-open');
      // On mobile the sheet is a modal — lock page scroll like the other modals.
      if (global.matchMedia && global.matchMedia('(max-width: 480px)').matches) {
        global.document.body.classList.add('modal-open');
      }
      launcher.setAttribute('aria-expanded', 'true');
      if (!greeted) {
        greeted = true;
        // Greeting comes from the admin when set, otherwise the default.
        // When the admin hasn't written one, fall back to a short intro with
        // a few concrete example questions so visitors know what to ask.
        var help = String(chatConfig().greeting || '').trim() ||
          'Welcome to the portfolio assistant! Ask me about Bryan\'s [skills](skills), [projects](projects), [experience](experience), [certifications](certifications), or how to [contact](contact) him.\n\n' +
          'Or just type a question below.\n\n' +
          'Try these questions:\n' +
          '[[Q:what tech do you use?]]\n' +
          '[[Q:show me your latest projects]]\n' +
          '[[Q:what are you currently learning?]]\n' +
          '[[Q:how can I reach you?]]';
        setTimeout(function() { botRecord(help); typeBot(help); }, 150);
      }
      setTimeout(function() { inputEl.focus(); }, 50);
    }

    function closeChat() {
      // Exit animation already running — ignore repeat calls.
      if (closeTimer) return;
      windowEl.classList.add('closing');
      backdropEl.classList.remove('is-open');
      global.document.body.classList.remove('modal-open');
      launcher.setAttribute('aria-expanded', 'false');
      // Reduced-motion users get an instant hide; everyone else waits for the
      // shrink-away exit (and backdrop fade) to finish before display:none.
      if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        windowEl.hidden = true;
        windowEl.classList.remove('closing');
        return;
      }
      closeTimer = setTimeout(function() {
        windowEl.hidden = true;
        windowEl.classList.remove('closing');
        closeTimer = null;
        // Re-introduce the assistant once the chat has closed.
        setTimeout(function() {
          showCallout();
          retireCallout(6000);
        }, 700);
      }, 460);
    }

    launcher.addEventListener('click', function() {
      ensureAudio();
      if (windowEl.hidden || closeTimer) openChat(); else closeChat();
    });
    backdropEl.addEventListener('click', closeChat);
    document.getElementById('chatbot-close').addEventListener('click', closeChat);

    // ── Intro callout bubble ────────────────────────────────────
    var calloutAutoHide = null;
    function showCallout() {
      if (calloutAutoHide) { clearTimeout(calloutAutoHide); calloutAutoHide = null; }
      if (launcher.style.display === 'none' || !windowEl.hidden) return;
      calloutEl.classList.add('show');
      calloutEl.removeAttribute('aria-hidden');
    }
    function hideCallout() {
      if (calloutAutoHide) { clearTimeout(calloutAutoHide); calloutAutoHide = null; }
      calloutEl.classList.remove('show');
      calloutEl.setAttribute('aria-hidden', 'true');
    }
    // Retire the callout after a delay, then give the chat head a quick
    // attention wiggle so it doesn't just sit there once the bubble leaves.
    function retireCallout(afterMs) {
      if (calloutAutoHide) { clearTimeout(calloutAutoHide); }
      calloutAutoHide = setTimeout(function() {
        calloutAutoHide = null;
        hideCallout();
        bounceHead();
      }, afterMs);
    }
    function bounceHead() {
      if (launcher.style.display === 'none' || !windowEl.hidden) return;
      launcher.classList.remove('wiggle');
      void launcher.offsetWidth; // restart the animation even on rapid re-trigger
      launcher.classList.add('wiggle');
      // Fallback cleanup — reduced-motion users never fire animationend.
      setTimeout(function() { launcher.classList.remove('wiggle'); }, 750);
    }
    launcher.addEventListener('animationend', function(e) {
      if (e.animationName === 'chat-head-wiggle') launcher.classList.remove('wiggle');
    });
    // Introduce the assistant shortly after load, then let the bubble retire.
    setTimeout(function() {
      showCallout();
      retireCallout(8000);
    }, 1800);
    launcher.addEventListener('mouseenter', function() { if (windowEl.hidden) showCallout(); });
    launcher.addEventListener('mouseleave', hideCallout);
    calloutEl.addEventListener('mouseenter', showCallout);
    calloutEl.addEventListener('mouseleave', hideCallout);
    calloutEl.addEventListener('click', function() {
      ensureAudio();
      if (windowEl.hidden || closeTimer) openChat(); else closeChat();
    });

    // ── Sound toggle (persisted per visitor) ─────────────────
    var soundBtn = document.getElementById('chatbot-sound');
    if (soundBtn) {
      function paintSoundBtn() {
        soundBtn.innerHTML = soundEnabled ? SOUND_ON_SVG : SOUND_OFF_SVG;
        soundBtn.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
        soundBtn.setAttribute('aria-label', soundEnabled ? 'Mute reply sound' : 'Enable reply sound');
      }
      soundBtn.addEventListener('click', function() {
        soundEnabled = !soundEnabled;
        try { global.localStorage.setItem(SOUND_KEY, soundEnabled ? 'on' : 'off'); } catch (e) {}
        paintSoundBtn();
        if (soundEnabled) { ensureAudio(); blip(); }
      });
      paintSoundBtn();
    }
    document.getElementById('chatbot-form').addEventListener('submit', function(e) {
      e.preventDefault();
      send(inputEl.value);
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !windowEl.hidden) { e.preventDefault(); closeChat(); }
    });
    bodyEl.addEventListener('click', function(e) {
      // One-tap suggestion questions in the greeting — send them as a message.
      var qBtn = e.target.closest('.chat-q');
      if (qBtn) {
        send(qBtn.textContent.replace(/^\$\s*/, ''));
        return;
      }
      // In-page anchors ([skills](skills) etc.) — close the chat first so the
      // mobile scroll-lock releases, then let the default smooth-scroll jump
      // to the section actually happen.
      var anchor = e.target.closest('a[href^="#"]');
      if (anchor && anchor.getAttribute('href').length > 1) {
        closeChat();
        return;
      }
      var cta = e.target.closest('.chat-cta[data-action="contact"]');
      if (cta) {
        closeChat();
        var contact = document.getElementById('contact');
        if (contact && contact.scrollIntoView) contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var nameField = document.getElementById('contact-name');
        if (nameField && nameField.focus) setTimeout(function() { nameField.focus(); }, 600);
      }
    });

    // Hide the launcher entirely when the admin has disabled the chatbot.
    // Cloud data can arrive a moment after the widget is built, so re-check
    // once more after the async fetch has had time to land.
    function applyEnabled() {
      if (!botEnabled()) {
        launcher.style.display = 'none';
        hideCallout();
        if (!windowEl.hidden) closeChat();
      }
    }
    applyEnabled();
    setTimeout(applyEnabled, 3000);
  }

  // ── Init (browser only) ─────────────────────────────────────
  if (global && typeof global.document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildWidget);
    } else {
      buildWidget();
    }
  }

  // ── Export for headless tests ───────────────────────────────
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      matchRule: matchRule,
      matchFaq: matchFaq,
      matchRulesOnly: matchRulesOnly,
      normalize: normalize,
      faqRulesFromData: faqRulesFromData,
      buildAiContext: buildAiContext,
      typeDelayFor: typeDelayFor,
      renderBotText: renderBotText
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
