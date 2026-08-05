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
        return 'You can grab Bryan\'s resume (and photo) from the download buttons in the Contact section of this page. [[CONTACT]]';
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

  // ── Core matcher (pure — also exported for tests) ──────────
  function matchRule(text, data) {
    var nq = normalize(text);
    if (!nq) return null;
    for (var i = 0; i < RULES.length; i++) {
      var rule = RULES[i];
      var hit = rule.match ? rule.match(nq) : rule.keywords.some(function(k) { return nq.indexOf(k) !== -1; });
      if (hit) return { topic: rule.topic, answered: true, text: String(rule.answer(data) || '') };
    }
    return { topic: null, answered: false, text: UNANSWERED };
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

  // ── Widget UI ───────────────────────────────────────────────
  var LAUNCHER_ID = 'chatbot-launcher';
  var WIN_ID = 'chatbot-window';

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function(k) { node.setAttribute(k, attrs[k]); });
    if (html != null) node.innerHTML = html;
    return node;
  }

  function renderBotText(text) {
    var contactCTA = '<button type="button" class="chat-cta" data-action="contact">[ contact bryan ]</button>';
    return esc(text)
      .split('[[CONTACT]]').join(contactCTA)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(m, label, url) {
        url = String(url).trim();
        if (!/^(https?:\/\/|mailto:|#)/i.test(url)) return m;
        return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '</a>';
      })
      .replace(/\n/g, '<br>');
  }

  function buildWidget() {
    if (document.getElementById(LAUNCHER_ID)) return;

    var launcher = el('button', {
      'id': LAUNCHER_ID,
      'type': 'button',
      'aria-label': 'Open chat assistant',
      'aria-expanded': 'false',
      'aria-controls': WIN_ID
    }, '<span class="chatbot-launcher-icon" aria-hidden="true">&gt;_</span><span class="chatbot-launcher-label">ask bryan</span>');

    var windowEl = el('div', { 'id': WIN_ID, 'role': 'dialog', 'aria-label': 'Portfolio chat assistant', 'hidden': 'hidden' });
    windowEl.innerHTML =
      '<div class="chatbot-header">' +
        '<span class="chatbot-dots" aria-hidden="true">...</span>' +
        '<span class="chatbot-title">bryan-bot:~$ ./assistant --help</span>' +
        '<button type="button" id="chatbot-close" aria-label="Close chat">×</button>' +
      '</div>' +
      '<div class="chatbot-body" id="chatbot-body" role="log" aria-live="polite"></div>' +
      '<div class="chatbot-chips" id="chatbot-chips"></div>' +
      '<form class="chatbot-input-row" id="chatbot-form">' +
        '<span class="chatbot-prompt" aria-hidden="true">➜</span>' +
        '<input id="chatbot-input" type="text" autocomplete="off" spellcheck="false" aria-label="Type your question" placeholder="ask me about skills, projects..." />' +
        '<button type="submit" id="chatbot-send" aria-label="Send">↵</button>' +
      '</form>';

    document.body.appendChild(launcher);
    document.body.appendChild(windowEl);

    var bodyEl = document.getElementById('chatbot-body');
    var chipsEl = document.getElementById('chatbot-chips');
    var inputEl = document.getElementById('chatbot-input');
    var openState = false;
    var greeted = false;

    function addLine(who, html) {
      var line = el('div', { 'class': 'chat-msg ' + who },
        '<span class="chat-prompt" aria-hidden="true">' + (who === 'bot' ? 'bryan-bot:~$' : 'you:~$') + '</span>' +
        '<span class="chat-text">' + html + '</span>');
      bodyEl.appendChild(line);
      bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    function typeBot(text, done) {
      var line = el('div', { 'class': 'chat-msg bot' },
        '<span class="chat-prompt" aria-hidden="true">bryan-bot:~$</span>' +
        '<span class="chat-text chat-typing">…<span class="cursor" aria-hidden="true"></span></span>');
      bodyEl.appendChild(line);
      bodyEl.scrollTop = bodyEl.scrollHeight;
      var delay = 350 + Math.min(600, text.length * 4);
      setTimeout(function() {
        line.innerHTML = '<span class="chat-prompt" aria-hidden="true">bryan-bot:~$</span><span class="chat-text">' + renderBotText(text) + '</span>';
        bodyEl.scrollTop = bodyEl.scrollHeight;
        if (done) done();
      }, delay);
    }

    function showChips() {
      ['skills', 'projects', 'experience', 'contact'].forEach(function(label) {
        var chip = el('button', { 'type': 'button', 'class': 'chat-chip' }, label);
        chip.addEventListener('click', function() { send(label); });
        chipsEl.appendChild(chip);
      });
    }

    function clearChips() { chipsEl.innerHTML = ''; }

    function send(text) {
      text = String(text || '').trim();
      if (!text) return;
      clearChips();
      addLine('user', esc(text));
      inputEl.value = '';
      var result = matchRule(text, getData());
      logChat(text, result.topic, result.answered, !result.answered);
      typeBot(result.text, function() {
        if (result.answered) showChips();
      });
    }

    function openChat() {
      windowEl.hidden = false;
      launcher.setAttribute('aria-expanded', 'true');
      if (!greeted) {
        greeted = true;
        var help = 'Welcome to the portfolio assistant! Ask me about Bryan\'s [skills](skills), [projects](projects), [experience](experience), certifications, or how to [contact](contact) him.\n\nOr just type a question below.';
        setTimeout(function() { typeBot(help, showChips); }, 150);
      }
      setTimeout(function() { inputEl.focus(); }, 50);
    }

    function closeChat() {
      windowEl.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
    }

    launcher.addEventListener('click', function() {
      if (windowEl.hidden) openChat(); else closeChat();
    });
    document.getElementById('chatbot-close').addEventListener('click', closeChat);
    document.getElementById('chatbot-form').addEventListener('submit', function(e) {
      e.preventDefault();
      send(inputEl.value);
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !windowEl.hidden) { e.preventDefault(); closeChat(); }
    });
    bodyEl.addEventListener('click', function(e) {
      var cta = e.target.closest('.chat-cta[data-action="contact"]');
      if (cta) {
        closeChat();
        var contact = document.getElementById('contact');
        if (contact && contact.scrollIntoView) contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var nameField = document.getElementById('contact-name');
        if (nameField && nameField.focus) setTimeout(function() { nameField.focus(); }, 600);
      }
    });
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
    module.exports = { matchRule: matchRule, normalize: normalize };
  }
})(typeof window !== 'undefined' ? window : globalThis);
