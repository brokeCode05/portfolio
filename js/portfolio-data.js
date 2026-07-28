/* ===================================================
   Portfolio Data Layer
   Manages all editable portfolio content via localStorage
   =================================================== */

const STORAGE_KEY = 'portfolio_data';
const ADMIN_PASSWORD_KEY = 'portfolio_admin_pw';

// ─── Default Data ────────────────────────────────────

const DEFAULT_DATA = {
  hero: {
    badge: 'BSIT Student & Lifelong Learner',
    status: 'Currently studying: Google Cybersecurity Certificate',
    title: 'Learning infrastructure, one lab at a time.',
    description: "BSIT student with a growing interest in web development, networking, and cybersecurity. Always tinkering, always learning — building hands-on projects to turn curiosity into real skills."
  },
  about: {
    bio: "I'm a BSIT student who's always been drawn to how things work under the hood. I started with web development, got into networking, and now I'm diving deep into cybersecurity. I have so much interest in this field — I just really love to learn. Whether I'm building something in my home lab, reading about security, or tinkering with Linux configs, I'm always exploring something new. Every project teaches me something, and that's what keeps me going.",
    terminal: {
      role: 'BSIT Student',
      path: ['Web Dev', 'Networking', 'Security'],
      philosophy: 'Just love to learn.',
      status: 'Exploring'
    }
  },
  techStack: [
    { name: 'Linux', icon: 'terminal', cat: 'System' },
    { name: 'SSH', icon: 'lock', cat: 'Remote' },
    { name: 'Tailscale', icon: 'activity', cat: 'Network' },
    { name: 'VS Code', icon: 'tool', cat: 'Editor' },
    { name: 'Git', icon: 'git-branch', cat: 'VCS' },
    { name: 'npm', icon: 'package', cat: 'Tools' },
    { name: 'Termius', icon: 'terminal', cat: 'Remote' },
    { name: 'HTML', icon: 'code', cat: 'Frontend' },
    { name: 'CSS', icon: 'layout', cat: 'Frontend' },
    { name: 'JavaScript', icon: 'js', cat: 'Frontend' },
    { name: 'Java', icon: 'coffee', cat: 'Languages' },
    { name: 'C#', icon: 'hash', cat: 'Languages' },
    { name: 'Python', icon: 'terminal', cat: 'Languages' },
    { name: 'Networking', icon: 'activity', cat: 'Infra' },
    { name: 'Cybersecurity', icon: 'shield', cat: 'Security' }
  ],
  currently: [
    'Linux Administration',
    'Cybersecurity',
    'Ethical Hacking',
    'Advanced Networking',
    'System Administration',
    'Home Lab Development',
    'The Practice of Network Security Monitoring',
    'Google Cybersecurity Certificate'
  ],
  projects: [
    {
      id: 'proj-portfolio',
      title: 'Personal Portfolio',
      description: 'A terminal-themed developer portfolio built with vanilla HTML, CSS, and JavaScript. Features include a premium hero section with parallax portrait, animated skill progress bars with tooltips, certificate viewer modal, dark/light theme toggle, and responsive design.',
      tags: ['HTML', 'CSS', 'JavaScript'],
      links: {
        live: 'https://brokeCode05.github.io/portfolio/',
        repo: 'https://github.com/brokeCode05/portfolio'
      }
    },
    {
      id: 'proj-stonerich',
      title: 'Stonerich Granite Construction & Supply',
      description: 'A production-ready business website built for a granite and construction supply company. 11 routes with 28 static pages, product catalog with 9 categories, service pages, masonry gallery, quotation form, and SEO optimization.',
      tags: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
      links: {
        live: 'https://stonerich-website.vercel.app',
        repo: 'https://github.com/brokeCode05/stonerich-website'
      }
    }
  ],
  certifications: [
    { id: 'cert-java', name: 'Java Fundamentals', issuer: 'Oracle', date: '2024', path: 'img/certs/certificate.jpg' },
    { id: 'cert-web', name: 'Web Development Basics', issuer: 'IBM', date: '2025', path: 'img/certs/certificate.jpg' },
    { id: 'cert-cyber', name: 'Introduction to Cybersecurity', issuer: 'Cisco Net Academy', date: '2026', path: 'img/certs/certificate.jpg' }
  ],
  experience: [
    {
      id: 'exp-csr',
      role: 'Customer Service Representative',
      company: 'VXI Philippines',
      date: '2023',
      bullets: [
        'Assisted customers with technical support, financial/account-related inquiries, and sales concerns through phone-based customer service.',
        'Diagnosed and resolved customer issues while providing accurate information and effective solutions.',
        'Maintained clear and professional communication to ensure a positive customer experience.',
        'Followed company procedures to document customer interactions and resolve cases efficiently.',
        'Developed strong problem-solving, communication, and customer service skills in a fast-paced BPO environment.'
      ]
    },
    {
      id: 'exp-proctor',
      role: 'Exam Proctor',
      company: 'CLAD Asia',
      date: '2024',
      bullets: [
        'Facilitated and supervised onsite and online examinations while ensuring compliance with testing policies and procedures.',
        'Verified candidate identities and monitored examinations to maintain test integrity.',
        'Assisted examinees with exam instructions and resolved basic technical or procedural concerns during testing.',
        'Coordinated with the examination team to ensure smooth and organized exam operations.',
        'Maintained accurate records and reported any incidents encountered during examination sessions.'
      ]
    }
  ]
};

// ─── LocalStorage CRUD ────────────────────────────────

