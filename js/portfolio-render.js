// ─── Section HTML Renderers (view layer, moved from portfolio-data.js) ───
var BRAND_LOGOS = {
  terminal:
    '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 22 14 16 6 10"/><line x1="18" y1="24" x2="26" y2="24"/></svg>',
  shield:
    '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 28s10-5 10-12V8l-10-4L6 8v8c0 7 10 12 10 12z"/></svg>'
};

// Removed: SIMPLE_ICONS_BASE — using local TECH_ICONS from js/tech-icons.js instead

// ─── Render Section HTML ──────────────────────────────

// Map known categories to display labels
var CATEGORY_LABELS = {
  Programming: 'Languages',
  Web: 'Web Tech',
  Database: 'Databases',
  VCS: 'Version Control',
  DevTools: 'Dev Tools',
  Networking: 'Networking',
  OS: 'OS'
};

// Order of categories (known first, then any new ones)
var CATEGORY_ORDER = ['Programming', 'Web', 'Database', 'VCS', 'DevTools', 'Networking', 'OS'];

function renderTechStack(data) {
  if (!data || !data.techStack) return '';

  // Group items by category dynamically
  var groups = {};
  data.techStack.forEach(function (tech) {
    var cat = tech.cat || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(tech);
  });

  // Determine row order: known categories first, then new ones sorted alphabetically
  var seen = {};
  CATEGORY_ORDER.forEach(function (c) {
    seen[c] = true;
  });
  var rowOrder = CATEGORY_ORDER.filter(function (c) {
    return groups[c];
  });
  Object.keys(groups)
    .sort()
    .forEach(function (c) {
      if (!seen[c]) rowOrder.push(c);
    });

  var directions = ['right', 'left'];
  var html = '';
  var extraCount = 0;

  rowOrder.forEach(function (cat, ri) {
    var items = groups[cat];
    if (!items || !items.length) return;
    var dir = directions[ri % 2];
    var label = CATEGORY_LABELS[cat] || cat;

    var itemsHtml = items
      .map(function (tech) {
        var logoHtml;
        if (tech.logoUrl) {
          var fallbackSvgUrl = BRAND_LOGOS[tech.icon] || BRAND_LOGOS.terminal;
          logoHtml =
            '<img class="tech-logo-img" src="' +
            escapeHtml(tech.logoUrl) +
            '" alt="' +
            escapeHtml(tech.name) +
            '" loading="lazy" onerror="handleTechImgError(this)" />' +
            '<span class="tech-logo-fallback" aria-hidden="true" style="display:none">' +
            fallbackSvgUrl +
            '</span>';
        } else if (tech.logo) {
          logoHtml =
            '<img class="tech-logo-img" src="' +
            escapeHtml(tech.logo) +
            '" alt="' +
            escapeHtml(tech.name) +
            '" />';
        } else if (tech.brand) {
          var slug = tech.brand.toLowerCase();
          var brandLogo =
            (window.TECH_ICONS && window.TECH_ICONS[slug]) || BRAND_LOGOS[tech.icon] || BRAND_LOGOS.terminal;
          logoHtml = '<span class="tech-logo-icon-inline" aria-hidden="true">' + brandLogo + '</span>';
        } else {
          var svg = BRAND_LOGOS[tech.icon] || BRAND_LOGOS.terminal;
          logoHtml = '<span class="tech-logo-fallback" aria-hidden="true">' + svg + '</span>';
        }
        return (
          '<span class="tech-logo">' +
          '<span class="tech-logo-icon">' +
          logoHtml +
          '</span>' +
          '<span class="tech-logo-name">' +
          escapeHtml(tech.name) +
          '</span>' +
          '</span>'
        );
      })
      .join('');

    var minItems = 20;
    var repeatCount = Math.max(5, Math.ceil(minItems / items.length));
    var trackHtml = '';
    for (var r = 0; r < repeatCount; r++) {
      trackHtml += itemsHtml;
    }

    // First 3 categories are always visible, rest are extra (hidden behind toggle)
    var isExtra = ri >= 3;
    if (isExtra) extraCount++;
    var extraAttr = isExtra
      ? ' data-extra="true" style="animation-delay:' + ((ri - 3) * 0.06).toFixed(2) + 's"'
      : '';

    html +=
      '<div class="tech-marquee-row ' +
      dir +
      '" data-cat="' +
      escapeHtml(cat) +
      '"' +
      extraAttr +
      '>' +
      '<span class="tech-marquee-label">' +
      '<span class="tech-marquee-dot" aria-hidden="true"></span>' +
      escapeHtml(label) +
      '</span>' +
      '<div class="tech-marquee-track-wrap">' +
      '<div class="tech-marquee-track">' +
      trackHtml +
      '</div>' +
      '</div>' +
      '</div>';
  });

  if (extraCount > 0) {
    html +=
      '<button class="tech-marquee-toggle" id="tech-toggle-btn" aria-expanded="false" data-hidden="' +
      extraCount +
      '">' +
      '<span class="tech-toggle-text">Show ' +
      '<span class="tech-toggle-count">' +
      extraCount +
      '</span> more categor' +
      (extraCount === 1 ? 'y' : 'ies') +
      '</span>' +
      '<svg class="tech-toggle-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</button>';
  }
  return html;
}

