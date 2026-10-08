#!/usr/bin/env node
// Generates the JSON-LD structured data block for every public page and
// writes it into each page's <head>, between the
// <!-- structured-data:start --> / <!-- structured-data:end --> markers
// (inserted before </head> on first run, replaced in place after that).
//
// Usage: npm run build:jsonld
//
// Why a script instead of hand-pasted JSON: the Pitching Dictionary block
// carries all 117 DefinedTerm entries, read straight out of the page markup,
// so it can never drift from the visible definitions. Re-run this after any
// content change, then bump the matching <lastmod> in sitemap.xml.
//
// Business facts (address, phone, prices, ages) are declared once in
// SITE/PAGES below and must match what the pages say. If a price or age
// changes on a page, change it here too.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE = 'https://tapathletes.com';

// ---------------------------------------------------------------------------
// Shared entities
// ---------------------------------------------------------------------------

const ORG_ID = `${BASE}/#organization`;
const SITE_ID = `${BASE}/#website`;

const ORG = {
  '@type': ['SportsActivityLocation', 'LocalBusiness', 'Organization'],
  '@id': ORG_ID,
  name: 'TAP Athletes',
  alternateName: 'TAP Athletes Pitching Academy',
  legalName: 'Training Athletic Performance, Inc.',
  url: `${BASE}/`,
  logo: {
    '@type': 'ImageObject',
    url: `${BASE}/images/web-app-manifest-512x512.png`,
    width: 512,
    height: 512,
  },
  image: `${BASE}/images/og-card.png`,
  description:
    'TAP Athletes is a baseball pitching academy in Rogers, Arkansas, serving youth and high-school pitchers ages 8 and up. TAP trains pitching only — no hitting, no fielding, no general athletic training. Programs are progression-based: athletes are assessed, placed at a level that matches their current mechanics, and advance by demonstrating skills rather than by aging up.',
  telephone: '+1-833-860-2711',
  email: 'support@tapathletes.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '1751 S 1st Street',
    addressLocality: 'Rogers',
    addressRegion: 'AR',
    postalCode: '72758',
    addressCountry: 'US',
  },
  areaServed: [
    { '@type': 'City', name: 'Rogers', containedInPlace: { '@type': 'State', name: 'Arkansas' } },
    { '@type': 'Place', name: 'Northwest Arkansas' },
  ],
  priceRange: '$15 – $4,500',
  sport: 'Baseball',
  knowsAbout: [
    'Baseball pitching instruction',
    'Youth pitching mechanics',
    'Pitch design',
    'Pitching velocity development',
    'Pitching command training',
    'Rapsodo pitch tracking',
  ],
};

const ORG_REF = { '@id': ORG_ID };

const WEBSITE = {
  '@type': 'WebSite',
  '@id': SITE_ID,
  url: `${BASE}/`,
  name: 'TAP Athletes',
  publisher: ORG_REF,
  inLanguage: 'en-US',
};

const breadcrumb = (pageUrl, items) => ({
  '@type': 'BreadcrumbList',
  '@id': `${pageUrl}#breadcrumb`,
  itemListElement: items.map(([name, url], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name,
    item: url,
  })),
});

const faq = (pageUrl, pairs) => ({
  '@type': 'FAQPage',
  '@id': `${pageUrl}#faq`,
  mainEntity: pairs.map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});

const webPage = (url, extra) => ({
  '@type': 'WebPage',
  '@id': `${url}#webpage`,
  url,
  isPartOf: { '@id': SITE_ID },
  about: ORG_REF,
  inLanguage: 'en-US',
  primaryImageOfPage: `${BASE}/images/og-card.png`,
  ...extra,
});

const usd = (price) => ({ '@type': 'Offer', price, priceCurrency: 'USD', availability: 'https://schema.org/InStock', seller: ORG_REF });
const monthly = (price, name, url, description) => ({
  ...usd(price),
  name,
  url,
  description,
  priceSpecification: {
    '@type': 'UnitPriceSpecification',
    price,
    priceCurrency: 'USD',
    billingIncrement: 1,
    unitCode: 'MON',
    unitText: 'per month',
  },
});

