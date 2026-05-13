import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEO({ 
  title, 
  description, 
  keywords, 
  image = '/og-image.png',
  url = 'https://armamods-leaderboard.pages.dev/',
  type = 'website'
}: SEOProps) {
  const siteTitle = 'Arma Mods';
  const fullTitle = title ? `${title} | ${siteTitle}` : `${siteTitle} - Real-time Analytics & Trends`;
  const defaultDesc = 'Discover and track the most popular Arma Reforger and Arma 3 mods. Real-time player counts and trending analytics.';

  return (
    <Helmet>
      {/* Standard tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDesc} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDesc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || defaultDesc} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
