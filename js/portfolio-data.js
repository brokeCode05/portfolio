/* ===================================================
   Portfolio Data Layer
   Manages all editable portfolio content via localStorage
   =================================================== */

const STORAGE_KEY = 'portfolio_data';
const ADMIN_PASSWORD_KEY = 'portfolio_admin_pw';
const GITHUB_TOKEN_KEY = 'portfolio_github_token';

// (Hardcoded defaults removed — admin panel + cloud sync manage all data)

// ─── LocalStorage CRUD ────────────────────────────────

function getPortfolioData() {
  try {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return null;
}

function savePortfolioData(data) {
  // Stamp with current time to protect local edits from being overwritten by older cloud data
  data._syncTimestamp = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function resetPortfolioData() {
  localStorage.removeItem(STORAGE_KEY);
}

function getAdminPassword() {
  try { return localStorage.getItem(ADMIN_PASSWORD_KEY) || ''; } catch(e) { return ''; }
}

function setAdminPassword(pw) {
  try { localStorage.setItem(ADMIN_PASSWORD_KEY, pw); } catch(e) {}
}

function getGitHubToken() {
  try { return localStorage.getItem(GITHUB_TOKEN_KEY) || ''; } catch(e) { return ''; }
}

function setGitHubToken(token) {
  try { localStorage.setItem(GITHUB_TOKEN_KEY, token); } catch(e) {}
}

// ─── Supabase Cloud Sync (Secure) ─────────────────────
// Uses Row Level Security (RLS) with admin password header
// Service key is NEVER stored in the browser.

const SUPABASE_URL = 'https://mnsgwitzgwhmiccbojck.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uc2d3aXR6Z3dobWljY2JvamNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMTA3NzIsImV4cCI6MjEwMDg4Njc3Mn0.KQnCRuyC8amh7On1A5G-tVx1yRvUlPxSZiFlTEpzy0g';

async function fetchFromSupabase() {
  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, 8000);
  try {
    var resp = await fetch(SUPABASE_URL + '/rest/v1/portfolio_data?id=eq.1&select=json_data', {
      signal: controller.signal,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      }
    });
    clearTimeout(timeoutId);
    if (!resp.ok) return null;
    var rows = await resp.json();
    if (rows && rows.length > 0 && rows[0].json_data) {
      return rows[0].json_data;
    }
  } catch(e) {
    console.log('[cloud-sync] Fetch error:', e.name === 'AbortError' ? 'Timeout (8s)' : (e.message || e));
  }
  clearTimeout(timeoutId);
  return null;
}

async function pushToSupabase(data) {
  // Uses the admin password as a custom header that the RLS policy checks
  var adminPw = getAdminPassword();
  if (!adminPw) return false;
  var now = new Date().toISOString();
  // Stamp the data with our sync timestamp so the next sync can compare
  data._syncTimestamp = now;
  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, 8000);
  try {
    var resp = await fetch(SUPABASE_URL + '/rest/v1/portfolio_data', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
        'x-portfolio-secret': adminPw
      },
      body: JSON.stringify({
        id: 1,
        json_data: data,
        updated_at: now
      })
    });
    clearTimeout(timeoutId);
    if (resp.ok) {
      // Also stamp the local copy so we know the cloud is in sync
      savePortfolioData(data);
    }
    return resp.ok;
  } catch(e) {
    console.log('[cloud-sync] Push error:', e.name === 'AbortError' ? 'Timeout (8s)' : (e.message || e));
  }
  clearTimeout(timeoutId);
  return false;
}

// ─── Contact Messages (Phase 3) ──────────────────────
// Public visitors submit via the contact form (RLS allows anon INSERT).
// The admin reads/marks them via their authenticated Supabase session.
// Optional: Supabase Edge Function that verifies the Turnstile token server-side
// before inserting the message (deploy: supabase/functions/contact). Leave empty
// to keep the direct REST insert (token stored for audit, not verified).
var CONTACT_FUNCTION_URL = '';

