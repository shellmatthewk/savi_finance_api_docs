"use client";

import {
  Shield,
  Database,
  Zap,
  Layers,
  RefreshCw,
  Clock,
  ArrowDown,
  Cpu,
  HardDrive,
  Radio,
} from "lucide-react";

const stack = [
  { layer: "Frontend", tech: "Next.js 15 (App Router)", why: "SSR for SEO, RSC for dashboard" },
  { layer: "Auth", tech: "Clerk", why: "Pre-built components, JWT middleware" },
  { layer: "Billing", tech: "Stripe", why: "Checkout, portal, usage metering" },
  { layer: "Database", tech: "MongoDB Atlas", why: "Flexible schema, time-series collections" },
  { layer: "Cache", tech: "Upstash Redis", why: "Serverless, pay-per-request, global" },
  { layer: "Job Queue", tech: "BullMQ on Railway", why: "Persistent queues, cron, retries" },
  { layer: "Edge", tech: "Cloudflare Workers", why: "Rate limiting, cache, 300+ PoPs" },
  { layer: "Docs", tech: "Mintlify", why: "Beautiful MDX docs, API reference" },
  { layer: "Monitoring", tech: "BetterStack + Sentry", why: "Uptime, logs, error tracking" },
];

const caching = [
  {
    icon: Shield,
    layer: "Layer 1 — Edge",
    tech: "Cloudflare Workers KV",
    detail: "85%+ of requests never touch origin",
    ttl: "Sandbox: 24hr, Builder/Scale: 15min, Enterprise: 5min",
    color: "text-cyan",
    bg: "bg-cyan/10",
  },
  {
    icon: Zap,
    layer: "Layer 2 — Application",
    tech: "Upstash Redis",
    detail: "Full normalized JSON for every pair",
    ttl: "5-min TTL, hydrated from MongoDB on deploy",
    color: "text-accent-light",
    bg: "bg-accent/10",
  },
  {
    icon: Database,
    layer: "Layer 3 — Database",
    tech: "MongoDB Atlas",
    detail: "Source of truth, written by ingestion only",
    ttl: "Time-series collections for historical data",
    color: "text-emerald",
    bg: "bg-emerald/10",
  },
];

const ingestion = [
  { asset: "Fiat", primary: "Open Exchange Rates", fallback: "ExchangeRate.host", freq: "15 min", items: "170+ currencies" },
  { asset: "Crypto", primary: "CoinGecko Pro", fallback: "CoinCap", freq: "5 min", items: "250+ coins" },
  { asset: "Equities", primary: "Twelve Data", fallback: "Alpha Vantage", freq: "15 min", items: "5,000+ tickers" },
  { asset: "Metals", primary: "Metals.dev", fallback: "Gold-API", freq: "15 min", items: "10+ rates" },
];