function renderCurrently(data) {
  if (!data || !data.currently || !data.currently.length) return '';
  return data.currently
    .map(function (tag) {
      return '<span class="learning-tag">' + escapeHtml(tag) + '</span>';
    })
    .join('');
}

var PROJECT_ICONS = [
  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
  '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
];

function renderProjects(data) {
  if (!data || !data.projects) return '';
  return data.projects
    .map(function (proj, idx) {
      var iconPath = PROJECT_ICONS[idx % PROJECT_ICONS.length];
      var links = '';
      if (proj.links) {
        if (proj.links.live)
          links +=
            '<a href="' +
            escapeHtml(proj.links.live) +
            '" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Live Demo</a> ';
        if (proj.links.repo)
          links +=
            '<a href="' +
            escapeHtml(proj.links.repo) +
            '" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">GitHub</a>';
      }
      var tags = (proj.tags || [])
        .map(function (t) {
          return '<span class="tech-tag">' + escapeHtml(t) + '</span>';
        })
        .join('');
      var tagsAttr = 'data-tags="' + escapeHtml((proj.tags || []).join(',')) + '"';
      var shot = proj.screenshot || '';
      var shotAttr = shot ? ' data-shot="' + escapeHtml(shot) + '"' : '';
      var status = proj.status === 'draft' ? 'Draft' : 'Published';
      var statusCls = proj.status === 'draft' ? 'is-draft' : 'is-live';
      // Media area — an uploaded screenshot when one exists (admin uploads it),
      // otherwise a terminal placeholder so cards without repos still look
      // intentional instead of empty.
      var mediaHtml =
        '<div class="project-card-media">' +
        (shot
          ? '<img class="project-card-shot" src="' +
            escapeHtml(shot) +
            '" alt="' +
            escapeHtml(proj.title) +
            ' screenshot" loading="lazy" />' +
            '<button type="button" class="project-shot-expand" aria-label="View ' +
            escapeHtml(proj.title) +
            ' screenshot" data-expand="1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg></button>' +
            '<span class="project-card-shot-status ' +
            statusCls +
            '">' +
            status +
            '</span>'
          : '<div class="project-card-terminal" aria-hidden="true">' +
            '<span class="project-card-terminal-dots"><i></i><i></i><i></i></span>' +
            '<span class="project-card-terminal-cmd">$ ./' +
            escapeHtml(
              (proj.title || 'project')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 20)
            ) +
            ' --demo</span>' +
            '<span class="project-card-terminal-cursor" aria-hidden="true">\u258A</span>' +
            '</div>' +
            '<span class="project-card-shot-status ' +
            statusCls +
            '">' +
            status +
            '</span>') +
        '</div>';
      return (
        '<article class="project-card" ' +
        tagsAttr +
        shotAttr +
        ' data-reveal data-reveal-delay="' +
        (100 + idx * 100) +
        '">' +
        mediaHtml +
        '<div class="project-card-header">' +
        '<div class="project-card-icon" aria-hidden="true">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        iconPath +
        '</svg>' +
        '</div>' +
        '<h3 class="project-card-title">' +
        escapeHtml(proj.title) +
        '</h3>' +
        '</div>' +
        '<p class="project-card-description">' +
        escapeHtml(proj.description) +
        '</p>' +
        '<div class="project-card-links flex gap-sm" style="margin-top:auto;padding-top:var(--space-md)">' +
        links +
        '</div>' +
        '<div class="project-card-tech flex flex-wrap gap-sm">' +
        tags +
        '</div>' +
        '</article>'
      );
    })
    .join('');
}

