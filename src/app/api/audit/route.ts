import { NextRequest, NextResponse } from 'next/server';
import { auditUrl } from '@/lib/auditor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Basic URL validation
    let targetUrl = url.trim();
    if (!targetUrl.match(/^https?:\/\//)) {
      targetUrl = 'https://' + targetUrl;
    }

    // Validate it looks like a Shopify store or any website
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Run the audit
    const result = await auditUrl(targetUrl);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Audit error:', error);
    return NextResponse.json(
      { error: error.message || 'Audit failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'ShopAudit API',
    version: '1.0.0',
    endpoints: {
      'POST /api/audit': 'Run SEO audit on a URL',
    },
  });
}
