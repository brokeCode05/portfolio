(function () {
  'use strict';

  var currentSection = 'dashboard';
  var data = loadData();
  var supabaseClient = null;

  // ─── Supabase Auth Setup ──────────────────
  var ADMIN_EMAIL = 'jhnbryn05@gmail.com';
  var SUPABASE_URL = 'https://mnsgwitzgwhmiccbojck.supabase.co';
  // In-app reply endpoint. Set this after deploying the `reply` edge function
  // (supabase/functions/reply). Leave empty to keep the mailto Reply fallback.
  var REPLY_FUNCTION_URL = 'https://mnsgwitzgwhmiccbojck.supabase.co/functions/v1/reply';
  var SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uc2d3aXR6Z3dobWljY2JvamNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMTA3NzIsImV4cCI6MjEwMDg4Njc3Mn0.KQnCRuyC8amh7On1A5G-tVx1yRvUlPxSZiFlTEpzy0g';

  try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  } catch (e) {
    console.error('Failed to initialize Supabase:', e);
  }

  // ─── UI Elements ───────────────────────────
  var loginScreen = document.getElementById('login-screen');
  var adminApp = document.getElementById('admin-app');
  var loginStepEmail = document.getElementById('login-step-email');
  var loginStepOtp = document.getElementById('login-step-otp');
  var authEmailInput = document.getElementById('auth-email-input');
  var authEmailDisplay = document.getElementById('auth-email-display');
  var loginError = document.getElementById('login-error');
  var otpError = document.getElementById('otp-error');
  var otpInput = document.getElementById('otp-input');
  var loginSentMsg = document.getElementById('login-sent-msg');
  var sendOtpBtn = document.getElementById('auth-send-otp-btn');
  var sendText = document.getElementById('auth-send-text');
  var sendSpinner = document.getElementById('auth-send-spinner');
  var verifyOtpBtn = document.getElementById('verify-otp-btn');
  var verifyOtpText = document.getElementById('verify-otp-text');
  var verifyOtpSpinner = document.getElementById('verify-otp-spinner');
  var backToEmailBtn = document.getElementById('back-to-email-btn');
  var signOutBtn = document.getElementById('admin-signout-btn');
  var authEmailFooter = document.getElementById('auth-email-footer');
  var statusBar = document.getElementById('admin-statusbar');

  // ─── Auth Functions ────────────────────────

  function checkSession() {
    if (!supabaseClient) return false;
    supabaseClient.auth
      .getSession()
      .then(function (result) {
        var session = result.data.session;
        if (session && session.user && session.user.email === ADMIN_EMAIL) {
          showDashboard(session.user.email);
        } else {
          showLogin();
        }
      })
      .catch(function () {
        showLogin();
      });
  }

  function showLogin() {
    loginScreen.style.display = 'flex';
    adminApp.style.display = 'none';
    if (statusBar) statusBar.style.display = 'none';
    loginStepEmail.style.display = 'block';
    loginStepOtp.style.display = 'none';
    loginSentMsg.style.display = 'none';
    loginError.textContent = '';
    otpError.textContent = '';
  }

  function showDashboard(email) {
    loginScreen.style.display = 'none';
    adminApp.style.display = 'flex';
    if (statusBar) statusBar.style.display = 'flex';
    if (authEmailFooter) {
      authEmailFooter.textContent = 'Signed in as ' + email;
    }
    initDashboard();
  }

  function setLoading(btn, textEl, spinnerEl, loading) {
    if (loading) {
      textEl.style.display = 'none';
      spinnerEl.style.display = 'inline-block';
      btn.disabled = true;
    } else {
      textEl.style.display = 'inline';
      spinnerEl.style.display = 'none';
      btn.disabled = false;
    }
  }

  function clearAllErrors() {
    loginError.textContent = '';
    otpError.textContent = '';
  }

  // Send OTP Code (6-digit code to email)
  var OTP_RESEND_KEY = 'portfolio_otp_last_sent';
  var OTP_RESEND_MIN_MS = 60000; // 60s between OTP emails
  function otpCooldownRemaining() {
    try {
      var last = parseInt(localStorage.getItem(OTP_RESEND_KEY) || '0', 10);
      var remain = OTP_RESEND_MIN_MS - (Date.now() - last);
      return remain > 0 ? remain : 0;
    } catch (e) {
      return 0;
    }
  }
  function sendOtpCode() {
    clearAllErrors();
    if (!supabaseClient) {
      loginError.textContent = 'Supabase is not initialized';
      return;
    }
    var cooldown = otpCooldownRemaining();
    if (cooldown > 0) {
      loginError.textContent =
        'Please wait ' + Math.ceil(cooldown / 1000) + 's before requesting another code.';
      return;
    }
    var email = authEmailInput.value.trim();
    if (!email) {
      loginError.textContent = 'Please enter your email address.';
      return;
    }
    if (email !== ADMIN_EMAIL) {
      loginError.textContent = 'Only ' + ADMIN_EMAIL + ' can access this dashboard.';
      return;
    }

    setLoading(sendOtpBtn, sendText, sendSpinner, true);
    loginError.textContent = '⏳ Sending OTP code to your email...';

    supabaseClient.auth
      .signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true
        }
      })
      .then(function (result) {
        setLoading(sendOtpBtn, sendText, sendSpinner, false);
        if (result.error) {
          loginError.textContent = 'Failed: ' + result.error.message;
          return;
        }
        // Show success + OTP input
        loginError.textContent = '';
        loginSentMsg.style.display = 'block';
        authEmailDisplay.textContent = email;
        loginStepEmail.style.display = 'none';
        loginStepOtp.style.display = 'block';
        otpInput.value = '';
        otpError.textContent = '';
        otpInput.focus();
        try {
          localStorage.setItem(OTP_RESEND_KEY, String(Date.now()));
        } catch (e) {}
        showToast('OTP code sent to ' + email + ' — check your inbox!', 'success');
      })
      .catch(function (err) {
        setLoading(sendOtpBtn, sendText, sendSpinner, false);
        loginError.textContent = 'Could not send. ' + (err.message || '');
      });
  }

  // Verify 6-digit OTP code
  function verifyOtpCode() {
    clearAllErrors();
    var code = otpInput.value.trim();
    if (!code || code.length !== 8) {
      otpError.textContent = 'Please enter the full 8-digit code from your email.';
      return;
    }
    var email = authEmailInput.value.trim();
    setLoading(verifyOtpBtn, verifyOtpText, verifyOtpSpinner, true);
    supabaseClient.auth
      .verifyOtp({
        email: email,
        token: code,
        type: 'email'
      })
      .then(function (result) {
        setLoading(verifyOtpBtn, verifyOtpText, verifyOtpSpinner, false);
        if (result.error) {
          otpError.textContent = result.error.message;
          return;
        }
        showToast('Signed in!', 'success');
        showDashboard(email);
      })
      .catch(function (err) {
        setLoading(verifyOtpBtn, verifyOtpText, verifyOtpSpinner, false);
        otpError.textContent = 'Verification failed: ' + (err.message || '');
      });
  }

  // Sign Out
  function signOut() {
    if (!supabaseClient) return;
    supabaseClient.auth
      .signOut()
      .then(function () {
        showLogin();
      })
      .catch(function () {
        showLogin();
      });
  }

  // ─── Auth Event Listeners ─────────────────

  sendOtpBtn.addEventListener('click', sendOtpCode);

  authEmailInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendOtpCode();
  });

  verifyOtpBtn.addEventListener('click', verifyOtpCode);

  otpInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') verifyOtpCode();
  });

  backToEmailBtn.addEventListener('click', function () {
    loginStepOtp.style.display = 'none';
    loginStepEmail.style.display = 'block';
    loginSentMsg.style.display = 'none';
    loginError.textContent = '';
    otpError.textContent = '';
  });

  signOutBtn.addEventListener('click', signOut);

  // Listen for auth state changes
  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(function (event, session) {
      if (event === 'SIGNED_OUT') {
        showLogin();
      }
    });
  }

  // ─── Cloud Sync Password ──────────────────
  var cloudPwInput = document.getElementById('cloud-password-input');
  var cloudSavePwBtn = document.getElementById('cloud-save-password-btn');

  // Load saved cloud password
  var savedCloudPw = getAdminPassword();
  if (savedCloudPw && savedCloudPw !== 'admin123') {
    cloudPwInput.value = savedCloudPw;
  }

  cloudSavePwBtn.addEventListener('click', function () {
    var pw = cloudPwInput.value.trim();
    if (!pw) {
      showToast('Enter a secret password for cloud sync.', 'error');
      return;
    }
    if (pw.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }
    setAdminPassword(pw);
    showToast('Cloud sync password saved!', 'success');
  });

  // ─── Password / token visibility toggles ───────
  document.querySelectorAll('.pw-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.getAttribute('data-toggle-for'));
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
      btn.setAttribute('aria-label', (show ? 'Hide' : 'Show') + ' password');
      input.focus();
    });
  });

  // ─── GitHub Token ─────────────────────────
  var githubTokenInput = document.getElementById('github-token-input');
  var githubTokenSaveBtn = document.getElementById('github-token-save-btn');

  if (githubTokenInput) {
    var savedToken = getGitHubToken();
    if (savedToken) githubTokenInput.value = savedToken;
  }

  if (githubTokenSaveBtn) {
    githubTokenSaveBtn.addEventListener('click', function () {
      var token = githubTokenInput.value.trim();
      if (!token) {
        setGitHubToken('');
        showToast('GitHub token cleared.', 'success');
        return;
      }
      if (token.length < 10) {
        showToast('Token looks too short. Did you paste the full token?', 'error');
        return;
      }
      setGitHubToken(token);
      showToast('GitHub token saved! Now stats will use authenticated requests (5,000 req/hr).', 'success');
    });
  }

  // ─── Toast ─────────────────────────────────
  function showToast(msg, type, actionText, actionFn, duration) {
    var toast = document.getElementById('admin-toast');
    if (toast._hideTimer) {
      clearTimeout(toast._hideTimer);
      toast._hideTimer = null;
    }
    toast.textContent = '';
    var span = document.createElement('span');
    span.textContent = msg;
    toast.appendChild(span);
    if (actionText && actionFn) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.textContent = actionText;
      btn.addEventListener('click', function () {
        actionFn();
        toast.classList.remove('show');
      });
      toast.appendChild(btn);
    }
    toast.className = 'admin-toast ' + (type || '') + ' show';
    var hideTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, duration || 2500);
    toast._hideTimer = hideTimer;
  }

  // ─── Confirmation Modal ────────────────────
  var confirmCallback = null;

  // Shared focus trap for admin dialogs — keeps Tab cycling inside the open
  // modal so keyboard users can't escape into the page behind it (a11y).
  window.trapFocus =
    window.trapFocus ||
    function (e, container) {
      if (e.key !== 'Tab') return;
      var focusables = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      var active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !container.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

  function showConfirm(message, callback) {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-overlay').classList.add('open');
    confirmCallback = callback;
    document.getElementById('confirm-ok-btn').focus();
  }

  // Escape + focus trap for the confirm dialog (a11y).
  document.addEventListener('keydown', function (e) {
    var ov = document.getElementById('confirm-overlay');
    if (!ov || !ov.classList.contains('open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      ov.classList.remove('open');
      confirmCallback = null;
    } else if (e.key === 'Tab' && window.trapFocus) {
      window.trapFocus(e, ov);
    }
  });
  document.getElementById('confirm-ok-btn').addEventListener('click', function () {
    document.getElementById('confirm-overlay').classList.remove('open');
    if (confirmCallback) {
      var cb = confirmCallback;
      confirmCallback = null;
      cb(true);
    }
  });

  document.getElementById('confirm-cancel-btn').addEventListener('click', function () {
    document.getElementById('confirm-overlay').classList.remove('open');
    if (confirmCallback) {
      var cb = confirmCallback;
      confirmCallback = null;
      cb(false);
    }
  });

  document.getElementById('confirm-overlay').addEventListener('click', function (e) {
    if (e.target === this) {
      this.classList.remove('open');
      if (confirmCallback) {
        var cb = confirmCallback;
        confirmCallback = null;
        cb(false);
      }
    }
  });

  // ─── Save Status Bar ───────────────────────
  var statusTimeout = null;

  function updateStatusBar(state) {
    var bar = document.getElementById('admin-statusbar');
    var dot = document.getElementById('statusbar-dot');
    var text = document.getElementById('statusbar-text');
    var section = document.getElementById('statusbar-section');
    if (state === 'saving' || state === 'saved' || state === 'error') {
      if (bar) bar.classList.add('active');
    }
    dot.className = 'statusbar-dot';
    if (state === 'saved') {
      dot.classList.add('saved');
      var pw = getAdminPassword();
      text.textContent =
        pw && pw !== 'admin123'
          ? 'Saved at ' + new Date().toLocaleTimeString() + ' · synced to cloud'
          : 'Saved locally at ' + new Date().toLocaleTimeString() + ' — publish to update site';
      if (statusTimeout) clearTimeout(statusTimeout);
      statusTimeout = setTimeout(function () {
        text.textContent = 'Ready';
        dot.className = 'statusbar-dot saved';
        if (bar) bar.classList.remove('active');
      }, 5000);
    } else if (state === 'saving') {
      dot.classList.add('saving');
      text.textContent = 'Saving...';
    } else if (state === 'error') {
      dot.classList.add('error');
      text.textContent = 'Save failed';
    }
    var navBtn = document.querySelector('.admin-nav-btn.active');
    if (navBtn) {
      section.textContent = navBtn.querySelector('span:last-child').textContent;
    }
  }

  // ─── Sidebar Counts ────────────────────────
  function updateSidebarCounts() {
    var d = readData();
    var counts = {
      projects: (d.projects || []).length,
      certs: (d.certifications || []).length,
      experience: (d.experience || []).length,
      learning: (d.learning || []).length,
      contact: (d.contactLinks || []).length,
      faq: (d.chatFaq || []).length
    };
    document.querySelectorAll('.admin-nav-btn').forEach(function (btn) {
      var section = btn.dataset.section;
      var countEl = btn.querySelector('.nav-count');
      if (countEl && counts[section] !== undefined) {
        countEl.textContent = '(' + counts[section] + ')';
      }
    });
  }

  // ─── Dashboard ─────────────────────────────
  function fmtShortDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  function renderDashboard() {
    var statsEl = document.getElementById('dash-stats');
    var recentEl = document.getElementById('dash-recent-messages');
    var statusEl = document.getElementById('dash-status');
    var dateEl = document.getElementById('dash-date');
    if (!statsEl) return;

    if (dateEl) {
      dateEl.textContent =
        ' — ' +
        new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
    }

    var d = readData();
    var projects = d.projects || [];
    var certs = d.certifications || [];
    var experience = d.experience || [];
    var learning = d.learning || [];
    var faq = d.chatFaq || [];
    var contactLinks = d.contactLinks || [];

    var msgTotal = 0;
    var msgUnread = 0;
    var recentRows = [];

    function fillRecent() {
      var statCards = [
        { label: 'Projects', value: projects.length },
        { label: 'Certificates', value: certs.length },
        { label: 'Experience', value: experience.length },
        { label: 'Messages', value: msgTotal },
        { label: 'Unread', value: msgUnread, accent: msgUnread > 0 },
        {
          label: 'Chatbot',
          value: d.chatConfig && d.chatConfig.enabled === false ? 'Disabled' : 'Enabled',
          sub: faq.length + ' FAQ answers'
        }
      ];
      statsEl.innerHTML = statCards
        .map(function (s) {
          return (
            '<div class="dash-stat' +
            (s.accent ? ' dash-stat-accent' : '') +
            '">' +
            '<span class="dash-stat-value">' +
            escapeHtml(String(s.value)) +
            '</span>' +
            '<span class="dash-stat-label">' +
            escapeHtml(s.label) +
            '</span>' +
            (s.sub ? '<span class="dash-stat-sub">' + escapeHtml(s.sub) + '</span>' : '') +
            '</div>'
          );
        })
        .join('');

      if (recentEl) {
        recentEl.innerHTML = recentRows.length
          ? recentRows
              .map(function (m) {
                return (
                  '<div class="dash-msg' +
                  (m.read ? '' : ' dash-msg-unread') +
                  '">' +
                  '<span class="dash-msg-dot" aria-hidden="true"></span>' +
                  '<div class="dash-msg-main">' +
                  '<span class="dash-msg-name">' +
                  escapeHtml(m.name || 'Unknown') +
                  '</span>' +
                  '<span class="dash-msg-subject">' +
                  escapeHtml(m.subject || '(no subject)') +
                  '</span>' +
                  '</div>' +
                  '<span class="dash-msg-date">' +
                  fmtShortDate(m.created_at) +
                  '</span>' +
                  '</div>'
                );
              })
              .join('')
          : '<p class="dash-empty">No messages yet — they will appear here when someone uses the Contact form.</p>';
      }

      if (statusEl) {
        var sync = d._syncTimestamp ? new Date(d._syncTimestamp).toLocaleString() : 'Not synced yet';
        var rows = [
          {
            k: 'Content items',
            v:
              projects.length +
              certs.length +
              experience.length +
              learning.length +
              contactLinks.length +
              ' saved'
          },
          { k: 'FAQ answers', v: faq.length + ' configured' },
          { k: 'Cloud sync', v: sync }
        ];
        statusEl.innerHTML = rows
          .map(function (r) {
            return (
              '<div class="dash-status-row"><span>' +
              escapeHtml(r.k) +
              '</span><strong>' +
              escapeHtml(r.v) +
              '</strong></div>'
            );
          })
          .join('');
      }
    }

    fillRecent();
    if (supabaseClient) {
      supabaseClient
        .from('contact_messages')
        .select('id, name, subject, created_at, read')
        .order('created_at', { ascending: false })
        .then(function (result) {
          if (result.error) return;
          var rows = result.data || [];
          msgTotal = rows.length;
          msgUnread = rows.filter(function (m) {
            return !m.read;
          }).length;
          recentRows = rows.slice(0, 5);
          fillRecent();
        });
    }
  }

  // ─── Dashboard quick actions ───────────────
  function bindDashboardActions() {
    var viewAll = document.getElementById('dash-view-messages');
    if (viewAll)
      viewAll.addEventListener('click', function () {
        switchSection('messages');
      });
    var testChat = document.getElementById('dash-test-chat');
    if (testChat) testChat.addEventListener('click', openChatTest);
    document.querySelectorAll('.dash-action[data-go]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchSection(this.dataset.go);
      });
    });
  }

  // ─── AI Chatbot Test Panel ─────────────────
  function openChatTest() {
    var backdrop = document.getElementById('chat-test-backdrop');
    var result = document.getElementById('chat-test-result');
    var input = document.getElementById('chat-test-input');
    if (backdrop) backdrop.hidden = false;
    if (result) result.hidden = true;
    if (input) {
      input.value = '';
      setTimeout(function () {
        input.focus();
      }, 50);
    }
  }

  function closeChatTest() {
    var backdrop = document.getElementById('chat-test-backdrop');
    if (backdrop) backdrop.hidden = true;
  }

  function runChatTest() {
    var input = document.getElementById('chat-test-input');
    var result = document.getElementById('chat-test-result');
    var sendBtn = document.getElementById('chat-test-send');
    var q = ((input && input.value) || '').trim();
    if (!q) return;
    if (!result) return;
    result.hidden = false;
    result.innerHTML = '<div class="chat-test-loading">Asking the AI…</div>';
    if (sendBtn) sendBtn.disabled = true;
    fetch('https://mnsgwitzgwhmiccbojck.supabase.co/functions/v1/chat-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q.slice(0, 500), context: '' })
    })
      .then(function (resp) {
        return resp
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            return { ok: resp.ok, data: data };
          });
      })
      .then(function (r) {
        if (r.ok && r.data && r.data.text) {
          result.innerHTML =
            '<div class="chat-test-answer"><strong>Answer</strong><p>' +
            escapeHtml(String(r.data.text).slice(0, 1200)) +
            '</p></div>';
        } else {
          result.innerHTML =
            '<div class="chat-test-error"><strong>Error</strong><p>' +
            escapeHtml((r.data && r.data.error) || 'No response from the AI function.') +
            '</p></div>';
        }
      })
      .catch(function () {
        result.innerHTML =
          '<div class="chat-test-error"><strong>Error</strong><p>Could not reach the AI function. Check that <code>chat-ai</code> is deployed.</p></div>';
      })
      .then(function () {
        if (sendBtn) sendBtn.disabled = false;
      });
  }

  function bindChatTest() {
    var closeBtn = document.getElementById('chat-test-close');
    if (closeBtn) closeBtn.addEventListener('click', closeChatTest);
    var backdrop = document.getElementById('chat-test-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) closeChatTest();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !backdrop.hidden) closeChatTest();
        else if (e.key === 'Tab' && !backdrop.hidden && window.trapFocus) window.trapFocus(e, backdrop);
      });
    }
    var sendBtn = document.getElementById('chat-test-send');
    if (sendBtn) sendBtn.addEventListener('click', runChatTest);
    var input = document.getElementById('chat-test-input');
    if (input)
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          runChatTest();
        }
      });
  }

  // ─── Sidebar collapse + mobile drawer ──────
  function bindSidebar() {
    var sidebarEl = document.getElementById('admin-sidebar');
    var collapseBtn = document.getElementById('sidebar-collapse-btn');
    var menuBtn = document.getElementById('topbar-menu-btn');
    var backdropEl = document.getElementById('admin-backdrop');
    if (!sidebarEl) return;
    if (collapseBtn) {
      try {
        if (localStorage.getItem('admin_sidebar_collapsed') === '1') sidebarEl.classList.add('collapsed');
      } catch (e) {}
      collapseBtn.addEventListener('click', function () {
        sidebarEl.classList.toggle('collapsed');
        try {
          localStorage.setItem(
            'admin_sidebar_collapsed',
            sidebarEl.classList.contains('collapsed') ? '1' : '0'
          );
        } catch (e) {}
      });
    }
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        sidebarEl.classList.add('open');
        if (backdropEl) backdropEl.hidden = false;
      });
    }
    if (backdropEl) {
      backdropEl.addEventListener('click', function () {
        sidebarEl.classList.remove('open');
        backdropEl.hidden = true;
      });
    }
    document.querySelectorAll('.admin-nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sidebarEl.classList.remove('open');
        if (backdropEl) backdropEl.hidden = true;
      });
    });
  }

  // ─── Messages search + filter (client-side) ─
  // ─── Contact Messages Inbox ───────────────
  function renderMessageCard(m) {
    var date = new Date(m.created_at).toLocaleString();
    var replies = (m.contact_replies || []).slice().sort(function (a, b) {
      return new Date(a.created_at) - new Date(b.created_at);
    });
    var thread = replies.length
      ? '<div class="admin-thread">' +
        replies
          .map(function (r) {
            return (
              '<div class="admin-thread-item">' +
              '<div class="admin-thread-item-head">' +
              '<span>You replied</span>' +
              '<span class="admin-message-date">' +
              new Date(r.created_at).toLocaleString() +
              '</span>' +
              '</div>' +
              '<div class="admin-thread-item-body">' +
              escapeHtml(r.body) +
              '</div>' +
              '</div>'
            );
          })
          .join('') +
        '</div>'
      : '';
    // Compact inbox row — body/actions are revealed on click so the list stays
    // scannable. Click a message to open it; reply/delete live inside.
    return (
      '<div class="admin-message' +
      (m.read ? '' : ' is-unread') +
      '" data-id="' +
      escapeHtml(m.id) +
      '" data-read="' +
      (m.read ? '1' : '0') +
      '" data-name="' +
      escapeHtml(m.name || '') +
      '" data-email="' +
      escapeHtml(m.email || '') +
      '">' +
      '<button type="button" class="admin-message-toggle" aria-expanded="false" aria-controls="msg-detail-' +
      escapeHtml(m.id) +
      '">' +
      '<span class="admin-message-dot" aria-hidden="true"></span>' +
      '<span class="admin-message-toggle-head">' +
      '<strong>' +
      escapeHtml(m.name) +
      '</strong>' +
      '<span class="admin-message-email">&lt;' +
      escapeHtml(m.email) +
      '&gt;</span>' +
      (m.replied_at ? '<span class="admin-message-replied">Replied</span>' : '') +
      '</span>' +
      '<span class="admin-message-date">' +
      date +
      '</span>' +
      '<span class="admin-message-chevron" aria-hidden="true">›</span>' +
      '</button>' +
      '<div class="admin-message-subject">' +
      escapeHtml(m.subject) +
      '</div>' +
      '<div class="admin-message-detail" id="msg-detail-' +
      escapeHtml(m.id) +
      '" hidden>' +
      '<p class="admin-message-body">' +
      escapeHtml(m.message) +
      '</p>' +
      thread +
      '<div class="admin-message-actions">' +
      '<button class="btn btn-sm msg-reply" data-id="' +
      escapeHtml(m.id) +
      '">' +
      (replies.length ? 'Reply Again' : 'Reply') +
      '</button>' +
      '<button class="btn btn-sm msg-toggle-read" data-id="' +
      escapeHtml(m.id) +
      '">' +
      (m.read ? 'Mark Unread' : 'Mark Read') +
      '</button>' +
      '<button class="btn btn-sm btn-danger-ghost msg-delete" data-id="' +
      escapeHtml(m.id) +
      '">Delete</button>' +
      '</div>' +
      '<div class="msg-compose" hidden>' +
      '<label class="msg-compose-label" for="msg-reply-' +
      escapeHtml(m.id) +
      '">Reply to &lt;' +
      escapeHtml(m.email) +
      '&gt;</label>' +
      '<textarea class="msg-compose-input" id="msg-reply-' +
      escapeHtml(m.id) +
      '" rows="4" placeholder="Write your reply…" maxlength="10000"></textarea>' +
      '<div class="msg-compose-actions">' +
      '<button class="btn btn-sm msg-send-reply" data-id="' +
      escapeHtml(m.id) +
      '" data-email="' +
      escapeHtml(m.email) +
      '">Send Reply</button>' +
      '<button class="btn btn-sm btn-danger-ghost msg-cancel-reply">Cancel</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  var MESSAGES_PAGE = 25;
  var messagesLoaded = MESSAGES_PAGE;
  function loadMessages() {
    var inbox = document.getElementById('messages-inbox');
    if (!inbox) return;
    if (!supabaseClient) {
      inbox.innerHTML =
        '<p style="color:var(--admin-text-secondary)">Supabase is not available. Check your connection or the CDN script.</p>';
      return;
    }
    inbox.innerHTML = '<p style="color:var(--admin-text-secondary)">Loading messages…</p>';
    supabaseClient
      .from('contact_messages')
      .select('*, contact_replies(id, body, created_at)')
      .order('created_at', { ascending: false })
      .limit(messagesLoaded)
      .then(function (result) {
        if (result.error) {
          inbox.innerHTML =
            '<p style="color:var(--admin-danger,#F87171)">Could not load messages: ' +
            escapeHtml(result.error.message) +
            '</p>';
          return;
        }
        var rows = result.data || [];
        var hasMore = rows.length === messagesLoaded;
        var unread = rows.filter(function (m) {
          return !m.read;
        }).length;
        var badge = document.getElementById('messages-nav-count');
        if (badge) badge.textContent = unread ? '(' + unread + ')' : '';
        if (!rows.length) {
          inbox.innerHTML =
            '<p style="color:var(--admin-text-secondary)">No messages yet. They will appear here when someone uses the Contact form.</p>';
          var emptyMsg = document.getElementById('messages-empty');
          if (emptyMsg) emptyMsg.style.display = 'none';
          return;
        }
        inbox.innerHTML =
          rows.map(renderMessageCard).join('') +
          (hasMore
            ? '<button class="btn btn-sm" id="messages-load-more" style="align-self:center;margin-top:0.25rem">Load more (' +
              messagesLoaded +
              ' loaded)</button>'
            : '');
        var loadMoreBtn = document.getElementById('messages-load-more');
        if (loadMoreBtn) {
          loadMoreBtn.addEventListener('click', function () {
            messagesLoaded += MESSAGES_PAGE;
            loadMessages();
          });
        }
        inbox.querySelectorAll('.msg-toggle-read').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var card = btn.closest('.admin-message');
            if (!card || !supabaseClient) return;
            var id = card.dataset.id;
            var read = card.dataset.read === '1';
            supabaseClient
              .from('contact_messages')
              .update({ read: !read })
              .eq('id', id)
              .then(function (result) {
                if (result.error) showToast('Failed to update message', 'error');
                loadMessages();
              });
          });
        });
        inbox.querySelectorAll('.msg-delete').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var card = btn.closest('.admin-message');
            if (!card || !supabaseClient) return;
            if (!confirm('Delete this message?')) return;
            var id = card.dataset.id;
            supabaseClient
              .from('contact_messages')
              .delete()
              .eq('id', id)
              .then(function (result) {
                if (result.error) showToast('Failed to delete message', 'error');
                loadMessages();
              });
          });
        });
        inbox.querySelectorAll('.msg-reply').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var card = btn.closest('.admin-message');
            if (!card) return;
            // Make sure the collapsed detail is open so the reply box is visible.
            var detail = card.querySelector('.admin-message-detail');
            if (detail && detail.hidden) {
              detail.hidden = false;
              card.classList.add('expanded');
              var toggle = card.querySelector('.admin-message-toggle');
              if (toggle) toggle.setAttribute('aria-expanded', 'true');
            }
            var compose = card.querySelector('.msg-compose');
            if (compose) {
              compose.hidden = !compose.hidden;
              if (!compose.hidden) {
                var ta = compose.querySelector('textarea');
                if (ta) ta.focus();
              }
            }
          });
        });
        inbox.querySelectorAll('.msg-cancel-reply').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var compose = btn.closest('.msg-compose');
            if (compose) compose.hidden = true;
          });
        });
        inbox.querySelectorAll('.msg-send-reply').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var card = btn.closest('.admin-message');
            if (!card) return;
            var compose = card.querySelector('.msg-compose');
            var ta = compose ? compose.querySelector('textarea') : null;
            if (!ta) return;
            var body = ta.value.trim();
            if (!body) {
              showToast('Reply is empty', 'error');
              return;
            }
            sendReply(
              {
                message_id: btn.dataset.id,
                body: body,
                to: btn.dataset.email || '',
                subject: (card.querySelector('.admin-message-subject') || {}).textContent || ''
              },
              ta,
              btn
            );
          });
        });
        // Re-apply the search/filter after every re-render (mark read, delete…).
        applyMessageFilter();
      })
      .catch(function (err) {
        inbox.innerHTML =
          '<p style="color:var(--admin-danger,#F87171)">Could not load messages: ' +
          escapeHtml(err.message || err) +
          '</p>';
      });
  }

  // ─── Chat FAQ (admin-editable chatbot answers) ─
  function renderFaqList() {
    renderManager('faq');
  }

  document.getElementById('faq-add').addEventListener('click', function () {
    var d = readData();
    if (!d.chatFaq) d.chatFaq = [];
    d.chatFaq.push({ topic: '', keywords: 'new topic', answer: 'Answer the visitor here.' });
    writeData();
    renderManager('faq');
    openItemModal('faq', d.chatFaq.length - 1);
  });

  // ─── Chat Insights ─────────────────────────────
  function loadChatInsights() {
    if (!supabaseClient) return;
    var wrap = document.getElementById('chats-stats');
    if (!wrap) return;
    wrap.innerHTML = '<p style="color:var(--admin-text-secondary);font-size:0.875rem">Loading chat logs…</p>';
    supabaseClient
      .from('chat_logs')
      .select('id, question, matched_topic, answered, escalated, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(function (result) {
        if (result.error) {
          wrap.innerHTML =
            '<p style="color:var(--admin-text-secondary);font-size:0.875rem">Could not load chats: ' +
            (result.error.message || 'table may not exist yet — run Step 15 in docs/supabase-rls.sql') +
            '</p>';
          return;
        }
        var rows = result.data || [];
        renderChatInsights(rows);
      });
    // Exact total for the sidebar badge (separate lightweight count query).
    supabaseClient
      .from('chat_logs')
      .select('id', { count: 'exact', head: true })
      .then(function (countResult) {
        var badge = document.getElementById('chats-nav-count');
        if (badge && !countResult.error)
          badge.textContent = countResult.count ? '(' + countResult.count + ')' : '';
      });
  }

  function renderChatInsights(rows) {
    var total = rows.length;
    var answered = rows.filter(function (r) {
      return r.answered;
    }).length;
    var escalated = rows.filter(function (r) {
      return r.escalated;
    }).length;

    var stats = [
      { label: 'Total questions', value: total },
      { label: 'Answered', value: answered },
      { label: 'Escalated to you', value: escalated },
      { label: 'Escalation rate', value: total ? Math.round((escalated / total) * 100) + '%' : '—' }
    ];
    document.getElementById('chats-stats').innerHTML = stats
      .map(function (s) {
        return (
          '<div style="background:#1A1D27;border:1px solid #2A2D35;border-radius:8px;padding:0.75rem;text-align:center">' +
          '<div style="font-size:1.35rem;font-weight:700;color:#4ADE80">' +
          s.value +
          '</div>' +
          '<div style="font-size:0.7rem;color:var(--admin-text-secondary);margin-top:0.25rem">' +
          escapeHtml(s.label) +
          '</div></div>'
        );
      })
      .join('');

    // Most-asked answered topics
    var topicCounts = {};
    rows.forEach(function (r) {
      if (r.matched_topic) topicCounts[r.matched_topic] = (topicCounts[r.matched_topic] || 0) + 1;
    });
    var topics = Object.keys(topicCounts).sort(function (a, b) {
      return topicCounts[b] - topicCounts[a];
    });
    document.getElementById('chats-topics').innerHTML = topics.length
      ? topics
          .map(function (t) {
            var pct = Math.round((topicCounts[t] / total) * 100);
            return (
              '<div style="margin-bottom:0.6rem">' +
              '<div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:0.2rem"><span>' +
              escapeHtml(t) +
              '</span><span style="color:var(--admin-text-secondary)">' +
              topicCounts[t] +
              '×</span></div>' +
              '<div style="height:6px;background:#2A2D35;border-radius:3px;overflow:hidden"><div style="height:100%;width:' +
              pct +
              '%;background:#4ADE80;border-radius:3px"></div></div></div>'
            );
          })
          .join('')
      : '<p style="color:var(--admin-text-secondary);font-size:0.875rem">No answered questions yet — try the chat on the live site.</p>';

    // Unanswered (escalated) questions grouped by text
    var unMap = {};
    rows.forEach(function (r) {
      if (r.escalated && r.question) {
        var key = r.question.toLowerCase().trim();
        if (!unMap[key]) unMap[key] = { text: r.question, n: 0 };
        unMap[key].n++;
      }
    });
    var unanswered = Object.keys(unMap)
      .map(function (k) {
        return unMap[k];
      })
      .sort(function (a, b) {
        return b.n - a.n;
      });
    document.getElementById('chats-unanswered').innerHTML = unanswered.length
      ? unanswered
          .slice(0, 20)
          .map(function (u) {
            return (
              '<div style="display:flex;justify-content:space-between;gap:1rem;padding:0.5rem 0;border-bottom:1px solid #2A2D35;font-size:0.8rem">' +
              '<span style="word-break:break-word">\u201C' +
              escapeHtml(u.text) +
              '\u201D</span><span style="color:var(--admin-text-secondary);flex-shrink:0">' +
              u.n +
              '×</span></div>'
            );
          })
          .join('')
      : '<p style="color:var(--admin-text-secondary);font-size:0.875rem">No unanswered questions — great coverage.</p>';

    // Recent chat log
    document.getElementById('chats-recent').innerHTML = rows.length
      ? '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.78rem">' +
        '<thead><tr style="text-align:left;color:var(--admin-text-secondary);border-bottom:1px solid #2A2D35">' +
        '<th style="padding:0.4rem 0.5rem">When</th><th style="padding:0.4rem 0.5rem">Question</th><th style="padding:0.4rem 0.5rem">Topic</th><th style="padding:0.4rem 0.5rem">Status</th></tr></thead><tbody>' +
        rows
          .slice(0, 15)
          .map(function (r) {
            var when = r.created_at ? new Date(r.created_at).toLocaleString() : '';
            var status = r.escalated ? 'Escalated' : r.answered ? 'Answered' : '—';
            var statusColor = r.escalated ? '#F59E0B' : '#4ADE80';
            return (
              '<tr style="border-bottom:1px solid #2A2D35">' +
              '<td style="padding:0.4rem 0.5rem;white-space:nowrap;color:var(--admin-text-secondary)">' +
              escapeHtml(when) +
              '</td>' +
              '<td style="padding:0.4rem 0.5rem;word-break:break-word">' +
              escapeHtml(r.question) +
              '</td>' +
              '<td style="padding:0.4rem 0.5rem">' +
              escapeHtml(r.matched_topic || '—') +
              '</td>' +
              '<td style="padding:0.4rem 0.5rem;color:' +
              statusColor +
              '">' +
              status +
              '</td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div>'
      : '<p style="color:var(--admin-text-secondary);font-size:0.875rem">No chat activity yet — open the chat on the live site and ask it something!</p>';
  }

  function sendReply(payload, textarea, sendBtn) {
    if (!supabaseClient) {
      showToast('Supabase is not available', 'error');
      return;
    }
    if (!REPLY_FUNCTION_URL) {
      // Edge function not deployed yet — fall back to mailto with the typed reply.
      var subject = 'Re: ' + payload.subject;
      var link =
        'mailto:' +
        payload.to +
        '?subject=' +
        encodeURIComponent(subject) +
        '&body=' +
        encodeURIComponent(payload.body);
      window.location.href = link;
      showToast('Edge function not deployed — opened your email app instead', '');
      return;
    }
    textarea.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    function reenable() {
      textarea.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
    }
    supabaseClient.auth
      .getSession()
      .then(function (sessionResult) {
        var token =
          sessionResult && sessionResult.data && sessionResult.data.session
            ? sessionResult.data.session.access_token
            : null;
        if (!token) {
          showToast('Please sign in first', 'error');
          reenable();
          return;
        }
        fetch(REPLY_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify(payload)
        })
          .then(function (resp) {
            return resp
              .json()
              .catch(function () {
                return {};
              })
              .then(function (data) {
                return { ok: resp.ok, data: data };
              });
          })
          .then(function (result) {
            reenable();
            if (result.ok) {
              showToast('Reply sent', 'success');
              loadMessages();
            } else {
              showToast(result.data && result.data.error ? result.data.error : 'Reply failed', 'error');
            }
          })
          .catch(function (err) {
            reenable();
            showToast('Reply failed: ' + (err.message || err), 'error');
          });
      })
      .catch(function () {
        reenable();
        showToast('Could not verify your session', 'error');
      });
  }

  var messagesRefreshBtn = document.getElementById('messages-refresh');
  if (messagesRefreshBtn) {
    messagesRefreshBtn.addEventListener('click', loadMessages);
  }

  // Bulk action: mark every unread message as read in one click.
  var markReadBtn = document.getElementById('messages-mark-read');
  if (markReadBtn) {
    markReadBtn.addEventListener('click', function () {
      if (!supabaseClient) {
        showToast('Supabase is not available', 'error');
        return;
      }
      showConfirm('Mark all messages as read?', function (ok) {
        if (!ok) return;
        supabaseClient
          .from('contact_messages')
          .update({ read: true })
          .eq('read', false)
          .then(function (result) {
            if (result.error) {
              showToast('Could not update messages', 'error');
              return;
            }
            showToast('All messages marked as read', 'success');
            loadMessages();
          });
      });
    });
  }

  // Click a message row to expand/collapse its body + actions (compact inbox).
  var inboxToggleEl = document.getElementById('messages-inbox');
  if (inboxToggleEl) {
    inboxToggleEl.addEventListener('click', function (e) {
      var toggle = e.target.closest('.admin-message-toggle');
      if (!toggle) return;
      var card = toggle.closest('.admin-message');
      if (!card) return;
      var detail = card.querySelector('.admin-message-detail');
      if (!detail) return;
      var expand = detail.hidden;
      detail.hidden = !expand;
      card.classList.toggle('expanded', expand);
      toggle.setAttribute('aria-expanded', expand ? 'true' : 'false');
    });
  }

  // ─── Messages search/filter ────────────────
  function applyMessageFilter() {
    var inbox = document.getElementById('messages-inbox');
    if (!inbox) return;
    var q = (document.getElementById('messages-search') || {}).value || '';
    var f = (document.getElementById('messages-filter') || {}).value || 'all';
    q = q.toLowerCase().trim();
    var cards = inbox.querySelectorAll('.admin-message');
    var shown = 0;
    cards.forEach(function (card) {
      var read = card.dataset.read === '1';
      var okFilter = f === 'all' || (f === 'unread' && !read) || (f === 'read' && read);
      var hay = (
        (card.dataset.name || '') +
        ' ' +
        (card.dataset.email || '') +
        ' ' +
        ((card.querySelector('.admin-message-subject') || {}).textContent || '') +
        ' ' +
        ((card.querySelector('.admin-message-body') || {}).textContent || '')
      ).toLowerCase();
      var show = okFilter && (!q || hay.indexOf(q) !== -1);
      card.style.display = show ? '' : 'none';
      if (show) shown++;
    });
    var empty = document.getElementById('messages-empty');
    if (empty) empty.style.display = shown ? 'none' : '';
  }
  var msgSearchEl = document.getElementById('messages-search');
  var msgFilterEl = document.getElementById('messages-filter');
  if (msgSearchEl) msgSearchEl.addEventListener('input', applyMessageFilter);
  if (msgFilterEl) msgFilterEl.addEventListener('change', applyMessageFilter);

  // ─── Chatbot Config (admin-editable bot settings) ──
  function loadChatConfig() {
    var d = readData();
    var cfg = d.chatConfig || {};
    var enabled = document.getElementById('chatbot-enabled');
    var nameEl = document.getElementById('chatbot-name');
    var greetEl = document.getElementById('chatbot-greeting');
    if (enabled) enabled.checked = cfg.enabled !== false;
    if (nameEl) nameEl.value = cfg.botName || '';
    if (greetEl) greetEl.value = cfg.greeting || '';
  }
  function saveChatConfig() {
    if (!requireField(document.getElementById('chatbot-name'), 'Bot name')) return;
    if (!requireField(document.getElementById('chatbot-greeting'), 'Greeting message')) return;
    var d = readData();
    d.chatConfig = Object.assign({}, d.chatConfig || {}, {
      enabled: (document.getElementById('chatbot-enabled') || {}).checked !== false,
      botName: (document.getElementById('chatbot-name') || {}).value || '',
      greeting: (document.getElementById('chatbot-greeting') || {}).value || ''
    });
    writeData();
    showToast('Chatbot settings saved', 'success');
  }
  var chatbotSaveBtn = document.getElementById('chatbot-config-save');
  if (chatbotSaveBtn) chatbotSaveBtn.addEventListener('click', saveChatConfig);
  var chatbotTestBtn = document.getElementById('chatbot-test-open');
  if (chatbotTestBtn) chatbotTestBtn.addEventListener('click', openChatTest);
  var chatsRefreshBtn = document.getElementById('chats-refresh');
  if (chatsRefreshBtn) {
    chatsRefreshBtn.addEventListener('click', loadChatInsights);
  }

  // ─── Clear Chat Logs ──────────────────────
  // Wipes all chat_logs rows so test data doesn't pollute the insights.
  // Relies on the "Admin delete chat logs" RLS policy (Step 15c in
  // docs/supabase-rls.sql) — only the signed-in admin can do this.
  var chatsClearBtn = document.getElementById('chats-clear');
  if (chatsClearBtn) {
    chatsClearBtn.addEventListener('click', function () {
      if (!supabaseClient) {
        showToast('Supabase is not connected.', 'error');
        return;
      }
      showConfirm(
        'Delete ALL chat logs? This permanently wipes Chat Insights — test data included — and cannot be undone.',
        function (ok) {
          if (!ok) return;
          chatsClearBtn.disabled = true;
          chatsClearBtn.textContent = 'Clearing…';
          // PostgREST refuses an unfiltered DELETE, so match every real uuid.
          supabaseClient
            .from('chat_logs')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')
            .then(function (result) {
              if (result.error) {
                showToast('Failed to clear logs: ' + (result.error.message || 'error'), 'error');
              } else {
                showToast('Chat logs cleared', 'success');
                loadChatInsights();
              }
              chatsClearBtn.disabled = false;
              chatsClearBtn.textContent = 'Clear Logs';
            })
            .catch(function (err) {
              showToast('Failed to clear logs: ' + (err.message || err), 'error');
              chatsClearBtn.disabled = false;
              chatsClearBtn.textContent = 'Clear Logs';
            });
        }
      );
    });
  }

  // ─── Ctrl+S Shortcut ──────────────────────
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      var saveBtn = document.querySelector('.admin-section.active .btn-primary');
      if (saveBtn) {
        updateStatusBar('saving');
        saveBtn.click();
      }
    }
  });

  // ─── Navigation ────────────────────────────
  function switchSection(id) {
    if (id === currentSection) return;
    function go() {
      currentSection = id;
      document.querySelectorAll('.admin-section').forEach(function (el) {
        el.classList.remove('active');
      });
      document.getElementById('section-' + id).classList.add('active');
      if (id === 'dashboard') renderDashboard();
      if (id === 'messages') loadMessages();
      if (id === 'chats') loadChatInsights();
      if (id === 'chatbot') loadChatConfig();
      document.querySelectorAll('.admin-nav-btn').forEach(function (el) {
        el.classList.remove('active');
      });
      document.querySelector('.admin-nav-btn[data-section="' + id + '"]').classList.add('active');
      document.getElementById('section-title').textContent = document.querySelector(
        '.admin-nav-btn[data-section="' + id + '"] span:last-child'
      ).textContent;
    }
    if (formDirty) {
      showConfirm('You have unsaved changes. Leave this section without saving?', function (ok) {
        if (ok) go();
      });
      return;
    }
    go();
  }

  document.querySelectorAll('.admin-nav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchSection(this.dataset.section);
    });
  });

  // ─── Unsaved-changes tracking ──────────────
  // Any edit to a content input marks the panel dirty; saves (writeData) clear
  // it. The status bar shows the state, section switches ask for confirmation,
  // and closing the tab warns so work is never silently lost.
  var formDirty = false;
  function markDirty() {
    if (formDirty) return;
    formDirty = true;
    if (statusTimeout) {
      clearTimeout(statusTimeout);
      statusTimeout = null;
    }
    var bar = document.getElementById('admin-statusbar');
    var text = document.getElementById('statusbar-text');
    var dot = document.getElementById('statusbar-dot');
    if (bar) bar.classList.add('active');
    if (text) text.textContent = 'Unsaved changes';
    if (dot) dot.className = 'statusbar-dot dirty';
  }
  var adminAppEl = document.getElementById('admin-app');
  if (adminAppEl) {
    adminAppEl.addEventListener('input', function (e) {
      var t = e.target;
      if (!t || t.closest('.admin-modal')) return;
      // Messages (inbox search/filter + reply compose) and Cloud Sync fields
      // talk to Supabase/localStorage directly — they are not portfolio content,
      // so editing them must not trigger the unsaved-changes warning.
      if (t.closest('#section-messages') || t.closest('#section-cloud')) return;
      if (t.id === 'projects-search') return;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') markDirty();
    });
  }
  window.addEventListener('beforeunload', function (e) {
    if (!formDirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  // ─── Helpers ───────────────────────────────
  function readData() {
    data = loadData();
    return data;
  }
  function writeData() {
    updateStatusBar('saving');
    savePortfolioData(data);
    autoPushToCloud();
    formDirty = false;
    updateSidebarCounts();
    updateStatusBar('saved');
  }

  // Required-field check for admin forms — marks the input invalid, focuses it
  // and toasts so an accidental wipe can't silently blank a section.
  function requireField(el, label) {
    if (!el) return true;
    var ok = (el.value || '').trim().length > 0;
    el.classList.toggle('admin-input-invalid', !ok);
    if (!ok) {
      showToast(label + ' is required', 'error');
      el.focus();
    }
    return ok;
  }

  // Small inline SVG icon used by upload labels (keeps buttons emoji-free).
  var ICON_FOLDER =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
  var ICON_WARN =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  var ICON_LOCK =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  var ICON_CHECK =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

  // Shared upload guard — accept="image/*" is a hint, not a check. Reject
  // non-images and oversized files before the FileReader ever fires.
  function validImageFile(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      showToast('Please choose an image file (JPG, PNG, SVG, WEBP).', 'error');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image is too large — max 2MB. Please resize it and try again.', 'error');
      return false;
    }
    return true;
  }

  // ─── Hero ──────────────────────────────────
  function loadHero() {
    var d = readData();
    document.getElementById('hero-badge').value = d.hero.badge || '';
    document.getElementById('hero-badge2').value = d.hero.badge2 || '';
    document.getElementById('hero-name').value = d.hero.name || '';
    document.getElementById('hero-idno').value = d.hero.idNumber || '';
    document.getElementById('hero-qrlink').value = d.hero.qrLink || '';
    document.getElementById('hero-school').value = d.hero.schoolTitle || '';
    document.getElementById('hero-school-sub').value = d.hero.schoolSub || '';
    document.getElementById('hero-title').value = d.hero.title || '';
    document.getElementById('hero-desc').value = d.hero.description || '';
    document.getElementById('hero-roles').value = (d.hero.roles || []).join(', ');
    renderHeroPhotoPreview(d.hero.photo || '');
  }

  function renderHeroPhotoPreview(photo) {
    var img = document.getElementById('idp-front-photo');
    var empty = document.getElementById('idp-front-photo-empty');
    var clearBtn = document.getElementById('hero-photo-clear');
    if (!img || !empty) return;
    if (photo) {
      img.src = photo;
      img.style.display = 'block';
      empty.style.display = 'none';
      if (clearBtn) clearBtn.hidden = false;
    } else {
      img.removeAttribute('src');
      img.style.display = 'none';
      empty.style.display = 'flex';
      if (clearBtn) clearBtn.hidden = true;
    }
  }

  document.getElementById('hero-save').addEventListener('click', function () {
    if (
      !requireField(document.getElementById('hero-name'), 'Name') ||
      !requireField(document.getElementById('hero-title'), 'Hero title')
    )
      return;
    var d = readData();
    d.hero.badge = document.getElementById('hero-badge').value;
    d.hero.badge2 = document.getElementById('hero-badge2').value;
    d.hero.name = document.getElementById('hero-name').value;
    d.hero.idNumber = document.getElementById('hero-idno').value;
    d.hero.qrLink = document.getElementById('hero-qrlink').value.trim();
    d.hero.schoolTitle = document.getElementById('hero-school').value.trim();
    d.hero.schoolSub = document.getElementById('hero-school-sub').value.trim();
    d.hero.title = document.getElementById('hero-title').value;
    d.hero.description = document.getElementById('hero-desc').value;
    d.hero.roles = document
      .getElementById('hero-roles')
      .value.split(',')
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    writeData();
    showToast('Hero saved!', 'success');
  });

  // Live ID preview (front + back) — refresh as hero fields are typed
  [
    'hero-name',
    'hero-badge',
    'hero-badge2',
    'hero-idno',
    'hero-qrlink',
    'hero-school',
    'hero-school-sub'
  ].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', updateIdPreview);
  });

  // Profile photo upload (resize to keep data lean, like cert uploads)
  var heroPhotoInput = document.getElementById('hero-photo-upload');
  if (heroPhotoInput) {
    heroPhotoInput.addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      if (!validImageFile(file)) {
        this.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var MAX = 800;
          var w = img.width,
            h = img.height;
          var canvas = document.createElement('canvas');
          if (w > MAX || h > MAX) {
            var ratio = Math.min(MAX / w, MAX / h);
            canvas.width = Math.round(w * ratio);
            canvas.height = Math.round(h * ratio);
          } else {
            canvas.width = w;
            canvas.height = h;
          }
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Merge current form values so unsaved hero text isn't dropped
          var d = readData();
          d.hero.badge = document.getElementById('hero-badge').value;
          d.hero.badge2 = document.getElementById('hero-badge2').value;
          d.hero.name = document.getElementById('hero-name').value;
          d.hero.idNumber = document.getElementById('hero-idno').value;
          d.hero.qrLink = document.getElementById('hero-qrlink').value.trim();
          d.hero.schoolTitle = document.getElementById('hero-school').value.trim();
          d.hero.schoolSub = document.getElementById('hero-school-sub').value.trim();
          d.hero.title = document.getElementById('hero-title').value;
          d.hero.description = document.getElementById('hero-desc').value;
          d.hero.roles = document
            .getElementById('hero-roles')
            .value.split(',')
            .map(function (s) {
              return s.trim();
            })
            .filter(Boolean);
          d.hero.photo = canvas.toDataURL('image/jpeg', 0.85);
          writeData();
          renderHeroPhotoPreview(d.hero.photo);
          updateIdPreview();
          showToast('Profile photo uploaded!', 'success');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      this.value = '';
    });
  }

  var heroPhotoClear = document.getElementById('hero-photo-clear');
  if (heroPhotoClear) {
    heroPhotoClear.addEventListener('click', function () {
      // Merge current form values so unsaved hero text isn't dropped
      var d = readData();
      d.hero.badge = document.getElementById('hero-badge').value;
      d.hero.badge2 = document.getElementById('hero-badge2').value;
      d.hero.name = document.getElementById('hero-name').value;
      d.hero.idNumber = document.getElementById('hero-idno').value;
      d.hero.qrLink = document.getElementById('hero-qrlink').value.trim();
      d.hero.schoolTitle = document.getElementById('hero-school').value.trim();
      d.hero.schoolSub = document.getElementById('hero-school-sub').value.trim();
      d.hero.title = document.getElementById('hero-title').value;
      d.hero.description = document.getElementById('hero-desc').value;
      d.hero.roles = document
        .getElementById('hero-roles')
        .value.split(',')
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      d.hero.photo = '';
      writeData();
      renderHeroPhotoPreview('');
      updateIdPreview();
      showToast('Profile photo removed', 'success');
    });
  }

  // ─── ID Badge Back — Live Preview ─────────
  // Mirrors the back of the portfolio ID badge. Reads the hero form fields
  // AND the Direct Contact link editor live (before saving) so the admin
  // sees exactly what the badge will show.
  function updateIdPreview() {
    var idEl = document.getElementById('idp-id');
    var scanLabelEl = document.getElementById('idp-scan-label');
    var siteLinkEl = document.getElementById('idp-site-link');
    var qrTargetEl = document.getElementById('idp-qr-target');
    var schoolEl = document.getElementById('idp-school');
    var schoolSubEl = document.getElementById('idp-sub');
    if (!idEl || !scanLabelEl || !qrTargetEl) return;

    // Badge header (live from the card editor)
    var schoolInput = document.getElementById('hero-school');
    var schoolSubInput = document.getElementById('hero-school-sub');
    if (schoolEl) schoolEl.textContent = (schoolInput && schoolInput.value) || 'Student ID';
    if (schoolSubEl) schoolSubEl.textContent = (schoolSubInput && schoolSubInput.value) || 'brokeCode05.dev';

    // Hero fields (live from the card editor)
    var idno = document.getElementById('hero-idno').value || 'IT-2024-0842';
    var qrRaw = document.getElementById('hero-qrlink').value.trim();
    var qrTarget = qrRaw;
    if (qrTarget && !/^[a-z][a-z0-9+.-]*:/i.test(qrTarget)) qrTarget = 'https://' + qrTarget;

    // Friendly brand for the scan label + QR box
    var brand = '';
    var host = '';
    if (qrTarget) {
      try {
        host = new URL(qrTarget).hostname;
      } catch (e) {
        host = qrTarget;
      }
      if (host.indexOf('github.com') > -1) brand = 'GitHub';
      else if (host.indexOf('linkedin.com') > -1) brand = 'LinkedIn';
      else if (host.indexOf('facebook.com') > -1) brand = 'Facebook';
      else if (host.indexOf('instagram.com') > -1) brand = 'Instagram';
      else if (host.indexOf('t.me') > -1 || host.indexOf('telegram') > -1) brand = 'Telegram';
      else if (host.indexOf('twitter.com') > -1 || host.indexOf('x.com') > -1) brand = 'X / Twitter';
      else brand = host.replace(/^www\./, '');
    }

    idEl.textContent = idno;
    scanLabelEl.textContent = brand ? 'Scan to connect on ' + brand : 'Scan to connect';
    qrTargetEl.textContent = brand || qrTarget || 'QR';
    if (siteLinkEl) siteLinkEl.textContent = host || 'brokeCode05.dev';
  }

  // ─── About ─────────────────────────────────
  function loadAbout() {
    var d = readData();
    document.getElementById('about-bio').value = d.about.bio || '';
    document.getElementById('about-role').value = d.about.terminal.role || '';
    document.getElementById('about-philosophy').value = d.about.terminal.philosophy || '';
    document.getElementById('about-path').value = (d.about.terminal.path || []).join(', ');
    document.getElementById('about-status').value = d.about.terminal.status || '';
  }

  document.getElementById('about-save').addEventListener('click', function () {
    if (!requireField(document.getElementById('about-bio'), 'Introduction')) return;
    var d = readData();
    d.about.bio = document.getElementById('about-bio').value;
    d.about.terminal.role = document.getElementById('about-role').value;
    d.about.terminal.philosophy = document.getElementById('about-philosophy').value;
    d.about.terminal.path = document
      .getElementById('about-path')
      .value.split(',')
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    d.about.terminal.status = document.getElementById('about-status').value;
    writeData();
    showToast('About saved!', 'success');
  });

  // ─── Tech Stack: Inline Edit/Add ────────────
  var techEditIdx = -1;
  var techAddCat = null;
  var techTempLogo = {};

  function renderTechItems() {
    var d = readData();
    var container = document.getElementById('tech-list');
    if (!d.techStack || !d.techStack.length) {
      if (techAddCat) {
        container.innerHTML = renderInlineAddForm(null, techAddCat);
        bindTechEvents();
      } else {
        container.innerHTML =
          '<div class="empty-state">No tech items yet. Click <strong>+ Add</strong> below to get started.</div>';
      }
      return;
    }

    var groups = {};
    var order = [];
    d.techStack.forEach(function (item, idx) {
      var cat = item.cat || 'Other';
      if (!groups[cat]) {
        groups[cat] = [];
        order.push(cat);
      }
      groups[cat].push({ item: item, idx: idx });
    });

    var html = '';
    order.forEach(function (cat) {
      var items = groups[cat];
      var itemsHtml = items
        .map(function (entry) {
          var item = entry.item;
          var idx = entry.idx;
          if (techEditIdx === idx) {
            return renderInlineEditRow(item, idx);
          }
          var indicator = '';
          if (item.logo) {
            indicator =
              '<img src="' +
              item.logo +
              '" style="width:22px;height:22px;object-fit:contain;border-radius:3px;margin-right:0.5rem" />';
          } else if (item.logoUrl) {
            indicator =
              '<span style="display:inline-flex;width:22px;height:22px;border-radius:3px;margin-right:0.5rem;background:var(--admin-accent);opacity:0.3;align-items:center;justify-content:center;font-size:8px;color:#0F1115;font-weight:600">URL</span>';
          } else if (item.brand) {
            indicator =
              '<span style="display:inline-flex;width:22px;height:22px;border-radius:3px;margin-right:0.5rem;background:var(--admin-accent);opacity:0.2;align-items:center;justify-content:center;font-size:9px;color:var(--admin-accent)">C</span>';
          }
          return (
            '<div class="item-row" style="padding:0.375rem 0.625rem">' +
            indicator +
            '<div class="item-row-info">' +
            '<div class="item-row-title">' +
            escapeHtml(item.name) +
            '</div>' +
            '<div class="item-row-sub">' +
            (item.brand ? escapeHtml(item.brand) : item.logoUrl ? 'URL' : 'fallback') +
            '</div>' +
            '</div>' +
            '<div class="item-row-actions">' +
            '<button class="btn btn-sm tech-edit" data-idx="' +
            idx +
            '" style="padding:0.25rem 0.5rem;font-size:0.6875rem">Edit</button>' +
            '<button class="btn btn-sm btn-danger tech-remove" data-idx="' +
            idx +
            '" style="padding:0.25rem 0.5rem;font-size:0.6875rem">×</button>' +
            '</div>' +
            '</div>'
          );
        })
        .join('');

      var addForm = '';
      if (techAddCat === cat) {
        addForm = renderInlineAddForm(null, cat);
      }

      html +=
        '<div class="tech-cat-group">' +
        '<div class="tech-cat-header">' +
        '<span class="tech-cat-name">' +
        escapeHtml(cat) +
        '</span>' +
        '<span class="tech-cat-count">' +
        items.length +
        '</span>' +
        '<button class="btn btn-sm tech-cat-add" data-cat="' +
        cat.replace(/\"/g, '&quot;') +
        '" style="margin-left:auto">+ Add</button>' +
        '</div>' +
        '<div class="tech-cat-items">' +
        itemsHtml +
        addForm +
        '</div>' +
        '</div>';
    });
    container.innerHTML = html;
    bindTechEvents();
  }

  function renderInlineEditRow(item, idx) {
    var name = escapeHtml(item.name);
    var brand = escapeHtml(item.brand || '');
    var logoUrl = escapeHtml(item.logoUrl || '');
    var logoSrc = techTempLogo[idx] || item.logo || '';
    var previewHtml = logoSrc
      ? '<div class="inline-logo-preview"><img src="' +
        logoSrc +
        '" /><button class="inline-logo-clear" data-idx="' +
        idx +
        '">×</button></div>'
      : '';
    return (
      '<div class="item-row item-row-editing" data-edit-idx="' +
      idx +
      '">' +
      '<input type="text" class="inline-edit-name" value="' +
      name +
      '" placeholder="Name" aria-label="Technology name" />' +
      '<input type="text" class="inline-edit-brand" value="' +
      brand +
      '" placeholder="Brand slug" aria-label="Brand slug" />' +
      '<input type="text" class="inline-edit-logourl" value="' +
      logoUrl +
      '" placeholder="Logo URL" aria-label="Logo URL" />' +
      '<label class="inline-upload-label" title="Upload logo">' +
      ICON_FOLDER +
      '<input type="file" class="inline-edit-upload" accept="image/*" data-idx="' +
      idx +
      '" style="display:none" /></label>' +
      previewHtml +
      '<button class="btn btn-sm btn-primary inline-save" data-idx="' +
      idx +
      '" style="flex-shrink:0">Save</button>' +
      '<button class="btn btn-sm inline-cancel" data-idx="' +
      idx +
      '" style="flex-shrink:0">Cancel</button>' +
      '</div>'
    );
  }

  function renderInlineAddForm(existingHtml, cat) {
    var formHtml =
      '<div class="item-row item-row-editing" data-add-cat="' +
      cat.replace(/\"/g, '&quot;') +
      '">' +
      '<input type="text" class="inline-add-name" placeholder="Name" aria-label="Technology name" />' +
      '<input type="text" class="inline-add-brand" placeholder="Brand slug" aria-label="Brand slug" />' +
      '<input type="text" class="inline-add-logourl" placeholder="Logo URL" aria-label="Logo URL" />' +
      '<label class="inline-upload-label" title="Upload logo">' +
      ICON_FOLDER +
      '<input type="file" class="inline-add-upload" accept="image/*" data-add="1" style="display:none" /></label>' +
      '<div class="inline-logo-preview inline-add-preview" style="display:none"><img /><button class="inline-add-clear">×</button></div>' +
      '<button class="btn btn-sm btn-primary inline-add-save" style="flex-shrink:0">Save</button>' +
      '<button class="btn btn-sm inline-add-cancel" style="flex-shrink:0">Cancel</button>' +
      '</div>';
    if (existingHtml !== null) return formHtml;
    return (
      '<div class="tech-cat-group">' +
      '<div class="tech-cat-header">' +
      '<span class="tech-cat-name">' +
      escapeHtml(cat) +
      '</span>' +
      '<span class="tech-cat-count">0</span>' +
      '<button class="btn btn-sm tech-cat-add" data-cat="' +
      cat.replace(/\"/g, '&quot;') +
      '" style="margin-left:auto">+ Add</button>' +
      '</div>' +
      '<div class="tech-cat-items">' +
      formHtml +
      '</div>' +
      '</div>'
    );
  }

  function bindTechEvents() {
    var container = document.getElementById('tech-list');
    container.querySelectorAll('.tech-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        showConfirm('Remove this item?', function (ok) {
          if (!ok) return;
          var d = readData();
          d.techStack.splice(parseInt(this.dataset.idx), 1);
          writeData();
          techEditIdx = -1;
          renderTechItems();
        });
      });
    });
    container.querySelectorAll('.tech-edit').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        techEditIdx = parseInt(this.dataset.idx);
        techAddCat = null;
        renderTechItems();
        var nameInput = container.querySelector('.inline-edit-name');
        if (nameInput) nameInput.focus();
      });
    });
    container.querySelectorAll('.inline-save').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.dataset.idx);
        var row = this.closest('.item-row-editing');
        var name = row.querySelector('.inline-edit-name').value.trim();
        if (!name) {
          showToast('Enter a name', 'error');
          return;
        }
        var d = readData();
        if (!d.techStack[idx]) return;
        d.techStack[idx].name = name;
        d.techStack[idx].brand = row.querySelector('.inline-edit-brand').value.trim().toLowerCase() || null;
        d.techStack[idx].logoUrl = row.querySelector('.inline-edit-logourl').value.trim() || null;
        if (techTempLogo[idx] !== undefined) {
          d.techStack[idx].logo = techTempLogo[idx];
        }
        writeData();
        delete techTempLogo[idx];
        techEditIdx = -1;
        renderTechItems();
        showToast('Updated!', 'success');
      });
    });
    container.querySelectorAll('.inline-cancel').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.dataset.idx);
        delete techTempLogo[idx];
        techEditIdx = -1;
        renderTechItems();
      });
    });
    container.querySelectorAll('.tech-cat-add').forEach(function (btn) {
      btn.addEventListener('click', function () {
        techAddCat = this.dataset.cat;
        techEditIdx = -1;
        renderTechItems();
        var nameInput = container.querySelector('.inline-add-name');
        if (nameInput)
          setTimeout(function () {
            nameInput.focus();
          }, 100);
      });
    });
    container.querySelectorAll('.inline-add-save').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = this.closest('.item-row-editing');
        var name = row.querySelector('.inline-add-name').value.trim();
        if (!name) {
          showToast('Enter a name', 'error');
          return;
        }
        var d = readData();
        if (!d.techStack) d.techStack = [];
        var newItem = {
          name: name,
          cat: techAddCat,
          brand: row.querySelector('.inline-add-brand').value.trim().toLowerCase() || null,
          logoUrl: row.querySelector('.inline-add-logourl').value.trim() || null,
          icon: 'code'
        };
        if (techTempLogo['new']) {
          newItem.logo = techTempLogo['new'];
        }
        d.techStack.push(newItem);
        writeData();
        delete techTempLogo['new'];
        techAddCat = null;
        renderTechItems();
        showToast('Added!', 'success');
      });
    });
    container.querySelectorAll('.inline-add-cancel').forEach(function (btn) {
      btn.addEventListener('click', function () {
        delete techTempLogo['new'];
        techAddCat = null;
        renderTechItems();
      });
    });
    container.querySelectorAll('.inline-edit-upload').forEach(function (input) {
      input.addEventListener('change', function () {
        var idx = parseInt(this.dataset.idx);
        handleInlineUpload(this, function (dataUrl) {
          techTempLogo[idx] = dataUrl;
          renderTechItems();
        });
      });
    });
    container.querySelectorAll('.inline-add-upload').forEach(function (input) {
      input.addEventListener('change', function () {
        handleInlineUpload(this, function (dataUrl) {
          techTempLogo['new'] = dataUrl;
          renderTechItems();
        });
      });
    });
    container.querySelectorAll('.inline-logo-clear').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = this.dataset.idx;
        techTempLogo[idx] = null;
        renderTechItems();
      });
    });
    container.querySelectorAll('.inline-add-clear').forEach(function (btn) {
      btn.addEventListener('click', function () {
        delete techTempLogo['new'];
        var preview = this.closest('.inline-add-preview');
        preview.style.display = 'none';
      });
    });
  }

  function handleInlineUpload(input, callback) {
    var file = input.files[0];
    if (!file) return;
    if (!validImageFile(file)) {
      input.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 64, 64);
        callback(canvas.toDataURL('image/png'));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ─── Currently ─────────────────────────────
  function loadCurrently() {
    var d = readData();
    var list = document.getElementById('currently-list');
    list.innerHTML = (d.currently || [])
      .map(function (tag) {
        return (
          '<span class="tag-item">' +
          escapeHtml(tag) +
          '<button class="tag-remove" data-tag="' +
          escapeHtml(tag) +
          '">×</button></span>'
        );
      })
      .join('');
    list.querySelectorAll('.tag-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tag = this.dataset.tag;
        var d = readData();
        d.currently = (d.currently || []).filter(function (t) {
          return t !== tag;
        });
        writeData();
        loadCurrently();
      });
    });
  }

  document.getElementById('currently-add').addEventListener('click', function () {
    var input = document.getElementById('currently-input');
    var val = input.value.trim();
    if (!val) return;
    var d = readData();
    if (!d.currently) d.currently = [];
    if (d.currently.indexOf(val) === -1) {
      d.currently.push(val);
      writeData();
      loadCurrently();
    }
    input.value = '';
  });

  document.getElementById('currently-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('currently-add').click();
  });

  document.getElementById('currently-save').addEventListener('click', function () {
    var d = readData();
    var list = document.getElementById('currently-list');
    var tags = list.querySelectorAll('.tag-item');
    d.currently = [];
    tags.forEach(function (item) {
      var btn = item.querySelector('.tag-remove');
      if (btn && btn.dataset.tag) {
        d.currently.push(btn.dataset.tag);
      }
    });
    if (!d.currently.length) {
      showToast('Add at least one currently item', 'error');
      return;
    }
    writeData();
    showToast('Currently saved!', 'success');
  });

  // ─── Projects ──────────────────────────────
  // ─── Collection manager ────────────────────
  // Projects, Certs, Experience, Learning, Contact, and FAQ share one compact
  // list: a row per item with title + meta + Edit/Remove/Reorder. Editing
  // opens the item modal, so you never face a wall of inline forms. Per-item
  // saves persist immediately (writeData) and return you to the list.
  var MANAGERS = {
    projects: {
      key: 'projects',
      container: 'projects-list',
      count: 'projects-count',
      empty: 'No projects yet. Click + Add Project to create your first one.',
      title: function (p) {
        return p.title || 'Untitled';
      },
      sub: function (p) {
        var parts = [p.category || 'Uncategorized'];
        if (p.tags && p.tags.length) parts.push(p.tags.join(', '));
        return parts.join(' · ');
      },
      badge: function (p) {
        return (
          '<span class="admin-badge ' +
          (p.status === 'draft' ? 'is-draft' : 'is-live') +
          '">' +
          (p.status === 'draft' ? 'Draft' : 'Published') +
          '</span>'
        );
      }
    },
    certs: {
      key: 'certifications',
      container: 'certs-list',
      count: 'certs-count',
      empty: 'No certificates yet. Click + Add Certificate.',
      title: function (c) {
        return c.name || 'Untitled';
      },
      sub: function (c) {
        return [c.issuer || '', c.date || ''].filter(Boolean).join(' · ');
      }
    },
    experience: {
      key: 'experience',
      container: 'experience-list',
      count: 'experience-count',
      empty: 'No experience entries yet. Click + Add Experience.',
      title: function (x) {
        return (x.role || 'Role') + (x.company ? ' @ ' + x.company : '');
      },
      sub: function (x) {
        return x.date || '';
      }
    },
    learning: {
      key: 'learning',
      container: 'learning-list',
      count: 'learning-count',
      empty: 'No milestones yet. Click + Add Milestone.',
      title: function (l) {
        return (l.year ? l.year + ' — ' : '') + (l.title || 'Untitled');
      },
      sub: function (l) {
        return String(l.description || '').slice(0, 90);
      }
    },
    'contact-links': {
      key: 'contactLinks',
      container: 'contact-links-list',
      count: 'contact-links-count',
      empty: 'Email and GitHub show by default until you add your own links.',
      title: function (l) {
        return l.label || 'New Link';
      },
      sub: function (l) {
        return l.value || l.url || '';
      }
    },
    faq: {
      key: 'chatFaq',
      container: 'faq-list',
      count: 'faq-count',
      empty: 'No custom FAQ entries yet. Add one to give the chatbot answers you control.',
      title: function (f) {
        return (
          String(f.keywords || '')
            .split(',')[0]
            .trim() || 'Untitled FAQ'
        );
      },
      sub: function (f) {
        return String(f.answer || '').slice(0, 90);
      }
    }
  };

  // 6-dot grip handle for drag reordering (replaces the old up/down buttons).
  var DRAG_GRIP_SVG =
    '<svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="2" r="1.2"/><circle cx="9" cy="2" r="1.2"/><circle cx="3" cy="8" r="1.2"/><circle cx="9" cy="8" r="1.2"/><circle cx="3" cy="14" r="1.2"/><circle cx="9" cy="14" r="1.2"/></svg>';

  function renderManager(name) {
    var cfg = MANAGERS[name];
    var d = readData();
    var list = d[cfg.key] || [];
    var container = document.getElementById(cfg.container);
    if (!container) return;
    var countEl = cfg.count ? document.getElementById(cfg.count) : null;
    if (countEl) countEl.textContent = list.length;
    if (!list.length) {
      container.innerHTML = '<div class="empty-state">' + cfg.empty + '</div>';
      return;
    }
    container.innerHTML = list
      .map(function (item, idx) {
        return (
          '<div class="admin-row">' +
          '<span class="drag-handle" title="Drag to reorder" aria-hidden="true">' +
          DRAG_GRIP_SVG +
          '</span>' +
          '<div class="admin-row-main">' +
          '<div class="admin-row-title">' +
          escapeHtml(cfg.title(item)) +
          '</div>' +
          (cfg.sub ? '<div class="admin-row-sub">' + escapeHtml(cfg.sub(item)) + '</div>' : '') +
          (cfg.badge ? cfg.badge(item) : '') +
          '</div>' +
          '<div class="admin-row-actions">' +
          // Touch/keyboard fallback — hidden on desktop (drag handles win there),
          // shown on touch devices and when a row is focused via the keyboard.
          '<button class="reorder-btn touch-reorder ' +
          name +
          '-up" data-idx="' +
          idx +
          '"' +
          (idx === 0 ? ' disabled' : '') +
          ' title="Move up" aria-label="Move up">↑</button>' +
          '<button class="reorder-btn touch-reorder ' +
          name +
          '-down" data-idx="' +
          idx +
          '"' +
          (idx === list.length - 1 ? ' disabled' : '') +
          ' title="Move down" aria-label="Move down">↓</button>' +
          '<button class="btn btn-sm ' +
          name +
          '-edit" data-idx="' +
          idx +
          '">Edit</button>' +
          '<button class="btn btn-sm btn-danger ' +
          name +
          '-remove" data-idx="' +
          idx +
          '" title="Remove">×</button>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');
    // Re-apply the live projects filter after a re-render (drag/edit/remove).
    if (name === 'projects') applyProjectsFilter();
  }

  function adminRenderProjects() {
    renderManager('projects');
  }

  // Re-render a manager list after an edit, keeping the ID-back preview in
  // sync for contact links.
  function renderAfter(name) {
    renderManager(name);
    if (name === 'contact-links') updateIdPreview();
  }

  // Delegated Edit / Remove / Reorder for every manager (no per-item binding).
  var MANAGER_CONTAINERS = {
    'projects-list': 'projects',
    'certs-list': 'certs',
    'experience-list': 'experience',
    'learning-list': 'learning',
    'contact-links-list': 'contact-links',
    'faq-list': 'faq'
  };
  Object.keys(MANAGER_CONTAINERS).forEach(function (cid) {
    var container = document.getElementById(cid);
    if (!container) return;
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-idx]');
      if (!btn) return;
      var name = MANAGER_CONTAINERS[cid];
      var cfg = MANAGERS[name];
      var idx = parseInt(btn.dataset.idx, 10);
      if (btn.classList.contains(name + '-edit')) {
        openItemModal(name, idx);
        return;
      }
      if (btn.classList.contains(name + '-remove')) {
        showConfirm('Remove this item?', function (ok) {
          if (!ok) return;
          var d = readData();
          var removed = d[cfg.key][idx];
          d[cfg.key].splice(idx, 1);
          writeData();
          renderAfter(name);
          showToast(
            'Item removed',
            'success',
            'Undo',
            function () {
              var d2 = readData();
              if (removed !== undefined && idx <= d2[cfg.key].length) {
                d2[cfg.key].splice(idx, 0, removed);
                writeData();
                renderAfter(name);
              }
            },
            6000
          );
        });
        return;
      }
      var up = btn.classList.contains(name + '-up');
      var down = btn.classList.contains(name + '-down');
      if (up || down) {
        var list = readData()[cfg.key];
        var to = up ? idx - 1 : idx + 1;
        if (to < 0 || to >= list.length) return;
        var tmp = list[idx];
        list[idx] = list[to];
        list[to] = tmp;
        writeData();
        renderAfter(name);
        return;
      }
    });

    // Pointer-based drag reordering — works with mouse, pen, and touch in every
    // browser (native HTML5 drag/drop is unreliable for list reordering). Drag
    // any row; the top half of a row = place before, bottom half = after. Drops
    // land on rows AND the gaps between them. A 5px movement threshold keeps
    // ordinary clicks untouched. Touch needs a ~300ms hold to arm the drag so
    // swiping still scrolls the list; the scroll lock (touch-action: none on
    // the container) is applied when the drag arms and removed on release.
    var dragState = { from: -1, to: -1, row: null, moved: false, sx: 0, sy: 0, pid: null, timer: null };
    function clearDragMarks() {
      container.querySelectorAll('.admin-row').forEach(function (r) {
        r.classList.remove('dragging', 'drag-before', 'drag-after');
      });
    }
    container.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (e.target.closest('button, a, input, select, textarea')) return;
      var row = e.target.closest('.admin-row');
      if (!row) return;
      var idx = Array.prototype.indexOf.call(container.children, row);
      if (idx < 0) return;
      e.preventDefault();
      clearDragMarks();
      dragState.from = idx;
      dragState.to = -1;
      dragState.moved = false;
      dragState.sx = e.clientX;
      dragState.sy = e.clientY;
      dragState.row = row;
      dragState.pid = e.pointerId;
      // Defensive: never let a stale scroll lock linger from an interrupted
      // gesture (it is normally removed on pointerup/pointercancel).
      container.classList.remove('drag-active');
      // Touch: a quick swipe should keep scrolling the list, so a drag only
      // arms after a short hold (the standard mobile reorder gesture). The
      // scroll lock is applied at that moment — before the finger moves — so
      // the browser never turns the drag into a pan.
      if (dragState.timer) {
        clearTimeout(dragState.timer);
        dragState.timer = null;
      }
      if (e.pointerType === 'touch') {
        dragState.timer = setTimeout(function () {
          dragState.timer = null;
          dragState.moved = true;
          container.classList.add('drag-active');
          if (dragState.row) dragState.row.classList.add('dragging');
          if (dragState.pid !== null && container.setPointerCapture) {
            try {
              container.setPointerCapture(dragState.pid);
            } catch (err) {}
          }
        }, 300);
      }
    });
    container.addEventListener('pointermove', function (e) {
      if (dragState.from < 0) return;
      // Touch: movement before the hold completes means the user is scrolling —
      // abandon the pending hold and hand the gesture back to the browser.
      if (dragState.timer) {
        if (Math.abs(e.clientX - dragState.sx) + Math.abs(e.clientY - dragState.sy) >= 5) {
          clearTimeout(dragState.timer);
          dragState.timer = null;
          dragState.from = -1;
          dragState.pid = null;
          dragState.row = null;
        }
        return;
      }
      if (!dragState.moved && Math.abs(e.clientX - dragState.sx) + Math.abs(e.clientY - dragState.sy) < 5)
        return;
      if (!dragState.moved) {
        dragState.moved = true;
        if (dragState.row) dragState.row.classList.add('dragging');
        if (dragState.pid !== null && container.setPointerCapture) {
          try {
            container.setPointerCapture(dragState.pid);
          } catch (err) {}
        }
      }
      // Stop the browser from panning while the row is in motion (also keeps
      // touch drags reliable — pointer capture + preventDefault win the gesture).
      e.preventDefault();
      var rows = container.querySelectorAll('.admin-row');
      var cRect = container.getBoundingClientRect();
      if (!rows.length || e.clientY < cRect.top || e.clientY > cRect.bottom) {
        dragState.to = -1;
        clearDragMarks();
        return;
      }
      // Nearest visible row decides the insertion point (works on rows AND gaps).
      var best = 0,
        bestDist = Infinity;
      for (var i = 0; i < rows.length; i++) {
        var rc = rows[i].getBoundingClientRect();
        var d = Math.abs(e.clientY - (rc.top + rc.height / 2));
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      var bRect = rows[best].getBoundingClientRect();
      var before = e.clientY < bRect.top + bRect.height / 2;
      // Map to the real children index so hidden (filtered) rows keep order.
      var realIdx = Array.prototype.indexOf.call(container.children, rows[best]);
      dragState.to = realIdx + (before ? 0 : 1);
      clearDragMarks();
      rows[best].classList.add(before ? 'drag-before' : 'drag-after');
    });
    container.addEventListener('pointerup', function (e) {
      var from = dragState.from;
      var to = dragState.to;
      var moved = dragState.moved;
      dragState.from = -1;
      dragState.to = -1;
      dragState.row = null;
      dragState.moved = false;
      dragState.pid = null;
      if (dragState.timer) {
        clearTimeout(dragState.timer);
        dragState.timer = null;
      }
      clearDragMarks();
      container.classList.remove('drag-active');
      if (container.releasePointerCapture) {
        try {
          container.releasePointerCapture(e.pointerId);
        } catch (err) {}
      }
      if (!moved || to < 0) return;
      try {
        var list = readData()[cfg.key] || [];
        if (
          from >= 0 &&
          from < list.length &&
          to >= 0 &&
          to <= list.length &&
          from !== to &&
          to - 1 !== from
        ) {
          var item = list.splice(from, 1)[0];
          list.splice(to > from ? to - 1 : to, 0, item);
          writeData();
        }
      } catch (err) {}
      renderAfter(name);
    });
    container.addEventListener('pointercancel', function () {
      dragState.from = -1;
      dragState.to = -1;
      dragState.row = null;
      dragState.moved = false;
      dragState.pid = null;
      if (dragState.timer) {
        clearTimeout(dragState.timer);
        dragState.timer = null;
      }
      clearDragMarks();
      container.classList.remove('drag-active');
    });
    // Fallback cleanup for browsers without pointer capture: a release outside
    // the container never reaches the container's pointerup, so reset here.
    window.addEventListener('pointerup', function (e) {
      if (dragState.from >= 0 && (dragState.pid === null || e.pointerId === dragState.pid)) {
        dragState.from = -1;
        dragState.to = -1;
        dragState.row = null;
        dragState.moved = false;
        dragState.pid = null;
        if (dragState.timer) {
          clearTimeout(dragState.timer);
          dragState.timer = null;
        }
        clearDragMarks();
        container.classList.remove('drag-active');
      }
    });
    window.addEventListener('pointercancel', function (e) {
      if (dragState.from >= 0 && (dragState.pid === null || e.pointerId === dragState.pid)) {
        dragState.from = -1;
        dragState.to = -1;
        dragState.row = null;
        dragState.moved = false;
        dragState.pid = null;
        if (dragState.timer) {
          clearTimeout(dragState.timer);
          dragState.timer = null;
        }
        clearDragMarks();
        container.classList.remove('drag-active');
      }
    });
  });

  // ─── Item editor modal ────────────────────
  var ITEM_KEYS = {
    projects: 'projects',
    certs: 'certifications',
    experience: 'experience',
    learning: 'learning',
    'contact-links': 'contactLinks',
    faq: 'chatFaq'
  };
  var ITEM_TITLES = {
    projects: 'Project',
    certs: 'Certificate',
    experience: 'Experience',
    learning: 'Milestone',
    'contact-links': 'Contact Method',
    faq: 'FAQ Entry'
  };
  var itemModalType = null;
  var itemModalIndex = -1;
  var certModalPath = '';

  function imVal(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function itemModalFields(name, item) {
    var e = escapeHtml;
    if (name === 'projects') {
      var statusOpts =
        '<option value="published"' +
        (item.status !== 'draft' ? ' selected' : '') +
        '>Published</option>' +
        '<option value="draft"' +
        (item.status === 'draft' ? ' selected' : '') +
        '>Draft</option>';
      return (
        '<div class="form-group"><label for="im-title">Project Name</label><input type="text" id="im-title" value="' +
        e(item.title || '') +
        '" /></div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label for="im-category">Category</label><input type="text" id="im-category" value="' +
        e(item.category || '') +
        '" placeholder="e.g. Web App" /></div>' +
        '<div class="form-group"><label for="im-status">Status</label><select id="im-status">' +
        statusOpts +
        '</select></div>' +
        '</div>' +
        '<div class="form-group"><label for="im-desc">Short Description</label><textarea id="im-desc" rows="3">' +
        e(item.description || '') +
        '</textarea></div>' +
        '<div class="form-group"><label for="im-tags">Technologies (comma separated)</label><input type="text" id="im-tags" value="' +
        e((item.tags || []).join(', ')) +
        '" placeholder="HTML, CSS, JavaScript" /></div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label for="im-live">Live URL</label><input type="text" id="im-live" value="' +
        e((item.links && item.links.live) || '') +
        '" placeholder="https://…" /><p class="form-hint" style="margin-top:0.25rem">Full link incl. https:// — shown as the live demo button.</p></div>' +
        '<div class="form-group"><label for="im-repo">GitHub URL</label><input type="text" id="im-repo" value="' +
        e((item.links && item.links.repo) || '') +
        '" placeholder="https://github.com/…" /><p class="form-hint" style="margin-top:0.25rem">Full link incl. https:// — shown as the repo button.</p></div>' +
        '</div>'
      );
    }
    if (name === 'certs') {
      var imgHtml = certModalPath
        ? '<img src="' +
          e(certModalPath) +
          '" style="max-width:140px;max-height:80px;border-radius:4px;object-fit:cover" alt="Certificate preview" />' +
          '<button type="button" class="btn btn-sm" id="cert-modal-clear" style="padding:2px 6px;font-size:10px">× Remove</button>'
        : '<span class="form-hint" style="margin:0">No image yet.</span>';
      return (
        '<div class="form-group"><label for="im-name">Certificate Name</label><input type="text" id="im-name" value="' +
        e(item.name || '') +
        '" /></div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label for="im-issuer">Issuer</label><input type="text" id="im-issuer" value="' +
        e(item.issuer || '') +
        '" /></div>' +
        '<div class="form-group"><label for="im-date">Date</label><input type="text" id="im-date" value="' +
        e(item.date || '') +
        '" placeholder="2026" /></div>' +
        '</div>' +
        '<div class="form-group"><label>Certificate Image</label>' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
        '<label class="btn btn-sm" style="cursor:pointer;flex-shrink:0">' +
        ICON_FOLDER +
        ' Upload<input type="file" id="cert-modal-upload" accept="image/*" style="display:none" /></label>' +
        '<div id="cert-modal-preview" style="display:flex;align-items:center;gap:8px">' +
        imgHtml +
        '</div>' +
        '</div>' +
        '</div>'
      );
    }
    if (name === 'experience') {
      return (
        '<div class="form-row">' +
        '<div class="form-group"><label for="im-role">Role</label><input type="text" id="im-role" value="' +
        e(item.role || '') +
        '" /></div>' +
        '<div class="form-group"><label for="im-company">Company / Organization</label><input type="text" id="im-company" value="' +
        e(item.company || '') +
        '" /></div>' +
        '</div>' +
        '<div class="form-group"><label for="im-date">Date / Period</label><input type="text" id="im-date" value="' +
        e(item.date || '') +
        '" placeholder="2024 — Present" /></div>' +
        '<div class="form-group"><label for="im-bullets">Bullet Points (one per line)</label>' +
        '<textarea id="im-bullets" rows="5" placeholder="Built the landing page&#10;Fixed 12 bugs">' +
        e((item.bullets || []).join('\n')) +
        '</textarea></div>'
      );
    }
    if (name === 'learning') {
      return (
        '<div class="form-row">' +
        '<div class="form-group"><label for="im-year">Year</label><input type="text" id="im-year" value="' +
        e(item.year || '') +
        '" /></div>' +
        '<div class="form-group"><label for="im-title">Title</label><input type="text" id="im-title" value="' +
        e(item.title || '') +
        '" /></div>' +
        '</div>' +
        '<div class="form-group"><label for="im-desc">Description</label><textarea id="im-desc" rows="4">' +
        e(item.description || '') +
        '</textarea></div>'
      );
    }
    if (name === 'contact-links') {
      var iconOpts = ['email', 'github', 'linkedin', 'generic']
        .map(function (i) {
          return (
            '<option value="' +
            i +
            '"' +
            (item.icon === i ? ' selected' : '') +
            '>' +
            i.charAt(0).toUpperCase() +
            i.slice(1) +
            '</option>'
          );
        })
        .join('');
      return (
        '<div class="form-row">' +
        '<div class="form-group"><label for="im-label">Label</label><input type="text" id="im-label" value="' +
        e(item.label || '') +
        '" placeholder="LinkedIn" /></div>' +
        '<div class="form-group"><label for="im-icon">Icon</label><select id="im-icon">' +
        iconOpts +
        '</select></div>' +
        '</div>' +
        '<div class="form-group"><label for="im-value">Display Text</label><input type="text" id="im-value" value="' +
        e(item.value || '') +
        '" placeholder="linkedin.com/in/username" /></div>' +
        '<div class="form-group"><label for="im-url">URL</label><input type="text" id="im-url" value="' +
        e(item.url || '') +
        '" placeholder="https://linkedin.com/in/username" /><p class="form-hint" style="margin-top:0.25rem">Full link incl. https:// (mailto: works for email).</p></div>'
      );
    }
    if (name === 'faq') {
      return (
        '<div class="form-group"><label for="im-topic">Topic (optional — shown in Chat Insights)</label><input type="text" id="im-topic" value="' +
        e(item.topic || '') +
        '" placeholder="e.g. pricing" /></div>' +
        '<div class="form-group"><label for="im-keywords">Keywords (comma-separated)</label><input type="text" id="im-keywords" value="' +
        e(item.keywords || '') +
        '" placeholder="price, cost, how much" /></div>' +
        '<div class="form-group"><label for="im-answer">Answer</label><textarea id="im-answer" rows="5">' +
        e(item.answer || '') +
        '</textarea></div>'
      );
    }
    return '';
  }

  function openItemModal(name, idx) {
    var d = readData();
    var item = (d[ITEM_KEYS[name]] || [])[idx];
    if (!item) return;
    itemModalType = name;
    itemModalIndex = idx;
    certModalPath = item.path || '';
    document.getElementById('item-modal-title').textContent = 'Edit ' + ITEM_TITLES[name];
    document.getElementById('item-modal-body').innerHTML = itemModalFields(name, item);
    if (name === 'certs') bindCertModalUpload();
    var backdrop = document.getElementById('item-modal-backdrop');
    if (!backdrop) return;
    backdrop.hidden = false;
    document.body.classList.add('modal-open');
    var first = backdrop.querySelector('input[type="text"], textarea, select');
    if (first) first.focus();
  }

  function closeItemModal() {
    var backdrop = document.getElementById('item-modal-backdrop');
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove('modal-open');
    itemModalType = null;
    itemModalIndex = -1;
  }

  function saveItemModal() {
    if (itemModalType === null) return;
    var d = readData();
    var list = d[ITEM_KEYS[itemModalType]];
    var item = list[itemModalIndex];
    if (!item) {
      closeItemModal();
      return;
    }
    if (itemModalType === 'projects') {
      if (!requireField(document.getElementById('im-title'), 'Project name')) return;
      item.title = imVal('im-title');
      item.category = imVal('im-category') || 'Uncategorized';
      item.status = imVal('im-status') || 'published';
      item.description = imVal('im-desc');
      item.tags = imVal('im-tags')
        .split(',')
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      if (!item.links) item.links = {};
      item.links.live = imVal('im-live');
      item.links.repo = imVal('im-repo');
    } else if (itemModalType === 'certs') {
      if (!requireField(document.getElementById('im-name'), 'Certificate name')) return;
      item.name = imVal('im-name');
      item.issuer = imVal('im-issuer');
      item.date = imVal('im-date');
      item.path = certModalPath;
    } else if (itemModalType === 'experience') {
      if (
        !requireField(document.getElementById('im-role'), 'Role') ||
        !requireField(document.getElementById('im-company'), 'Company / Organization')
      )
        return;
      item.role = imVal('im-role');
      item.company = imVal('im-company');
      item.date = imVal('im-date');
      item.bullets = imVal('im-bullets')
        .split('\n')
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
    } else if (itemModalType === 'learning') {
      if (
        !requireField(document.getElementById('im-year'), 'Year') ||
        !requireField(document.getElementById('im-title'), 'Title')
      )
        return;
      item.year = imVal('im-year');
      item.title = imVal('im-title');
      item.description = imVal('im-desc');
    } else if (itemModalType === 'contact-links') {
      if (
        !requireField(document.getElementById('im-label'), 'Label') ||
        !requireField(document.getElementById('im-url'), 'URL')
      )
        return;
      item.label = imVal('im-label');
      item.value = imVal('im-value');
      item.url = imVal('im-url');
      item.icon = imVal('im-icon') || 'generic';
    } else if (itemModalType === 'faq') {
      if (!requireField(document.getElementById('im-answer'), 'Answer')) return;
      item.topic = imVal('im-topic');
      item.keywords = imVal('im-keywords');
      item.answer = imVal('im-answer');
    }
    writeData();
    renderAfter(itemModalType);
    closeItemModal();
    showToast(ITEM_TITLES[itemModalType] + ' saved', 'success');
  }

  function bindCertModalUpload() {
    var input = document.getElementById('cert-modal-upload');
    if (!input) return;
    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) return;
      if (!validImageFile(file)) {
        input.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var MAX = 1200;
          var w = img.width,
            h = img.height;
          // Always re-encode through canvas so even small-but-heavy PNGs
          // get compressed (keeps localStorage + cloud payloads lean).
          var ratio = Math.min(1, MAX / w, MAX / h);
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(w * ratio);
          canvas.height = Math.round(h * ratio);
          var ctx = canvas.getContext('2d');
          // White fill first so transparent PNG areas don't render black in JPEG
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          certModalPath = canvas.toDataURL('image/jpeg', 0.85);
          var preview = document.getElementById('cert-modal-preview');
          if (preview) {
            preview.innerHTML =
              '<img src="' +
              certModalPath +
              '" style="max-width:140px;max-height:80px;border-radius:4px;object-fit:cover" alt="Certificate preview" />' +
              '<button type="button" class="btn btn-sm" id="cert-modal-clear" style="padding:2px 6px;font-size:10px">× Remove</button>';
            var clearBtn = preview.querySelector('#cert-modal-clear');
            if (clearBtn)
              clearBtn.addEventListener('click', function () {
                certModalPath = '';
                preview.innerHTML = '<span class="form-hint" style="margin:0">No image yet.</span>';
                input.value = '';
              });
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  (function bindItemModal() {
    var backdrop = document.getElementById('item-modal-backdrop');
    if (!backdrop) return;
    var closeBtn = document.getElementById('item-modal-close');
    var cancelBtn = document.getElementById('item-modal-cancel');
    var saveBtn = document.getElementById('item-modal-save');
    if (closeBtn) closeBtn.addEventListener('click', closeItemModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeItemModal);
    if (saveBtn) saveBtn.addEventListener('click', saveItemModal);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeItemModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !backdrop.hidden) closeItemModal();
      else if (e.key === 'Tab' && !backdrop.hidden && window.trapFocus) window.trapFocus(e, backdrop);
    });
  })();

  // Live filter for the projects manager (title / category / tags / status).
  // Named so renderManager can re-apply it after every re-render.
  function applyProjectsFilter() {
    var input = document.getElementById('projects-search');
    if (!input || !input.value) return;
    var q = input.value.toLowerCase().trim();
    document.querySelectorAll('#projects-list .admin-row').forEach(function (row) {
      row.style.display = !q || row.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
    });
  }
  var projectsSearchEl = document.getElementById('projects-search');
  if (projectsSearchEl) {
    projectsSearchEl.addEventListener('input', applyProjectsFilter);
  }

  document.getElementById('projects-add').addEventListener('click', function () {
    var d = readData();
    if (!d.projects) d.projects = [];
    d.projects.push({
      id: 'proj-' + Date.now(),
      title: 'New Project',
      description: '',
      category: 'Uncategorized',
      status: 'published',
      tags: [],
      links: { live: '', repo: '' }
    });
    writeData();
    renderManager('projects');
    openItemModal('projects', d.projects.length - 1);
  });

  // ─── Certs ─────────────────────────────────
  function adminRenderCerts() {
    renderManager('certs');
  }

  document.getElementById('certs-add').addEventListener('click', function () {
    var d = readData();
    if (!d.certifications) d.certifications = [];
    d.certifications.push({
      id: 'cert-' + Date.now(),
      name: 'New Certificate',
      issuer: 'Issuer',
      date: '2026',
      path: ''
    });
    writeData();
    renderManager('certs');
    openItemModal('certs', d.certifications.length - 1);
  });

  // ─── Experience ────────────────────────────
  function adminRenderExperience() {
    renderManager('experience');
  }

  document.getElementById('experience-add').addEventListener('click', function () {
    var d = readData();
    if (!d.experience) d.experience = [];
    d.experience.push({
      id: 'exp-' + Date.now(),
      role: 'New Role',
      company: 'Company Name',
      date: '2026',
      bullets: ['New bullet point']
    });
    writeData();
    renderManager('experience');
    openItemModal('experience', d.experience.length - 1);
  });

  // ─── Learning Journey ────────────────────
  function renderLearningMilestones() {
    renderManager('learning');
  }

  document.getElementById('learning-add').addEventListener('click', function () {
    var d = readData();
    if (!d.learning) d.learning = [];
    d.learning.push({ year: '2026', title: 'New Milestone', description: 'Description of what I learned.' });
    writeData();
    renderManager('learning');
    openItemModal('learning', d.learning.length - 1);
  });

  // ─── Direct Contact Links ─────────────────
  function renderContactLinksList() {
    renderManager('contact-links');
    updateIdPreview();
  }

  document.getElementById('contact-links-add').addEventListener('click', function () {
    var d = readData();
    if (!d.contactLinks) d.contactLinks = [];
    // Seed the Email/GitHub defaults on first add so they are never lost
    if (!d.contactLinks.length) {
      d.contactLinks = DEFAULT_CONTACT_LINKS.map(function (l) {
        return { label: l.label, value: l.value, url: l.url, icon: l.icon };
      });
    }
    d.contactLinks.push({
      label: 'LinkedIn',
      value: 'linkedin.com/in/username',
      url: 'https://linkedin.com/in/username',
      icon: 'linkedin'
    });
    writeData();
    renderManager('contact-links');
    openItemModal('contact-links', d.contactLinks.length - 1);
  });

  // ─── JSON Export/Import ────────────────────
  document.getElementById('admin-export-btn').addEventListener('click', function () {
    exportDataJSON();
    showToast('Data exported!', 'success');
  });

  document.getElementById('admin-import-input').addEventListener('change', function () {
    if (this.files && this.files[0]) {
      importDataJSON(this.files[0], function (err, importedData) {
        if (err) {
          showToast(err, 'error');
          return;
        }
        data = importedData;
        showToast('Data imported! Reloading...', 'success');
        setTimeout(function () {
          location.reload();
        }, 1000);
      });
    }
    this.value = '';
  });

  // ─── Reset ─────────────────────────────────
  document.getElementById('admin-reset-btn').addEventListener('click', function () {
    showConfirm('Reset all portfolio data to defaults? This cannot be undone.', function (ok) {
      if (!ok) return;
      showConfirm('Are you sure? All your custom edits will be lost.', function (ok) {
        if (!ok) return;
        resetPortfolioData();
        data = loadData();
        location.reload();
      });
    });
  });

  // ─── Cloud Sync Functions ──────────────────
  function updateCloudStatus() {
    var icon = document.getElementById('cloud-status-icon');
    var text = document.getElementById('cloud-status-text');
    var savedPw = getAdminPassword();
    if (!savedPw || savedPw === 'admin123') {
      icon.innerHTML = ICON_WARN;
      text.textContent = 'Set a Cloud Sync Password above to enable cloud publishing.';
      text.style.color = 'var(--admin-warning)';
    } else {
      icon.innerHTML = ICON_LOCK;
      text.textContent = 'Password set. Ready to sync.';
      text.style.color = 'var(--admin-accent)';
    }
  }

  function autoPushToCloud() {
    var pw = getAdminPassword();
    if (!pw || pw === 'admin123') return;
    pushToSupabase(data).then(function (ok) {
      if (ok) {
        showToast('Synced to cloud!', 'success');
        document.getElementById('cloud-status-icon').innerHTML = ICON_CHECK;
        document.getElementById('cloud-status-text').textContent =
          'Last synced: ' + new Date().toLocaleTimeString();
        document.getElementById('cloud-status-text').style.color = 'var(--admin-accent)';
      }
    });
  }

  document.getElementById('cloud-publish-btn').addEventListener('click', function () {
    readData();
    pushToSupabase(data).then(function (ok) {
      if (ok) {
        showToast('Published to cloud!', 'success');
        document.getElementById('cloud-status-icon').innerHTML = ICON_CHECK;
        document.getElementById('cloud-status-text').textContent =
          'Published: ' + new Date().toLocaleTimeString();
        document.getElementById('cloud-status-text').style.color = 'var(--admin-accent)';
      } else {
        showToast('Failed to publish. Did you set the Cloud Sync Password and run the SQL setup?', 'error');
      }
    });
  });

  document.getElementById('cloud-fetch-btn').addEventListener('click', function () {
    showToast('⏳ Fetching from cloud...', '');
    fetchFromSupabase()
      .then(function (result) {
        if (!result || !result.ok) {
          showToast(
            'Failed to fetch from cloud' +
              (result && result.error ? ': ' + result.error : '. Check your connection.'),
            'error'
          );
          return;
        }
        var cloudData = result.data;
        if (cloudData && Object.keys(cloudData).length > 1) {
          savePortfolioData(cloudData);
          showToast('Cloud data loaded! Reloading...', 'success');
          setTimeout(function () {
            location.reload();
          }, 1000);
        } else {
          showToast('No cloud data found. Publish first.', 'error');
        }
      })
      .catch(function () {
        showToast('Failed to fetch from cloud.', 'error');
      });
  });

  // ─── Init ──────────────────────────────────
  function initDashboard() {
    loadHero();
    loadAbout();
    updateIdPreview();
    renderTechItems();
    loadCurrently();
    adminRenderProjects();
    adminRenderCerts();
    adminRenderExperience();
    renderLearningMilestones();
    renderContactLinksList();
    updateIdPreview();
    renderFaqList();
    updateCloudStatus();
    updateSidebarCounts();
    loadMessages();
    loadChatInsights();
    renderDashboard();
    bindDashboardActions();
    bindChatTest();
    bindSidebar();
    updateStatusBar('saved');
  }

  // ─── Auto sign in check ────────────────────
  checkSession();
})();