function renderCerts(data) {
  if (!data || !data.certifications) return '';
  return data.certifications
    .map(function (cert, idx) {
      var path = escapeHtml(cert.path || '');
      var name = escapeHtml(cert.name);
      return (
        '<div class="cert-card" data-cert-path="' +
        path +
        '" data-cert-name="' +
        name +
        '" data-cert-issuer="' +
        escapeHtml(cert.issuer) +
        '" data-cert-date="' +
        escapeHtml(cert.date) +
        '" data-cert-key="' +
        escapeHtml(cert.id || 'cert-' + idx) +
        '" data-cert-index="' +
        idx +
        '" data-reveal onclick="openCertViewer(this)" onkeydown="if(event.key===\' \'||event.key===\'Enter\'){event.preventDefault();openCertViewer(this)}" tabindex="0" role="button">' +
        '<div class="cert-card-front">' +
        '<div class="cert-card-badge" aria-hidden="true">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
        '</div>' +
        '<div class="cert-card-body">' +
        '<h3 class="cert-card-title">' +
        name +
        '</h3>' +
        '<p class="cert-card-issuer">' +
        escapeHtml(cert.issuer) +
        '</p>' +
        '<span class="cert-card-date">' +
        cert.date +
        '</span>' +
        '</div>' +
        '</div>' +
        '</div>'
      );
    })
    .join('');
}

function renderExperience(data) {
  if (!data || !data.experience) return '';
  return data.experience
    .map(function (exp) {
      var bullets = exp.bullets
        .map(function (b) {
          return '<li>' + escapeHtml(b) + '</li>';
        })
        .join('');
      return (
        '<div class="timeline-item" data-reveal>' +
        '<div class="timeline-marker" aria-hidden="true"></div>' +
        '<div class="timeline-content">' +
        '<div class="timeline-meta flex items-center justify-between mb-sm">' +
        '<h3 class="timeline-title">' +
        escapeHtml(exp.role) +
        '</h3>' +
        '<time class="timeline-date">' +
        escapeHtml(exp.company) +
        '</time>' +
        '</div>' +
        '<ul class="timeline-bullets">' +
        bullets +
        '</ul>' +
        '</div>' +
        '</div>'
      );
    })
    .join('');
}

function renderLearningJourney(data) {
  if (!data || !data.learning) return '';
  return data.learning
    .map(function (item, idx) {
      return (
        '<div class="timeline-item" data-reveal data-reveal-delay="' +
        (100 + idx * 100) +
        '">' +
        '<div class="timeline-marker" aria-hidden="true"></div>' +
        '<div class="timeline-content">' +
        '<time class="timeline-date" datetime="' +
        escapeHtml(item.year) +
        '">' +
        escapeHtml(item.year) +
        '</time>' +
        '<h3 class="timeline-title">' +
        escapeHtml(item.title) +
        '</h3>' +
        '<p class="timeline-description">' +
        escapeHtml(item.description) +
        '</p>' +
        '</div>' +
        '</div>'
      );
    })
    .join('');
}

// Contact link icons (small inline SVGs, no external deps)
var CONTACT_ICONS = {
  email:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  github:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
  linkedin:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>',
  generic:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'
};

