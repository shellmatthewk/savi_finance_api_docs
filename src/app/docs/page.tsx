"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Copy, Check, Code, Play, BookOpen, Zap } from "lucide-react";
import { useState } from "react";
import { codeExamples, planComparison, errorCodes } from "@/data/codeExamples";

function CodeBlock({ code, title, language: _language = "bash" }: { code: string; title?: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
          <span className="text-sm text-muted">{title}</span>
          <button
            onClick={handleCopy}
            className="text-muted hover:text-foreground transition p-1"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const pythonClient = `"""
VaultLine API Client

Usage:
    client = VaultLine('vl_your_api_key')
    rates = client.get_rates(['BTC/USD', 'ETH/USD'])
"""

import requests
from dataclasses import dataclass
from typing import Optional


@dataclass
class RateLimit:
    limit: int
    remaining: int
    reset: int


class VaultLineError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"[{status_code}] {message}")


class VaultLine:
    def __init__(self, api_key: str, base_url: str = "https://api.vaultline.io/api/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}"
        })
        self.rate_limit: Optional[RateLimit] = None

    def _request(self, endpoint: str, params: dict = None) -> dict:
        """Make an API request and return JSON response"""
        response = self.session.get(f"{self.base_url}{endpoint}", params=params)

        self.rate_limit = RateLimit(
            limit=int(response.headers.get("X-RateLimit-Limit", 0)),
            remaining=int(response.headers.get("X-RateLimit-Remaining", 0)),
            reset=int(response.headers.get("X-RateLimit-Reset", 0)),
        )

        if not response.ok:
            error = response.json()
            raise VaultLineError(
                response.status_code,
                error.get("message") or error.get("error") or f"HTTP {response.status_code}"
            )

        return response.json()

    def get_assets(self, asset_class: str = None) -> dict:
        """
        Get available symbols grouped by asset class

        Args:
            asset_class: Filter by 'fiat', 'crypto', 'stocks', or 'metals'

        Returns:
            dict with asset_classes and total_symbols
        """
        params = {}
        if asset_class:
            params["asset_class"] = asset_class
        return self._request("/assets", params)

    def get_rates(self, symbols: list[str], date: str = None) -> dict:
        """
        Get current rates for symbols

        Args:
            symbols: List of symbols, e.g. ['BTC/USD', 'AAPL']
            date: Optional ISO date (YYYY-MM-DD)

        Returns:
            dict with data array of rates
        """
        params = {"symbols": ",".join(symbols)}
        if date:
            params["date"] = date
        return self._request("/rates", params)

    def get_history(self, symbol: str, from_date: str, to_date: str) -> dict:
        """
        Get historical rates for a symbol

        Args:
            symbol: Symbol, e.g. 'BTC/USD'
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            dict with symbol info and history array
        """
        return self._request("/rates/history", {
            "symbol": symbol,
            "from": from_date,
            "to": to_date,
        })`;

const sidebarItems = [
  { id: "quickstart", label: "Quick Start", icon: BookOpen },
  { id: "authentication", label: "Authentication", icon: Code },
  { id: "endpoints", label: "API Endpoints", icon: Code },
  { id: "client", label: "Python Client", icon: Code },
  { id: "examples", label: "Code Examples", icon: Play },
  { id: "ratelimits", label: "Rate Limits", icon: Zap },
  { id: "errors", label: "Error Codes", icon: Code },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("client");

  return (
    <>
      <Navbar />
      <div className="pt-16 min-h-screen flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card/30 fixed top-16 bottom-0 left-0 overflow-y-auto hidden lg:block">
          <nav className="p-4">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4 px-3">
              Documentation
            </h2>
            <ul className="space-y-1">
              {sidebarItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                      activeSection === item.id
                        ? "bg-accent/20 text-accent-light"
                        : "text-muted hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="lg:hidden fixed top-16 left-0 right-0 z-40 bg-card/80 backdrop-blur border-b border-border">
          <div className="flex gap-2 p-3 overflow-x-auto">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${
                  activeSection === item.id
                    ? "bg-accent/20 text-accent-light"
                    : "text-muted hover:text-foreground bg-card"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 lg:pl-64 pt-8 lg:pt-0">
          <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
            {activeSection === "quickstart" && (
              <>
                <div className="mb-10">
                  <h1 className="text-3xl font-bold tracking-tight mb-3">
                    Quick <span className="gradient-text">Start</span>
                  </h1>
                  <p className="text-muted">
                    Get up and running with the VaultLine API in minutes.
                  </p>
                </div>

                <div className="space-y-8">
                  <section>
                    <h2 className="text-xl font-semibold mb-4">1. Get Your Token</h2>
                    <p className="text-muted mb-4">
                      Sign up for an account and obtain your API token from the dashboard.
                    </p>
                    <Link href="/auth/login">
                      <button className="px-4 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition">
                        Log In to Dashboard
                      </button>
                    </Link>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">2. Make Your First Request</h2>
                    <CodeBlock
                      code={codeExamples.curl.getRate}
                      title="Get Current Rate (cURL)"
                      language="bash"
                    />
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">3. Parse the Response</h2>
                    <div className="bg-card/30 border border-border rounded-lg p-4 mb-4">
                      <pre className="text-sm overflow-x-auto">
{`{
  "data": [
    {
      "symbol": "EUR",
      "rate": 0.92,
      "date": "2024-03-26",
      "meta": {
        "triangulated": false,
        "stale": false,
        "cache": "HIT"
      }
    }
  ]
}`}
                      </pre>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
                    <ul className="space-y-2 text-muted">
                      <li>- Check the <button onClick={() => setActiveSection("endpoints")} className="text-accent hover:underline">API Endpoints</button> section for all available endpoints</li>
                      <li>- See <button onClick={() => setActiveSection("examples")} className="text-accent hover:underline">Code Examples</button> in your preferred language</li>
                      <li>- Review <button onClick={() => setActiveSection("ratelimits")} className="text-accent hover:underline">Rate Limits</button> for your plan</li>
                      <li>- Check the <Link href="/docs/swagger" className="text-accent hover:underline">Interactive API Docs</Link> powered by Swagger</li>
                    </ul>
                  </section>
                </div>
              </>
            )}

            {activeSection === "authentication" && (
              <>
                <div className="mb-10">
                  <h1 className="text-3xl font-bold tracking-tight mb-3">
                    <span className="gradient-text">Authentication</span>
                  </h1>
                  <p className="text-muted">
                    How to authenticate requests to the VaultLine API.
                  </p>
                </div>

                <div className="space-y-8">
                  <section>
                    <h2 className="text-xl font-semibold mb-4">Bearer Token Authentication</h2>
                    <p className="text-muted mb-4">
                      All API requests require a bearer token in the Authorization header.
                    </p>
                    <CodeBlock
                      code={`Authorization: Bearer YOUR_TOKEN`}
                      title="Header Format"
                      language="text"
                    />
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">Getting Your Token</h2>
                    <ol className="space-y-3 text-muted">
                      <li className="flex gap-3">
                        <span className="font-bold text-accent">1.</span>
                        <span>Sign in to your <Link href="/auth/login" className="text-accent hover:underline">dashboard</Link></span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-accent">2.</span>
                        <span>Navigate to the API Keys section</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-accent">3.</span>
                        <span>Create a new API key</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-accent">4.</span>
                        <span>Copy and store your token securely</span>
                      </li>
                    </ol>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">Token Security</h2>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                      <p className="text-sm text-foreground">
                        <strong>Never share your API token publicly.</strong> Treat it like a password.
                        If compromised, revoke it immediately from your dashboard.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">Example Request</h2>
                    <CodeBlock
                      code={codeExamples.curl.getRate}
                      title="Authenticated cURL Request"
                      language="bash"
                    />
                  </section>
                </div>
              </>
            )}

            {activeSection === "endpoints" && (
              <>
                <div className="mb-10">
                  <h1 className="text-3xl font-bold tracking-tight mb-3">
                    API <span className="gradient-text">Endpoints</span>
                  </h1>
                  <p className="text-muted">
                    Complete reference for all available API endpoints.
                  </p>
                </div>

                <div className="space-y-8">
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded text-xs font-mono font-bold">GET</span>
                      <h2 className="text-xl font-semibold">/api/v1/rates</h2>
                    </div>
                    <p className="text-muted mb-4">Get current or historical rates for one or more symbols.</p>

                    <div className="bg-card/30 border border-border rounded-lg p-4 mb-4">
                      <h3 className="font-semibold mb-3">Query Parameters</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-accent-light font-mono">symbols</span>
                          <span className="text-red-400 ml-2">*required</span>
                          <p className="text-muted text-xs mt-1">Comma-separated symbols (e.g., EUR,BTC/USD,AAPL)</p>
                        </div>
                        <div>
                          <span className="text-accent-light font-mono">date</span>
                          <span className="text-gray-500 ml-2">optional</span>
                          <p className="text-muted text-xs mt-1">Historical date in YYYY-MM-DD format</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card/30 border border-border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Example Response</h3>
                      <pre className="text-xs overflow-x-auto">
{`{
  "data": [
    {
      "symbol": "EUR",
      "rate": 0.92,
      "date": "2024-03-26",
      "meta": {
        "triangulated": false,
        "stale": false,
        "cache": "HIT"
      }
    }
  ]
}`}
                      </pre>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded text-xs font-mono font-bold">GET</span>
                      <h2 className="text-xl font-semibold">/api/v1/rates/history</h2>
                    </div>
                    <p className="text-muted mb-4">Get historical rate data for a symbol over a date range.</p>

                    <div className="bg-card/30 border border-border rounded-lg p-4 mb-4">
                      <h3 className="font-semibold mb-3">Query Parameters</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-accent-light font-mono">symbol</span>
                          <span className="text-red-400 ml-2">*required</span>
                          <p className="text-muted text-xs mt-1">Single symbol (e.g., EUR)</p>
                        </div>
                        <div>
                          <span className="text-accent-light font-mono">from</span>
                          <span className="text-red-400 ml-2">*required</span>
                          <p className="text-muted text-xs mt-1">Start date in YYYY-MM-DD format</p>
                        </div>
                        <div>
                          <span className="text-accent-light font-mono">to</span>
                          <span className="text-red-400 ml-2">*required</span>
                          <p className="text-muted text-xs mt-1">End date in YYYY-MM-DD format</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded text-xs font-mono font-bold">GET</span>
                      <h2 className="text-xl font-semibold">/api/v1/assets</h2>
                    </div>
                    <p className="text-muted mb-4">Get all supported assets grouped by asset class.</p>

                    <div className="bg-card/30 border border-border rounded-lg p-4 mb-4">
                      <h3 className="font-semibold mb-3">Query Parameters</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-accent-light font-mono">asset_class</span>
                          <span className="text-gray-500 ml-2">optional</span>
                          <p className="text-muted text-xs mt-1">Filter by: fiat, crypto, stocks, or metals</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <p className="text-sm">
                      For interactive API documentation, visit the <Link href="/docs/swagger" className="text-accent hover:underline">Swagger UI</Link> or download the <a href="/openapi.yaml" className="text-accent hover:underline">OpenAPI specification</a>.
                    </p>
                  </section>
                </div>
              </>
            )}

            {activeSection === "ratelimits" && (
              <>
                <div className="mb-10">
                  <h1 className="text-3xl font-bold tracking-tight mb-3">
                    Rate <span className="gradient-text">Limits</span>
                  </h1>
                  <p className="text-muted">
                    API rate limits by plan. Upgrade your plan for higher limits.
                  </p>
                </div>

                <div className="space-y-8">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-foreground font-semibold">Plan</th>
                          <th className="text-left py-3 px-4 text-foreground font-semibold">Calls/Day</th>
                          <th className="text-left py-3 px-4 text-foreground font-semibold">Calls/Min</th>
                          <th className="text-left py-3 px-4 text-foreground font-semibold">History</th>
                          <th className="text-left py-3 px-4 text-foreground font-semibold">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {planComparison.map((plan) => (
                          <tr key={plan.name} className="border-b border-border hover:bg-card/50 transition">
                            <td className="py-3 px-4 font-medium">{plan.name}</td>
                            <td className="py-3 px-4 text-muted">{plan.calls_per_day}</td>
                            <td className="py-3 px-4 text-muted">{plan.calls_per_minute}</td>
                            <td className="py-3 px-4 text-muted">{plan.history_days}</td>
                            <td className="py-3 px-4 font-medium text-accent">{plan.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">Rate Limit Headers</h2>
                    <p className="text-muted mb-4">
                      Each response includes rate limit information in the headers:
                    </p>
                    <div className="bg-card/30 border border-border rounded-lg p-4">
                      <pre className="text-sm overflow-x-auto">
{`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1711502400`}
                      </pre>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">Hitting the Limit</h2>
                    <p className="text-muted mb-4">
                      When you exceed your rate limit, the API returns a 429 status code with the
                      <code className="bg-card px-1.5 py-0.5 rounded text-accent-light text-sm"> Retry-After </code>
                      header indicating how many seconds to wait.
                    </p>
                  </section>
                </div>
              </>
            )}

            {activeSection === "errors" && (
              <>
                <div className="mb-10">
                  <h1 className="text-3xl font-bold tracking-tight mb-3">
                    Error <span className="gradient-text">Codes</span>
                  </h1>
                  <p className="text-muted">
                    Understanding API error responses.
                  </p>
                </div>

                <div className="space-y-6">
                  {errorCodes.map((error) => (
                    <div key={error.code} className="border border-border rounded-lg p-4 bg-card/30">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-accent/20 text-accent font-mono font-bold">
                            {error.code}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{error.name}</h3>
                          <p className="text-sm text-muted mt-1">{error.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <section className="mt-8 p-4 rounded-lg bg-card/30 border border-border">
                  <h2 className="text-lg font-semibold mb-3">Error Response Format</h2>
                  <pre className="text-sm overflow-x-auto">
{`{
  "error": "Invalid symbol",
  "code": "INVALID_SYMBOL",
  "message": "The symbol 'INVALID' is not supported"
}`}
                  </pre>
                </section>
              </>
            )}

            {activeSection === "client" && (
              <>
                {/* Header */}
                <div className="mb-10">
                  <h1 className="text-3xl font-bold tracking-tight mb-3">
                    Python <span className="gradient-text">Client</span>
                  </h1>
                  <p className="text-muted">
                    A simple Python client for the VaultLine API.
                  </p>
                </div>

                {/* Installation */}
                <section className="mb-10">
                  <h2 className="text-xl font-semibold mb-3">Installation</h2>
                  <p className="text-muted mb-4">
                    Save the client code below to a file named{" "}
                    <code className="px-1.5 py-0.5 rounded bg-card text-accent-light text-sm">
                      vaultline.py
                    </code>{" "}
                    in your project.
                  </p>
                </section>

                {/* Client Code */}
                <section className="mb-10">
                  <h2 className="text-xl font-semibold mb-4">Client Code</h2>
                  <CodeBlock code={pythonClient} title="vaultline.py" />
                </section>

                {/* API Methods */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">API Methods</h2>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border border-border bg-card/30">
                      <h3 className="font-mono text-accent-light mb-2">
                        get_assets(asset_class=None)
                      </h3>
                      <p className="text-sm text-muted">
                        Get available symbols. Optionally filter by asset class:{" "}
                        <code className="text-xs px-1 py-0.5 rounded bg-card">
                          &apos;fiat&apos;
                        </code>
                        ,{" "}
                        <code className="text-xs px-1 py-0.5 rounded bg-card">
                          &apos;crypto&apos;
                        </code>
                        ,{" "}
                        <code className="text-xs px-1 py-0.5 rounded bg-card">
                          &apos;stocks&apos;
                        </code>
                        , or{" "}
                        <code className="text-xs px-1 py-0.5 rounded bg-card">
                          &apos;metals&apos;
                        </code>
                        .
                      </p>
                    </div>

                    <div className="p-4 rounded-lg border border-border bg-card/30">
                      <h3 className="font-mono text-accent-light mb-2">
                        get_rates(symbols, date=None)
                      </h3>
                      <p className="text-sm text-muted">
                        Get current rates for a list of symbols. Optionally
                        specify a date (YYYY-MM-DD) for historical rates.
                      </p>
                    </div>

                    <div className="p-4 rounded-lg border border-border bg-card/30">
                      <h3 className="font-mono text-accent-light mb-2">
                        get_history(symbol, from_date, to_date)
                      </h3>
                      <p className="text-sm text-muted">
                        Get historical rates for a symbol between two dates
                        (YYYY-MM-DD format).
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}

            {activeSection === "examples" && (
              <>
                <div className="mb-10">
                  <h1 className="text-3xl font-bold tracking-tight mb-3">
                    Code <span className="gradient-text">Examples</span>
                  </h1>
                  <p className="text-muted">
                    Quick examples to get you started with the VaultLine API in your preferred language.
                  </p>
                </div>

                <div className="space-y-12">
                  {/* cURL */}
                  <section>
                    <h2 className="text-xl font-semibold mb-4">cURL</h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-accent mb-2">Get Current Rate</h3>
                        <CodeBlock code={codeExamples.curl.getRate} title="curl" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-accent mb-2">Get Multiple Rates</h3>
                        <CodeBlock code={codeExamples.curl.getMultipleRates} title="curl" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-accent mb-2">Get Historical Rate</h3>
                        <CodeBlock code={codeExamples.curl.getHistoricalRate} title="curl" />
                      </div>
                    </div>
                  </section>

                  {/* JavaScript */}
                  <section>
                    <h2 className="text-xl font-semibold mb-4">JavaScript</h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-accent mb-2">Get Current Rate</h3>
                        <CodeBlock code={codeExamples.javascript.getRate} title="javascript" language="javascript" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-accent mb-2">Get Multiple Rates</h3>
                        <CodeBlock code={codeExamples.javascript.getMultipleRates} title="javascript" language="javascript" />
                      </div>
                    </div>
                  </section>

                  {/* TypeScript */}
                  <section>
                    <h2 className="text-xl font-semibold mb-4">TypeScript</h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-accent mb-2">Fetch Rates with Types</h3>
                        <CodeBlock code={codeExamples.typescript.getRate} title="typescript" language="typescript" />
                      </div>
                    </div>
                  </section>

                  {/* Python */}
                  <section>
                    <h2 className="text-xl font-semibold mb-4">Python</h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-accent mb-2">VaultLine Client</h3>
                        <CodeBlock code={codeExamples.python.getRate} title="python" language="python" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-accent mb-2">Get Historical Data</h3>
                        <CodeBlock code={codeExamples.python.getHistory} title="python" language="python" />
                      </div>
                    </div>
                  </section>

                  {/* Go */}
                  <section>
                    <h2 className="text-xl font-semibold mb-4">Go</h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-accent mb-2">Get Current Rate</h3>
                        <CodeBlock code={codeExamples.go.getRate} title="go" language="go" />
                      </div>
                    </div>
                  </section>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
