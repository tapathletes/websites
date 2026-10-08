#!/usr/bin/env node
// Generates the JSON-LD structured data block for every page a site lists
// and writes it into each page's <head>, between the
// <!-- structured-data:start --> / <!-- structured-data:end --> markers
// (inserted before </head> on first run, replaced in place after that).
//
// Usage (from the repo root):  node shared/jsonld/build.mjs <site-folder>
//   e.g.                       node shared/jsonld/build.mjs tapathletes.com
//
// The site folder must contain site.config.mjs exporting:
//   BASE   — the site origin, no trailing slash ('https://tapathletes.com')
//   ORG    — the Organization block (the business facts, declared once)
//   PAGES  — { 'path/index.html': ({ url, html }) => [graph nodes...] }
// Business facts in site.config.mjs must match what the pages say.

import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const START = '<!-- structured-data:start -->';
const END = '<!-- structured-data:end -->';

function render(graph) {
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
    // Never let "</script>" or "<!--" appear inside the script body.
    .replace(/</g, '\\u003c');
  return `${START}\n  <script type="application/ld+json">${json}</script>\n  ${END}`;
}

export async function buildJsonLd(siteDir) {
  const ROOT = resolve(siteDir);
  const config = await import(pathToFileURL(join(ROOT, 'site.config.mjs')).href);
  const { BASE, PAGES } = config;
  if (!BASE || !PAGES || !config.ORG) throw new Error(`${ROOT}/site.config.mjs must export BASE, ORG and PAGES`);

  for (const [rel, build] of Object.entries(PAGES)) {
    const file = join(ROOT, rel);
    const html = await readFile(file, 'utf8');
    const path = rel === 'index.html' ? '/' : `/${rel.replace(/index\.html$/, '')}`;
    const url = `${BASE}${path}`;
    const block = render(build({ url, html }));

    let out;
    if (html.includes(START) && html.includes(END)) {
      out = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
    } else if (html.includes('</head>')) {
      out = html.replace('</head>', `  ${block}\n</head>`);
    } else {
      throw new Error(`${rel}: no </head> found`);
    }
    if (out !== html) await writeFile(file, out);
    console.log(`${out === html ? 'unchanged' : 'wrote'}  ${rel}  (${(block.length / 1024).toFixed(1)} KB)`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const site = process.argv[2];
  if (!site) {
    console.error('Usage: node shared/jsonld/build.mjs <site-folder>');
    process.exit(2);
  }
  await buildJsonLd(site);
}