// ─── Contact Links Renderer ───────────────────────────
function renderContactLinks(data) {
  var links =
    data && data.contactLinks && data.contactLinks.length ? data.contactLinks : DEFAULT_CONTACT_LINKS;
  return links
    .map(function (link) {
      var icon = CONTACT_ICONS[link.icon] || CONTACT_ICONS.generic;
      var display = link.value || link.url || '';
      var external = (link.url || '').indexOf('mailto:') !== 0;
      return (
        '<div class="contact-item">' +
        '<span class="contact-item-label">' +
        escapeHtml(link.label || '') +
        '</span>' +
        '<a href="' +
        escapeHtml(link.url || '#') +
        '" class="contact-item-value"' +
        (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
        ' aria-label="' +
        escapeHtml(link.label || '') +
        '">' +
        icon +
        escapeHtml(display) +
        '</a>' +
        '</div>'
      );
    })
    .join('');
}

// ─── Helper ───────────────────────────────────────────

function handleTechImgError(img) {
  img.style.display = 'none';
  var fb = img.parentNode.querySelector('.tech-logo-fallback');
  if (fb) fb.style.display = 'flex';
}

(function () {
  'use strict';

  // ─── Load data (cloud-first, localStorage fallback) ───
  (function loadAndRender() {
    var localStorageData = loadData();
    var resolved = false;

    // ─── About terminal typewriter (matches Contact) ───
    var aboutTyped = false;
    var aboutTypeObserver = null;
    var aboutTypeTimer = null;

    function typeAboutTerminal(body) {
      var lines = [];
      var children = body.querySelectorAll('.line');
      Array.prototype.forEach.call(children, function (line) {
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
        if (li >= lines.length) {
          finish();
          return;
        }
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
        aboutTypeTimer = setInterval(function () {
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
      if (aboutTypeTimer) {
        clearInterval(aboutTypeTimer);
        aboutTypeTimer = null;
      }
      if (aboutTyped) return;
      var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) return;
      if (aboutTypeObserver) aboutTypeObserver.disconnect();
      if (!('IntersectionObserver' in window)) {
        typeAboutTerminal(body);
        return;
      }
      aboutTypeObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              aboutTypeObserver.disconnect();
              typeAboutTerminal(body);
            }
          });
        },
        { threshold: 0.2 }
      );
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
        badgeImg.src =
          data.hero.photo || (window.PORTFOLIO_META && window.PORTFOLIO_META.photo) || 'img/johnbryan.jpg';
        badgeImg.style.display = 'block';
      }
      var badgeName = document.getElementById('hero-badge-name');
      if (badgeName)
        badgeName.textContent =
          data.hero.name || (window.PORTFOLIO_META && window.PORTFOLIO_META.name) || 'John Bryan Capellan';
      var badgeRole = document.getElementById('hero-badge-role');
      if (badgeRole)
        badgeRole.textContent =
          data.hero.badge ||
          (window.PORTFOLIO_META && window.PORTFOLIO_META.role) ||
          'Information Technology Student';
      var badgeRole2 = document.getElementById('hero-badge-role2');
      if (badgeRole2) {
        var role2 = data.hero.badge2 || '';
        badgeRole2.textContent = role2;
        badgeRole2.style.display = role2 ? 'block' : 'none';
      }
      var badgeIdno = document.getElementById('hero-badge-idno');
      if (badgeIdno)
        badgeIdno.textContent =
          data.hero.idNumber || (window.PORTFOLIO_META && window.PORTFOLIO_META.idNumber) || 'IT-2024-0842';
      var personName =
        data.hero.name || (window.PORTFOLIO_META && window.PORTFOLIO_META.name) || 'John Bryan Capellan';
      var badgeCardEl = document.getElementById('hero-badge-card');
      if (badgeCardEl) {
        badgeCardEl.setAttribute(
          'aria-label',
          'Student ID badge — ' + personName + '. Click to flip, or use the corner button to enlarge.'
        );
      }

      // Badge header (front + back) — admin-editable school title/subtitle
      var schoolTitle =
        data.hero.schoolTitle || (window.PORTFOLIO_META && window.PORTFOLIO_META.schoolTitle) || 'Student ID';
      var schoolSub =
        data.hero.schoolSub ||
        (window.PORTFOLIO_META && window.PORTFOLIO_META.schoolSub) ||
        'brokeCode05.dev';
      var badgeSchool = document.getElementById('hero-badge-school');
      if (badgeSchool) badgeSchool.textContent = schoolTitle;
      var badgeSchoolSub = document.getElementById('hero-badge-school-sub');
      if (badgeSchoolSub) badgeSchoolSub.textContent = schoolSub;
      var badgeBackSchool = document.getElementById('hero-badge-back-school');
      if (badgeBackSchool) badgeBackSchool.textContent = schoolTitle;
      var badgeBackSchoolSub = document.getElementById('hero-badge-back-school-sub');
      if (badgeBackSchoolSub) badgeBackSchoolSub.textContent = schoolSub;
      var badgeBackId = document.querySelector('.hero-badge-back-id');
      if (badgeBackId)
        badgeBackId.textContent =
          data.hero.idNumber || (window.PORTFOLIO_META && window.PORTFOLIO_META.idNumber) || 'IT-2024-0842';
      var badgeFallback = document.getElementById('hero-badge-photo-fallback');
      if (badgeFallback) badgeFallback.style.display = 'none';

      // QR link on the ID back — admin-set target overrides the site default
      var badgeQr = document.getElementById('hero-badge-qr-real');
      var qrTarget = (data.hero.qrLink || '').trim();
      var qrLabel = ''; // human-readable target for the scan label / flip hint
      if (badgeQr && qrTarget) {
        if (!/^[a-z][a-z0-9+.-]*:/i.test(qrTarget)) qrTarget = 'https://' + qrTarget;
        badgeQr.src =
          'https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=' +
          encodeURIComponent(qrTarget);
        badgeQr.alt = 'QR code — scan to open ' + qrTarget;
        badgeQr.style.display = 'block';
        var qrFallback = document.getElementById('hero-badge-qr-fallback');
        if (qrFallback) qrFallback.style.display = 'none';
        // Friendly brand for the scan label + flip hint
        var host = '';
        try {
          host = new URL(qrTarget).hostname;
        } catch (e) {
          host = qrTarget;
        }
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
          knownBrands.indexOf(qrLabel) > -1 ? 'flip to scan my ' + qrLabel : 'click to flip';
      }

      // ─── About ────────────────────────────────
      var aboutParagraph = document.querySelector('.about-text p');
      if (aboutParagraph) aboutParagraph.textContent = data.about.bio || '';

      // Terminal JSON
      var terminalBody = document.querySelector('.about-terminal .terminal-body');
      if (terminalBody && data.about.terminal) {
        var t = data.about.terminal;
        var pathStr = (t.path || [])
          .map(function (p) {
            return '\"' + p + '\"';
          })
          .join(', ');
        terminalBody.innerHTML =
          '<span class="line"><span class="prompt">$</span> cat about.txt</span>' +
          '<span class="line output">{</span>' +
          '<span class="line output indent">\"role\": \"' +
          escapeHtml(t.role || '') +
          '\",</span>' +
          '<span class="line output indent">\"path\": [' +
          pathStr +
          '],</span>' +
          '<span class="line output indent">\"philosophy\": \"' +
          escapeHtml(t.philosophy || '') +
          '\",</span>' +
          '<span class="line output indent">\"status\": \"' +
          escapeHtml(t.status || '') +
          '\"</span>' +
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
          techGrid.addEventListener('click', function (e) {
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
      var skillsSection =
        (techGrid && techGrid.closest('section')) || (learningList && learningList.closest('section'));
      if (skillsSection) {
        var stackEmpty = !(techGrid && techGrid.innerHTML.trim());
        var currentlyEmpty = !(learningList && learningList.innerHTML.trim());
        skillsSection.style.display = stackEmpty && currentlyEmpty ? 'none' : '';
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
            footerUpdated.textContent =
              '— last updated ' +
              updatedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            footerUpdated.hidden = false;
          }
        }
      }

      // ─── Re-observe new [data-reveal] elements ───
      (function () {
        var reducedMotion =
          window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) return;
        var freshReveals = document.querySelectorAll('[data-reveal]:not(.revealed)');
        if (!freshReveals.length) return;
        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
              }
            });
          },
          { rootMargin: '0px 0px -60px 0px', threshold: 0.1 }
        );
        freshReveals.forEach(function (el) {
          observer.observe(el);
        });
      })();

      initAboutTypewriter();
    }

    // Render with local data immediately (so user sees content fast)
    renderPortfolio(localStorageData);

    // Async cloud fetch — runs in background, upgrades if newer data found
    if (typeof fetchFromSupabase === 'function') {
      dbg('[cloud-sync] Fetching from Supabase...');
      fetchFromSupabase()
        .then(function (result) {
          if (resolved) {
            dbg('[cloud-sync] Already resolved, skipping');
            return;
          }
          resolved = true;

          var cloudData = result && result.ok ? result.data : null;
          if (result && !result.ok) {
            dbg('[cloud-sync] Fetch failed:', result.error || 'unknown error');
          }

          dbg(
            '[cloud-sync] Cloud data received:',
            cloudData ? 'keys=' + Object.keys(cloudData).join(',') : 'null'
          );

          if (cloudData && Object.keys(cloudData).length > 3) {
            var cloudTime = cloudData._syncTimestamp || '';
            var localTime = localStorageData._syncTimestamp || '';
            dbg('[cloud-sync] Cloud timestamp:', cloudTime, '| Local timestamp:', localTime);

            // Only overwrite local data if cloud data is newer or local has no timestamp
            var shouldUpdate = cloudTime > localTime;

            if (shouldUpdate) {
              dbg('[cloud-sync] Cloud data is newer. Saving to localStorage and re-rendering...');
              savePortfolioData(cloudData);
              renderPortfolio(cloudData);
              dbg('[cloud-sync] Re-render complete!');
            } else if (cloudTime === localTime) {
              dbg('[cloud-sync] Data is in sync (same timestamp). No update needed.');
            } else {
              dbg('[cloud-sync] Local data is newer than cloud. Keeping local data.');
            }
          } else {
            dbg(
              '[cloud-sync] Cloud data rejected: keys=' +
                (cloudData ? Object.keys(cloudData).length : 0) +
                ' (need > 3)'
            );
          }

          // Hide the loading screen now that we have the best data
          if (typeof window.hideLoader === 'function') {
            window.hideLoader();
          }
        })
        .catch(function (err) {
          console.error('[cloud-sync] ERROR:', err ? err.message || err : 'unknown error');
          if (resolved) return;
          resolved = true;
          if (typeof window.hideLoader === 'function') {
            window.hideLoader();
          }
        });
    } else {
      dbg('[cloud-sync] fetchFromSupabase not available');
      if (typeof window.hideLoader === 'function') {
        window.hideLoader();
      }
    }
  })();
})();