function getPortfolioData() {
  try {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return null;
}

function savePortfolioData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function resetPortfolioData() {
  localStorage.removeItem(STORAGE_KEY);
}

function getAdminPassword() {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || 'admin123';
}

function setAdminPassword(pw) {
  localStorage.setItem(ADMIN_PASSWORD_KEY, pw);
}

// ─── Data Getters (with fallback) ────────────────────

function loadData() {
  return getPortfolioData() || DEFAULT_DATA;
}

var BRAND_LOGOS = {
  terminal: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 22 14 16 6 10"/><line x1="18" y1="24" x2="26" y2="24"/></svg>',
  lock: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="14" width="20" height="14" rx="2"/><path d="M10 14V10a6 6 0 0 1 12 0v4"/><circle cx="16" cy="20" r="2" fill="currentColor"/><line x1="16" y1="22" x2="16" y2="25"/></svg>',
  activity: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16h5l3-9 4 18 3-9h5"/></svg>',
  tool: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 11.5a1.5 1.5 0 0 0 0 3l2 2a1.5 1.5 0 0 0 3 0l4-4a7 7 0 0 1-9 9l-8 8a2.5 2.5 0 0 1-3.5-3.5l8-8a7 7 0 0 1 9-9l-4 4z"/></svg>',
  'git-branch': '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="8" r="3"/><circle cx="10" cy="24" r="3"/><circle cx="24" cy="14" r="3"/><line x1="10" y1="11" x2="10" y2="21"/><path d="M10 21a8 8 0 0 0 8-8"/></svg>',
  package: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="24" height="20" rx="2"/><line x1="4" y1="14" x2="28" y2="14"/><polyline points="12 14 12 20 16 17 20 20 20 14"/></svg>',
  code: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="12 22 6 16 12 10"/><polyline points="20 10 26 16 20 22"/></svg>',
  layout: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="24" height="24" rx="2"/><line x1="4" y1="12" x2="28" y2="12"/><line x1="14" y1="12" x2="14" y2="28"/></svg>',
  js: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="24" height="24" rx="2"/><path d="M18 12a3 3 0 0 0-3-3h-2a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4h-2a3 3 0 0 1-3-3"/><line x1="12" y1="22" x2="12" y2="18"/></svg>',
  coffee: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10h2a5 5 0 0 1 0 10h-2"/><path d="M4 10h18v12a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V10z"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="14" y1="2" x2="14" y2="6"/><line x1="20" y1="2" x2="20" y2="6"/></svg>',
  hash: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="13" x2="26" y2="13"/><line x1="6" y1="19" x2="26" y2="19"/><line x1="14" y1="6" x2="10" y2="26"/><line x1="22" y1="6" x2="18" y2="26"/></svg>',
  shield: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 28s10-5 10-12V8l-10-4L6 8v8c0 7 10 12 10 12z"/><path d="M12 16l3 3 5-6" stroke-linecap="round"/></svg>',
  'linux': '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="12" r="6"/><path d="M10 18c-2 2-3 5-2 7 1 2 3 3 6 3h4c3 0 5-1 6-3 1-2 0-5-2-7"/><circle cx="12" cy="10" r="1" fill="currentColor"/><circle cx="20" cy="10" r="1" fill="currentColor"/><path d="M14 18l2 2 2-2"/></svg>',
  'network': '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="6" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="24" cy="20" r="2"/><circle cx="16" cy="26" r="2"/><line x1="14" y1="8" x2="10" y2="18"/><line x1="18" y1="8" x2="22" y2="18"/><line x1="10" y1="22" x2="14" y2="24"/><line x1="22" y1="22" x2="18" y2="24"/></svg>'
};

var MARQUEE_ROWS = [
  { dir: 'right', items: ['linux', 'lock', 'activity', 'tool', 'git-branch'] },
  { dir: 'left', items: ['package', 'terminal', 'code', 'layout', 'js'] },
  { dir: 'right', items: ['coffee', 'hash', 'terminal', 'network', 'shield'] }
];

// ─── Render Section HTML ──────────────────────────────

function renderTechStack(data) {
  if (!data || !data.techStack) return '';
  return MARQUEE_ROWS.map(function(row) {
    var items = row.items.map(function(iconKey) {
      var tech = data.techStack.find(function(t) { return t.icon === iconKey; });
      if (!tech) return '';
      var svg = BRAND_LOGOS[tech.icon] || BRAND_LOGOS.terminal;
      return '<span class="tech-logo">' +
        '<span class="tech-logo-icon" aria-hidden="true">' + svg + '</span>' +
        '<span class="tech-logo-name">' + escapeHtml(tech.name) + '</span>' +
      '</span>';
    }).join('');
    // Duplicate for seamless looping
    return '<div class="tech-marquee-row ' + row.dir + '">' +
      '<div class="tech-marquee-track">' + items + items + '</div>' +
    '</div>';
  }).join('');
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
      if (proj.links.live) links += '<a href="' + escapeHtml(proj.links.live) + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding:0.375rem 0.875rem;font-size:var(--text-xs)">Live Demo</a> ';
      if (proj.links.repo) links += '<a href="' + escapeHtml(proj.links.repo) + '" target="_blank" rel="noopener noreferrer" class="btn btn-ghost" style="padding:0.375rem 0.875rem;font-size:var(--text-xs)">GitHub</a>';
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
  return data.certifications.map(function(cert) {
    return '<div class="cert-card" data-cert-path="' + cert.path + '" data-cert-name="' + escapeHtml(cert.name) + '" data-cert-issuer="' + escapeHtml(cert.issuer) + '" data-cert-date="' + cert.date + '" data-reveal>' +
      '<div class="cert-card-badge">' +
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

// ─── Helper ───────────────────────────────────────────

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
