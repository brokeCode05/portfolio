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
  skills: [
    {
      id: 'sk-linux',
      title: 'Linux & System Administration',
      icon: 'terminal',
      delay: 100,
      items: [
        { name: 'Linux Mint XFCE', level: 'Beginner', percent: 35 },
        { name: 'Linux Command Line', level: 'Beginner', percent: 35 },
        { name: 'Basic Linux Administration', level: 'Beginner', percent: 30 }
      ]
    },
    {
      id: 'sk-networking',
      title: 'Networking',
      icon: 'activity',
      delay: 150,
      items: [
        { name: 'Networking Fundamentals', level: 'Beginner', percent: 30 },
        { name: 'TCP/IP Fundamentals', level: 'Beginner', percent: 25 }
      ]
    },
    {
      id: 'sk-remote',
      title: 'Remote Administration',
      icon: 'lock',
      delay: 200,
      items: [
        { name: 'SSH / OpenSSH', level: 'Beginner', percent: 35 },
        { name: 'Tailscale', level: 'Beginner', percent: 35 }
      ]
    },
    {
      id: 'sk-webdev',
      title: 'Web Development',
      icon: 'code',
      delay: 250,
      items: [
        { name: 'HTML', level: 'Intermediate+', percent: 70 },
        { name: 'CSS', level: 'Intermediate+', percent: 65 },
        { name: 'JavaScript', level: 'Intermediate', percent: 60 },
        { name: 'Responsive Web Design', level: 'Intermediate+', percent: 65 }
      ]
    },
    {
      id: 'sk-tools',
      title: 'Development Tools',
      icon: 'tool',
      delay: 300,
      items: [
        { name: 'VS Code', level: 'Intermediate+', percent: 70 },
        { name: 'Git', level: 'Basic Awareness', percent: 20 },
        { name: 'npm', level: 'Beginner', percent: 35 },
        { name: 'Termius', level: 'Beginner', percent: 35 }
      ]
    },
    {
      id: 'sk-cyber',
      title: 'Cybersecurity',
      icon: 'shield',
      delay: 350,
      items: [
        { name: 'Cybersecurity Fundamentals', level: 'Basic Awareness', percent: 20 },
        { name: 'Ethical Hacking Fundamentals', level: 'Basic Awareness', percent: 20 },
        { name: 'System Enumeration Concepts', level: 'Basic Awareness', percent: 20 }
      ]
    },
    {
      id: 'sk-programming',
      title: 'Programming',
      icon: 'code',
      delay: 400,
      items: [
        { name: 'Java', level: 'Intermediate', percent: 60 },
        { name: 'C#', level: 'Intermediate+', percent: 70 },
        { name: 'Python', level: 'Intermediate', percent: 60 }
      ]
    }
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

// ─── SVG Icon Helpers ─────────────────────────────────

function getSkillIconSVG(type) {
  var icons = {
    terminal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
    activity: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    code: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    tool: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
  };
  return icons[type] || icons.code;
}

// ─── Render Section HTML ──────────────────────────────

function renderSkills(data) {
  if (!data || !data.skills) return '';
  return data.skills.map(function(skill, idx) {
    var items = skill.items.map(function(item) {
      return '<div class="skill-item">' +
        '<div class="skill-item-header">' +
          '<span class="skill-item-name">' + escapeHtml(item.name) + '</span>' +
          '<span class="skill-item-level">' + escapeHtml(item.level) + '</span>' +
        '</div>' +
        '<div class="skill-progress-row">' +
          '<div class="skill-progress" role="progressbar" aria-valuenow="' + item.percent + '" aria-valuemin="0" aria-valuemax="100">' +
            '<div class="skill-progress-fill" style="--target: ' + item.percent + '%"></div>' +
          '</div>' +
          '<span class="skill-pct-label">' + item.percent + '%</span>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="skill-card" data-reveal data-reveal-delay="' + skill.delay + '">' +
      '<div class="skill-card-header">' +
        '<span class="skill-card-icon" aria-hidden="true">' + getSkillIconSVG(skill.icon) + '</span>' +
        '<h3 class="skill-card-title">' + escapeHtml(skill.title) + '</h3>' +
      '</div>' +
      '<div class="skill-card-body">' + items + '</div>' +
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
