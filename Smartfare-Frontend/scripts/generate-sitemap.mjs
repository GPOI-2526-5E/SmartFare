#!/usr/bin/env node
/**
 * Generates public/sitemap.xml from seo.config.ts entries.
 * Run automatically before production build.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '../src/app/core/seo/seo.config.ts');
const outputPath = join(__dirname, '../public/sitemap.xml');

const SITE_URL = 'https://smartfare.nicolas-dominici.it';
const configSource = readFileSync(configPath, 'utf8');

const entriesBlock = configSource.match(
  /export const SITEMAP_ENTRIES[^=]*=\s*\[([\s\S]*?)\];/
)?.[1];

if (!entriesBlock) {
  console.error('Could not parse SITEMAP_ENTRIES from seo.config.ts');
  process.exit(1);
}

const entries = [...entriesBlock.matchAll(/\{\s*loc:\s*'([^']+)',\s*changefreq:\s*'([^']+)',\s*priority:\s*([\d.]+)\s*\}/g)].map(
  ([, loc, changefreq, priority]) => ({ loc, changefreq, priority: Number(priority) })
);

const today = new Date().toISOString().slice(0, 10);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${entries
  .map(
    ({ loc, changefreq, priority }) => `  <url>
    <loc>${SITE_URL}${loc === '/' ? '/' : loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(2)}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

writeFileSync(outputPath, `${xml}\n`, 'utf8');
console.log(`Generated sitemap with ${entries.length} URLs → public/sitemap.xml`);