const audience = (minAge, description) => ({
  '@type': 'PeopleAudience',
  audienceType: 'Youth and high-school baseball pitchers',
  suggestedMinAge: minAge,
  ...(description ? { description } : {}),
});

// ---------------------------------------------------------------------------
// Per-page graphs. `modified` is today's build date; `published` is the date
// the page first shipped (from git history).
// ---------------------------------------------------------------------------

const TODAY = new Date().toISOString().slice(0, 10);

const PAGES = {
  'index.html': ({ url }) => [
    ORG,
    WEBSITE,
    webPage(url, {
      name: 'TAP Athletes — Baseball Pitching Instruction in Rogers, Arkansas',
      description:
        'Pitching academy in Rogers, Arkansas for ages 8 and up. Structured programs, group classes, and individual instruction that build mechanics, command, and confidence.',
      datePublished: '2026-04-08',
      dateModified: TODAY,
      mainEntity: ORG_REF,
    }),
    {
      '@type': 'OfferCatalog',
      '@id': `${url}#programs`,
      name: 'TAP Athletes programs and sessions',
      itemListElement: [
        { '@type': 'Offer', name: 'Classes & individual instruction (à la carte)', description: 'Single sessions, group classes (Pitch Design, Beyond the Pitch, rotating topics), and Rapsodo scripted bullpens. Open to any athlete ages 8+, no program enrollment required. Booked in the TAP Athletes app.', priceCurrency: 'USD', priceSpecification: { '@type': 'PriceSpecification', minPrice: 15, maxPrice: 100, priceCurrency: 'USD', unitText: 'per session' }, seller: ORG_REF },
        { '@type': 'Offer', name: 'TAP Athletes Foundations', url: `${BASE}/foundations/`, description: 'Progression-based pitching development, ages 8+. Monthly, from $510.', price: 510, priceCurrency: 'USD', seller: ORG_REF },
        { '@type': 'Offer', name: 'Train Unprompted', url: `${BASE}/train-unprompted/`, description: 'Six-week behavior-first cohort, ages 13+. $497 flat.', price: 497, priceCurrency: 'USD', seller: ORG_REF },
        { '@type': 'Offer', name: 'Pitching Accelerator', url: `${BASE}/pitching-accelerator/`, description: 'Six-month semi-private cohort, 14U+ playing level, with a +5 mph and +5% strike-rate guarantee. $4,500 per seat.', price: 4500, priceCurrency: 'USD', seller: ORG_REF },
      ],
    },
    faq(url, [
      ['What age does TAP Athletes work with?', 'We work with pitchers ages 8 and up. Each program targets a different stage: Foundations is for ages 8+ at all skill levels; Pitching Accelerator is for the 14U playing level and higher; Train Unprompted is for ages 13+ (junior high and up).'],
      ['Do you offer private instruction outside of programs?', 'Yes. Outside of our structured programs we offer individual instruction, Rapsodo scripted bullpens, and standalone classes (Pitch Design, Beyond the Pitch, and rotating topics). All are booked inside the TAP Athletes app with no long-term commitment required.'],
      ['What makes TAP Athletes different from a private pitching coach?', 'The difference is how, what, and why we teach pitching: a pitching-only focus (no hitting, no fielding), full-time instructors whose whole job is pitcher development, a documented curriculum with defined progression and real end points to every phase, independent training through bookable Rapsodo bullpen slots, and finish lines such as Foundations milestones, the 60/10 Club, and the Accelerator guarantee.'],
    ]),
  ],

  'education/index.html': ({ url }) => [
    ORG,
    WEBSITE,
    breadcrumb(url, [['Home', `${BASE}/`], ['Education', url]]),
    {
      ...webPage(url, {
        name: 'Education & Resources — TAP Athletes',
        description: 'Free pitching resources from TAP Athletes: a 117-term pitching dictionary and the full Foundations curriculum. Open to read, no email required.',
        datePublished: '2026-08-13',
        dateModified: TODAY,
        breadcrumb: { '@id': `${url}#breadcrumb` },
      }),
      '@type': 'CollectionPage',
      hasPart: [
        { '@type': 'WebPage', '@id': `${BASE}/pitching-dictionary/#webpage`, url: `${BASE}/pitching-dictionary/`, name: 'The Pitching Dictionary', description: '117 plain-language pitching terms across pitch types, characteristics, mechanics, data and metrics, pitch science and technology, drills, and pitch design. Every entry has its own link.' },
        { '@type': 'WebPage', '@id': `${BASE}/foundations/curriculum/#webpage`, url: `${BASE}/foundations/curriculum/`, name: 'The Foundations Curriculum', description: 'How the Foundations program works: four mechanical phases governed by effort bands, the 18 skills trained in every phase, sample drills, and what it takes to advance.' },
      ],
    },
  ],

  'foundations/index.html': ({ url }) => [
    ORG,
    WEBSITE,
    breadcrumb(url, [['Home', `${BASE}/`], ['Foundations', url]]),
    webPage(url, {
      name: 'TAP Athletes Foundations — Progression-Based Pitching, Ages 8+',
      description: 'Progression-based pitching development for ages 8+. Free in-person assessment, phase-based placement, up to 8 sessions/month. From $510/mo.',
      datePublished: '2026-04-14',
      dateModified: TODAY,
      breadcrumb: { '@id': `${url}#breadcrumb` },
      mainEntity: { '@id': `${url}#service` },
    }),
    {
      '@type': 'Service',
      '@id': `${url}#service`,
      name: 'TAP Athletes Foundations',
      serviceType: 'Baseball pitching instruction program',
      url,
      provider: ORG_REF,
      areaServed: { '@type': 'City', name: 'Rogers', containedInPlace: { '@type': 'State', name: 'Arkansas' } },
      audience: audience(8, 'Pitchers ages 8 and up, any experience level.'),
      description:
        'The core progression-based pitching program. Every athlete starts with a free 90-minute in-person assessment, is placed into the right mechanical phase and subphase, trains in reserved weekly time slots (up to 8 sessions per month), and advances by demonstrating execution rather than by attendance or age. Follows the published Foundations curriculum: four mechanical phases governed by effort bands and 18 skills trained in every phase.',
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Foundations formats',
        itemListElement: [
          monthly(510, 'Foundations — All-Facility', url, 'Every session at the TAP Athletes facility. Up to 8 sessions per month, reserved weekly time slots, 2 sessions per week recommended. Classes included free for members.'),
          monthly(600, 'Foundations — Hybrid', url, 'All facility sessions plus up to 4 on-site visits per month — the coach comes to the pitcher\'s home, park, or field. Same progression.'),
          { '@type': 'Offer', name: 'Foundations Prep', url, description: 'A one-month entry point for younger pitchers, beginners, or families new to structured training. Two 30-minute sessions per week; ideal for ages 8–12. Transitions into the full Foundations program after one month.', priceCurrency: 'USD', availability: 'https://schema.org/InStock', seller: ORG_REF, eligibleCustomerType: 'Ages 8–12' },
        ],
      },
      isRelatedTo: { '@type': 'CreativeWork', '@id': `${BASE}/foundations/curriculum/#article`, name: 'The Foundations Pitching Curriculum', url: `${BASE}/foundations/curriculum/` },
    },
    faq(url, [
      ['How is this different from private lessons?', 'Many athletes benefit from both, but they solve different problems. Lessons are adjustments: they address recent game problems, are booked individually as needed, and offer no structured path between sessions. Foundations is development: a defined progression toward lasting results, where each session builds on the last, with repeatable mechanics over time and reserved weekly slots.'],
      ['Does my pitcher need experience to start?', 'No. Foundations is built for any pitcher age 8 and up — whether they are brand new to pitching, struggling with consistency, or have had instruction before without consistent results. The assessment determines where your pitcher starts.'],
      ['How often does my pitcher need to train?', 'There is no required weekly count; pitchers train at a pace that fits their schedule. Pitchers who average 2 sessions per week typically complete one subphase per month. Up to 8 sessions per month are available.'],
      ['What happens at the assessment?', 'A 90-minute in-person evaluation. Free, with no commitment to enroll; parent and pitcher both attend. It covers athlete background, pitch repertoire and game knowledge, warm-up quality grading (each movement graded 1–5 and re-graded at future sessions), athleticism benchmarks (broad jump, single-leg balance, rotational med ball throw, 10-yard acceleration), and movement observation (8–12 throws on flat ground to identify the dominant pattern). The output is a documented start profile specific to your pitcher.'],
    ]),
  ],

  'foundations/curriculum/index.html': ({ url }) => [
    ORG,
    WEBSITE,
    breadcrumb(url, [['Home', `${BASE}/`], ['Foundations', `${BASE}/foundations/`], ['Curriculum', url]]),
    webPage(url, {
      name: 'The Foundations Pitching Curriculum — TAP Athletes',
      description: 'The full Foundations pitching curriculum: four mechanical phases governed by effort bands, 18 skills, sample drills, and how pitchers advance.',
      datePublished: '2026-08-13',
      dateModified: TODAY,
      breadcrumb: { '@id': `${url}#breadcrumb` },
      mainEntity: { '@id': `${url}#article` },
    }),
    {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: 'The Foundations Pitching Curriculum',
      url,
      mainEntityOfPage: { '@id': `${url}#webpage` },
      author: ORG_REF,
      publisher: ORG_REF,
      datePublished: '2026-08-13',
      dateModified: TODAY,
      image: `${BASE}/images/og-card.png`,
      inLanguage: 'en-US',
      isAccessibleForFree: true,
      about: { '@id': `${BASE}/foundations/#service` },
      description:
        'Public documentation of what the Foundations program teaches: four mechanical phases, each bound to an effort band (Band 1 at 30–50% of recent representative maximum, Band 2 at 50–70%, Band 3 at 70–85%, Band 4 at 85% and above); eighteen mechanical skills across four categories (Lower Body & Force Transfer; Arm Action & Upper Body; Sequencing & Full-Body Integration; Command & Pitch Execution), trained in every phase; sample drills; and how assessment, per-skill placement, and coach-signed advancement work.',
      keywords: ['pitching curriculum', 'effort bands', 'youth pitching mechanics', 'pitching progression', 'TAP Athletes Foundations'],
    },
    faq(url, [
      ['What is an effort band?', 'An effort band is a defined range of throwing intensity, expressed as a percentage of the pitcher\'s recent representative maximum. Foundations uses four: Band 1 at 30–50%, Band 2 at 50–70%, Band 3 at 70–85%, and Band 4 at 85% and above. Each mechanical phase is bound to one band, so a pitcher\'s training intensity is defined by where they are in the curriculum.'],
      ['Does my pitcher\'s age determine their phase?', 'No. Phases describe what the pitcher is working on, not their age or experience level. All new pitchers begin in Phase 1, regardless of background. Effort bands are assigned from the pitcher\'s recent representative maximum throwing velocity — not age, not experience, and not a parent\'s report.'],
      ['How does a pitcher advance to the next phase?', 'By demonstrating the ability to perform and repeat what is being trained. No pitcher moves to the next phase just by attending. Advancement is earned, and the coach signs off before the pitcher progresses.'],
      ['Can a pitcher be in two phases at once?', 'Yes. Placement is per-skill, not per-pitcher. A pitcher may be placed into different phases for different skills based on their individual development — for example, further along in lower-body force transfer than in command.'],
      ['Who is the Foundations curriculum for?', 'Pitchers ages 8 and up, at any experience level, training at TAP Athletes in Rogers, Arkansas. Foundations Prep is a one-month entry point for younger pitchers, beginners, or families new to structured training, aimed at ages 8–12.'],
    ]),
  ],

  'pitching-accelerator/index.html': ({ url }) => [
    ORG,
    WEBSITE,
    breadcrumb(url, [['Home', `${BASE}/`], ['Pitching Accelerator', url]]),
    webPage(url, {
      name: 'Pitching Accelerator — +5 MPH & Command Guarantee | TAP Athletes',
      description: 'A 6-month semi-private cohort for 14U+ pitchers with a +5 mph fastball and 5% strike-rate guarantee. 6+ hrs/week hybrid instruction. $4,500/seat.',
      datePublished: '2026-04-10',
      dateModified: TODAY,
      breadcrumb: { '@id': `${url}#breadcrumb` },
      mainEntity: { '@id': `${url}#service` },
    }),
    {
      '@type': 'Service',
      '@id': `${url}#service`,
      name: 'Pitching Accelerator',
      serviceType: 'Semi-private baseball pitching development cohort',
      url,
      provider: ORG_REF,
      areaServed: { '@type': 'City', name: 'Rogers', containedInPlace: { '@type': 'State', name: 'Arkansas' } },
      audience: audience(13, 'Pitchers at a 14U or higher playing level. An updated sports or annual physical must be on file before starting.'),
      description:
        'A six-month, closed cohort of four athletes for pitchers at the inflection point. Weekly structure: 1 private instruction session, 1 cohort group session, 2 hours of independent lab training in the facility, daily at-home work (2–3 drills), and 2 hours of weekly homework, with tracked Rapsodo bullpens and a monthly progress review. Includes the TAP Athletes Pitching Dictionary, a TAP Athlete hoodie, and the Student Accountability Planner. Performance guarantee: if the athlete does not gain +5 mph on the fastball and +5% in strike percentage within 6 months, with participation requirements met, the full fee is refunded.',
      offers: {
        ...usd(4500),
        name: 'Pitching Accelerator — one seat',
        url,
        description: '$4,500 per seat. Four athletes per cohort; payment secures the seat. 100% money-back performance guarantee when participation requirements are met.',
        warranty: {
          '@type': 'WarrantyPromise',
          durationOfWarranty: { '@type': 'QuantitativeValue', value: 6, unitCode: 'MON' },
          description: 'Full refund if the athlete does not achieve +5 mph fastball velocity and a +5% strike-percentage improvement within 6 months, provided participation requirements are met: complete the weekly structure (1 private + 1 cohort group + 2 independent lab hours), log at-home work at least 5 days per week, and complete two standardized tracked bullpen assessments per month.',
        },
      },
      termsOfService: 'All athletes must have an updated sports or annual physical on file prior to beginning the program.',
    },
  ],

  'train-unprompted/index.html': ({ url }) => [
    ORG,
    WEBSITE,
    breadcrumb(url, [['Home', `${BASE}/`], ['Train Unprompted', url]]),
    webPage(url, {
      name: 'Train Unprompted — TAP Athletes Pitching Academy',
      description: 'A six-week youth and high school baseball pitching program for ages 13+ that teaches athletes to train on their own. Weekly coach home visits. $497.',
      datePublished: '2026-04-08',
      dateModified: TODAY,
      breadcrumb: { '@id': `${url}#breadcrumb` },
      mainEntity: { '@id': `${url}#service` },
    }),
    {
      '@type': 'Service',
      '@id': `${url}#service`,
      name: 'Train Unprompted',
      serviceType: 'Behavior-first baseball pitching development cohort',
      url,
      provider: ORG_REF,
      areaServed: { '@type': 'City', name: 'Rogers', containedInPlace: { '@type': 'State', name: 'Arkansas' } },
      audience: audience(13, 'Pitchers ages 13 and up (junior high and up).'),
      description:
        'A six-week cohort built to develop athlete ownership: the ability to train without being told to. Three touchpoints every week — a facility session, an at-home coach visit, and a video call — for 15+ touchpoints across the program, built on the self-determination pillars of autonomy, competence, and relatedness. Athletes learn why each drill works, how to execute it independently, and how to organize progressions and regressions. Every athlete leaves with a personal drill library, a training plan he built himself, and six weeks of logged work in the included student-athlete planner. If an athlete completes the program and is not independently running his own training sessions, TAP continues working with him at no additional cost; Phase 3 check-ins are always included.',
      offers: {
        ...usd(497),
        name: 'Train Unprompted — six-week cohort',
        url,
        description: '$497 flat for six weeks, no add-ons. Planner included. Extra Phase 3 check-ins at no charge.',
      },
    },
  ],

  'pitching-dictionary/index.html': ({ url, html }) => {
    const terms = extractTerms(html);
    if (terms.length !== 117) throw new Error(`Expected 117 dictionary terms, found ${terms.length}`);
    const sections = [...new Set(terms.map((t) => t.section))];
    return [
      ORG,
      WEBSITE,
      breadcrumb(url, [['Home', `${BASE}/`], ['Education', `${BASE}/education/`], ['Pitching Dictionary', url]]),
      webPage(url, {
        name: 'Pitching Dictionary: 117 Terms — TAP Athletes',
        description: 'A plain-language pitching dictionary — 117 terms covering pitch types, mechanics, metrics, technology, drills, and pitch design.',
        datePublished: '2026-08-13',
        dateModified: TODAY,
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: { '@id': `${url}#terms` },
      }),
      {
        '@type': 'DefinedTermSet',
        '@id': `${url}#terms`,
        name: 'TAP Athletes Pitching Dictionary',
        url,
        description: `${terms.length} baseball pitching terms defined in plain language by TAP Athletes, organized into ${sections.length} sections: ${sections.join('; ')}. Each term has its own anchor URL so individual definitions can be cited directly.`,
        publisher: ORG_REF,
        inLanguage: 'en-US',
        isAccessibleForFree: true,
        dateModified: TODAY,
        hasDefinedTerm: terms.map((t) => ({
          '@type': 'DefinedTerm',
          '@id': `${url}#${t.id}`,
          name: t.name,
          description: t.description,
          url: `${url}#${t.id}`,
          termCode: t.id,
          inDefinedTermSet: { '@id': `${url}#terms` },
          additionalType: t.section,
        })),
      },
    ];
  },
};

