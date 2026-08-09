/* ===================================================
   Portfolio Data Layer
   Manages all editable portfolio content via localStorage
   =================================================== */

const STORAGE_KEY = 'portfolio_data';
const ADMIN_PASSWORD_KEY = 'portfolio_admin_pw';
const GITHUB_TOKEN_KEY = 'portfolio_github_token';

// ─── Single source of truth for identity values ───────
// Used by github-widgets.js (GH stats), portfolio-render.js (ID badge
// fallbacks), and id-card.js (site link). Edit once here.
var PORTFOLIO_META = {
  ghUser: 'brokeCode05',
  name: 'John Bryan Capellan',
  role: 'Information Technology Student',
  idNumber: 'IT-2024-0842',
  schoolTitle: 'Student ID',
  schoolSub: 'brokeCode05.dev',
  photo: 'img/johnbryan.jpg',
  siteUrl: 'https://brokeCode05.github.io/portfolio/'
};

// ─── Debug logging (off by default — flip to true to trace cloud-sync) ──
var PORTFOLIO_DEBUG = false;
function dbg() {
  if (PORTFOLIO_DEBUG) {
    try { console.log.apply(console, arguments); } catch(e) {}
  }
}

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
  // Returns { ok:true, data } on success (data may be null if nothing is
  // published yet) and { ok:false, error } on network/timeout failure so
  // callers can distinguish "no data" from "couldn't reach Supabase".
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
    if (!resp.ok) return { ok: false, error: 'HTTP ' + resp.status };
    var rows = await resp.json();
    if (rows && rows.length > 0 && rows[0].json_data) {
      return { ok: true, data: rows[0].json_data };
    }
    return { ok: true, data: null };
  } catch(e) {
    console.error('[cloud-sync] Fetch error:', e.name === 'AbortError' ? 'Timeout (8s)' : (e.message || e));
    return { ok: false, error: e.name === 'AbortError' ? 'Timeout (8s)' : (e.message || 'network error') };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function pushToSupabase(data) {
  // Writes go through the portfolio-sync edge function, which compares the
  // admin password against a server-side secret (PORTFOLIO_SYNC_SECRET) and
  // upserts via the service role. Direct REST writes are closed (the old
  // open anon policies are dropped), so the public anon key alone can no
  // longer overwrite the portfolio.
  var adminPw = getAdminPassword();
  if (!adminPw) return false;
  var now = new Date().toISOString();
  // Stamp the data with our sync timestamp so the next sync can compare
  data._syncTimestamp = now;
  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, 8000);
  try {
    var resp = await fetch(SUPABASE_URL + '/functions/v1/portfolio-sync', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-portfolio-secret': adminPw
      },
      body: JSON.stringify({
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
    console.error('[cloud-sync] Push error:', e.name === 'AbortError' ? 'Timeout (8s)' : (e.message || e));
  }
  clearTimeout(timeoutId);
  return false;
}

// ─── Contact Messages (Phase 3) ──────────────────────
// Public visitors submit via the contact form (RLS allows anon INSERT).
// The admin reads/marks them via their authenticated Supabase session.
// The Turnstile token is stored with the row for audit; the insert goes
// straight to the REST endpoint (no edge function in the path).
async function submitContactMessage(msg) {
  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, 8000);
  try {
    // POST to the contact-submit edge function: it verifies the Turnstile
    // token server-side (secret key never reaches the browser), then inserts
    // via the service role. Direct REST inserts are disabled (anon INSERT
    // policy dropped), so unverified bots get a 403 here.
    var endpoint = SUPABASE_URL + '/functions/v1/contact-submit';
    var resp = await fetch(endpoint, {
      signal: controller.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });
    clearTimeout(timeoutId);
    if (resp.status === 403) {
      console.warn('[contact] Rejected: Turnstile verification failed');
      return false;
    }
    return resp.ok;
  } catch(e) {
    console.error('[contact] Submit error:', e.name === 'AbortError' ? 'Timeout (8s)' : (e.message || e));
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
    hero: { badge: '', badge2: '', title: '', description: '', photo: '', name: '', idNumber: '', qrLink: '', schoolTitle: '', schoolSub: '', roles: [] },
    about: { bio: '', terminal: { role: '', path: [], philosophy: '', status: '' } },
    techStack: [],
    currently: [],
    projects: [],
    certifications: [],
    experience: [],
    learning: [],
    contactLinks: [],
    chatFaq: [],
    chatConfig: { enabled: true, botName: '', greeting: '' }
  };
}



// Fallback contact links shown when no data is configured yet
var DEFAULT_CONTACT_LINKS = [
  { label: 'Email', value: 'jhnbryn05@gmail.com', url: 'mailto:jhnbryn05@gmail.com', icon: 'email' },
  { label: 'GitHub', value: 'github.com/brokeCode05', url: 'https://github.com/brokeCode05', icon: 'github' }
];




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
      // Shape guard — only accept a real portfolio payload. A random valid JSON
      // file (array, string, wrong keys) would otherwise silently overwrite the
      // entire portfolio with garbage and blank the live site.
      var REQUIRED_KEYS = ['hero', 'about', 'projects', 'experience', 'contactLinks', 'chatConfig'];
      var missing = [];
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        missing = REQUIRED_KEYS;
      } else {
        missing = REQUIRED_KEYS.filter(function(k) { return data[k] === undefined; });
      }
      if (missing.length) {
        if (callback) callback('Not a valid portfolio export — missing required sections: ' + missing.join(', ') + '. Import cancelled.');
        return;
      }
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
