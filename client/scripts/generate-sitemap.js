/**
 * Sitemap Generator
 * 
 * Generates sitemap.xml for SEO
 * Run with: node scripts/generate-sitemap.js
 */

import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'node:url';

// Define your site's URLs
const SITE_URL = 'https://yoursite.com';

const urls = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/about', changefreq: 'monthly', priority: 0.8 },
  { url: '/features', changefreq: 'weekly', priority: 0.9 },
  { url: '/docs', changefreq: 'weekly', priority: 0.7 },
  { url: '/contact', changefreq: 'monthly', priority: 0.6 },
  // Add more URLs as needed
];

async function generateSitemap() {
  try {
    const sitemapPath = resolve(process.cwd(), 'public', 'sitemap.xml');
    const stream = new SitemapStream({ hostname: SITE_URL });
    const writeStream = createWriteStream(sitemapPath);

    stream.pipe(writeStream);

    // Add URLs to sitemap
    urls.forEach(url => stream.write(url));

    // End the stream
    stream.end();

    await streamToPromise(stream);

    console.log('✓ Sitemap generated successfully at:', sitemapPath);
  } catch (error) {
    console.error('✗ Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateSitemap();
}

export { generateSitemap };
