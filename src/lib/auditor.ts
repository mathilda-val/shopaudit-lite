/**
 * ShopAudit Core - SEO Auditing Engine v2
 * 22 comprehensive checks across 6 categories
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface AuditResult {
  url: string;
  timestamp: Date;
  score: number;
  grade: string;
  checks: AuditCheck[];
  summary: {
    critical: number;
    warnings: number;
    passed: number;
    info: number;
  };
  meta: {
    title: string | null;
    description: string | null;
    ogImage: string | null;
    favicon: string | null;
    responseTimeMs: number;
    htmlSizeKb: number;
    isShopify: boolean;
  };
}

export interface AuditCheck {
  id: string;
  name: string;
  category: 'meta' | 'content' | 'images' | 'technical' | 'social' | 'performance';
  status: 'critical' | 'warning' | 'passed' | 'info';
  message: string;
  details?: string[];
  fix?: string;
}

function gradeFromScore(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export async function auditUrl(url: string): Promise<AuditResult> {
  if (!url.startsWith('http')) url = 'https://' + url;

  const checks: AuditCheck[] = [];
  let meta: AuditResult['meta'] = {
    title: null, description: null, ogImage: null, favicon: null,
    responseTimeMs: 0, htmlSizeKb: 0, isShopify: false,
  };

  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: 20000,
      headers: { 'User-Agent': 'ShopAudit/2.0 (SEO Auditor)' },
      maxRedirects: 5,
    });

    meta.responseTimeMs = Date.now() - startTime;
    meta.htmlSizeKb = Math.round(Buffer.byteLength(response.data, 'utf8') / 1024);

    const html: string = response.data;
    const $ = cheerio.load(html);

    // Detect Shopify
    meta.isShopify = html.includes('Shopify.theme') || html.includes('cdn.shopify.com') || !!$('meta[name="shopify-checkout-api-token"]').length;

    // === META CHECKS ===

    // 1. Title
    const title = $('title').text().trim();
    meta.title = title || null;
    if (!title) {
      checks.push({ id: 'meta-title', name: 'Page Title', category: 'meta', status: 'critical', message: 'Missing page title', fix: 'Add a descriptive <title> tag (50-60 characters)' });
    } else if (title.length < 30) {
      checks.push({ id: 'meta-title', name: 'Page Title', category: 'meta', status: 'warning', message: `Title too short (${title.length} chars)`, details: [`"${title}"`], fix: 'Expand to 50-60 characters with relevant keywords' });
    } else if (title.length > 60) {
      checks.push({ id: 'meta-title', name: 'Page Title', category: 'meta', status: 'warning', message: `Title may be truncated (${title.length} chars)`, details: [`"${title.substring(0, 60)}..."`], fix: 'Shorten to under 60 characters' });
    } else {
      checks.push({ id: 'meta-title', name: 'Page Title', category: 'meta', status: 'passed', message: `Good title (${title.length} chars)` });
    }

    // 2. Meta Description
    const desc = $('meta[name="description"]').attr('content')?.trim();
    meta.description = desc || null;
    if (!desc) {
      checks.push({ id: 'meta-desc', name: 'Meta Description', category: 'meta', status: 'critical', message: 'Missing meta description', fix: 'Add <meta name="description" content="..."> (150-160 chars)' });
    } else if (desc.length < 120) {
      checks.push({ id: 'meta-desc', name: 'Meta Description', category: 'meta', status: 'warning', message: `Description short (${desc.length} chars)`, fix: 'Expand to 150-160 characters' });
    } else if (desc.length > 160) {
      checks.push({ id: 'meta-desc', name: 'Meta Description', category: 'meta', status: 'warning', message: `Description may be truncated (${desc.length} chars)`, fix: 'Shorten to under 160 characters' });
    } else {
      checks.push({ id: 'meta-desc', name: 'Meta Description', category: 'meta', status: 'passed', message: `Good description (${desc.length} chars)` });
    }

    // 3. Canonical URL
    const canonical = $('link[rel="canonical"]').attr('href');
    if (!canonical) {
      checks.push({ id: 'canonical', name: 'Canonical URL', category: 'meta', status: 'warning', message: 'Missing canonical URL', fix: 'Add <link rel="canonical" href="..."> to prevent duplicate content issues' });
    } else {
      checks.push({ id: 'canonical', name: 'Canonical URL', category: 'meta', status: 'passed', message: 'Canonical URL set' });
    }

    // 4. Language attribute
    const lang = $('html').attr('lang');
    if (!lang) {
      checks.push({ id: 'lang', name: 'Language Attribute', category: 'meta', status: 'warning', message: 'Missing lang attribute on <html>', fix: 'Add lang="en" (or appropriate language) to <html> tag' });
    } else {
      checks.push({ id: 'lang', name: 'Language Attribute', category: 'meta', status: 'passed', message: `Language set: ${lang}` });
    }

    // === CONTENT CHECKS ===

    // 5. H1 Heading
    const h1s = $('h1');
    if (h1s.length === 0) {
      checks.push({ id: 'h1', name: 'H1 Heading', category: 'content', status: 'critical', message: 'Missing H1 heading', fix: 'Add exactly one H1 that describes the page content' });
    } else if (h1s.length > 1) {
      checks.push({ id: 'h1', name: 'H1 Heading', category: 'content', status: 'warning', message: `${h1s.length} H1 headings found`, details: h1s.map((_, el) => $(el).text().trim().substring(0, 80)).get(), fix: 'Use only one H1 per page' });
    } else {
      checks.push({ id: 'h1', name: 'H1 Heading', category: 'content', status: 'passed', message: `H1: "${h1s.first().text().trim().substring(0, 60)}"` });
    }

    // 6. Heading Hierarchy
    const headingLevels: number[] = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      headingLevels.push(parseInt(el.tagName.charAt(1)));
    });
    let hierarchyBroken = false;
    for (let i = 1; i < headingLevels.length; i++) {
      if (headingLevels[i] - headingLevels[i - 1] > 1) {
        hierarchyBroken = true;
        break;
      }
    }
    if (headingLevels.length === 0) {
      checks.push({ id: 'heading-hierarchy', name: 'Heading Structure', category: 'content', status: 'warning', message: 'No headings found', fix: 'Add structured headings (H1→H2→H3) for better SEO' });
    } else if (hierarchyBroken) {
      checks.push({ id: 'heading-hierarchy', name: 'Heading Structure', category: 'content', status: 'warning', message: 'Heading levels skip (e.g. H1→H3)', details: [`Sequence: ${headingLevels.slice(0, 10).map(l => `H${l}`).join(' → ')}`], fix: 'Use sequential heading levels without skipping' });
    } else {
      checks.push({ id: 'heading-hierarchy', name: 'Heading Structure', category: 'content', status: 'passed', message: `${headingLevels.length} headings, proper hierarchy` });
    }

    // 7. Word Count
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(' ').filter(w => w.length > 0).length;
    if (wordCount < 300) {
      checks.push({ id: 'word-count', name: 'Content Length', category: 'content', status: 'warning', message: `Thin content (${wordCount} words)`, fix: 'Add more descriptive content (aim for 300+ words on key pages)' });
    } else {
      checks.push({ id: 'word-count', name: 'Content Length', category: 'content', status: 'passed', message: `${wordCount} words` });
    }

    // === IMAGE CHECKS ===

    // 8. Image Alt Text
    const images = $('img');
    const missingAlt: string[] = [];
    images.each((_, img) => {
      const alt = $(img).attr('alt');
      if (!alt || alt.trim() === '') {
        missingAlt.push($(img).attr('src')?.substring(0, 60) || 'unknown');
      }
    });
    if (images.length === 0) {
      checks.push({ id: 'img-alt', name: 'Image Alt Text', category: 'images', status: 'info', message: 'No images found on page' });
    } else if (missingAlt.length > 0) {
      checks.push({ id: 'img-alt', name: 'Image Alt Text', category: 'images', status: missingAlt.length > 5 ? 'critical' : 'warning', message: `${missingAlt.length}/${images.length} images missing alt text`, details: missingAlt.slice(0, 5), fix: 'Add descriptive alt text to all images for accessibility and SEO' });
    } else {
      checks.push({ id: 'img-alt', name: 'Image Alt Text', category: 'images', status: 'passed', message: `All ${images.length} images have alt text` });
    }

    // 9. Lazy Loading
    const lazyImages = $('img[loading="lazy"]').length;
    if (images.length > 5 && lazyImages === 0) {
      checks.push({ id: 'img-lazy', name: 'Image Lazy Loading', category: 'images', status: 'warning', message: `${images.length} images, none lazy-loaded`, fix: 'Add loading="lazy" to below-the-fold images' });
    } else if (images.length > 0) {
      checks.push({ id: 'img-lazy', name: 'Image Lazy Loading', category: 'images', status: 'passed', message: `${lazyImages}/${images.length} images lazy-loaded` });
    }

    // === TECHNICAL CHECKS ===

    // 10. HTTPS
    if (!url.startsWith('https://')) {
      checks.push({ id: 'https', name: 'HTTPS', category: 'technical', status: 'critical', message: 'Not using HTTPS', fix: 'Enable SSL/HTTPS — required for SEO and security' });
    } else {
      checks.push({ id: 'https', name: 'HTTPS', category: 'technical', status: 'passed', message: 'HTTPS enabled' });
    }

    // 11. Mobile Viewport
    const viewport = $('meta[name="viewport"]').attr('content');
    if (!viewport) {
      checks.push({ id: 'viewport', name: 'Mobile Viewport', category: 'technical', status: 'critical', message: 'Missing viewport meta tag', fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">' });
    } else {
      checks.push({ id: 'viewport', name: 'Mobile Viewport', category: 'technical', status: 'passed', message: 'Viewport configured' });
    }

    // 12. Favicon
    const favicon = $('link[rel="icon"], link[rel="shortcut icon"]').attr('href');
    meta.favicon = favicon || null;
    if (!favicon) {
      checks.push({ id: 'favicon', name: 'Favicon', category: 'technical', status: 'warning', message: 'No favicon found', fix: 'Add a favicon for browser tabs and bookmarks' });
    } else {
      checks.push({ id: 'favicon', name: 'Favicon', category: 'technical', status: 'passed', message: 'Favicon set' });
    }

    // 13. Structured Data (JSON-LD)
    const jsonLd = $('script[type="application/ld+json"]');
    if (jsonLd.length === 0) {
      checks.push({ id: 'structured-data', name: 'Structured Data', category: 'technical', status: 'warning', message: 'No JSON-LD structured data found', fix: 'Add Schema.org markup (Product, Organization, BreadcrumbList) for rich snippets' });
    } else {
      const types: string[] = [];
      jsonLd.each((_, el) => {
        try {
          const data = JSON.parse($(el).html() || '');
          const t = data['@type'] || (Array.isArray(data['@graph']) ? data['@graph'].map((g: any) => g['@type']).join(', ') : 'Unknown');
          types.push(t);
        } catch {}
      });
      checks.push({ id: 'structured-data', name: 'Structured Data', category: 'technical', status: 'passed', message: `${jsonLd.length} JSON-LD block(s)`, details: types.length > 0 ? [`Types: ${types.join(', ')}`] : undefined });
    }

    // 14. Robots Meta
    const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase();
    if (robotsMeta && (robotsMeta.includes('noindex') || robotsMeta.includes('nofollow'))) {
      checks.push({ id: 'robots-meta', name: 'Robots Meta', category: 'technical', status: 'warning', message: `Page has restrictive robots: ${robotsMeta}`, fix: 'Remove noindex/nofollow if you want this page indexed' });
    } else {
      checks.push({ id: 'robots-meta', name: 'Robots Meta', category: 'technical', status: 'passed', message: 'No indexing restrictions' });
    }

    // 15. Check for robots.txt
    try {
      const robotsUrl = new URL('/robots.txt', url).href;
      const robotsRes = await axios.get(robotsUrl, { timeout: 5000, validateStatus: () => true });
      if (robotsRes.status === 200 && robotsRes.data.toLowerCase().includes('user-agent')) {
        checks.push({ id: 'robots-txt', name: 'robots.txt', category: 'technical', status: 'passed', message: 'robots.txt found' });
      } else {
        checks.push({ id: 'robots-txt', name: 'robots.txt', category: 'technical', status: 'warning', message: 'No valid robots.txt', fix: 'Create a robots.txt to guide search engine crawlers' });
      }
    } catch {
      checks.push({ id: 'robots-txt', name: 'robots.txt', category: 'technical', status: 'info', message: 'Could not check robots.txt' });
    }

    // 16. Sitemap reference
    try {
      const sitemapUrl = new URL('/sitemap.xml', url).href;
      const smRes = await axios.get(sitemapUrl, { timeout: 5000, validateStatus: () => true });
      if (smRes.status === 200 && smRes.data.includes('<urlset') || smRes.data.includes('<sitemapindex')) {
        checks.push({ id: 'sitemap', name: 'XML Sitemap', category: 'technical', status: 'passed', message: 'Sitemap found' });
      } else {
        checks.push({ id: 'sitemap', name: 'XML Sitemap', category: 'technical', status: 'warning', message: 'No sitemap.xml found', fix: 'Create a sitemap.xml and submit to Google Search Console' });
      }
    } catch {
      checks.push({ id: 'sitemap', name: 'XML Sitemap', category: 'technical', status: 'info', message: 'Could not check sitemap' });
    }

    // === SOCIAL CHECKS ===

    // 17. Open Graph Title
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (!ogTitle) {
      checks.push({ id: 'og-title', name: 'OG Title', category: 'social', status: 'warning', message: 'Missing Open Graph title', fix: 'Add <meta property="og:title" content="..."> for social sharing' });
    } else {
      checks.push({ id: 'og-title', name: 'OG Title', category: 'social', status: 'passed', message: 'OG title set' });
    }

    // 18. Open Graph Image
    const ogImage = $('meta[property="og:image"]').attr('content');
    meta.ogImage = ogImage || null;
    if (!ogImage) {
      checks.push({ id: 'og-image', name: 'OG Image', category: 'social', status: 'warning', message: 'Missing Open Graph image', fix: 'Add <meta property="og:image" content="..."> (1200×630px recommended)' });
    } else {
      checks.push({ id: 'og-image', name: 'OG Image', category: 'social', status: 'passed', message: 'OG image set' });
    }

    // 19. Open Graph Description
    const ogDesc = $('meta[property="og:description"]').attr('content');
    if (!ogDesc) {
      checks.push({ id: 'og-desc', name: 'OG Description', category: 'social', status: 'warning', message: 'Missing Open Graph description', fix: 'Add <meta property="og:description" content="...">' });
    } else {
      checks.push({ id: 'og-desc', name: 'OG Description', category: 'social', status: 'passed', message: 'OG description set' });
    }

    // 20. Twitter Card
    const twitterCard = $('meta[name="twitter:card"]').attr('content');
    if (!twitterCard) {
      checks.push({ id: 'twitter-card', name: 'Twitter Card', category: 'social', status: 'info', message: 'No Twitter card meta tags', fix: 'Add <meta name="twitter:card" content="summary_large_image"> for Twitter sharing' });
    } else {
      checks.push({ id: 'twitter-card', name: 'Twitter Card', category: 'social', status: 'passed', message: `Twitter card: ${twitterCard}` });
    }

    // === PERFORMANCE CHECKS ===

    // 21. Response Time
    if (meta.responseTimeMs > 3000) {
      checks.push({ id: 'response-time', name: 'Response Time', category: 'performance', status: 'critical', message: `Slow response (${(meta.responseTimeMs / 1000).toFixed(1)}s)`, fix: 'Optimize server response time — aim for under 1 second' });
    } else if (meta.responseTimeMs > 1500) {
      checks.push({ id: 'response-time', name: 'Response Time', category: 'performance', status: 'warning', message: `Response time: ${(meta.responseTimeMs / 1000).toFixed(1)}s`, fix: 'Consider CDN or server optimization' });
    } else {
      checks.push({ id: 'response-time', name: 'Response Time', category: 'performance', status: 'passed', message: `Fast response (${meta.responseTimeMs}ms)` });
    }

    // 22. Page Size
    if (meta.htmlSizeKb > 500) {
      checks.push({ id: 'page-size', name: 'HTML Size', category: 'performance', status: 'warning', message: `Large HTML (${meta.htmlSizeKb}KB)`, fix: 'Reduce HTML size — consider minification and removing inline styles/scripts' });
    } else {
      checks.push({ id: 'page-size', name: 'HTML Size', category: 'performance', status: 'passed', message: `HTML size: ${meta.htmlSizeKb}KB` });
    }

  } catch (error: any) {
    checks.push({ id: 'fetch', name: 'Page Fetch', category: 'technical', status: 'critical', message: `Failed to fetch: ${error.message}`, fix: 'Ensure the URL is correct and the server is accessible' });
  }

  const summary = {
    critical: checks.filter(c => c.status === 'critical').length,
    warnings: checks.filter(c => c.status === 'warning').length,
    passed: checks.filter(c => c.status === 'passed').length,
    info: checks.filter(c => c.status === 'info').length,
  };

  const scorable = checks.filter(c => c.status !== 'info');
  const totalScorable = scorable.length || 1;
  const score = Math.round(
    ((summary.passed * 1 + summary.warnings * 0.4) / totalScorable) * 100
  );

  return {
    url,
    timestamp: new Date(),
    score: Math.min(score, 100),
    grade: gradeFromScore(score),
    checks,
    summary,
    meta,
  };
}
