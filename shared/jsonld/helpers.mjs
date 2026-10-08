// Schema.org building blocks shared by every site's site.config.mjs.
// Key order inside each object is deliberate: it fixes the byte-for-byte
// output of the generated JSON-LD, so a refactor here shows up as a diff
// on every page. Keep it stable.

/** Today's build date (UTC, YYYY-MM-DD) — the value pages use for dateModified. */
export const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Helpers bound to one site's origin.
 * @param {string} BASE  Site origin without trailing slash, e.g. 'https://tapathletes.com'.
 * @param {{ shareImage?: string, inLanguage?: string }} [opts]
 */
export function schema(BASE, { shareImage = `${BASE}/images/og-card.png`, inLanguage = 'en-US' } = {}) {
  const ORG_ID = `${BASE}/#organization`;
  const SITE_ID = `${BASE}/#website`;
  const ORG_REF = { '@id': ORG_ID };

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
    inLanguage,
    primaryImageOfPage: shareImage,
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

  return { ORG_ID, SITE_ID, ORG_REF, breadcrumb, faq, webPage, usd, monthly };
}
