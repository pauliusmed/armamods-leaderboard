import { SITE_ORIGIN } from './site';

export type JsonLd = Record<string, unknown>;

export function websiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'reforgermods.com',
    url: `${SITE_ORIGIN}/`,
    description:
      'Live Arma Reforger and Arma 3 mod and server popularity rankings from multiplayer networks.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_ORIGIN}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function softwareApplicationJsonLd(input: {
  name: string;
  url: string;
  description: string;
  modId: string;
  players?: number;
  servers?: number;
  rank?: number | string | null;
  image?: string;
}): JsonLd {
  const extra: string[] = [];
  if (input.rank != null && input.rank !== '') extra.push(`Rank #${input.rank}`);
  if (input.players != null) extra.push(`${input.players} players`);
  if (input.servers != null) extra.push(`${input.servers} servers`);

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: input.name,
    url: input.url,
    description: input.description,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Arma Reforger / Arma 3',
    identifier: input.modId,
    ...(input.image ? { image: input.image } : {}),
    ...(extra.length
      ? {
          additionalProperty: extra.map((value) => ({
            '@type': 'PropertyValue',
            name: 'networkStat',
            value,
          })),
        }
      : {}),
  };
}

export function itemListJsonLd(input: {
  name: string;
  description: string;
  url: string;
  items: Array<{ name: string; url: string }>;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: input.name,
    description: input.description,
    url: input.url,
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function breadcrumbJsonLd(
  crumbs: Array<{ name: string; url: string }>
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function howToJsonLd(input: {
  name: string;
  description: string;
  url: string;
  steps: Array<{ name: string; text: string }>;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    url: input.url,
    step: input.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}
