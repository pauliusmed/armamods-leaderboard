import { Helmet } from 'react-helmet-async';
import { SITE_ORIGIN } from '../../lib/site';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
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
  url = SITE_ORIGIN,
  type = 'website',
}: SEOProps) {
  const siteTitle = 'Arma Mods';
  const fullTitle = title ? `${title} | ${siteTitle}` : `${siteTitle} - Real-time Analytics & Trends`;
  const defaultDesc =
    'Discover and track the most popular Arma Reforger and Arma 3 mods. Real-time player counts and trending analytics.';
  const ogImage = absoluteUrl(image);
  const pageUrl = absoluteUrl(url);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDesc} />
      {keywords && <meta name="keywords" content={keywords} />}

      <meta property="og:site_name" content="reforgermods.com" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDesc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || defaultDesc} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
