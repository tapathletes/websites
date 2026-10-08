#!/usr/bin/env node
// Regenerates foundations/TAP-Athletes-Foundations-Curriculum-Guide.pdf
// from foundations/curriculum-guide.html using headless Chromium (Puppeteer).
//
// Usage: npm run build:pdf

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SOURCE = '/foundations/curriculum-guide.html';
const OUTPUT = join(ROOT, 'foundations', 'TAP-Athletes-Foundations-Curriculum-Guide.pdf');

// .page divs are sized 880px wide × (880 * 11/8.5) = 1138.8px tall in CSS pixels.
// Letter PDF is 612pt × 792pt = 816 × 1056 CSS px (at 96 DPI).
// Scale = 816/880 maps the layout pixel-perfect onto Letter without overflow.
const PAGE_CSS_WIDTH = 880;
const LETTER_CSS_WIDTH = 816;
const SCALE = LETTER_CSS_WIDTH / PAGE_CSS_WIDTH;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.jsx':  'application/javascript; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pdf':  'application/pdf',
  '.ico':  'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (req, res) => {
  try {
    const url = req.url.split('?')[0];
    let path = join(ROOT, decodeURIComponent(url));
    const s = await stat(path).catch(() => null);
    if (s && s.isDirectory()) path = join(path, 'index.html');
    const data = await readFile(path);
    res.writeHead(200, {
      'Content-Type': MIME[extname(path).toLowerCase()] || 'application/octet-stream',
    });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const targetUrl = `http://127.0.0.1:${port}${SOURCE}`;
console.log(`[build-pdf] Serving ${ROOT} on ${targetUrl}`);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  // Viewport must be wider than the page's 900px mobile breakpoint so the
  // desktop layout renders. The .doc itself stays at max-width 880px.
  await page.setViewport({ width: 1200, height: 1200 });
  await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60_000 });

  // Wait for web fonts (DM Sans, JetBrains Mono) to settle so layout doesn't shift.
  await page.evaluate(() => document.fonts && document.fonts.ready);

  // page.pdf() forces print media emulation, and the print layout viewport is
  // sized to the PDF page width (~880 CSS px for Letter at our scale) — which
  // is below the page's 900px mobile breakpoint and collapses the 2×2 skill
  // matrix into a single column. Strip those mobile rules so desktop layout
  // applies during PDF render.
  await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (let i = rules.length - 1; i >= 0; i--) {
        const r = rules[i];
        if (r.type === CSSRule.MEDIA_RULE && /max-width:\s*900px/.test(r.media.mediaText)) {
          sheet.deleteRule(i);
        }
      }
    }
  });

  // Inject print rules: hide the dev tweaks panel, kill page-shadows/margins, and
  // pin every .page to exactly one PDF page. The content was authored to fit
  // 880 × 1138.8px CSS, so we hard-clip to that and force a break after each.
  const PAGE_CSS_HEIGHT = (PAGE_CSS_WIDTH * 11) / 8.5; // 1138.823...
  await page.addStyleTag({
    content: `
      @page { size: Letter; margin: 0; }
      html, body { background: #fff !important; }
      #tweaks-root { display: none !important; }
      .doc { margin: 0 auto !important; padding: 0 !important; max-width: ${PAGE_CSS_WIDTH}px !important; }
      .page {
        margin: 0 !important;
        box-shadow: none !important;
        width: ${PAGE_CSS_WIDTH}px !important;
        height: ${PAGE_CSS_HEIGHT}px !important;
        min-height: ${PAGE_CSS_HEIGHT}px !important;
        max-height: ${PAGE_CSS_HEIGHT}px !important;
        overflow: hidden !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .page:last-of-type {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    `,
  });

  await page.pdf({
    path: OUTPUT,
    format: 'Letter',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    scale: SCALE,
    preferCSSPageSize: false,
  });

  console.log(`[build-pdf] Wrote ${OUTPUT}`);
} finally {
  await browser.close();
  server.close();
}
