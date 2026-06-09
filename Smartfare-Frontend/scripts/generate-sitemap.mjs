import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seoConfigPath = path.join(process.cwd(), 'src', 'app', 'core', 'seo', 'seo.config.ts');

if (!fs.existsSync(seoConfigPath)) {
  console.error("Could not find seo.config.ts at", seoConfigPath);
  process.exit(1);
}

const seoConfigContent = fs.readFileSync(seoConfigPath, 'utf8');

// Extract SITEMAP_ENTRIES
const match = seoConfigContent.match(/export const SITEMAP_ENTRIES[\s\S]*?=\s*(\[[\s\S]*?\]);/);
if (!match) {
  console.error("Could not find SITEMAP_ENTRIES in seo.config.ts");
  process.exit(1);
}

// Extract DOMAIN
const domainMatch = seoConfigContent.match(/export const DEFAULT_SITE_URL = '(.*?)';/);
const DOMAIN = domainMatch ? domainMatch[1] : 'https://smartfare.nicolas-dominici.it';

let SITEMAP_ENTRIES;
try {
  SITEMAP_ENTRIES = eval(`(${match[1]})`);
} catch (e) {
  console.error("Error parsing SITEMAP_ENTRIES:", e);
  process.exit(1);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${SITEMAP_ENTRIES.map(entry => `  <url>
    <loc>${DOMAIN}${entry.loc}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
console.log('sitemap.xml generated successfully in public/sitemap.xml');