async function submitContactMessage(msg) {
  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, 8000);
  try {
    var headers = {
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };
    var endpoint;
    if (CONTACT_FUNCTION_URL) {
      endpoint = CONTACT_FUNCTION_URL;
    } else {
      endpoint = SUPABASE_URL + '/rest/v1/contact_messages';
      headers['apikey'] = SUPABASE_ANON_KEY;
      headers['Authorization'] = 'Bearer ' + SUPABASE_ANON_KEY;
    }
    var resp = await fetch(endpoint, {
      signal: controller.signal,
      method: 'POST',
      headers: headers,
      body: JSON.stringify(msg)
    });
    clearTimeout(timeoutId);
    return resp.ok;
  } catch(e) {
    console.log('[contact] Submit error:', e.name === 'AbortError' ? 'Timeout (8s)' : (e.message || e));
  }
  clearTimeout(timeoutId);
  return false;
}

// ─── Data Getters (with fallback) ────────────────────

function loadData() {
  var saved = getPortfolioData();
  if (saved) {
    return saved;
  }
  // Return empty data structure — admin panel populates via cloud sync
  return {
    hero: { badge: '', status: '', title: '', description: '' },
    about: { bio: '', terminal: { role: '', path: [], philosophy: '', status: '' } },
    techStack: [],
    currently: [],
    projects: [],
    certifications: [],
    experience: [],
    learning: [],
    contactLinks: []
  };
}

var BRAND_LOGOS = {
  terminal: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 22 14 16 6 10"/><line x1="18" y1="24" x2="26" y2="24"/></svg>',
  shield: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 28s10-5 10-12V8l-10-4L6 8v8c0 7 10 12 10 12z"/></svg>'
};

// Removed: SIMPLE_ICONS_BASE — using local TECH_ICONS from js/tech-icons.js instead

// ─── Render Section HTML ──────────────────────────────

// Map known categories to display labels
var CATEGORY_LABELS = {
  'Programming': 'Languages',
  'Web': 'Web Tech',
  'Database': 'Databases',
  'VCS': 'Version Control',
  'DevTools': 'Dev Tools',
  'Networking': 'Networking',
  'OS': 'OS'
};

// Order of categories (known first, then any new ones)
var CATEGORY_ORDER = ['Programming', 'Web', 'Database', 'VCS', 'DevTools', 'Networking', 'OS'];

