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

var TECH_ICONS = {
  terminal: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  lock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  activity: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  tool: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  'git-branch': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>',
  package: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  code: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  layout: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
  js: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M15 9a3 3 0 0 0-3-3h-1a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-1a3 3 0 0 1-3-3"/><line x1="9" y1="18" x2="9" y2="14"/></svg>',
  coffee: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
  hash: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
  shield: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
};

// ─── Render Section HTML ──────────────────────────────

function renderTechStack(data) {
  if (!data || !data.techStack) return '';
  return data.techStack.map(function(tech) {
    var svg = TECH_ICONS[tech.icon] || TECH_ICONS.terminal;
    return '<a class="tech-badge" data-reveal>' +
      '<span class="tech-badge-icon" aria-hidden="true">' + svg + '</span>' +
      '<span class="tech-badge-name">' + escapeHtml(tech.name) + '</span>' +
    '</a>';
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
