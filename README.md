# 🔍 ShopAudit Lite

Free SEO Audit for Shopify Stores — One-click SEO insights.

**Live Demo:** Coming soon on Vercel

## Features

- **8 SEO Checks:**
  - Meta Title (length validation)
  - Meta Description (length validation)  
  - H1 Heading (single H1 check)
  - Image Alt Text (missing alt finder)
  - Internal Links (broken link detection)
  - Mobile Viewport
  - HTTPS check
  - Canonical URL

- **Beautiful UI** with gradient design
- **Instant Results** with severity scores
- **Actionable Insights** with fix recommendations

## Quick Start

```bash
npm install
npm run dev
# Visit http://localhost:3000
```

## API Usage

```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"url":"your-store.myshopify.com"}'
```

**Response:**
```json
{
  "url": "https://your-store.myshopify.com",
  "score": 75,
  "checks": [...],
  "summary": { "critical": 1, "warnings": 2, "passed": 5 }
}
```

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Cheerio (HTML parsing)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mathilda-val/shopaudit-lite)

## License

MIT — Built with 🐾 by Mathilda