function renderTechStack(data) {
  if (!data || !data.techStack) return '';
  
  // Group items by category dynamically
  var groups = {};
  data.techStack.forEach(function(tech) {
    var cat = tech.cat || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(tech);
  });
  
  // Determine row order: known categories first, then new ones sorted alphabetically
  var seen = {};
  CATEGORY_ORDER.forEach(function(c) { seen[c] = true; });
  var rowOrder = CATEGORY_ORDER.filter(function(c) { return groups[c]; });
  Object.keys(groups).sort().forEach(function(c) {
    if (!seen[c]) rowOrder.push(c);
  });
  
  var directions = ['right', 'left'];
  var html = '';
  var extraCount = 0;
  
  rowOrder.forEach(function(cat, ri) {
    var items = groups[cat];
    if (!items || !items.length) return;
    var dir = directions[ri % 2];
    var label = CATEGORY_LABELS[cat] || cat;
    
    var itemsHtml = items.map(function(tech) {
      var logoHtml;
      if (tech.logoUrl) {
        var fallbackSvgUrl = (BRAND_LOGOS[tech.icon] || BRAND_LOGOS.terminal);
        logoHtml = '<img class="tech-logo-img" src="' + escapeHtml(tech.logoUrl) + '" alt="' + escapeHtml(tech.name) + '" loading="lazy" onerror="handleTechImgError(this)" />' +
          '<span class="tech-logo-fallback" aria-hidden="true" style="display:none">' + fallbackSvgUrl + '</span>';
      } else if (tech.logo) {
        logoHtml = '<img class="tech-logo-img" src="' + escapeHtml(tech.logo) + '" alt="' + escapeHtml(tech.name) + '" />';
      } else if (tech.brand) {
        var slug = tech.brand.toLowerCase();
        var brandLogo = (window.TECH_ICONS && window.TECH_ICONS[slug]) || BRAND_LOGOS[tech.icon] || BRAND_LOGOS.terminal;
        logoHtml = '<span class="tech-logo-icon-inline" aria-hidden="true">' + brandLogo + '</span>';
      } else {
        var svg = BRAND_LOGOS[tech.icon] || BRAND_LOGOS.terminal;
        logoHtml = '<span class="tech-logo-fallback" aria-hidden="true">' + svg + '</span>';
      }
      return '<span class="tech-logo">' +
        '<span class="tech-logo-icon">' + logoHtml + '</span>' +
        '<span class="tech-logo-name">' + escapeHtml(tech.name) + '</span>' +
      '</span>';
    }).join('');
    
    var minItems = 20;
    var repeatCount = Math.max(5, Math.ceil(minItems / items.length));
    var trackHtml = '';
    for (var r = 0; r < repeatCount; r++) {
      trackHtml += itemsHtml;
    }
    
    // First 3 categories are always visible, rest are extra (hidden behind toggle)
    var isExtra = ri >= 3;
    if (isExtra) extraCount++;
    var extraAttr = isExtra ? ' data-extra="true" style="animation-delay:' + ((ri - 3) * 0.06).toFixed(2) + 's"' : '';
    
    html += '<div class="tech-marquee-row ' + dir + '"' + extraAttr + '>' +
      '<span class="tech-marquee-label">' +
        '<span class="tech-marquee-dot" aria-hidden="true"></span>' +
        escapeHtml(label) +
      '</span>' +
      '<div class="tech-marquee-track-wrap">' +
        '<div class="tech-marquee-track">' + trackHtml + '</div>' +
      '</div>' +
    '</div>';
  });
  
  if (extraCount > 0) {
    html += '<button class="tech-marquee-toggle" id="tech-toggle-btn" aria-expanded="false" data-hidden="' + extraCount + '">' +
      '<span class="tech-toggle-text">Show ' +
      '<span class="tech-toggle-count">' + extraCount + '</span> more categor' + (extraCount === 1 ? 'y' : 'ies') +
      '</span>' +
      '<svg class="tech-toggle-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
    '</button>';
  }
  return html;
}

function renderCurrently(data) {
  if (!data || !data.currently || !data.currently.length) return '';
  return data.currently.map(function(tag) {
    return '<span class="learning-tag">' + escapeHtml(tag) + '</span>';
  }).join('');
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
  return data.projects.map(function(proj, idx) {
    var iconPath = PROJECT_ICONS[idx % PROJECT_ICONS.length];
    var links = '';
    if (proj.links) {
      if (proj.links.live) links += '<a href="' + escapeHtml(proj.links.live) + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Live Demo</a> ';
      if (proj.links.repo) links += '<a href="' + escapeHtml(proj.links.repo) + '" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">GitHub</a>';
    }
    var tags = (proj.tags || []).map(function(t) { return '<span class="tech-tag">' + escapeHtml(t) + '</span>'; }).join('');
    return '<article class="project-card" data-reveal data-reveal-delay="' + (100 + idx * 100) + '">' +
      '<div class="project-card-header">' +
        '<div class="project-card-icon" aria-hidden="true">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + iconPath + '</svg>' +
        '</div>' +
        '<h3 class="project-card-title">' + escapeHtml(proj.title) + '</h3>' +
      '</div>' +
      '<p class="project-card-description">' + escapeHtml(proj.description) + '</p>' +
      '<div class="project-card-links flex gap-sm" style="margin-bottom:var(--space-md)">' + links + '</div>' +
      '<div class="project-card-tech flex flex-wrap gap-sm">' + tags + '</div>' +
    '</article>';
  }).join('');
}

