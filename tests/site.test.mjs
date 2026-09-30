import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = 'https://goktugtutar.github.io/guitarViz/';
const pages = ['', 'guitar-scales/', 'guitar-chords/', 'chord-progressions/'];

test('all public pages are crawlable English documents with distinct metadata and valid local links', () => {
  const titles = new Set(), descriptions = new Set();
  for (const page of pages) {
    const dom = new JSDOM(fs.readFileSync(path.join(root, page, 'index.html'), 'utf8'), { url: base + page });
    const doc = dom.window.document;
    assert.equal(doc.documentElement.lang, 'en');
    assert.equal(doc.querySelectorAll('h1').length, 1);
    assert.equal(doc.querySelector('link[rel="canonical"]').href, base + page);
    assert.equal(doc.querySelector('meta[property="og:url"]').content, base + page);
    assert.ok(doc.querySelector('meta[property="og:title"]').content);
    assert.ok(doc.querySelector('meta[name="twitter:description"]').content);
    assert.ok(doc.querySelector('meta[name="description"]').content.length > 60);
    titles.add(doc.title); descriptions.add(doc.querySelector('meta[name="description"]').content);
    for (const el of doc.querySelectorAll('a[href],link[href],script[src],img[src]')) {
      const url = new URL(el.getAttribute('href') || el.getAttribute('src'), base + page);
      if (!url.href.startsWith(base)) continue;
      let local = decodeURIComponent(url.pathname.slice(new URL(base).pathname.length));
      if (!local || local.endsWith('/')) local += 'index.html';
      assert.ok(fs.existsSync(path.join(root, local)), `${page}: missing ${local}`);
      if (url.searchParams.has('tab')) assert.ok(['explore','chords','progressions','editor'].includes(url.searchParams.get('tab')));
    }
    assert.doesNotMatch(doc.body.textContent, /[çğıöşüÇĞİÖŞÜ]/);
    if (page) assert.ok(doc.querySelector('article').textContent.split(/\s+/).length >= 200);
    dom.window.close();
  }
  assert.equal(titles.size, pages.length);
  assert.equal(descriptions.size, pages.length);
});

test('sitemap contains exactly the canonical public pages and structured data describes the free app', () => {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const sitemap = new JSDOM(xml, { contentType: 'application/xml' });
  assert.deepEqual([...sitemap.window.document.querySelectorAll('loc')].map(x => x.textContent), pages.map(p => base+p));
  const home = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  const data = JSON.parse(home.window.document.querySelector('script[type="application/ld+json"]').textContent);
  assert.equal(data['@type'], 'WebApplication');
  assert.equal(data.url, base);
  assert.equal(data.offers.price, '0');
  assert.equal(data.inLanguage, 'en');
  home.window.close(); sitemap.window.close();
});