export default function Architecture() {
  return (
    <section id="architecture" className="py-24 sm:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-accent-light text-sm font-medium uppercase tracking-widest mb-4">
            Technical Architecture
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Built for <span className="gradient-text">99.9% uptime</span> and{" "}
            <span className="gradient-text">&lt;100ms</span> responses
          </h2>
          <p className="mt-5 text-muted text-lg">
            Three-layer caching, dual-provider resilience, and edge computing.
            10x users does not mean 10x cost.
          </p>
        </div>

        {/* System architecture diagram */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 mb-16">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent-light" />
            System Overview
          </h3>

          <div className="space-y-4">
            {/* Edge Layer */}
            <div className="rounded-xl border border-cyan/20 bg-cyan/[0.03] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-cyan" />
                <span className="text-sm font-medium text-cyan">
                  Edge Layer (Cloudflare)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["Rate Limiter (per API key)", "Edge Cache (TTL by tier)", "WAF / DDoS / Bot Protection"].map((s) => (
                  <div
                    key={s}
                    className="text-xs text-muted bg-black/30 rounded-lg p-2 text-center"
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowDown className="w-4 h-4 text-muted" />
            </div>

            {/* Application Layer */}
            <div className="rounded-xl border border-accent/20 bg-accent/[0.03] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-4 h-4 text-accent-light" />
                <span className="text-sm font-medium text-accent-light">
                  Application Layer (Node.js / TypeScript)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  "Auth MW (Clerk JWT)",
                  "Rate MW (Redis counter)",
                  "Asset Validator",
                  "Triangulation Engine",
                  "Conversion Engine",
                  "Webhook Dispatcher (BullMQ)",
                ].map((s) => (
                  <div
                    key={s}
                    className="text-xs text-muted bg-black/30 rounded-lg p-2 text-center"
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowDown className="w-4 h-4 text-muted" />
            </div>

            {/* Data Layer */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-emerald/20 bg-emerald/[0.03] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-emerald" />
                  <span className="text-xs font-medium text-emerald">
                    Redis Cache
                  </span>
                </div>
                <div className="text-xs text-muted">
                  Hot rates, TTL: 5min-24hr by tier
                </div>
              </div>
              <div className="rounded-xl border border-amber/20 bg-amber/[0.03] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-4 h-4 text-amber" />
                  <span className="text-xs font-medium text-amber">
                    MongoDB Atlas
                  </span>
                </div>
                <div className="text-xs text-muted">
                  assets, history, alerts, users, usage
                </div>
              </div>
              <div className="rounded-xl border border-danger/20 bg-danger/[0.03] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Radio className="w-4 h-4 text-danger" />
                  <span className="text-xs font-medium text-danger">
                    BullMQ Jobs
                  </span>
                </div>
                <div className="text-xs text-muted">
                  Ingestion, alerts eval, webhooks
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Three-layer caching */}
        <div className="mb-16">
          <h3 className="text-xl font-semibold text-center mb-2">
            The Three-Layer Cache Shield
          </h3>
          <p className="text-sm text-muted text-center mb-8">
            Data that&apos;s 15 minutes old is identical for every user. This is
            the most cacheable API imaginable.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {caching.map((c) => (
              <div
                key={c.layer}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-4`}
                >
                  <c.icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <h4 className="font-semibold text-sm mb-1">{c.layer}</h4>
                <div className="text-xs font-mono text-muted mb-3">
                  {c.tech}
                </div>
                <p className="text-sm text-muted mb-2">{c.detail}</p>
                <div className="text-xs text-muted bg-black/30 rounded-md px-3 py-1.5">
                  {c.ttl}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div className="mb-16">
          <h3 className="text-xl font-semibold text-center mb-8">
            Technology Stack
          </h3>
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card border-b border-border">
                    <th className="text-left px-5 py-3 font-medium text-muted">
                      Layer
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-muted">
                      Technology
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-muted">
                      Why
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stack.map((s) => (
                    <tr
                      key={s.layer}
                      className="border-b border-border/50 hover:bg-card-hover/50 transition"
                    >
                      <td className="px-5 py-3 font-medium text-accent-light">
                        {s.layer}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">
                        {s.tech}
                      </td>
                      <td className="px-5 py-3 text-muted text-xs">
                        {s.why}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Data Ingestion */}
        <div className="mb-16">
          <h3 className="text-xl font-semibold text-center mb-2">
            Data Ingestion Pipeline
          </h3>
          <p className="text-sm text-muted text-center mb-8">
            Dual-provider strategy for every asset class. Total upstream cost:{" "}
            <span className="text-emerald font-mono font-medium">
              ~$179/month fixed
            </span>
            .
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ingestion.map((d) => (
              <div
                key={d.asset}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="text-sm font-semibold mb-3">{d.asset}</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Primary</span>
                    <span className="font-mono">{d.primary}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Fallback</span>
                    <span className="font-mono">{d.fallback}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Frequency</span>
                    <span className="font-mono text-cyan">Every {d.freq}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Coverage</span>
                    <span className="font-mono">{d.items}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Never Fail + Rate Triangulation */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-success/20 bg-success/[0.03] p-6">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-5 h-5 text-success" />
              <h4 className="font-semibold">&ldquo;Never Fail&rdquo; Contract</h4>
            </div>
            <div className="code-block p-4 text-xs font-mono leading-relaxed text-muted">
              <div>Try Primary Provider</div>
              <div className="pl-4 text-warning">
                ↓ fail? → Retry 3x (30s, 2min, 10min backoff)
              </div>
              <div className="pl-4 text-warning">
                ↓ still fail? → Try Fallback Provider
              </div>
              <div className="pl-4 text-warning">
                ↓ still fail? → Serve stale data + PagerDuty
              </div>
              <div className="mt-3 text-success font-medium">
                API ALWAYS returns 200 with best available data.
              </div>
              <div className="text-success font-medium">
                User never sees 500 for data availability.
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-cyan/20 bg-cyan/[0.03] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-cyan" />
              <h4 className="font-semibold">Rate Triangulation</h4>
            </div>
            <p className="text-sm text-muted mb-4">
              Store ~5,430 base rates (everything vs USD). Serve ~29 million
              pair combinations. Runs in &lt;1ms.
            </p>
            <div className="code-block p-4 text-xs font-mono leading-relaxed">
              <div className="text-muted">
                Stored: USD→EUR=0.94, USD→BTC=0.00001
              </div>
              <div className="text-muted">Requested: EUR→BTC</div>
              <div className="text-cyan mt-2">
                Calculated: (USD→BTC) / (USD→EUR)
              </div>
              <div className="text-cyan">= 0.00001 / 0.94 = 0.00001064</div>
              <div className="text-muted mt-2">
                No additional API calls needed.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
