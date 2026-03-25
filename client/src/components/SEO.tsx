import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  fullTitle?: string;
  description?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  canonicalUrl?: string;
  noIndex?: boolean;
}

const BASE_URL = 'https://redatametrix.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;
const SITE_NAME = 'RE Data Metrix';

export function SEO({
  title,
  fullTitle: fullTitleProp,
  description,
  ogImage = DEFAULT_IMAGE,
  ogType = 'website',
  canonicalUrl,
  noIndex = false,
}: SEOProps) {
  const fullTitle = fullTitleProp ?? (title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Real Estate Investment Analysis & Funding`);
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} key="canonical" />}
      
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
