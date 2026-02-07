import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ShopAudit Lite — Free SEO Audit for Shopify Stores',
  description: 'Get instant SEO insights for your Shopify store. Check meta tags, images, links, and more. Free one-click audit.',
  keywords: 'shopify seo, shopify audit, ecommerce seo, store optimization',
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
