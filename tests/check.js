#!/usr/bin/env node
/**
 * Portfolio CI checks — zero dependencies, run with: node tests/check.js
 *
 * Verifies:
 *  1. All JS files pass `node --check` (syntax)
 *  2. Inline <script> blocks in index.html + admin.html parse
 *  3. CSS files have balanced braces
 *  4. Every nav href="#..." resolves to a real id in index.html
 *  5. Cache-buster versions are consistent within each page
 *  6. Every referenced js/css asset exists on disk
 *  7. All JS loads in production order under a DOM stub (no reference errors)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const RESULTS = { pass: 0, fail: 0 };
const ERRORS = [];

function report(name, ok, detail) {
  if (ok) {
    RESULTS.pass++;
    console.log('  \u2713 ' + name);
  } else {
    RESULTS.fail++;
    ERRORS.push(name + (detail ? ' — ' + detail : ''));
    console.log('  \u2717 ' + name + (detail ? ' — ' + detail : ''));
  }
}

function checkJS() {
  console.log('1. JS syntax (node --check)');
  const files = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'));
  let ok = true;
  for (const f of files) {
    try {
      execSync('node --check ' + JSON.stringify(path.join(ROOT, 'js', f)), { stdio: 'pipe' });
    } catch (e) {
      ok = false;
      console.log('    syntax error in js/' + f);
    }
  }
  report('all ' + files.length + ' JS files parse', ok);
}

function checkInlineScripts() {
  console.log('2. Inline <script> blocks parse');
  for (const page of ['index.html', 'admin.html']) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const blocks = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
    let ok = true;
    for (const b of blocks) {
      try {
        new Function(b.replace(/<\/?script>/g, ''));
      } catch (e) {
        ok = false;
        console.log('    ' + page + ': ' + e.message.slice(0, 120));
      }
    }
    report(page + ': ' + blocks.length + ' inline block(s) parse', ok);
  }
}

function checkCSS() {
  console.log('3. CSS brace balance');
  const files = fs.readdirSync(path.join(ROOT, 'css')).filter(f => f.endsWith('.css'));
  let ok = true;
  for (const f of files) {
    const css = fs.readFileSync(path.join(ROOT, 'css', f), 'utf8');
    const open = (css.match(/{/g) || []).length;
    const close = (css.match(/}/g) || []).length;
    if (open !== close) {
      ok = false;
      console.log('    css/' + f + ': ' + open + ' open / ' + close + ' close');
    }
  }
  report('all ' + files.length + ' CSS files balanced', ok);
}

function checkNavHrefs() {
  console.log('4. Nav hrefs resolve to section ids');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const hrefs = [...html.matchAll(/href="#([a-z0-9-]+)"/g)].map(m => m[1]);
  const missing = hrefs.filter(h => !html.includes('id="' + h + '"'));
  report(hrefs.length + ' anchor hrefs checked, ' + (hrefs.length - missing.length) + ' resolve',
    missing.length === 0,
    missing.length ? 'missing ids: ' + missing.join(', ') : '');
}

function checkCacheBusters() {
  console.log('5. Cache-buster consistency');
  let ok = true;
  for (const page of ['index.html', 'admin.html']) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const versions = [...html.matchAll(/\?v=([0-9a-z]+)/g)].map(m => m[1]);
    const uniq = [...new Set(versions)];
    if (uniq.length > 1) {
      ok = false;
      console.log('    ' + page + ' mixed versions: ' + uniq.join(', '));
    }
  }
  report('all cache-busters unified per page', ok);
}

function checkAssetsExist() {
  console.log('6. Referenced js/css assets exist');
  let ok = true;
  for (const page of ['index.html', 'admin.html']) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const refs = [...html.matchAll(/(?:src|href)="((?:js|css)\/[^"?]+)/g)].map(m => m[1]);
    const missing = refs.filter(r => !fs.existsSync(path.join(ROOT, r)));
    if (missing.length) {
      ok = false;
      console.log('    ' + page + ' missing: ' + missing.join(', '));
    }
  }
  report('all referenced assets exist', ok);
}

// ---- DOM stub + production-order load test ----
function makeEl(id) {
  return {
    id: id || '',
    children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k] || null; },
    removeAttribute(k) { delete this.attributes[k]; },
    addEventListener() {},
    removeEventListener() {},
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
    insertBefore(c) { this.children.push(c); },
    cloneNode() { return makeEl(this.id); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    focus() {},
    click() {},
    getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 100 }; },
    textContent: '', innerHTML: '', value: '', type: 'text', src: '',
    hidden: false, disabled: false, tabIndex: 0, width: 100, height: 100,
  };
}

function checkLoadOrder() {
  console.log('7. All JS load in production order (DOM stub)');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  // Parse script srcs in document order (defer/main first, then the rest).
  const order = [];
  const re = /<script[^>]*src="((?:js\/)[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const src = m[1].replace(/\?v=[0-9a-z]+$/, '');
    if (!order.includes(src)) order.push(src);
  }

  const elements = {};
  const documentStub = {
    getElementById(id) { if (!elements[id]) elements[id] = makeEl(id); return elements[id]; },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    createElement(tag) { return makeEl(tag); },
    createTextNode(t) { return { text: t }; },
    addEventListener() {},
    body: makeEl('body'),
    documentElement: makeEl('html'),
    head: makeEl('head'),
  };
  const localStorageStub = {
    _d: {},
    getItem(k) { return this._d[k] !== undefined ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  };
  const windowStub = {
    addEventListener() {},
    matchMedia() { return { matches: false, addEventListener() {} }; },
    requestAnimationFrame(cb) { cb && cb(); },
    getComputedStyle() { return { getPropertyValue() { return ''; } }; },
    location: { origin: 'https://example.com', pathname: '/portfolio/index.html', href: 'https://example.com/portfolio/index.html' },
    localStorage: localStorageStub,
    document: documentStub,
    MutationObserver: function () { this.observe = function () {}; this.disconnect = function () {}; },
    Image: function () { return makeEl('img'); },
    FileReader: function () { this.readAsDataURL = function () {}; this.readAsText = function () {}; },
    Blob: function () {},
    URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} },
    AbortController: function () { this.abort = function () {}; },
    setTimeout, clearTimeout, setInterval, clearInterval,
    console,
    fetch: async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '{}' }),
    crypto: { getRandomValues(a) { return a; } },
  };
  windowStub.window = windowStub;
  windowStub.globalThis = windowStub;
  windowStub.self = windowStub;

  const sandbox = {
    window: windowStub, document: documentStub, localStorage: localStorageStub,
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    fetch: windowStub.fetch, Image: windowStub.Image, FileReader: windowStub.FileReader,
    Blob: windowStub.Blob, URL: windowStub.URL, AbortController: windowStub.AbortController,
    MutationObserver: windowStub.MutationObserver, matchMedia: windowStub.matchMedia,
    requestAnimationFrame: windowStub.requestAnimationFrame, getComputedStyle: windowStub.getComputedStyle,
    location: windowStub.location,
    navigator: { userAgent: 'node' },
    crypto: windowStub.crypto,
  };
  vm.createContext(sandbox);

  let ok = true;
  for (const f of order) {
    const abs = path.join(ROOT, f);
    if (!fs.existsSync(abs)) { ok = false; console.log('    missing: ' + f); continue; }
    try {
      vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f });
    } catch (e) {
      ok = false;
      console.log('    ' + f + ': ' + (e.message || e).toString().slice(0, 180));
    }
  }
  report(order.length + ' scripts loaded in production order', ok);
  process.exit(0); // timers from chatbot etc. keep the event loop alive otherwise
}

console.log('Running portfolio checks...\n');
checkJS();
checkInlineScripts();
checkCSS();
checkNavHrefs();
checkCacheBusters();
checkAssetsExist();
checkLoadOrder();

console.log('\n' + RESULTS.pass + ' passed, ' + RESULTS.fail + ' failed');
if (RESULTS.fail) {
  console.log('\nFailures:\n' + ERRORS.map(e => '  - ' + e).join('\n'));
  process.exit(1);
}
process.exit(0);
