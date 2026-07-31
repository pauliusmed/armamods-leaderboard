import { Helmet } from 'react-helmet-async';
import { SITE_ORIGIN } from '../../lib/site';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  imageAlt?: string;
  /** Absolute URL or path used for canonical + og:url (query strings should be omitted). */
  url?: string;
  type?: string;
  /** Hide thin / private pages from search indexes. */
  noindex?: boolean;
  /** One object or an array of JSON-LD graphs. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

function absoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  return `${SITE_ORIGIN}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function SEO({
  title,
  description,
  keywords,
  image = '/og-image.png',
  imageAlt,
  url = SITE_ORIGIN,
  type = 'website',
  noindex = false,
  jsonLd,
}: SEOProps) {
  const siteTitle = 'Arma Mods';
  const fullTitle = title ? `${title} | ${siteTitle}` : `${siteTitle} - Real-time Analytics & Trends`;
  const defaultDesc =
    'Discover and track the most popular Arma Reforger and Arma 3 mods. Real-time player counts and trending analytics.';
  const ogImage = absoluteUrl(image);
  const pageUrl = absoluteUrl(url);
  const resolvedImageAlt = imageAlt || fullTitle;
  const usesStandardSocialCard = image.startsWith('/og-');
  const graphs = jsonLd == null ? [] : Array.isArray(jsonLd) ? jsonLd : [jsonLd];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={pageUrl} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      <meta property="og:site_name" content="reforgermods.com" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDesc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={resolvedImageAlt} />
      {usesStandardSocialCard && <meta property="og:image:type" content="image/png" />}
      {usesStandardSocialCard && <meta property="og:image:width" content="1200" />}
      {usesStandardSocialCard && <meta property="og:image:height" content="630" />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || defaultDesc} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={resolvedImageAlt} />

      {graphs.map((graph, i) => (
        <script
          // Stable order; content is the identity for crawlers
          key={`jsonld-${i}-${String(graph['@type'] ?? 'graph')}`}
          type="application/ld+json"
        >
          {JSON.stringify(graph)}
        </script>
      ))}
    </Helmet>
  );
}
