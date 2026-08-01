<div align="center">
  <br />
  <pre><code style="font-size:1.5em; color:#4ADE80;">~/portfolio</code></pre>
  <br />
  <h1>John Bryan Capellan</h1>
  <p><strong>BSIT Student &bull; Home Lab Builder &bull; Future SysAdmin</strong></p>
  <br />
  <p>
    <a href="https://brokeCode05.github.io/portfolio" target="_blank">
      <img src="https://img.shields.io/badge/Live_Site-4ADE80?style=for-the-badge&logo=githubpages&logoColor=black" alt="Live Site" />
    </a>
    &nbsp;
    <a href="https://github.com/brokeCode05/portfolio" target="_blank">
      <img src="https://img.shields.io/badge/Source_Code-171A21?style=for-the-badge&logo=github&logoColor=white" alt="Source Code" />
    </a>
  </p>
  <br />
</div>

---

## 📋 Overview

A personal portfolio website built with vanilla **HTML**, **CSS**, and **JavaScript** — no frameworks, no build tools. Designed with a dark terminal/developer aesthetic that reflects my passion for Linux, networking, and system administration.

The site serves as both a **resume showcase** and a **technical sandbox** for experimenting with front-end interactions (scroll animations, progress bars, theme switching, and more) while keeping the codebase minimal and dependency-free.

---

## ✨ Features

| Feature | Details |
|---|---|
| **🌓 Dark / Light Theme** | Persistent theme toggle with system preference detection. Favicon and GitHub images adapt to the active theme. |
| **⌨️ Terminal Hero** | Animated typing effect in the hero section simulating a shell session. |
| **📊 Skill Progress Bars** | Animated bars with staggered reveal delays, counting percentage labels, and hover tooltips with skill descriptions. |
| **🖼️ Terminal Photo Frame** | Circular photo with CRT scan-line overlay, pulsing status dot, and grayscale-to-color hover effect. |
| **📱 Responsive Design** | Full mobile responsiveness with a hamburger navigation menu (animated X icon, slide-in panel, backdrop blur). |
| **📜 Scroll Animations** | Sections fade in as they enter the viewport using IntersectionObserver. |
| **📈 GitHub Integration** | Live stats (repos, followers, stars) and contribution graph fetched via the GitHub API. |
| **🔍 SEO & Accessibility** | Semantic HTML, ARIA labels, skip-to-content link, structured data (JSON-LD), Open Graph / Twitter Card meta tags. |
| **📄 Resume Download** | One-click PDF resume download. |

---

## 🛠️ Tech Stack

```
HTML5          — Semantic markup, ARIA accessibility
CSS3           — Custom properties, Flexbox, Grid, animations
JavaScript     — Vanilla ES5 (no frameworks, no bundlers)
GitHub API     — Live stats, streak, contribution graph
GitHub Pages   — Zero-config hosting
```

---

## 🗂️ Project Structure

```
portfolio/
├── index.html          # Single-page portfolio (all HTML)
├── css/
│   └── style.min.css   # Minified stylesheet
├── js/
│   └── main.min.js     # Minified JavaScript (scroll, theme, typing, reveal)
├── img/
│   └── profile.png     # Profile photo (replace with yours)
├── resume.pdf          # Downloadable resume
├── README.md           # You're here!
├── robots.txt          # Search engine crawling rules
├── sitemap.xml         # XML sitemap for SEO
└── .gitignore          # Git ignore rules
```

> **Note:** The project is intentionally a single HTML file for simplicity. All inline styles and scripts are in `index.html`; the minified files provide the core structure/behavior.

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/brokeCode05/portfolio.git
cd portfolio
```

### 2. Add your photo

Place a square profile photo at `img/profile.png` (recommended: 400×400px or larger).

No other setup is needed — open `index.html` in your browser to view.

### 3. Start a local server (optional)

```bash
# Python 3
python3 -m http.server 8080

# Or Node.js
npx serve .
```

Then visit `http://localhost:8080`.

### 4. Customize

- **Personal info** — Edit `index.html` (name, bio, email, GitHub username)
- **Skills** — Update the skill items and progress percentages in the Skills section
- **Projects** — Add/remove project cards in the Projects section
- **Resume** — Replace `resume.pdf` with your own
- **Theme colors** — Adjust CSS custom properties in the `:root` and `[data-theme="light"]` blocks

---

## 🌐 Deployment (GitHub Pages)

This site is deployed via **GitHub Pages** from the `main` branch (which is also the repo's default branch):

1. Push to your GitHub repo: `git push origin main`
2. Go to **Settings → Pages** and confirm **Source** is `Deploy from a branch` → `main` → `/ (root)`
3. Your site will be live at `https://brokeCode05.github.io/portfolio`

> The `robots.txt` and `sitemap.xml` are pre-configured for this repository URL (`brokeCode05.github.io/portfolio`). If you later add a custom domain, update them accordingly.

---

## 🎨 Design Highlights

### Dark Terminal Theme

The design language is inspired by Linux terminal emulators (like GNOME Terminal / Tilix):

- **Background:** `#0F1115` (deep navy-black)
- **Accent:** `#4ADE80` (terminal green)
- **Font stack:** `IBM Plex Sans` (headings), `Inter` (body), `JetBrains Mono` (code)
- **CRT scan-lines** on the profile photo for retro-tech feel

### Animations

| Animation | Trigger | Duration |
|---|---|---|
| Progress bar fill | Scroll reveal | 0.8s (ease-out quart) |
| Percentage counter | Scroll reveal | 0.8s (syncs with bars) |
| Section fade-in | Scroll reveal | 0.4s staggered |
| Photo frame glow | Hover | 0.25s ease |
| Hamburger → X | Click | 0.25s ease |
| Menu slide-in | Click | 0.25s ease |
| Terminal typing | Page load | 40-120ms per char |

All animations respect `prefers-reduced-motion`.

---

## 📄 License

MIT — feel free to use this as a template for your own portfolio.

---

<div align="center">
  <br />
  <p>
    Built with <code>HTML</code> + <code>CSS</code> + <code>JS</code> &nbsp;·&nbsp;
    No frameworks, no build tools, no nonsense.
  </p>
  <p>
    <a href="https://github.com/brokeCode05">@brokeCode05</a>
  </p>
  <br />
</div>
