'use client';

import { useState } from 'react';

interface AuditCheck {
  name: string;
  category: string;
  status: 'critical' | 'warning' | 'passed';
  message: string;
  details?: string[];
}

interface AuditResult {
  url: string;
  score: number;
  checks: AuditCheck[];
  summary: {
    critical: number;
    warnings: number;
    passed: number;
  };
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');

  const runAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Audit failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-500 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'passed': return 'text-green-500 bg-green-50 border-green-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return '❌';
      case 'warning': return '⚠️';
      case 'passed': return '✅';
      default: return '•';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🔍 ShopAudit <span className="text-blue-400">Lite</span>
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Free SEO Audit for Shopify Stores
          </p>
          <p className="text-gray-400">
            Get instant insights to improve your store's search rankings
          </p>
        </div>

        {/* Audit Form */}
        <form onSubmit={runAudit} className="mb-12">
          <div className="flex gap-4 max-w-2xl mx-auto">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter your store URL (e.g., mystore.myshopify.com)"
              className="flex-1 px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? '🔄 Auditing...' : '🚀 Audit'}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-center">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Score Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Audit Results</h2>
                  <p className="text-blue-100 text-sm">{result.url}</p>
                </div>
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score}
                  </div>
                  <div className="text-sm text-blue-100">SEO Score</div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="flex gap-8 mt-6">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">❌</span>
                  <span className="text-lg">{result.summary.critical} Critical</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  <span className="text-lg">{result.summary.warnings} Warnings</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <span className="text-lg">{result.summary.passed} Passed</span>
                </div>
              </div>
            </div>

            {/* Checks List */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Detailed Checks</h3>
              <div className="space-y-3">
                {result.checks.map((check, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border ${getStatusColor(check.status)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{getStatusIcon(check.status)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{check.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                            {check.category}
                          </span>
                        </div>
                        <p className="text-sm">{check.message}</p>
                        {check.details && (
                          <ul className="mt-2 text-xs space-y-1 text-gray-600">
                            {check.details.map((detail, i) => (
                              <li key={i}>• {detail}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gray-50 p-6 text-center border-t">
              <p className="text-gray-600 mb-4">
                Want weekly monitoring, PDF exports, and more checks?
              </p>
              <button className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-shadow">
                Upgrade to Pro — $29/month
              </button>
            </div>
          </div>
        )}

        {/* Features Section */}
        {!result && (
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🏷️</div>
              <h3 className="text-lg font-semibold text-white mb-2">Meta Tags</h3>
              <p className="text-gray-400 text-sm">Check titles, descriptions, and headings</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🖼️</div>
              <h3 className="text-lg font-semibold text-white mb-2">Image SEO</h3>
              <p className="text-gray-400 text-sm">Find missing alt text and optimization issues</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-lg font-semibold text-white mb-2">Mobile Ready</h3>
              <p className="text-gray-400 text-sm">Verify mobile viewport and responsiveness</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500 text-sm">
        Built with 🐾 by Mathilda • {new Date().getFullYear()}
      </footer>
    </main>
  );
}