// ---------------------------------------------------------------------------
// Dictionary term extraction (from the page's own markup)
// ---------------------------------------------------------------------------

function decode(s) {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&deg;/g, '°').replace(/&times;/g, '×').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTerms(html) {
  const sections = [...html.matchAll(/<section id="(sec-[a-z])"[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/g)]
    .map((m) => ({ id: m[1], name: decode(m[2]), pos: m.index }));
  const entries = [...html.matchAll(/<div class="entry[^"]*"[^>]*data-term[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="entry|<\/dl>)/g)];
  return entries.map((m) => {
    const block = m[1];
    const dt = block.match(/<dt id="([^"]+)"[^>]*>([\s\S]*?)<\/dt>/);
    const ddRaw = (block.match(/<dd[^>]*>([\s\S]*?)<\/dd>/)?.[1] ?? '').replace(/<p data-xref[\s\S]*?<\/p>/g, '');
    const nameRaw = (dt?.[2] ?? '').replace(/<span[^>]*aria-hidden="true"[^>]*>#<\/span>/g, '');
    const sec = [...sections].reverse().find((s) => s.pos < m.index);
    const term = { id: dt?.[1], name: decode(nameRaw), description: decode(ddRaw), section: sec?.name };
    for (const k of ['id', 'name', 'description', 'section']) {
      if (!term[k]) throw new Error(`Dictionary term missing ${k}: ${JSON.stringify(term)}`);
    }
    return term;
  });
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

const START = '<!-- structured-data:start -->';
const END = '<!-- structured-data:end -->';

function render(graph) {
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
    // Never let "</script>" or "<!--" appear inside the script body.
    .replace(/</g, '\\u003c');
  return `${START}\n  <script type="application/ld+json">${json}</script>\n  ${END}`;
}

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
