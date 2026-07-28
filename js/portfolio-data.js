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
    // Programming Languages (0-6)
    { name: 'HTML5', icon: 'code', cat: 'Programming', brand: 'html5' },
    { name: 'CSS3', icon: 'layout', cat: 'Programming', brand: 'css3' },
    { name: 'JavaScript', icon: 'js', cat: 'Programming', brand: 'javascript' },
    { name: 'Java', icon: 'coffee', cat: 'Programming', brand: 'java' },
    { name: 'Python', icon: 'terminal', cat: 'Programming', brand: 'python' },
    { name: 'C#', icon: 'hash', cat: 'Programming', brand: 'csharp' },
    { name: 'VB.NET', icon: 'code', cat: 'Programming', brand: 'visualbasic' },
    // Web Technologies (7-8)
    { name: 'Node.js', icon: 'code', cat: 'Web', brand: 'nodedotjs' },
    { name: 'npm', icon: 'package', cat: 'Web', brand: 'npm' },
    // Databases (9-10)
    { name: 'MongoDB', icon: 'code', cat: 'Database', brand: 'mongodb' },
    { name: 'MS SQL', icon: 'code', cat: 'Database', brand: 'microsoftsqlserver' },
    // Version Control (11-12)
    { name: 'Git', icon: 'git-branch', cat: 'VCS', brand: 'git' },
    { name: 'GitHub', icon: 'code', cat: 'VCS', brand: 'github' },
    // Developer Tools (13-16)
    { name: 'VS Code', icon: 'tool', cat: 'DevTools', brand: 'visualstudiocode' },
    { name: 'Termius', icon: 'terminal', cat: 'DevTools', brand: 'iterm2' },
    { name: 'Figma', icon: 'tool', cat: 'DevTools', brand: 'figma' },
    { name: 'Chrome DevTools', icon: 'tool', cat: 'DevTools', brand: 'googlechrome' },
    // Networking & Remote (17-20)
    { name: 'SSH', icon: 'lock', cat: 'Networking', brand: 'openssh' },
    { name: 'SFTP', icon: 'activity', cat: 'Networking' },
    { name: 'Tailscale', icon: 'activity', cat: 'Networking', brand: 'tailscale' },
    { name: 'OpenSSH', icon: 'lock', cat: 'Networking', brand: 'openssh' },
    // Operating Systems (21-22)
    { name: 'Windows 11', icon: 'terminal', cat: 'OS', brand: 'windows' },
    { name: 'Linux Mint', icon: 'terminal', cat: 'OS', brand: 'linuxmint' }
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
  var saved = getPortfolioData();
  if (saved) {
    var changed = false;
    // Migration 1: replace old flat tech stack with organized categories
    if (saved.techStack && saved.techStack[0] && saved.techStack[0].name === 'Linux' && saved.techStack.length <= 15) {
      saved.techStack = JSON.parse(JSON.stringify(DEFAULT_DATA.techStack));
      changed = true;
    } else if (!saved.techStack) {
      saved.techStack = JSON.parse(JSON.stringify(DEFAULT_DATA.techStack));
      changed = true;
    } else {
      // Migration 2: add brand fields to existing tech items if missing
      saved.techStack.forEach(function(item, idx) {
        if (!item.brand && DEFAULT_DATA.techStack[idx] && DEFAULT_DATA.techStack[idx].brand) {
          item.brand = DEFAULT_DATA.techStack[idx].brand;
          changed = true;
        }
      });
    }
    if (changed) {
      savePortfolioData(saved);
    }
    return saved;
  }
  return DEFAULT_DATA;
}

var BRAND_LOGOS = {
  terminal: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 22 14 16 6 10"/><line x1="18" y1="24" x2="26" y2="24"/></svg>',
  shield: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 28s10-5 10-12V8l-10-4L6 8v8c0 7 10 12 10 12z"/></svg>'
};

var SIMPLE_ICONS_BASE = 'https://cdn.simpleicons.org/';

var MARQUEE_ROWS = [
  { dir: 'right', label: 'Languages', indices: [0, 1, 2, 3, 4, 5, 6] },
  { dir: 'left', label: 'Web Tech', indices: [7, 8] },
  { dir: 'right', label: 'Databases', indices: [9, 10] },
  { dir: 'left', label: 'Version Control', indices: [11, 12] },
  { dir: 'right', label: 'Dev Tools', indices: [13, 14, 15, 16] },
  { dir: 'left', label: 'Networking', indices: [17, 18, 19, 20] },
  { dir: 'right', label: 'OS', indices: [21, 22] }
];

// ─── Render Section HTML ──────────────────────────────

function renderTechStack(data) {
  if (!data || !data.techStack) return '';
  var html = '';
  MARQUEE_ROWS.forEach(function(row, ri) {
    var items = row.indices.map(function(idx) {
      var tech = data.techStack[idx];
      if (!tech) return '';
      var logoHtml;
      if (tech.logoUrl) {
        var fallbackSvgUrl = (BRAND_LOGOS[tech.icon] || BRAND_LOGOS.terminal);
        logoHtml = '<img class="tech-logo-img" src="' + escapeHtml(tech.logoUrl) + '" alt="' + escapeHtml(tech.name) + '" loading="lazy" onerror="this.onerror=null;this.style.display=\'none\';this.parentNode.querySelector(\'.tech-logo-fallback\').style.display=\'flex\'" />' +
          '<span class="tech-logo-fallback" aria-hidden="true" style="display:none">' + fallbackSvgUrl + '</span>';
      } else if (tech.logo) {
        logoHtml = '<img class="tech-logo-img" src="' + escapeHtml(tech.logo) + '" alt="' + escapeHtml(tech.name) + '" />';
      } else if (tech.brand) {
        var slug = encodeURIComponent(tech.brand.toLowerCase());
        var fallbackSvg = (BRAND_LOGOS[tech.icon] || BRAND_LOGOS.terminal);
        logoHtml = '<img class="tech-logo-img" src="' + SIMPLE_ICONS_BASE + slug + '" alt="' + escapeHtml(tech.name) + '" loading="lazy" onerror="this.onerror=null;this.style.display=\'none\';this.parentNode.querySelector(\'.tech-logo-fallback\').style.display=\'flex\'" />' +
          '<span class="tech-logo-fallback" aria-hidden="true" style="display:none">' + fallbackSvg + '</span>';
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
    var repeatCount = Math.max(5, Math.ceil(minItems / row.indices.length));
    var trackHtml = '';
    for (var r = 0; r < repeatCount; r++) {
      trackHtml += items;
    }
    var extraAttr = ri >= 3 ? ' data-extra="true" style="animation-delay:' + ((ri - 3) * 0.06).toFixed(2) + 's"' : '';
    html += '<div class="tech-marquee-row ' + row.dir + '"' + extraAttr + '>' +
      '<span class="tech-marquee-label">' +
        '<span class="tech-marquee-dot" aria-hidden="true"></span>' +
        escapeHtml(row.label) +
      '</span>' +
      '<div class="tech-marquee-track-wrap">' +
        '<div class="tech-marquee-track">' + trackHtml + '</div>' +
      '</div>' +
    '</div>';
  });
  html += '<button class="tech-marquee-toggle" id="tech-toggle-btn" aria-expanded="false" data-hidden="4">' +
    '<span class="tech-toggle-text">Show ' +
    '<span class="tech-toggle-count">4</span> more categories' +
    '</span>' +
    '<svg class="tech-toggle-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
  '</button>';
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
