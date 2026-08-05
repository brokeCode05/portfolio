/* ============================================================
   UI UPGRADE — Phase 1 interactions (vanilla, no dependencies)
   - Cursor spotlight (desktop only)
   - Card mouse-tracking spotlight (sets --mx/--my CSS vars)
   - Hero rotating role typewriter
   - Data-driven hero stats with count-up on view
   - Hero portrait parallax + tilt
   - Back-to-top button with circular progress ring
   Respects prefers-reduced-motion and touch devices.
   ============================================================ */
(function (global) {
  'use strict';

  // ── Config ─────────────────────────────────────────────────
  // Edit the roles here — they cycle in the hero role line.
  var ROLES = ['BSIT Student', 'Web Developer', 'Network & Security Enthusiast', 'Lifelong Learner'];
  var SPOTLIGHT_SELECTOR = '.project-card, .skill-compact-card, .cert-card, .github-card, .github-graph-wrap';

  // ── Pure helpers (exported for headless tests) ─────────────
  function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }

  // Build the stat map from portfolio data (zeros are omitted).
  function statTargets(data) {
    var d = data || {};
    var out = {};
    var p = (d.projects || []).length;
    var c = (d.certifications || []).length;
    var t = (d.techStack || []).length;
    var l = (d.learning || []).length;
    if (p) out.Projects = p;
    if (c) out.Certs = c;
    if (t) out.Technologies = t;
    if (l) out.Milestones = l;
    return out;
  }

  function nextRole(roles, idx) {
    if (!roles || !roles.length) return '';
    return roles[(idx + 1) % roles.length];
  }

  // ── Feature gates ──────────────────────────────────────────
  function reducedMotion() {
    try { return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }
  function finePointer() {
    try { return !!(global.matchMedia && global.matchMedia('(pointer: fine)').matches); }
    catch (e) { return true; }
  }

  // ── Cursor spotlight ───────────────────────────────────────
  function createCursorGlow() {
    if (reducedMotion() || !finePointer()) return;
    var glow = document.createElement('div');
    glow.id = 'cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);
    document.body.classList.add('ui-cursor-on');
    var tx = -9999, ty = -9999, x = tx, y = ty, raf = null;
    function tick() {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      glow.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      if (Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) {
        raf = requestAnimationFrame(tick);
      } else {
        x = tx; y = ty; raf = null;
      }
    }
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (raf === null) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener('mouseleave', function () {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    });
  }

  // ── Card spotlight vars (rendered by CSS) ──────────────────
  function cardSpotlight() {
    if (!finePointer()) return;
    document.addEventListener('mousemove', function (e) {
      var card = e.target && e.target.closest ? e.target.closest(SPOTLIGHT_SELECTOR) : null;
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  // ── Cert card 3D tilt ─────────────────────────────────────
  // Pure: normalized cursor offset (-0.5..0.5) → tilt degrees.
  // px/py are the cursor position within the card as fractions
  // (0..1); result clamps to ±max degrees on each axis.
  function tiltDegrees(px, py, max) {
    max = max || 6;
    return {
      rx: Math.max(-max, Math.min(max, Math.round((0.5 - py) * 2 * max * 100) / 100)),
      ry: Math.max(-max, Math.min(max, Math.round((px - 0.5) * 2 * max * 100) / 100))
    };
  }

  // Drives --rx/--ry on revealed .cert-card elements (delegated so it
  // survives data-driven re-renders). Reset happens when the cursor leaves
  // the card or the window blurs; skipped on touch/reduced-motion.
  function certTilt() {
    if (!finePointer() || reducedMotion()) return;
    var current = null;
    function reset() {
      if (!current) return;
      current.style.setProperty('--rx', '0deg');
      current.style.setProperty('--ry', '0deg');
      current = null;
    }
    document.addEventListener('mousemove', function (e) {
      var card = e.target && e.target.closest ? e.target.closest('.cert-card') : null;
      if (!card || !card.classList.contains('revealed')) { reset(); return; }
      if (card !== current) { reset(); current = card; }
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      var t = tiltDegrees(px, py, 6);
      card.style.setProperty('--rx', t.rx + 'deg');
      card.style.setProperty('--ry', t.ry + 'deg');
    }, { passive: true });
    window.addEventListener('blur', reset, { passive: true });
  }

  // ── Filter helpers (pure — exported for tests) ────────────
  function parseTags(s) {
    return String(s || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
  }
  function matchesFilter(tags, key) {
    return key === 'all' || tags.indexOf(key) !== -1;
  }

  // ── Filter chip UI (skills categories + project tags) ──────
  var FILTER_MS = 240;
  function toggleEl(el, show) {
    if (show) {
      el.style.display = '';
      void el.offsetWidth; // restart the CSS transition from the hidden state
      el.classList.remove('ui-hide');
      return;
    }
    el.classList.add('ui-hide');
    // Reduced-motion fades are instant — collapse immediately so nothing
    // occupies space invisibly for FILTER_MS.
    if (reducedMotion()) { el.style.display = 'none'; return; }
    setTimeout(function () {
      if (el.classList.contains('ui-hide')) el.style.display = 'none';
    }, FILTER_MS);
  }

  function buildFilterBar(labels, opts) {
    var bar = document.createElement('div');
    bar.className = 'filter-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', (opts && opts.ariaLabel) || 'Filter');
    if (opts && opts.label) {
      var lab = document.createElement('span');
      lab.className = 'filter-bar-label';
      lab.setAttribute('aria-hidden', 'true');
      lab.textContent = opts.label;
      bar.appendChild(lab);
    }
    labels.forEach(function (item, i) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'filter-chip' + (i === 0 ? ' active' : '');
      chip.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      chip.textContent = item.label;
      chip.addEventListener('click', function () {
        if (chip.classList.contains('active')) return;
        Array.prototype.forEach.call(bar.querySelectorAll('.filter-chip'), function (c) {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');
        if (opts && opts.onPick) opts.onPick(item.key);
      });
      bar.appendChild(chip);
    });
    return bar;
  }

  // Skill category chips — filter the marquee rows by data-cat.
  function skillFilters() {
    var grid = document.getElementById('tech-stack-grid');
    if (!grid) return;
    var rows = Array.prototype.slice.call(grid.querySelectorAll('.tech-marquee-row'));
    if (!rows.length) return;
    var seen = {}, cats = [];
    rows.forEach(function (r) {
      var c = r.getAttribute('data-cat') || 'Other';
      if (!seen[c]) { seen[c] = true; cats.push(c); }
    });
    var labels = cats.map(function (c) {
      var row = rows.filter(function (r) { return r.getAttribute('data-cat') === c; })[0];
      var lab = row && row.querySelector('.tech-marquee-label');
      return { key: c, label: lab ? lab.textContent.trim() : c };
    });
    var toggleBtn = grid.querySelector('.tech-marquee-toggle');
    var bar = buildFilterBar([{ key: 'all', label: 'All' }].concat(labels), {
      label: '~/filter',
      ariaLabel: 'Filter technologies by category',
      onPick: function (key) {
        var showAll = key === 'all';
        rows.forEach(function (r) {
          toggleEl(r, showAll || r.getAttribute('data-cat') === key);
        });
        // A category filter overrides the "show more" toggle — hide it while
        // filtering, restore it on All so the default behavior returns.
        if (toggleBtn) toggleBtn.style.display = showAll ? '' : 'none';
      }
    });
    grid.parentNode.insertBefore(bar, grid);
  }

  // Project tech-tag chips — filter the project cards.
  function projectFilters() {
    var grid = document.querySelector('.projects-grid');
    if (!grid) return;
    grid.setAttribute('aria-live', 'polite');
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.project-card'));
    if (!cards.length) return;
    var tags = {};
    cards.forEach(function (c) {
      parseTags(c.getAttribute('data-tags')).forEach(function (t) { tags[t] = true; });
    });
    var tagList = Object.keys(tags).sort();
    if (!tagList.length) return;
    var empty = document.createElement('p');
    empty.className = 'filter-empty';
    empty.textContent = '// no projects match this filter';
    grid.parentNode.insertBefore(empty, grid);
    var bar = buildFilterBar([{ key: 'all', label: 'All' }].concat(tagList.map(function (t) { return { key: t, label: t }; })), {
      label: '~/filter',
      ariaLabel: 'Filter projects by technology',
      onPick: function (key) {
        var visible = 0;
        cards.forEach(function (c) {
          var match = matchesFilter(parseTags(c.getAttribute('data-tags')), key);
          toggleEl(c, match);
          if (match) visible++;
        });
        empty.style.display = (key === 'all' || visible > 0) ? 'none' : 'block';
      }
    });
    grid.parentNode.insertBefore(bar, grid);
  }

  // ── Interactive About terminal ─────────────────────────────
  // Pure command resolver — returns { lines: [...], clear: bool }.
  function aboutCommand(raw, data) {
    var lines = [];
    var cmd = String(raw || '').trim().toLowerCase();
    var d = data || {};
    if (cmd === 'help' || cmd === '?') {
      lines.push('available: help, skills, contact, status, projects, clear, cat about.txt');
    } else if (cmd === 'skills' || cmd === 'stack') {
      var st = d.techStack || [];
      if (!st.length) {
        lines.push('no skills data yet');
      } else {
        var groups = {};
        st.forEach(function (t) {
          var k = t.cat || 'Other';
          (groups[k] = groups[k] || []).push(t.name);
        });
        Object.keys(groups).forEach(function (k) {
          lines.push('[' + k + ']');
          lines.push('  ' + groups[k].join(', '));
        });
      }
    } else if (cmd === 'contact') {
      var links = (d.contactLinks && d.contactLinks.length) ? d.contactLinks
        : [{ label: 'Email', value: 'jhnbryn05@gmail.com' }, { label: 'GitHub', value: 'github.com/brokeCode05' }];
      links.forEach(function (l) {
        lines.push((l.label || 'Link') + ': ' + (l.value || l.url || ''));
      });
    } else if (cmd === 'status') {
      var status = d.about && d.about.terminal && d.about.terminal.status;
      lines.push('status: ' + (status || 'unknown'));
    } else if (cmd === 'projects') {
      var pj = d.projects || [];
      if (!pj.length) { lines.push('no projects yet'); }
      else { pj.forEach(function (p) { lines.push('- ' + (p.title || 'untitled')); }); }
    } else if (cmd === 'clear') {
      return { lines: [], clear: true };
    } else if (cmd === 'cat about.txt') {
      var t = (d.about && d.about.terminal) || {};
      lines.push('{');
      lines.push('  "role": ' + JSON.stringify(t.role || ''));
      lines.push('  "path": ' + JSON.stringify(t.path || []));
      lines.push('  "philosophy": ' + JSON.stringify(t.philosophy || ''));
      lines.push('  "status": ' + JSON.stringify(t.status || ''));
      lines.push('}');
    } else {
      lines.push('zsh: command not found: ' + String(raw || '').trim());
    }
    return { lines: lines, clear: false };
  }

  function aboutTerminal() {
    var terminal = document.querySelector('.about-terminal');
    if (!terminal) return;
    var body = terminal.querySelector('.terminal-body');
    if (!body) return;
    var ready = false, busy = false, input = null;
    var history = [], histIdx = -1;

    function makeInputLine() {
      var form = document.createElement('form');
      form.className = 'line about-term-form';
      form.setAttribute('aria-label', 'Terminal command input');
      var prompt = document.createElement('span');
      prompt.className = 'prompt';
      prompt.textContent = '$';
      input = document.createElement('input');
      input.className = 'about-term-input';
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('aria-label', 'Type a terminal command and press Enter');
      input.placeholder = 'type help';
      form.appendChild(prompt);
      form.appendChild(document.createTextNode(' '));
      form.appendChild(input);
      form.addEventListener('submit', function (e) { e.preventDefault(); runInput(); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (history.length) {
            histIdx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
            input.value = history[histIdx];
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (histIdx >= 0) {
            histIdx++;
            if (histIdx >= history.length) { histIdx = -1; input.value = ''; }
            else { input.value = history[histIdx]; }
          }
        }
      });
      return form;
    }

    function appendLine(cls, node) {
      var el = document.createElement('span');
      el.className = 'line ' + cls;
      el.appendChild(node);
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    }

    function typeText(el, text, done) {
      if (reducedMotion() || !text) { el.textContent = text; if (done) done(); return; }
      var i = 0;
      var timer = setInterval(function () {
        i++;
        el.textContent = text.substring(0, i);
        if (i >= text.length) {
          clearInterval(timer);
          if (done) done();
        }
      }, 16);
    }

    function runCommand(raw) {
      var res = aboutCommand(raw, typeof global.loadData === 'function' ? global.loadData() : null);
      var inputForm = body.querySelector('.about-term-form');
      // Echo the typed command right above the input line.
      var echo = document.createElement('span');
      echo.className = 'prompt';
      echo.textContent = '$';
      var echoLine = appendLine('', echo);
      echoLine.appendChild(document.createTextNode(' ' + raw.trim()));
      body.insertBefore(echoLine, inputForm);
      if (res.clear) {
        Array.prototype.forEach.call(body.children, function (n) {
          if (n !== inputForm && n !== echoLine) n.remove();
        });
        if (input) input.focus();
        return;
      }
      if (!res.lines.length) { if (input) input.focus(); return; }
      busy = true;
      var idx = 0;
      function next() {
        if (idx >= res.lines.length) { busy = false; if (input) input.focus(); return; }
        var text = res.lines[idx++];
        var out = document.createElement('span');
        out.className = 'line output' + (text.charAt(0) === ' ' ? ' indent' : '');
        body.insertBefore(out, inputForm);
        body.scrollTop = body.scrollHeight;
        typeText(out, text, function () { setTimeout(next, 90); });
      }
      next();
    }

    function runInput() {
      var raw = input.value;
      input.value = '';
      histIdx = -1;
      if (!raw.trim() || busy || !ready) return;
      history.push(raw.trim());
      if (history.length > 20) history.shift();
      runCommand(raw);
    }

    function upgrade() {
      if (ready) return;
      ready = true;
      var cl = body.querySelector('.cursor-line');
      if (cl) cl.remove();
      body.appendChild(makeInputLine());
      terminal.querySelectorAll('.about-cmd-bar .filter-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          if (!ready) return;
          input.value = chip.getAttribute('data-cmd') || '';
          runInput();
        });
      });
      setTimeout(function () { if (input) input.focus(); }, 350);
    }

    // Upgrade immediately if reduced motion (typewriter never runs, so the
    // static cursor-line stays) OR the typewriter already finished before we
    // attached (finish() stamps data-about-typed on the body). Otherwise wait
    // for the typewriter's finish() line (a newly ADDED .cursor-line) before
    // taking over, so the intro animation isn't disturbed.
    if (reducedMotion() || body.getAttribute('data-about-typed')) {
      upgrade();
    } else {
      var mo = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          if (m.type !== 'childList' || !m.addedNodes) return;
          Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.nodeType === 1 && n.classList && n.classList.contains('cursor-line')) upgrade();
          });
        });
      });
      mo.observe(body, { childList: true });
    }
  }

  // ── Timeline draw-on-scroll ───────────────────────────────
  // Pure: fraction (0–1) of the timeline that has been scrolled past.
  // Returns 0 when the timeline top is at the viewport bottom and 1 when
  // its bottom clears the viewport top.
  function timelineProgress(rect, vh) {
    if (!rect || !vh) return 0;
    var p = (vh - rect.top) / (rect.height + vh);
    return Math.max(0, Math.min(1, p));
  }

  // Drives the .timeline::before gradient line by setting --tl-progress
  // as a percentage on each timeline container while it scrolls through
  // the viewport. rAF-throttled; skipped under reduced motion.
  function timelineDraw() {
    if (reducedMotion()) return;
    var tls = document.querySelectorAll('.timeline');
    if (!tls.length) return;
    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      Array.prototype.forEach.call(tls, function (tl) {
        // Skip zero-height rects: timelines are populated asynchronously, and
        // an empty container would compute a misleading near-1 progress.
        var rect = tl.getBoundingClientRect();
        if (rect.height <= 0) return;
        var p = timelineProgress(rect, vh);
        tl.style.setProperty('--tl-progress', Math.round(p * 100) + '%');
      });
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Recompute once after full load too — fonts/images/async data can shift
    // layout without any scroll event.
    window.addEventListener('load', update, { passive: true });
    update();
  }

  // ── Hero role rotator (type / hold / delete cycle) ─────────
  function heroRoles(textEl, roles) {
    if (!textEl || !roles || !roles.length) return;
    if (reducedMotion()) { textEl.textContent = roles[0]; return; }
    var idx = 0, pos = 0, deleting = false, timer = null;
    function tick() {
      var word = roles[idx];
      if (!deleting) {
        pos++;
        textEl.textContent = word.slice(0, pos);
        if (pos === word.length) {
          deleting = true;
          timer = setTimeout(tick, 1900);
          return;
        }
        timer = setTimeout(tick, 65 + Math.random() * 45);
      } else {
        pos--;
        textEl.textContent = word.slice(0, pos);
        if (pos === 0) {
          deleting = false;
          var nextIdx = roles.indexOf(nextRole(roles, idx));
          idx = nextIdx === -1 ? (idx + 1) % roles.length : nextIdx;
          timer = setTimeout(tick, 380);
          return;
        }
        timer = setTimeout(tick, 30);
      }
    }
    timer = setTimeout(tick, 500);
  }

  // ── Count-up animation ─────────────────────────────────────
  function countUp(el, target, dur) {
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      el.textContent = String(Math.round(easeOutQuad(p) * target));
      if (p < 1) { requestAnimationFrame(frame); }
      else { el.textContent = String(target); }
    }
    requestAnimationFrame(frame);
  }

  // ── Data-driven hero stats row ─────────────────────────────
  function heroStats(container, data) {
    if (!container) return;
    container.setAttribute('role', 'list');
    var targets = statTargets(data);
    var labels = Object.keys(targets);
    if (!labels.length) { container.style.display = 'none'; return; }
    labels.forEach(function (label) {
      var item = document.createElement('div');
      item.className = 'hero-stat';
      item.setAttribute('role', 'listitem');
      var val = document.createElement('span');
      val.className = 'hero-stat-value';
      val.textContent = '0';
      var lab = document.createElement('span');
      lab.className = 'hero-stat-label';
      lab.textContent = label;
      item.appendChild(val);
      item.appendChild(lab);
      container.appendChild(item);
      if (reducedMotion()) { val.textContent = String(targets[label]); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            countUp(val, targets[label], 1100);
            io.disconnect();
          }
        });
      }, { threshold: 0.4 });
      io.observe(item);
    });
  }

  // ── Hero portrait parallax + hover tilt ────────────────────
  function parallax() {
    var media = document.getElementById('hero-media');
    var portrait = document.getElementById('hero-portrait');
    if (!media) return;
    if (reducedMotion()) return;
    var ticking = false;
    function update() {
      var y = window.scrollY;
      if (y < window.innerHeight * 1.15) {
        media.style.transform = 'translate3d(0,' + Math.round(y * 0.1) + 'px,0)';
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    if (finePointer() && portrait) {
      // Tilt the IMAGE, not the container: the container carries the
      // hero-floating animation, and CSS animations override inline styles.
      var imgEl = portrait.querySelector('img') || portrait;
      media.addEventListener('mousemove', function (e) {
        var r = media.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -5;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
        imgEl.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      });
      media.addEventListener('mouseleave', function () {
        imgEl.style.transform = '';
      });
    }
  }

  // ── Back-to-top with circular progress ring ────────────────
  function backToTop() {
    var btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>';
    document.body.appendChild(btn);
    function onScroll() {
      var st = window.scrollY || document.documentElement.scrollTop;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(100, Math.round(st / max * 100)) : 0;
      btn.style.setProperty('--p', p + '%');
      if (st > 420) { btn.classList.add('visible'); } else { btn.classList.remove('visible'); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    });
  }

  // ── Init (browser only) ────────────────────────────────────
  function init() {
    createCursorGlow();
    cardSpotlight();
    certTilt();
    heroRoles(document.getElementById('hero-roles-text'), ROLES);
    heroStats(document.getElementById('hero-stats'),
      typeof global.loadData === 'function' ? global.loadData() : null);
    parallax();
    backToTop();
    skillFilters();
    projectFilters();
    aboutTerminal();
    timelineDraw();
  }

  if (global && typeof global.document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  // ── Export for headless tests ──────────────────────────────
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      easeOutQuad: easeOutQuad,
      statTargets: statTargets,
      nextRole: nextRole,
      parseTags: parseTags,
      matchesFilter: matchesFilter,
      aboutCommand: aboutCommand,
      timelineProgress: timelineProgress,
      tiltDegrees: tiltDegrees
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
