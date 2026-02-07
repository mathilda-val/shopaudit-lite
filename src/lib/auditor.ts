/**
 * ShopAudit Core - SEO Auditing Engine
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface AuditResult {
  url: string;
  timestamp: Date;
  score: number; // 0-100
  checks: AuditCheck[];
  summary: {
    critical: number;
    warnings: number;
    passed: number;
  };
}

export interface AuditCheck {
  name: string;
  category: 'meta' | 'links' | 'images' | 'performance' | 'mobile';
  status: 'critical' | 'warning' | 'passed';
  message: string;
  details?: string[];
}

export async function auditUrl(url: string): Promise<AuditResult> {
  // Normalize URL
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  const checks: AuditCheck[] = [];

  try {
    // Fetch the page
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'ShopAudit/1.0 (SEO Auditor)',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 1. Meta Title Check
    const title = $('title').text().trim();
    if (!title) {
      checks.push({
        name: 'Meta Title',
        category: 'meta',
        status: 'critical',
        message: 'Missing page title',
        details: ['Add a <title> tag to your page'],
      });
    } else if (title.length < 30) {
      checks.push({
        name: 'Meta Title',
        category: 'meta',
        status: 'warning',
        message: `Title too short (${title.length} chars)`,
        details: ['Recommended: 50-60 characters', `Current: "${title}"`],
      });
    } else if (title.length > 60) {
      checks.push({
        name: 'Meta Title',
        category: 'meta',
        status: 'warning',
        message: `Title too long (${title.length} chars)`,
        details: ['May be truncated in search results', `Current: "${title.substring(0, 60)}..."`],
      });
    } else {
      checks.push({
        name: 'Meta Title',
        category: 'meta',
        status: 'passed',
        message: `Good title length (${title.length} chars)`,
      });
    }

    // 2. Meta Description Check
    const metaDesc = $('meta[name="description"]').attr('content')?.trim();
    if (!metaDesc) {
      checks.push({
        name: 'Meta Description',
        category: 'meta',
        status: 'critical',
        message: 'Missing meta description',
        details: ['Add a <meta name="description"> tag'],
      });
    } else if (metaDesc.length < 120) {
      checks.push({
        name: 'Meta Description',
        category: 'meta',
        status: 'warning',
        message: `Description too short (${metaDesc.length} chars)`,
        details: ['Recommended: 150-160 characters'],
      });
    } else if (metaDesc.length > 160) {
      checks.push({
        name: 'Meta Description',
        category: 'meta',
        status: 'warning',
        message: `Description too long (${metaDesc.length} chars)`,
        details: ['May be truncated in search results'],
      });
    } else {
      checks.push({
        name: 'Meta Description',
        category: 'meta',
        status: 'passed',
        message: `Good description length (${metaDesc.length} chars)`,
      });
    }

    // 3. H1 Check
    const h1s = $('h1');
    if (h1s.length === 0) {
      checks.push({
        name: 'H1 Heading',
        category: 'meta',
        status: 'critical',
        message: 'Missing H1 heading',
        details: ['Every page should have exactly one H1'],
      });
    } else if (h1s.length > 1) {
      checks.push({
        name: 'H1 Heading',
        category: 'meta',
        status: 'warning',
        message: `Multiple H1s found (${h1s.length})`,
        details: ['Best practice: only one H1 per page'],
      });
    } else {
      checks.push({
        name: 'H1 Heading',
        category: 'meta',
        status: 'passed',
        message: 'Single H1 heading found',
      });
    }

    // 4. Image Alt Text Check
    const images = $('img');
    const imagesWithoutAlt: string[] = [];
    images.each((_, img) => {
      const alt = $(img).attr('alt');
      const src = $(img).attr('src') || 'unknown';
      if (!alt || alt.trim() === '') {
        imagesWithoutAlt.push(src.substring(0, 50));
      }
    });

    if (images.length === 0) {
      checks.push({
        name: 'Image Alt Text',
        category: 'images',
        status: 'passed',
        message: 'No images found',
      });
    } else if (imagesWithoutAlt.length > 0) {
      const severity = imagesWithoutAlt.length > 5 ? 'critical' : 'warning';
      checks.push({
        name: 'Image Alt Text',
        category: 'images',
        status: severity,
        message: `${imagesWithoutAlt.length}/${images.length} images missing alt text`,
        details: imagesWithoutAlt.slice(0, 5),
      });
    } else {
      checks.push({
        name: 'Image Alt Text',
        category: 'images',
        status: 'passed',
        message: `All ${images.length} images have alt text`,
      });
    }

    // 5. Internal Links Check
    const links = $('a[href]');
    const brokenInternal: string[] = [];
    const baseUrl = new URL(url);
    
    links.each((_, link) => {
      const href = $(link).attr('href');
      if (href && href.startsWith('/') && href.includes(' ')) {
        brokenInternal.push(href);
      }
    });

    checks.push({
      name: 'Internal Links',
      category: 'links',
      status: brokenInternal.length > 0 ? 'warning' : 'passed',
      message: brokenInternal.length > 0 
        ? `${brokenInternal.length} potentially broken links`
        : `${links.length} links found`,
      details: brokenInternal.length > 0 ? brokenInternal.slice(0, 5) : undefined,
    });

    // 6. Mobile Viewport Check
    const viewport = $('meta[name="viewport"]').attr('content');
    if (!viewport) {
      checks.push({
        name: 'Mobile Viewport',
        category: 'mobile',
        status: 'critical',
        message: 'Missing viewport meta tag',
        details: ['Add <meta name="viewport" content="width=device-width, initial-scale=1">'],
      });
    } else {
      checks.push({
        name: 'Mobile Viewport',
        category: 'mobile',
        status: 'passed',
        message: 'Viewport configured',
      });
    }

    // 7. HTTPS Check
    if (!url.startsWith('https://')) {
      checks.push({
        name: 'HTTPS',
        category: 'performance',
        status: 'critical',
        message: 'Site not using HTTPS',
        details: ['HTTPS is required for SEO and security'],
      });
    } else {
      checks.push({
        name: 'HTTPS',
        category: 'performance',
        status: 'passed',
        message: 'Site uses HTTPS',
      });
    }

    // 8. Canonical URL Check
    const canonical = $('link[rel="canonical"]').attr('href');
    if (!canonical) {
      checks.push({
        name: 'Canonical URL',
        category: 'meta',
        status: 'warning',
        message: 'Missing canonical URL',
        details: ['Add <link rel="canonical" href="..."> to prevent duplicate content'],
      });
    } else {
      checks.push({
        name: 'Canonical URL',
        category: 'meta',
        status: 'passed',
        message: 'Canonical URL set',
      });
    }

  } catch (error: any) {
    checks.push({
      name: 'Page Fetch',
      category: 'performance',
      status: 'critical',
      message: `Failed to fetch page: ${error.message}`,
    });
  }

  // Calculate score
  const summary = {
    critical: checks.filter(c => c.status === 'critical').length,
    warnings: checks.filter(c => c.status === 'warning').length,
    passed: checks.filter(c => c.status === 'passed').length,
  };

  const totalChecks = checks.length;
  const score = Math.round(
    ((summary.passed * 1 + summary.warnings * 0.5) / totalChecks) * 100
  );

  return {
    url,
    timestamp: new Date(),
    score,
    checks,
    summary,
  };
}
