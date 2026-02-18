import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ShopAudit — Free SEO Audit Tool | 22 Checks in 30 Seconds',
  description: 'Instant SEO audit for any website. 22 checks across meta tags, content, images, technical SEO, social sharing, and performance. Free. No signup.',
  keywords: 'seo audit, shopify seo, website audit, ecommerce seo, free seo tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
