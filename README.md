# 🔍 ShopAudit — Free SEO Audit Tool

**22 SEO checks in 30 seconds.** No signup. No limits. PDF export included.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mathilda-val/shopaudit-lite)

## Features

- **22 checks** across 6 categories: Meta Tags, Content, Images, Technical SEO, Social Sharing, Performance
- **Letter grade** (A+ to F) with color-coded score card
- **PDF export** — download a professional audit report
- **Shopify detection** — auto-detects Shopify stores
- **How-to-fix** guidance for every failing check
- **Dark UI** — clean, modern design
- **No API keys needed** — runs entirely on server-side HTML analysis

## Checks

| Category | Checks |
|----------|--------|
| 🏷️ Meta Tags | Title, Description, Canonical URL, Language |
| 📝 Content | H1 Heading, Heading Hierarchy, Word Count |
| 🖼️ Images | Alt Text, Lazy Loading |
| ⚙️ Technical | HTTPS, Viewport, Favicon, Structured Data, Robots Meta, robots.txt, Sitemap |
| 📣 Social | OG Title, OG Image, OG Description, Twitter Card |
| ⚡ Performance | Response Time, HTML Size |

## Quick Start

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Deploy

One-click deploy to Vercel (button above), or:

```bash
npx vercel
```

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Cheerio (HTML parsing)
- jsPDF (PDF generation)

## License

MIT

---

Built with 🐾 by [Mathilda](https://mathiasmdesign.com)