function renderCerts(data) {
  if (!data || !data.certifications) return '';
  return data.certifications.map(function(cert, idx) {
    var path = escapeHtml(cert.path || '');
    return '<div class="cert-card" data-cert-path="' + path + '" data-cert-name="' + escapeHtml(cert.name) + '" data-cert-issuer="' + escapeHtml(cert.issuer) + '" data-cert-date="' + escapeHtml(cert.date) + '" data-cert-key="' + escapeHtml(cert.id || 'cert-' + idx) + '" data-cert-index="' + idx + '" data-reveal onclick="openCertViewer(this)" onkeydown="if(event.key===\' \'||event.key===\'Enter\'){event.preventDefault();openCertViewer(this)}" tabindex="0" role="button">' +
      '<div class="cert-card-badge" aria-hidden="true">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
      '</div>' +
      '<div class="cert-card-body">' +
        '<h3 class="cert-card-title">' + escapeHtml(cert.name) + '</h3>' +
        '<p class="cert-card-issuer">' + escapeHtml(cert.issuer) + '</p>' +
        '<span class="cert-card-date">' + cert.date + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderExperience(data) {
  if (!data || !data.experience) return '';
  return data.experience.map(function(exp) {
    var bullets = exp.bullets.map(function(b) { return '<li>' + escapeHtml(b) + '</li>'; }).join('');
    return '<div class="timeline-item" data-reveal>' +
      '<div class="timeline-marker" aria-hidden="true"></div>' +
      '<div class="timeline-content">' +
        '<div class="timeline-meta flex items-center justify-between mb-sm">' +
          '<h3 class="timeline-title">' + escapeHtml(exp.role) + '</h3>' +
          '<time class="timeline-date">' + escapeHtml(exp.company) + '</time>' +
        '</div>' +
        '<ul class="timeline-bullets">' + bullets + '</ul>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderLearningJourney(data) {
  if (!data || !data.learning) return '';
  return data.learning.map(function(item, idx) {
    return '<div class="timeline-item" data-reveal data-reveal-delay="' + (100 + idx * 100) + '">' +
      '<div class="timeline-marker" aria-hidden="true"></div>' +
      '<div class="timeline-content">' +
        '<time class="timeline-date" datetime="' + escapeHtml(item.year) + '">' + escapeHtml(item.year) + '</time>' +
        '<h3 class="timeline-title">' + escapeHtml(item.title) + '</h3>' +
        '<p class="timeline-description">' + escapeHtml(item.description) + '</p>' +
      '</div>' +
    '</div>';
  }).join('');
}

// Contact link icons (small inline SVGs, no external deps)
var CONTACT_ICONS = {
  email: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  github: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
  linkedin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>',
  generic: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'
};

// Fallback contact links shown when no data is configured yet
var DEFAULT_CONTACT_LINKS = [
  { label: 'Email', value: 'jhnbryn05@gmail.com', url: 'mailto:jhnbryn05@gmail.com', icon: 'email' },
  { label: 'GitHub', value: 'github.com/brokeCode05', url: 'https://github.com/brokeCode05', icon: 'github' }
];

// ─── Contact Links Renderer ───────────────────────────
function renderContactLinks(data) {
  var links = (data && data.contactLinks && data.contactLinks.length)
    ? data.contactLinks
    : DEFAULT_CONTACT_LINKS;
  return links.map(function(link) {
    var icon = CONTACT_ICONS[link.icon] || CONTACT_ICONS.generic;
    var display = link.value || link.url || '';
    var external = (link.url || '').indexOf('mailto:') !== 0;
    return '<div class="contact-item">' +
      '<span class="contact-item-label">' + escapeHtml(link.label || '') + '</span>' +
      '<a href="' + escapeHtml(link.url || '#') + '" class="contact-item-value"' +
        (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
        ' aria-label="' + escapeHtml(link.label || '') + '">' +
        icon + escapeHtml(display) +
      '</a>' +
    '</div>';
  }).join('');
}

// ─── Helper ───────────────────────────────────────────

function handleTechImgError(img) {
  img.style.display = 'none';
  var fb = img.parentNode.querySelector('.tech-logo-fallback');
  if (fb) fb.style.display = 'flex';
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ─── JSON Export/Import ───────────────────────────────

function exportDataJSON() {
  var data = loadData();
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'portfolio-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importDataJSON(file, callback) {
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      savePortfolioData(data);
      if (callback) callback(null, data);
    } catch(err) {
      if (callback) callback('Invalid JSON file: ' + err.message);
    }
  };
  reader.onerror = function() {
    if (callback) callback('Failed to read file');
  };
  reader.readAsText(file);
}
