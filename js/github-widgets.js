    (function(){
      var GH_USER = 'brokeCode05';

      var ghImages = {
        streak: {
          dark: 'https://github-readme-streak-stats-eight.vercel.app/?user=' + GH_USER + '&hide_border=true&background=171A21&stroke=2B313D&ring=4ADE80&fire=4ADE80&currStreakNum=F5F7FA&sideNums=A7B0BE&currStreakLabel=4ADE80&sideLabels=A7B0BE&dates=A7B0BE',
          light: 'https://github-readme-streak-stats-eight.vercel.app/?user=' + GH_USER + '&hide_border=true&background=FFFFFF&stroke=E5E7EB&ring=047857&fire=047857&currStreakNum=1A1D23&sideNums=6B7280&currStreakLabel=047857&sideLabels=6B7280&dates=6B7280'
        },
        graph: {
          dark: 'https://github-readme-activity-graph.vercel.app/graph?username=' + GH_USER + '&theme=react-dark&hide_border=true&bg_color=171A21&color=4ADE80&line=4ADE80&point=2DA05A&area=true',
          light: 'https://github-readme-activity-graph.vercel.app/graph?username=' + GH_USER + '&hide_border=true&bg_color=FFFFFF&color=047857&line=047857&point=047857&area=true'
        }
      };

      // ---- GitHub Stats (repos, followers, stars) via API ----
      function getGitHubAuthHeaders() {
        var token = '';
        try { token = localStorage.getItem('portfolio_github_token') || ''; } catch(e) {}
        if (token) {
          console.log('[github] Using authenticated requests (token length: ' + token.length + ')');
          return { 'Authorization': 'Bearer ' + token };
        }
        return {};
      }

      function fetchGitHubStats() {
        var headers = getGitHubAuthHeaders();
        var userUrl = 'https://api.github.com/users/' + GH_USER;
        var reposUrl = 'https://api.github.com/users/' + GH_USER + '/repos?per_page=100&page=1';
        var CACHE_KEY = 'portfolio_gh_stats';
        var CACHE_TTL = 60 * 60 * 1000; // 1 hour — saves the unauthenticated rate budget

        function setNote(text) {
          var note = document.getElementById('gh-stats-note');
          if (note) note.textContent = text;
        }

        function fillStats(user, repos) {
          var el;
          if (user && typeof user.public_repos === 'number') {
            el = document.getElementById('gh-repos');
            if (el) el.textContent = user.public_repos;
            el = document.getElementById('gh-followers');
            if (el) el.textContent = user.followers;
            el = document.getElementById('gh-following');
            if (el) el.textContent = user.following;
          }
          if (Array.isArray(repos)) {
            var totalStars = 0;
            repos.forEach(function(repo) { totalStars += repo.stargazers_count || 0; });
            el = document.getElementById('gh-stars');
            if (el) el.textContent = totalStars;
          }
        }

        function saveCache(user, repos) {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              t: Date.now(),
              user: user || null,
              repos: repos || null
            }));
          } catch (e) {}
        }

        // Serve a fresh cache instantly — no em-dash flash, no extra API call.
        var cached = null;
        try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) {}
        if (cached && cached.user) fillStats(cached.user, cached.repos);

        // Fresh cache within the TTL: skip the network entirely and keep the
        // unauthenticated rate budget (60 req/hr) for when it actually matters.
        if (cached && cached.user && cached.t && (Date.now() - cached.t) < CACHE_TTL) {
          return;
        }

        var userFailed = false;
        var reposFailed = false;

        var p1 = fetch(userUrl, { headers: headers })
          .then(function(r) { return r.json(); })
          .then(function(user) {
            if (user && user.message) { userFailed = true; return; } // 404 / rate-limited
            fillStats(user, null);
            saveCache(user, null);
          })
          .catch(function() { userFailed = true; });

        var p2 = fetch(reposUrl, { headers: headers })
          .then(function(r) { return r.json(); })
          .then(function(repos) {
            if (!Array.isArray(repos)) { reposFailed = true; return; }
            fillStats(null, repos);
            saveCache(null, repos);
          })
          .catch(function() { reposFailed = true; });

        // Honest fallback: never leave the tiles silently empty.
        Promise.all([p1, p2]).then(function() {
          if (userFailed || reposFailed) {
            setNote(cached && cached.user
              ? '// github API unavailable — showing cached stats'
              : '// github API unavailable — refresh to retry');
          } else {
            setNote('');
          }
        });
      }

      function displayGitHub() {
        var theme = document.documentElement.getAttribute('data-theme') || 'dark';
        var t = theme === 'dark' ? 'dark' : 'light';
        var el = document.getElementById('gh-streak');
        if (el) el.src = ghImages.streak[t];
        el = document.getElementById('gh-graph');
        if (el) el.src = ghImages.graph[t];
      }

      // ---- GitHub stats count-up (fires when the card scrolls into view) ----
      var ghCounted = false;
      var ghCountObserver = null;
      var ghCountPoll = null;

      function typeGhValues() {
        var order = ['gh-repos', 'gh-followers', 'gh-following', 'gh-stars'];
        var idx = 0;
        var attempts = 0;
        var reduced = window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }

        function countUp(el, target, dur) {
          if (reduced || target <= 0) {
            el.textContent = String(target);
            setTimeout(countNext, 160);
            return;
          }
          var start = null;
          el.classList.add('gh-counting');
          function frame(ts) {
            if (start === null) start = ts;
            var p = Math.min(1, (ts - start) / dur);
            el.textContent = String(Math.round(easeOutQuad(p) * target));
            if (p < 1) { requestAnimationFrame(frame); }
            else {
              el.textContent = String(target);
              el.classList.remove('gh-counting');
              setTimeout(countNext, 160);
            }
          }
          requestAnimationFrame(frame);
        }

        function countNext() {
          if (idx >= order.length) return;
          var el = document.getElementById(order[idx++]);
          if (!el) { countNext(); return; }
          var text = (el.textContent || '').trim();
          var target = parseInt(text, 10);
          if (isNaN(target)) {
            el.textContent = text || '—';
            setTimeout(countNext, 160);
            return;
          }
          countUp(el, target, 900);
        }

        // Wait for async stats to arrive (up to ~12s), then count up real numbers
        function waitForData() {
          var allLoaded = order.every(function(id) {
            var el = document.getElementById(id);
            return el && el.textContent && el.textContent !== '—';
          });
          if (allLoaded) { countNext(); return; }
          attempts++;
          if (attempts > 40) { countNext(); return; }
          ghCountPoll = setTimeout(waitForData, 300);
        }
        waitForData();
      }

      function initGhStats() {
        var grid = document.getElementById('gh-stats-container');
        if (!grid) return;
        if (ghCountPoll) { clearTimeout(ghCountPoll); ghCountPoll = null; }
        if (ghCounted) return;
        var reduced = window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) return;
        if (ghCountObserver) ghCountObserver.disconnect();
        if (!('IntersectionObserver' in window)) {
          ghCounted = true;
          typeGhValues();
          return;
        }
        ghCountObserver = new IntersectionObserver(function(entries) {
          entries.forEach(function(en) {
            if (en.isIntersecting) {
              ghCountObserver.disconnect();
              ghCounted = true;
              typeGhValues();
            }
          });
        }, { threshold: 0.3 });
        ghCountObserver.observe(grid);
      }

      displayGitHub();
      fetchGitHubStats();
      initGhStats();

      var observer = new MutationObserver(function(m) {
        for (var i = 0; i < m.length; i++) {
          if (m[i].attributeName === 'data-theme') {
            displayGitHub();
            break;
          }
        }
      });
      observer.observe(document.documentElement, { attributes: true });

      // ---- Skill tooltips: maps skill names to descriptions ----
      (function() {
        var descs = {
          "Linux Mint XFCE": "Learning Linux through hands-on home lab activities, terminal usage, and remote administration.",
          "Linux Command Line": "Learning Linux through hands-on home lab activities, terminal usage, and remote administration.",
          "Basic Linux Administration": "Learning Linux through hands-on home lab activities, terminal usage, and remote administration.",
          "Networking Fundamentals": "Studying core networking concepts including OSI model, IP addressing, and network protocols through coursework and home lab experiments.",
          "TCP/IP Fundamentals": "Learning TCP/IP protocol suite, subnetting, and packet analysis as part of networking curriculum.",
          "SSH / OpenSSH": "Using SSH for secure remote access to Linux machines in home lab environment.",
          "Tailscale": "Setting up secure mesh VPNs with Tailscale for remote home lab access.",
          "HTML": "Experienced building responsive webpages using semantic HTML.",
          "CSS": "Skilled in modern CSS including Flexbox, Grid, custom properties, and responsive design.",
          "JavaScript": "Building interactive web applications with vanilla JavaScript and DOM manipulation.",
          "Responsive Web Design": "Creating layouts that adapt seamlessly across desktop, tablet, and mobile devices.",
          "VS Code": "Primary editor with extensions, debugging, and integrated terminal for daily development.",
          "Git": "Learning version control fundamentals including commit, push, pull, and branching.",
          "npm": "Using npm for package management in JavaScript projects.",
          "Termius": "SSH client used for managing remote servers in home lab.",
          "Cybersecurity Fundamentals": "Studying security principles and best practices through coursework.",
          "Ethical Hacking Fundamentals": "Learning ethical hacking concepts and penetration testing methodologies.",
          "System Enumeration Concepts": "Exploring system fingerprinting and information gathering techniques."
        };
        var items = document.querySelectorAll('.skill-item');
        for (var i = 0; i < items.length; i++) {
          var nameEl = items[i].querySelector('.skill-item-name');
          var label = items[i].querySelector('.skill-pct-label');
          if (nameEl && label && descs[nameEl.textContent]) {
            label.setAttribute('data-desc', descs[nameEl.textContent]);
            label.title = descs[nameEl.textContent];
          }
        }
      })();

      // ---- Hamburger menu toggle ----
      (function() {
        var hamburger = document.querySelector('.hamburger');
        var overlay = document.getElementById('nav-overlay');
        var menu = document.getElementById('nav-menu-mobile');
        var body = document.body;

        if (!hamburger || !overlay || !menu) return;

        // Shared scroll-lock helpers (on window so both hamburger + cert modal IIFEs can use them)
      window._lockScroll = function() {
        window._scrollLock = (window._scrollLock || 0) + 1;
        document.body.classList.add('modal-open');
      };
      window._unlockScroll = function() {
        window._scrollLock = Math.max(0, (window._scrollLock || 0) - 1);
        if (window._scrollLock === 0) document.body.classList.remove('modal-open');
      };

      var closeTimer = null;

      function openMenu() {
          if (menu.classList.contains('open')) return;
          // Cancel any pending close so a rapid reopen replays the pop cleanly.
          if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
          menu.classList.remove('closing');
          hamburger.classList.add('active');
          hamburger.setAttribute('aria-expanded', 'true');
          hamburger.setAttribute('aria-label', 'Close menu');
          overlay.classList.add('open');
          menu.classList.add('open');
          window._lockScroll();
          // Move focus into the drawer (close button) for keyboard users
          var menuCloseBtn = document.getElementById('nav-menu-close');
          if (menuCloseBtn) menuCloseBtn.focus();
        }

        function closeMenu() {
          // Exit animation already running — ignore repeat calls.
          if (closeTimer) return;
          // Keep the X icon while the drawer slides out (deferred below).
          hamburger.setAttribute('aria-expanded', 'false');
          hamburger.setAttribute('aria-label', 'Open menu');
          overlay.classList.remove('open');
          menu.classList.add('closing');
          window._unlockScroll();
          // Reduced-motion users get an instant hide; everyone else waits for
          // the slide-out to finish before removing .open (which hides it).
          if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            hamburger.classList.remove('active');
            menu.classList.remove('open', 'closing');
            hamburger.focus();
            return;
          }
          closeTimer = setTimeout(function() {
            hamburger.classList.remove('active');
            menu.classList.remove('open', 'closing');
            closeTimer = null;
            // Return focus to the hamburger once the drawer is gone
            hamburger.focus();
          }, 460);
        }

        hamburger.addEventListener('click', function() {
          if (menu.classList.contains('open') && !closeTimer) {
            closeMenu();
          } else {
            openMenu();
          }
        });

        overlay.addEventListener('click', closeMenu);

        // Explicit close button in the menu panel itself.
        var menuClose = document.getElementById('nav-menu-close');
        if (menuClose) menuClose.addEventListener('click', closeMenu);

        // Wire up mobile theme toggle to dispatch a click on the desktop one
        var mobileToggle = document.getElementById('mobile-theme-toggle');
        var desktopToggle = document.querySelector('.navbar-links .theme-toggle');
        if (mobileToggle && desktopToggle) {
          mobileToggle.addEventListener('click', function() {
            desktopToggle.click();
            // main.min.js only syncs the first .theme-toggle's label/state, so
            // mirror it onto the mobile button too.
            var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            mobileToggle.setAttribute('aria-pressed', String(!isDark));
            mobileToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
          });
        }

        // Close on nav link click (smooth scroll will happen via main.min.js)
        var links = menu.querySelectorAll('.nav-link');
        for (var i = 0; i < links.length; i++) {
          links[i].addEventListener('click', function(e) {
            closeMenu();
          });
        }

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && menu.classList.contains('open')) {
            closeMenu();
          }
        });

      })();

      // ---- Animated counter: counts from 0 to target when card is revealed ----
      (function() {
        var prefersReducedMotion = window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Easing that matches the CSS cubic-bezier(0.25, 0.46, 0.45, 0.94)
        function easeOutQuart(t) {
          return 1 - Math.pow(1 - t, 4);
        }

        function animateLabel(label, target, delay) {
          var t = parseInt(target, 10);
          if (prefersReducedMotion) {
            label.textContent = t + '%';
            return;
          }
          var duration = 800;
          var startTime;

          function frame(time) {
            if (!startTime) startTime = time;
            var elapsed = time - startTime;
            var progress = Math.min(elapsed / duration, 1);
            var eased = easeOutQuart(progress);
            label.textContent = Math.round(eased * t) + '%';
            if (progress < 1) requestAnimationFrame(frame);
          }

          setTimeout(function() {
            requestAnimationFrame(frame);
          }, (delay || 0) * 1000);
        }

        // Map nth-child index to CSS delay values
        var staggerDelays = [0.05, 0.12, 0.19, 0.26, 0.33];

        function triggerCardCounters(card) {
          var skillItems = card.querySelectorAll('.skill-item');
          for (var i = 0; i < skillItems.length; i++) {
            var label = skillItems[i].querySelector('.skill-pct-label');
            if (label && !label.hasAttribute('data-target')) {
              var val = parseInt(label.textContent, 10);
              if (!isNaN(val)) {
                label.setAttribute('data-target', val);
                label.textContent = '0%';
                var delay = staggerDelays[i] || staggerDelays[staggerDelays.length - 1];
                animateLabel(label, val, delay);
              }
            }
          }
        }

        // Note: .skill-card elements were replaced by the tech stack marquee.
        // The animated counter for skill progress bars is no longer needed.
        // Keep the function available but don't observe non-existent elements.
      })();
    })();

    // ---- Certificate Viewer ----
    // Shared focus trap for dialogs — keeps Tab cycling inside the open
    // modal so keyboard users can't escape into the page behind it (a11y).
    window.trapFocus = window.trapFocus || function(e, container) {
      if (e.key !== 'Tab') return;
      var focusables = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
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
    (function(){
      var overlay = document.getElementById('cert-overlay');
      var modal = document.getElementById('cert-modal');
      var cmdLine = document.getElementById('cert-command-line');
      var certImg = document.getElementById('cert-modal-image');
      var filenameEl = document.getElementById('cert-modal-filename');
      var prevBtn = document.getElementById('cert-prev');
      var nextBtn = document.getElementById('cert-next');
      var counterEl = document.getElementById('cert-counter');
      var closeBtn = document.getElementById('cert-close-btn');
      var statusLine = document.getElementById('cert-status-line');
      var imgWrap = document.getElementById('cert-image-wrap');
      var zoomLabel = document.getElementById('cert-zoom-label');
      var downloadBtn = document.getElementById('cert-download');

      if (!overlay || !modal) return;

      // ---- Live DOM query (never cached — read fresh every time) ----
      function getCertCards() {
        var cards = document.querySelectorAll('.cert-card[data-cert-path]');
        var result = [];
        for (var i = 0; i < cards.length; i++) {
          result.push({
            el: cards[i],
            path: cards[i].getAttribute('data-cert-path'),
            name: cards[i].getAttribute('data-cert-name'),
            issuer: cards[i].getAttribute('data-cert-issuer'),
            date: cards[i].getAttribute('data-cert-date'),
            key: cards[i].getAttribute('data-cert-key') || ''
          });
        }
        return result;
      }

      // Initial population
      var certData = getCertCards();

      var currentIndex = -1;
      var typingTimer = null;

      function typeCommand(text, callback) {
        cmdLine.innerHTML = '';
        var i = 0;
        var cmdPrefix = '<span class="cmd-prompt">$</span> cat ';
        cmdLine.innerHTML = cmdPrefix;
        typingTimer = setInterval(function() {
          if (i < text.length) {
            cmdLine.innerHTML = cmdPrefix + text.substring(0, i + 1) + '<span class="cursor-blink">▊</span>';
            i++;
          } else {
            clearInterval(typingTimer);
            typingTimer = null;
            cmdLine.innerHTML = cmdPrefix + text;
            if (callback) callback();
          }
        }, 30);
      }

      // ---- Zoom (click toggles 100% <-> 160%, wheel adjusts, + / - keys) ----
      var zoomLevel = 1;
      var ZOOM_STEP = 0.2;
      var ZOOM_MAX = 3;
      var ZOOM_MIN = 1;

      function applyZoom() {
        certImg.style.transform = 'scale(' + zoomLevel + ')';
        certImg.classList.toggle('zoomed', zoomLevel > 1);
        if (zoomLabel) {
          zoomLabel.textContent = '[zoom ' + Math.round(zoomLevel * 100) + '%]';
        }
      }
      function setZoom(v) {
        zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(v * 10) / 10));
        applyZoom();
      }
      function resetZoom() {
        zoomLevel = 1;
        applyZoom();
      }
      if (certImg) {
        certImg.addEventListener('click', function(e) {
          if (e.altKey) { resetZoom(); return; }
          setZoom(zoomLevel > 1 ? 1 : 1.6);
        });
        if (imgWrap) {
          imgWrap.addEventListener('wheel', function(e) {
            if (zoomLevel > 1 || e.deltaY < 0) {
              e.preventDefault();
              setZoom(zoomLevel + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
            }
          }, { passive: false });
        }
      }

      // ---- Status line: types [ OK ] / [ ERR ] after the command ----
      var statusTimer = null;
      function typeStatus(text, ok) {
        if (!statusLine) return;
        if (statusTimer) { clearInterval(statusTimer); statusTimer = null; }
        statusLine.className = 'cert-status-line' + (ok ? '' : ' err');
        statusLine.textContent = '';
        // Reduced motion: show instantly, like the About terminal does
        var reduced = window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) { statusLine.textContent = text; return; }
        var i = 0;
        statusTimer = setInterval(function() {
          i++;
          statusLine.textContent = text.substring(0, i);
          if (i >= text.length) { clearInterval(statusTimer); statusTimer = null; }
        }, 20);
      }
      function clearStatus() {
        if (statusTimer) { clearInterval(statusTimer); statusTimer = null; }
        if (statusLine) statusLine.textContent = '';
      }

      // Refresh certData from live DOM (solves stale cache after dynamic re-render)
      function refreshCertData() {
        certData = getCertCards();
      }

      // keepZoom=true is used when navigating prev/next so the zoom level
      // carries across certs; opening the modal fresh resets it (default).
      function showCert(index, keepZoom) {
        refreshCertData();
        if (index < 0 || index >= certData.length) return;
        currentIndex = index;
        var cert = certData[index];

        // Build filename
        var filename = cert.name.toLowerCase().replace(/\s+/g, '-') + ' --view';
        filenameEl.textContent = filename;

        // Update counter
        counterEl.textContent = (index + 1) + ' / ' + certData.length;

        // Update nav buttons
        prevBtn.disabled = (index === 0);
        nextBtn.disabled = (index === certData.length - 1);

        // Hide image until loaded
        certImg.classList.remove('loaded');
        certImg.style.display = '';
        certImg.src = '';
        // Remove any previous error placeholder
        var oldPlaceholder = document.querySelector('.cert-image-wrap .cert-error-placeholder');
        if (oldPlaceholder) oldPlaceholder.remove();

        // Reset zoom (unless navigating prev/next) + status + download
        if (!keepZoom) resetZoom();
        clearStatus();
        if (downloadBtn) {
          downloadBtn.classList.toggle('disabled', !cert.path);
          if (cert.path) {
            downloadBtn.setAttribute('href', cert.path);
          } else {
            downloadBtn.removeAttribute('href');
          }
        }

        // Type the command
        var cmdText = filename;
        typeCommand(cmdText, function() {
          // Remove any placeholder that may have been added by phantom error from src=''
          var p = document.querySelector('.cert-image-wrap .cert-error-placeholder');
          if (p) p.remove();
          // After typing finishes, load the image
          certImg.style.display = '';
          certImg.src = cert.path;
          certImg.alt = (cert.name || 'Certificate') + (cert.issuer ? ' — ' + cert.issuer : '') + ' certificate';
          if (!cert.path) {
            typeStatus('[ ERR ] no image on file', false);
          }
        });
      }

      // When image loads, fade it in + log [ OK ]
      certImg.addEventListener('load', function() {
        // Guard against phantom loads from the temporary src='' reset
        var path = currentIndex >= 0 && certData[currentIndex] ? certData[currentIndex].path : '';
        if (!path) return;
        certImg.classList.add('loaded');
        typeStatus('[ OK ] image loaded', true);
      });
      certImg.addEventListener('error', function() {
        // Check if this is a real error (non-empty path) or a phantom error from src=''
        var path = currentIndex >= 0 && certData[currentIndex] ? certData[currentIndex].path : '';
        if (!path) return; // Ignore phantom errors from certImg.src = ''
        typeStatus('[ ERR ] image failed to load', false);
        // If image fails, show visible SVG placeholder
        certImg.style.display = 'none';
        var wrap = document.querySelector('.cert-image-wrap');
        if (!wrap) return;
        // Remove old placeholder if exists
        var old = wrap.querySelector('.cert-error-placeholder');
        if (old) old.remove();
        var div = document.createElement('div');
        div.className = 'cert-error-placeholder';
        div.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem;text-align:center;gap:0.75rem;width:100%';
        div.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
          '<p style="font-family:var(--font-code);font-size:var(--text-xs);color:var(--color-text-secondary);margin:0">Certificate image not available</p>' +
          '<p style="font-family:var(--font-body);font-size:11px;color:#6B7280;margin:0;max-width:280px">Save and view from the same location (both local or both deployed) for uploaded images to work.</p>' +
          '<a href="https://github.com/brokeCode05" target="_blank" rel="noopener noreferrer" style="font-family:var(--font-code);font-size:var(--text-xs);color:var(--color-accent);text-decoration:underline">Visit GitHub →</a>';
        wrap.appendChild(div);
      });

      function openModal(index) {
        if (overlay.classList.contains('open')) return;
        // Cancel any pending close timer and leftover closing state so a rapid
        // reopen plays the pop cleanly.
        if (window._certCloseTimer) {
          clearTimeout(window._certCloseTimer);
          window._certCloseTimer = null;
        }
        modal.classList.remove('closing');
        refreshCertData();
        if (index < 0 || index >= certData.length) return;
        modal.removeAttribute('hidden');
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        if (typeof window._lockScroll === 'function') window._lockScroll();
        showCert(index);
        // Focus the close button for accessibility
        setTimeout(function() {
          if (closeBtn) closeBtn.focus();
        }, 500);
      }

      function closeModal() {
        // Guard against double-close while the exit animation runs.
        if (window._certCloseTimer) return;
        if (typingTimer) {
          clearInterval(typingTimer);
          typingTimer = null;
        }
        // Cancel any pending open timer (e.g. if user closes during pulse animation)
        if (window._certTimer) {
          clearTimeout(window._certTimer);
          window._certTimer = null;
        }
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        if (typeof window._unlockScroll === 'function') window._unlockScroll();
        // Reduced-motion users get an instant hide (no exit animation, no delay).
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          modal.setAttribute('hidden', '');
          cmdLine.innerHTML = '';
          certImg.classList.remove('loaded');
          certImg.src = '';
          resetZoom();
          clearStatus();
          currentIndex = -1;
          return;
        }
        // Play the shrink-away exit while the backdrop fades, then finish cleanup.
        modal.classList.add('closing');
        window._certCloseTimer = setTimeout(function() {
          modal.classList.remove('closing');
          modal.setAttribute('hidden', '');
          cmdLine.innerHTML = '';
          certImg.classList.remove('loaded');
          certImg.src = '';
          resetZoom();
          clearStatus();
          currentIndex = -1;
          window._certCloseTimer = null;
        }, 460);
      }

      // Global function called by onclick on cert cards
      window.openCertViewer = function(card) {
        if (!card || !overlay || !modal) return;
        // Cancel any previous pending open timer (prevents stale callbacks)
        if (window._certTimer) {
          clearTimeout(window._certTimer);
          window._certTimer = null;
        }
        // Read index directly from data attribute (most reliable)
        var idx = parseInt(card.getAttribute('data-cert-index'), 10);
        if (isNaN(idx) || idx < 0) return; // bounds check done in showCert() with live data
        // Pulse animation
        card.classList.remove('pulsing');
        void card.offsetWidth;
        card.classList.add('pulsing');
        // Open modal after pulse finishes
        window._certTimer = setTimeout(function() {
          window._certTimer = null;
          openModal(idx);
        }, 420);
      };

      // Prev/Next — keep the current zoom level when moving between certs
      prevBtn.addEventListener('click', function() {
        if (currentIndex > 0) showCert(currentIndex - 1, true);
      });
      nextBtn.addEventListener('click', function() {
        if (currentIndex < certData.length - 1) showCert(currentIndex + 1, true);
      });

      // Keyboard navigation
      document.addEventListener('keydown', function(e) {
        if (!overlay.classList.contains('open')) return;
        if (e.key === 'Escape') {
          closeModal();
        } else if (e.key === 'Tab') {
          window.trapFocus(e, modal);
        } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
          showCert(currentIndex - 1, true);
        } else if (e.key === 'ArrowRight' && currentIndex < certData.length - 1) {
          showCert(currentIndex + 1, true);
        } else if (e.key === '+' || e.key === '=') {
          setZoom(zoomLevel + ZOOM_STEP);
        } else if (e.key === '-' || e.key === '_') {
          setZoom(zoomLevel - ZOOM_STEP);
        } else if (e.key === '0') {
          resetZoom();
        }
      });

      // Close on overlay click
      overlay.addEventListener('click', closeModal);

      // Close button
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      // Prevent modal close when clicking inside modal
      modal.addEventListener('click', function(e) {
        e.stopPropagation();
      });

      // Reduced motion
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Override typing speed to instant
        var origTypeCommand = typeCommand;
        typeCommand = function(text, callback) {
          cmdLine.innerHTML = '<span class="cmd-prompt">$</span> cat ' + text;
          if (callback) setTimeout(callback, 50);
        };
      }
    })();

    // ---- Hero: ID badge — drop-in, mouse tilt, click to flip ----
    (function(){
      var wrap = document.getElementById('hero-badge-wrap');
      var card = document.getElementById('hero-badge-card');
      var media = document.getElementById('hero-media');
      if (!wrap || !card) return;

      var reducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var finePointer = window.matchMedia &&
        window.matchMedia('(pointer: fine)').matches;

      // Image error fallback (exposed for the inline onerror attr)
      window._heroBadgeImgError = function(img) {
        var fallback = document.getElementById('hero-badge-photo-fallback');
        img.style.display = 'none';
        if (fallback) fallback.style.display = 'flex';
      };

      // Real QR error fallback → decorative pattern
      window._heroBadgeQrError = function(img) {
        img.style.display = 'none';
        var fb = document.getElementById('hero-badge-qr-fallback');
        if (fb) fb.style.display = 'block';
      };

      // Drop-in entrance (strap unreels via CSS once hero-revealed is added)
      if (reducedMotion) {
        wrap.classList.add('hero-revealed');
      } else {
        requestAnimationFrame(function() {
          wrap.classList.add('hero-revealed');
        });
      }

      // Point the back-side QR + site link at the live site (graceful fallback if offline).
      // renderPortfolio() overrides the QR with the admin-set QR link when present.
      var site = window.location.origin + window.location.pathname;
      if (/index\.html$/.test(site)) site = site.replace(/index\.html$/, '');
      if (!site || site.indexOf('http') !== 0) site = 'https://brokeCode05.github.io/portfolio/';
      var qr = document.getElementById('hero-badge-qr-real');
      if (qr) {
        qr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=' +
          encodeURIComponent(site);
      }
      var backSiteLink = document.querySelector('.hero-badge-back-link-site');
      if (backSiteLink) backSiteLink.href = site;

      // ── 3D mouse tilt (fine pointers only; card follows the cursor) ──
      // The card hangs at a small resting tilt and leans toward the cursor
      // while hovering the hero. Lerped per-frame for a smooth physical feel.
      var TILT_X = 4, TILT_Y = -3;  // resting tilt (deg), mirrors the old static pose
      var curX = TILT_X, curY = TILT_Y;
      var targetX = TILT_X, targetY = TILT_Y;
      var tiltRaf = null;

      function applyTilt() {
        curX += (targetX - curX) * 0.14;
        curY += (targetY - curY) * 0.14;
        card.style.transform =
          'perspective(1000px) rotateX(' + curX.toFixed(2) + 'deg) rotateY(' + curY.toFixed(2) + 'deg)';
        if (Math.abs(targetX - curX) > 0.02 || Math.abs(targetY - curY) > 0.02) {
          tiltRaf = requestAnimationFrame(applyTilt);
        } else {
          tiltRaf = null;
        }
      }

      function setTiltTarget(x, y) {
        targetX = x; targetY = y;
        if (!tiltRaf) tiltRaf = requestAnimationFrame(applyTilt);
      }

      if (finePointer && !reducedMotion) {
        var zone = media || wrap;
        zone.addEventListener('mousemove', function(e) {
          var r = card.getBoundingClientRect();
          if (!r.width || !r.height) return;
          var nx = (e.clientX - r.left) / r.width - 0.5;   // -0.5..0.5 across the card
          var ny = (e.clientY - r.top) / r.height - 0.5;
          // Lean into the cursor: tilt X follows vertical, Y follows horizontal
          setTiltTarget(TILT_X - ny * 10, TILT_Y + nx * 14);
        });
        zone.addEventListener('mouseleave', function() {
          setTiltTarget(TILT_X, TILT_Y);
        });
      }

      // ── Click / tap / keyboard to flip the ID over ──
      function setFlipped(on) {
        card.classList.toggle('flipped', on);
        card.setAttribute('aria-pressed', on ? 'true' : 'false');
        card.setAttribute('aria-label',
          (on ? 'Student ID badge — back side. ' : 'Student ID badge — ') +
          'Click to flip. Use the corner button to enlarge.');
      }
      card.addEventListener('click', function() {
        setFlipped(!card.classList.contains('flipped'));
      });
      card.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === card) {
          e.preventDefault();
          setFlipped(!card.classList.contains('flipped'));
        }
      });

      // The back-side site link opens the profile instead of flipping the card
      var backSiteLink = card.querySelector('.hero-badge-back-link-site');
      if (backSiteLink) {
        backSiteLink.addEventListener('click', function(e) {
          e.stopPropagation();
        });
      }
      // The front GitHub handle opens the profile instead of flipping the card
      var frontHandle = card.querySelector('.hero-badge-handle');
      if (frontHandle) {
        frontHandle.addEventListener('click', function(e) {
          e.stopPropagation();
        });
      }

      // ── Enlarge the ID in a lightbox viewer (click-to-flip stays on the card) ──
      var expandBtn = document.getElementById('hero-badge-expand');
      var idOverlay = document.getElementById('idzoom-overlay');
      var idModal = document.getElementById('idzoom-modal');
      var idBody = document.getElementById('idzoom-body');
      var idClose = document.getElementById('idzoom-close');
      var idFlip = document.getElementById('idzoom-flip');
      var idCloseTimer = null;
      if (expandBtn && idOverlay && idModal && idBody) {
        function openIdZoom() {
          if (idCloseTimer) { clearTimeout(idCloseTimer); idCloseTimer = null; }
          // Clear any leftover closing state so the fresh stage plays the pop.
          idModal.classList.remove('closing');
          // Clone the card so the small one keeps its own state and handlers.
          var clone = card.cloneNode(true);
          // Strip ids so the clone never collides with the live card.
          clone.removeAttribute('id');
          clone.querySelectorAll('[id]').forEach(function(el) { el.removeAttribute('id'); });
          clone.classList.remove('flipped');
          clone.setAttribute('aria-label', 'Student ID card — enlarged. Click to flip.');
          clone.addEventListener('click', function() {
            clone.classList.toggle('flipped');
          });
          clone.addEventListener('keydown', function(ev) {
            if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === clone) {
              ev.preventDefault();
              clone.classList.toggle('flipped');
            }
          });
          // Inner links open normally without flipping the card.
          clone.querySelectorAll('a').forEach(function(a) {
            a.addEventListener('click', function(ev) { ev.stopPropagation(); });
          });
          // Wrap the clone in a stage so the entrance animation never fights
          // the card's own flip transform.
          var stage = document.createElement('div');
          stage.className = 'idzoom-stage';
          idBody.innerHTML = '';
          stage.appendChild(clone);
          idBody.appendChild(stage);
          idOverlay.hidden = false;
          idModal.hidden = false;
          requestAnimationFrame(function() { idOverlay.classList.add('open'); });
          document.body.classList.add('modal-open');
          if (idClose) idClose.focus();
        }
        function closeIdZoom() {
          if (idCloseTimer) return;
          idOverlay.classList.remove('open');
          idModal.classList.add('closing');
          document.body.classList.remove('modal-open');
          // Reduced-motion users get an instant hide (no exit animation, no delay).
          if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            idOverlay.hidden = true;
            idModal.hidden = true;
            idModal.classList.remove('closing');
            idBody.innerHTML = '';
            if (expandBtn) expandBtn.focus();
            return;
          }
          idCloseTimer = setTimeout(function() {
            idOverlay.hidden = true;
            idModal.hidden = true;
            idModal.classList.remove('closing');
            idBody.innerHTML = '';
            idCloseTimer = null;
          }, 460);
          if (expandBtn) expandBtn.focus();
        }
        expandBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          openIdZoom();
        });
        if (idClose) idClose.addEventListener('click', closeIdZoom);
        if (idFlip) {
          idFlip.addEventListener('click', function() {
            var cc = idBody.querySelector('.hero-badge-card');
            if (cc) cc.classList.toggle('flipped');
          });
        }
        idOverlay.addEventListener('click', function(e) {
          if (e.target === idOverlay) closeIdZoom();
        });
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && !idOverlay.hidden) closeIdZoom();
          else if (e.key === 'Tab' && !idOverlay.hidden) {
            if (window.trapFocus) window.trapFocus(e, idModal);
          }
        });
      }
    })();
