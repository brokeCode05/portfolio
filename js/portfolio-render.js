  (function(){
    'use strict';

    // ─── Load data (cloud-first, localStorage fallback) ───
    (function loadAndRender(){
      var localStorageData = loadData();
      var resolved = false;

      // ─── About terminal typewriter (matches Contact) ───
      var aboutTyped = false;
      var aboutTypeObserver = null;
      var aboutTypeTimer = null;

      function typeAboutTerminal(body) {
        var lines = [];
        var children = body.querySelectorAll('.line');
        Array.prototype.forEach.call(children, function(line) {
          if (line.classList.contains('cursor-line')) return;
          var prompt = line.querySelector('.prompt');
          lines.push({
            cls: line.className,
            isCmd: prompt !== null,
            text: line.textContent.replace(/^\$\s*/, '')
          });
        });
        if (!lines.length) return;
        aboutTyped = true;

        body.innerHTML = '';
        var li = 0;

        function finish() {
          var fin = document.createElement('span');
          fin.className = 'line cursor-line';
          fin.innerHTML = '<span class="prompt">$</span> <span class="cursor" aria-hidden="true">\u258A</span>';
          body.appendChild(fin);
          // Stamp a marker so the upgrade layer (ui-upgrade.js) can take over
          // even if it attaches after the intro has already finished typing.
          body.setAttribute('data-about-typed', '1');
        }

        function typeLine() {
          if (li >= lines.length) { finish(); return; }
          var line = lines[li++];
          var el = document.createElement('span');
          el.className = line.cls;
          var typeSpan = document.createElement('span');
          if (line.isCmd) {
            var prompt = document.createElement('span');
            prompt.className = 'prompt';
            prompt.textContent = '$';
            el.appendChild(prompt);
            el.appendChild(document.createTextNode(' '));
            el.appendChild(typeSpan);
          } else {
            el.appendChild(typeSpan);
          }
          var cursor = document.createElement('span');
          cursor.className = 'about-type-cursor';
          cursor.setAttribute('aria-hidden', 'true');
          el.appendChild(cursor);
          body.appendChild(el);

          var text = line.text;
          var i = 0;
          aboutTypeTimer = setInterval(function() {
            i++;
            typeSpan.textContent = text.substring(0, i);
            if (i >= text.length) {
              clearInterval(aboutTypeTimer);
              aboutTypeTimer = null;
              cursor.remove();
              setTimeout(typeLine, 140);
            }
          }, 24);
        }
        typeLine();
      }

      function initAboutTypewriter() {
        var terminal = document.querySelector('.about-terminal');
        var body = terminal ? terminal.querySelector('.terminal-body') : null;
        if (!terminal || !body) return;
        if (aboutTypeTimer) { clearInterval(aboutTypeTimer); aboutTypeTimer = null; }
        if (aboutTyped) return;
        var reducedMotion = window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) return;
        if (aboutTypeObserver) aboutTypeObserver.disconnect();
        if (!('IntersectionObserver' in window)) {
          typeAboutTerminal(body);
          return;
        }
        aboutTypeObserver = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              aboutTypeObserver.disconnect();
              typeAboutTerminal(body);
            }
          });
        }, { threshold: 0.2 });
        aboutTypeObserver.observe(terminal);
      }

      function renderPortfolio(data) {
        // ─── Hero ─────────────────────────────────
        var titleEl = document.querySelector('.hero-title');
        var descEl = document.querySelector('.hero-description');

        if (titleEl) {
          titleEl.innerHTML = (data.hero.title || '').replace(/\n/g, '<br />');
        }
        if (descEl) descEl.textContent = data.hero.description || '';

        // ID badge photo + name (falls back to the bundled portrait)
        var badgeImg = document.getElementById('hero-badge-img');
        if (badgeImg) {
          badgeImg.src = (data.hero.photo || 'img/johnbryan.jpg');
          badgeImg.style.display = 'block';
        }
        var badgeName = document.getElementById('hero-badge-name');
        if (badgeName) badgeName.textContent = data.hero.name || 'John Bryan Capellan';
        var badgeRole = document.getElementById('hero-badge-role');
        if (badgeRole) badgeRole.textContent = data.hero.badge || 'Information Technology Student';
        var badgeRole2 = document.getElementById('hero-badge-role2');
        if (badgeRole2) {
          var role2 = data.hero.badge2 || '';
          badgeRole2.textContent = role2;
          badgeRole2.style.display = role2 ? 'block' : 'none';
        }
        var badgeIdno = document.getElementById('hero-badge-idno');
        if (badgeIdno) badgeIdno.textContent = data.hero.idNumber || 'IT-2024-0842';
        var personName = data.hero.name || 'John Bryan Capellan';
        var badgeCardEl = document.getElementById('hero-badge-card');
        if (badgeCardEl) {
          badgeCardEl.setAttribute('aria-label', 'Student ID badge — ' + personName + '. Click to flip, or use the corner button to enlarge.');
        }

        // Badge header (front + back) — admin-editable school title/subtitle
        var schoolTitle = data.hero.schoolTitle || 'Student ID';
        var schoolSub = data.hero.schoolSub || 'brokeCode05.dev';
        var badgeSchool = document.getElementById('hero-badge-school');
        if (badgeSchool) badgeSchool.textContent = schoolTitle;
        var badgeSchoolSub = document.getElementById('hero-badge-school-sub');
        if (badgeSchoolSub) badgeSchoolSub.textContent = schoolSub;
        var badgeBackSchool = document.getElementById('hero-badge-back-school');
        if (badgeBackSchool) badgeBackSchool.textContent = schoolTitle;
        var badgeBackSchoolSub = document.getElementById('hero-badge-back-school-sub');
        if (badgeBackSchoolSub) badgeBackSchoolSub.textContent = schoolSub;
        var badgeBackId = document.querySelector('.hero-badge-back-id');
        if (badgeBackId) badgeBackId.textContent = data.hero.idNumber || 'IT-2024-0842';
        var badgeFallback = document.getElementById('hero-badge-photo-fallback');
        if (badgeFallback) badgeFallback.style.display = 'none';

        // QR link on the ID back — admin-set target overrides the site default
        var badgeQr = document.getElementById('hero-badge-qr-real');
        var qrTarget = (data.hero.qrLink || '').trim();
        var qrLabel = ''; // human-readable target for the scan label / flip hint
        if (badgeQr && qrTarget) {
          if (!/^[a-z][a-z0-9+.-]*:/i.test(qrTarget)) qrTarget = 'https://' + qrTarget;
          badgeQr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=' +
            encodeURIComponent(qrTarget);
          badgeQr.alt = 'QR code — scan to open ' + qrTarget;
          badgeQr.style.display = 'block';
          var qrFallback = document.getElementById('hero-badge-qr-fallback');
          if (qrFallback) qrFallback.style.display = 'none';
          // Friendly brand for the scan label + flip hint
          var host = '';
          try { host = new URL(qrTarget).hostname; } catch (e) { host = qrTarget; }
          if (host.indexOf('github.com') > -1) qrLabel = 'GitHub';
          else if (host.indexOf('linkedin.com') > -1) qrLabel = 'LinkedIn';
          else if (host.indexOf('facebook.com') > -1) qrLabel = 'Facebook';
          else if (host.indexOf('instagram.com') > -1) qrLabel = 'Instagram';
          else if (host.indexOf('t.me') > -1 || host.indexOf('telegram') > -1) qrLabel = 'Telegram';
          else if (host.indexOf('twitter.com') > -1 || host.indexOf('x.com') > -1) qrLabel = 'X / Twitter';
          else qrLabel = host.replace(/^www\./, '');
        }
        var badgeScanLabel = document.getElementById('hero-badge-scan-label');
        if (badgeScanLabel) {
          badgeScanLabel.textContent = qrLabel ? 'Scan to connect on ' + qrLabel : 'Scan to connect';
        }
        var badgeFlipHint = document.querySelector('.hero-badge-flip-hint');
        if (badgeFlipHint) {
          // Only name the target when it's a recognizable brand — a raw hostname
          // is too long for the 8px caption.
          var knownBrands = ['GitHub', 'LinkedIn', 'Facebook', 'Instagram', 'Telegram', 'X / Twitter'];
          badgeFlipHint.textContent =
            (knownBrands.indexOf(qrLabel) > -1) ? 'flip to scan my ' + qrLabel : 'click to flip';
        }

        // ─── About ────────────────────────────────
        var aboutParagraph = document.querySelector('.about-text p');
        if (aboutParagraph) aboutParagraph.textContent = data.about.bio || '';

        // Terminal JSON
        var terminalBody = document.querySelector('.about-terminal .terminal-body');
        if (terminalBody && data.about.terminal) {
          var t = data.about.terminal;
          var pathStr = (t.path || []).map(function(p) { return '\"' + p + '\"'; }).join(', ');
          terminalBody.innerHTML =
            '<span class="line"><span class="prompt">$</span> cat about.txt</span>' +
            '<span class="line output">{</span>' +
            '<span class="line output indent">\"role\": \"' + escapeHtml(t.role || '') + '\",</span>' +
            '<span class="line output indent">\"path\": [' + pathStr + '],</span>' +
            '<span class="line output indent">\"philosophy\": \"' + escapeHtml(t.philosophy || '') + '\",</span>' +
            '<span class="line output indent">\"status\": \"' + escapeHtml(t.status || '') + '\"</span>' +
            '<span class="line output">}</span>' +
            '<span class="line cursor-line"><span class="prompt">$</span> <span class="cursor" aria-hidden="true">\u258A</span></span>';
        }

        // ─── Section visibility ───────────────────
        // A section with no content hides itself — a heading over nothing
        // looks broken. Restored automatically once data exists again.
        function syncSection(container) {
          if (!container) return;
          var sec = container.closest('section');
          if (sec) sec.style.display = container.innerHTML.trim() ? '' : 'none';
        }

        // ─── Skills ───────────────────────────────
        var techGrid = document.getElementById('tech-stack-grid');
        if (techGrid) {
          techGrid.innerHTML = renderTechStack(data);
          // Event delegation on the grid container — persists across re-renders
          if (!techGrid._toggleReady) {
            techGrid._toggleReady = true;
            techGrid.addEventListener('click', function(e) {
              var btn = e.target.closest('#tech-toggle-btn');
              if (!btn) return;
              var grid = this;
              var expanded = btn.classList.toggle('expanded');
              grid.classList.toggle('expanded', expanded);
              btn.setAttribute('aria-expanded', expanded);
              var count = btn.dataset.hidden || '4';
              var textEl = btn.querySelector('.tech-toggle-text');
              if (textEl) {
                textEl.innerHTML = expanded
                  ? 'Hide <span class="tech-toggle-count">' + count + '</span> categories'
                  : 'Show <span class="tech-toggle-count">' + count + '</span> more categories';
              }
            });
          }
        }

        // ─── Currently ────────────────────────────
        var learningList = document.querySelector('.skill-learning .learning-list');
        if (learningList) {
          learningList.innerHTML = renderCurrently(data);
          // Hide just the Currently block when it's empty — the Skills section
          // itself stays if the tech stack still has content.
          var curWrap = learningList.closest('.skill-learning');
          if (curWrap) curWrap.style.display = learningList.innerHTML.trim() ? '' : 'none';
        }

        // Skills section visibility: hide the WHOLE section only when both the
        // tech stack AND the Currently block are empty (they share one section).
        var skillsSection = (techGrid && techGrid.closest('section')) || (learningList && learningList.closest('section'));
        if (skillsSection) {
          var stackEmpty = !(techGrid && techGrid.innerHTML.trim());
          var currentlyEmpty = !(learningList && learningList.innerHTML.trim());
          skillsSection.style.display = (stackEmpty && currentlyEmpty) ? 'none' : '';
        }

        // ─── Projects ─────────────────────────────
        var projectsGrid = document.querySelector('.projects-grid');
        if (projectsGrid) {
          projectsGrid.innerHTML = renderProjects(data);
          syncSection(projectsGrid);
        }

        // ─── Certs ────────────────────────────────
        var certsGrid = document.querySelector('.certs-grid');
        if (certsGrid) {
          certsGrid.innerHTML = renderCerts(data);
          syncSection(certsGrid);
        }

        // ─── Learning Journey ────────────────────
        var learningContainer = document.querySelector('#learning .timeline');
        if (learningContainer) {
          learningContainer.innerHTML = renderLearningJourney(data);
          syncSection(learningContainer);
        }

        // ─── Experience ───────────────────────────
        var experienceContainer = document.querySelector('#experience .timeline');
        if (experienceContainer) {
          experienceContainer.innerHTML = renderExperience(data);
          syncSection(experienceContainer);
        }

        // ─── Direct Contact ─────────────────────
        var contactLinksContainer = document.getElementById('contact-links');
        if (contactLinksContainer) {
          contactLinksContainer.innerHTML = renderContactLinks(data);
        }

        // ─── Footer: last updated stamp ─────────
        var footerUpdated = document.getElementById('footer-updated');
        if (footerUpdated) {
          var syncTs = data && (data._syncTimestamp || data.updatedAt);
          if (syncTs) {
            var updatedDate = new Date(syncTs);
            if (!isNaN(updatedDate.getTime())) {
              footerUpdated.textContent = '— last updated ' +
                updatedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
              footerUpdated.hidden = false;
            }
          }
        }

        // ─── Re-observe new [data-reveal] elements ───
        (function(){
          var reducedMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (reducedMotion) return;
          var freshReveals = document.querySelectorAll('[data-reveal]:not(.revealed)');
          if (!freshReveals.length) return;
          var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
              }
            });
          }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });
          freshReveals.forEach(function(el) { observer.observe(el); });
        })();

        initAboutTypewriter();
      }

      // Render with local data immediately (so user sees content fast)
      renderPortfolio(localStorageData);

      // Async cloud fetch — runs in background, upgrades if newer data found
      if (typeof fetchFromSupabase === 'function') {
        console.log('[cloud-sync] Fetching from Supabase...');
        fetchFromSupabase()
          .then(function(result) {
            if (resolved) { console.log('[cloud-sync] Already resolved, skipping'); return; }
            resolved = true;

            var cloudData = (result && result.ok) ? result.data : null;
            if (result && !result.ok) {
              console.log('[cloud-sync] Fetch failed:', result.error || 'unknown error');
            }

            console.log('[cloud-sync] Cloud data received:', cloudData ? 'keys=' + Object.keys(cloudData).join(',') : 'null');

            if (cloudData && Object.keys(cloudData).length > 3) {
              var cloudTime = cloudData._syncTimestamp || '';
              var localTime = localStorageData._syncTimestamp || '';
              console.log('[cloud-sync] Cloud timestamp:', cloudTime, '| Local timestamp:', localTime);

              // Only overwrite local data if cloud data is newer or local has no timestamp
              var shouldUpdate = cloudTime > localTime;

              if (shouldUpdate) {
                console.log('[cloud-sync] Cloud data is newer. Saving to localStorage and re-rendering...');
                savePortfolioData(cloudData);
                renderPortfolio(cloudData);
                console.log('[cloud-sync] Re-render complete!');
              } else if (cloudTime === localTime) {
                console.log('[cloud-sync] Data is in sync (same timestamp). No update needed.');
              } else {
                console.log('[cloud-sync] Local data is newer than cloud. Keeping local data.');
              }
            } else {
              console.log('[cloud-sync] Cloud data rejected: keys=' + (cloudData ? Object.keys(cloudData).length : 0) + ' (need > 3)');
            }

            // Hide the loading screen now that we have the best data
            if (typeof window.hideLoader === 'function') {
              window.hideLoader();
            }
          })
          .catch(function(err) {
            console.log('[cloud-sync] ERROR:', err ? err.message || err : 'unknown error');
            if (resolved) return;
            resolved = true;
            if (typeof window.hideLoader === 'function') {
              window.hideLoader();
            }
          });
      } else {
        console.log('[cloud-sync] fetchFromSupabase not available');
        if (typeof window.hideLoader === 'function') {
          window.hideLoader();
        }
      }

    })();
  })();
