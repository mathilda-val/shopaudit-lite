'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';

interface AuditCheck {
  id: string;
  name: string;
  category: string;
  status: 'critical' | 'warning' | 'passed' | 'info';
  message: string;
  details?: string[];
  fix?: string;
}

interface AuditMeta {
  title: string | null;
  description: string | null;
  ogImage: string | null;
  favicon: string | null;
  responseTimeMs: number;
  htmlSizeKb: number;
  isShopify: boolean;
}

interface AuditResult {
  url: string;
  score: number;
  grade: string;
  checks: AuditCheck[];
  summary: { critical: number; warnings: number; passed: number; info: number };
  meta: AuditMeta;
}

const CATEGORIES = [
  { key: 'meta', label: 'Meta Tags', icon: '🏷️' },
  { key: 'content', label: 'Content', icon: '📝' },
  { key: 'images', label: 'Images', icon: '🖼️' },
  { key: 'technical', label: 'Technical', icon: '⚙️' },
  { key: 'social', label: 'Social', icon: '📣' },
  { key: 'performance', label: 'Performance', icon: '⚡' },
];

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');
  const [expandedFixes, setExpandedFixes] = useState<Set<string>>(new Set());

  const runAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    setExpandedFixes(new Set());

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Audit failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFix = (id: string) => {
    setExpandedFixes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const generatePDF = (data: AuditResult) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 18;
    const contentW = W - margin * 2;
    let y = 20;

    const addPage = () => { pdf.addPage(); y = 20; };
    const checkSpace = (need: number) => { if (y + need > 275) addPage(); };

    // Header
    pdf.setFillColor(10, 10, 15);
    pdf.rect(0, 0, W, 50, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ShopAudit SEO Report', margin, 22);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(160, 160, 180);
    pdf.text(data.url, margin, 30);
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, 36);

    // Grade badge
    const gradeColors: Record<string, [number, number, number]> = {
      'A+': [16, 185, 129], 'A': [16, 185, 129], 'B': [59, 130, 246],
      'C': [245, 158, 11], 'D': [239, 68, 68], 'F': [239, 68, 68],
    };
    const gc = gradeColors[data.grade] || [239, 68, 68];
    pdf.setFillColor(gc[0], gc[1], gc[2]);
    pdf.roundedRect(W - margin - 28, 10, 28, 28, 4, 4, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(data.grade, W - margin - 14, 28, { align: 'center' });
    pdf.setFontSize(8);
    pdf.text(`${data.score}/100`, W - margin - 14, 34, { align: 'center' });

    y = 58;

    // Summary bar
    pdf.setFillColor(245, 245, 250);
    pdf.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(220, 38, 38);
    pdf.text(`● ${data.summary.critical} Critical`, margin + 6, y + 9);
    pdf.setTextColor(245, 158, 11);
    pdf.text(`● ${data.summary.warnings} Warnings`, margin + 50, y + 9);
    pdf.setTextColor(16, 185, 129);
    pdf.text(`● ${data.summary.passed} Passed`, margin + 98, y + 9);

    if (data.meta.isShopify) {
      pdf.setTextColor(16, 185, 129);
      pdf.text('✓ Shopify Store', margin + contentW - 35, y + 9);
    }

    y += 22;

    // Quick stats
    pdf.setTextColor(100, 100, 120);
    pdf.setFontSize(8);
    const stats = [`Response: ${data.meta.responseTimeMs}ms`, `HTML: ${data.meta.htmlSizeKb}KB`];
    if (data.meta.title) stats.push(`Title: ${data.meta.title.substring(0, 50)}`);
    pdf.text(stats.join('  •  '), margin, y);
    y += 10;

    // Checks by category
    const categoryLabels: Record<string, string> = {
      meta: 'Meta Tags', content: 'Content', images: 'Images',
      technical: 'Technical SEO', social: 'Social Sharing', performance: 'Performance',
    };
    const statusIcons: Record<string, { label: string; color: [number, number, number] }> = {
      critical: { label: 'FAIL', color: [220, 38, 38] },
      warning: { label: 'WARN', color: [245, 158, 11] },
      passed: { label: 'PASS', color: [16, 185, 129] },
      info: { label: 'INFO', color: [100, 116, 139] },
    };

    for (const catKey of ['meta', 'content', 'images', 'technical', 'social', 'performance']) {
      const catChecks = data.checks.filter(c => c.category === catKey);
      if (catChecks.length === 0) continue;

      checkSpace(20);
      // Category header
      pdf.setFillColor(240, 240, 248);
      pdf.roundedRect(margin, y, contentW, 9, 2, 2, 'F');
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 30, 50);
      const catPassed = catChecks.filter(c => c.status === 'passed').length;
      pdf.text(categoryLabels[catKey] || catKey, margin + 4, y + 6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 140);
      pdf.text(`${catPassed}/${catChecks.length} passed`, margin + contentW - 4, y + 6.5, { align: 'right' });
      y += 13;

      for (const check of catChecks) {
        const si = statusIcons[check.status];
        const lines: string[] = [];
        lines.push(check.message);
        if (check.details) check.details.forEach(d => lines.push(`  • ${d}`));
        if (check.fix) lines.push(`  💡 ${check.fix}`);

        const estimatedH = 7 + lines.length * 4;
        checkSpace(estimatedH);

        // Status badge
        pdf.setFillColor(si.color[0], si.color[1], si.color[2]);
        pdf.roundedRect(margin + 2, y, 12, 5, 1, 1, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'bold');
        pdf.text(si.label, margin + 8, y + 3.5, { align: 'center' });

        // Check name
        pdf.setTextColor(30, 30, 50);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(check.name, margin + 18, y + 4);
        y += 7;

        // Details
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        for (const line of lines) {
          checkSpace(5);
          if (line.startsWith('  💡')) {
            pdf.setTextColor(59, 130, 246);
          } else {
            pdf.setTextColor(80, 80, 100);
          }
          const wrapped = pdf.splitTextToSize(line, contentW - 20);
          for (const wl of wrapped) {
            pdf.text(wl, margin + 18, y);
            y += 4;
          }
        }
        y += 3;
      }
      y += 4;
    }

    // Footer
    checkSpace(20);
    pdf.setDrawColor(220, 220, 230);
    pdf.line(margin, y, W - margin, y);
    y += 8;
    pdf.setTextColor(140, 140, 160);
    pdf.setFontSize(7);
    pdf.text('Generated by ShopAudit — Free SEO Audit Tool • shopaudit.dev', W / 2, y, { align: 'center' });

    // Save
    const domain = new URL(data.url).hostname.replace('www.', '');
    pdf.save(`shopaudit-${domain}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const statusStyles: Record<string, { bg: string; border: string; icon: string }> = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', icon: '🔴' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '🟡' },
    passed: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '🟢' },
    info: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'ℹ️' },
  };

  const gradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'from-emerald-400 to-green-500';
    if (grade === 'B') return 'from-blue-400 to-cyan-500';
    if (grade === 'C') return 'from-amber-400 to-yellow-500';
    return 'from-red-400 to-rose-500';
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔍</span>
            <span className="font-bold text-lg">ShopAudit</span>
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full ml-1">v2</span>
          </div>
          <a href="https://github.com/mathilda-val" className="text-sm text-gray-400 hover:text-white transition">GitHub</a>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            SEO Audit in <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">30 Seconds</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            22 checks across meta tags, content, images, technical SEO, social sharing, and performance. Free. No signup.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={runAudit} className="mb-12 max-w-2xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter any URL — e.g. mystore.com"
              className="flex-1 px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Auditing…
                </span>
              ) : 'Audit →'}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-center">
            {error}
          </div>
        )}

        {/* Loading animation */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
              </div>
              <p className="text-gray-400">Analyzing 22 SEO factors…</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-fadeIn">
            {/* Score Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-xl font-semibold">Audit Results</h2>
                    {result.meta.isShopify && (
                      <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">Shopify Store</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-4 break-all">{result.url}</p>
                  <div className="flex gap-6 text-sm">
                    <span className="flex items-center gap-1.5"><span className="text-red-400">●</span> {result.summary.critical} Critical</span>
                    <span className="flex items-center gap-1.5"><span className="text-amber-400">●</span> {result.summary.warnings} Warnings</span>
                    <span className="flex items-center gap-1.5"><span className="text-emerald-400">●</span> {result.summary.passed} Passed</span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${gradeColor(result.grade)} flex items-center justify-center`}>
                    <span className="text-4xl font-black text-white">{result.grade}</span>
                  </div>
                  <span className="text-sm text-gray-400 mt-2">{result.score}/100</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="border-t border-white/5 px-8 py-4 flex flex-wrap items-center gap-6 text-xs text-gray-400">
                <span>⏱ {result.meta.responseTimeMs}ms response</span>
                <span>📦 {result.meta.htmlSizeKb}KB HTML</span>
                {result.meta.title && <span className="truncate max-w-xs">🏷 {result.meta.title}</span>}
                <button
                  onClick={() => generatePDF(result)}
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg transition-all hover:shadow-lg"
                >
                  📄 Download PDF Report
                </button>
              </div>
            </div>

            {/* Checks by Category */}
            {CATEGORIES.map(cat => {
              const catChecks = result.checks.filter(c => c.category === cat.key);
              if (catChecks.length === 0) return null;
              const catPassed = catChecks.filter(c => c.status === 'passed').length;

              return (
                <div key={cat.key} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span>{cat.icon}</span> {cat.label}
                    </h3>
                    <span className="text-xs text-gray-400">{catPassed}/{catChecks.length} passed</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {catChecks.map(check => {
                      const style = statusStyles[check.status];
                      return (
                        <div key={check.id} className="px-6 py-4 flex items-start gap-3 hover:bg-white/[0.02] transition">
                          <span className="mt-0.5">{style.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-sm">{check.name}</span>
                            </div>
                            <p className="text-sm text-gray-400">{check.message}</p>
                            {check.details && (
                              <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                                {check.details.map((d, i) => <div key={i}>• {d}</div>)}
                              </div>
                            )}
                            {check.fix && (
                              <button
                                onClick={() => toggleFix(check.id)}
                                className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition"
                              >
                                {expandedFixes.has(check.id) ? '▼' : '▶'} How to fix
                              </button>
                            )}
                            {check.fix && expandedFixes.has(check.id) && (
                              <div className="mt-2 text-xs bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-blue-200">
                                💡 {check.fix}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* CTA */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">Want weekly monitoring?</h3>
              <p className="text-gray-400 text-sm mb-4">Get automated weekly audits, PDF exports, and trend tracking.</p>
              <button className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/20">
                Coming Soon — Join Waitlist
              </button>
            </div>
          </div>
        )}

        {/* Features (when no result) */}
        {!result && !loading && (
          <div className="grid md:grid-cols-3 gap-4 mt-16">
            {[
              { icon: '🏷️', title: 'Meta & Content', desc: 'Title, description, headings, word count' },
              { icon: '⚙️', title: 'Technical SEO', desc: 'HTTPS, robots.txt, sitemap, structured data' },
              { icon: '📣', title: 'Social & Speed', desc: 'Open Graph, Twitter cards, response time' },
            ].map(f => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:bg-white/[0.07] transition">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="text-center py-8 text-gray-600 text-xs">
        Built with 🐾 by Mathilda • Free forever
      </footer>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </main>
  );
}
