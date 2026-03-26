"use client";

import {
  Search,
  Users,
  Puzzle,
  Handshake,
  ArrowRight,
  TrendingUp,
  FileText,
  MessageSquare,
  Package,
} from "lucide-react";

const phases = [
  {
    icon: Search,
    phase: "Phase 1",
    period: "Months 1-3",
    title: "Developer SEO & Content",
    color: "text-cyan",
    bg: "bg-cyan/10",
    border: "border-cyan/20",
    strategy:
      "Own the search intent. Developers Google these exact queries — and we want to be the top result.",
    keywords: [
      '"free crypto API" — 33K monthly searches',
      '"forex API free" — 18K monthly searches',
      '"stock price API" — 22K monthly searches',
      '"currency converter API" — 14K monthly searches',
    ],
    actions: [
      "10 long-form comparison articles with working VaultLine code examples",
      'Landing page optimized for "unified financial data API"',
      "SEO-driven content that converts organic traffic",
    ],
  },
  {
    icon: Users,
    phase: "Phase 2",
    period: "Months 2-5",
    title: "Community & Dev Rel",
    color: "text-accent-light",
    bg: "bg-accent/10",
    border: "border-accent/20",
    strategy: "Go where developers already are.",
    keywords: [],
    actions: [
      "Open-source SDKs + quickstart templates on GitHub",
      'Dev.to / Hashnode tutorials: "Build a Portfolio Tracker in 30 Min"',
      'Product Hunt launch: "One API key to rule them all"',
      "Reddit (r/webdev, r/SideProject) — genuine helpful answers",
      'Twitter/X micro-content: "TIL you can convert BTC to Gold with one call"',
    ],
  },
  {
    icon: Puzzle,
    phase: "Phase 3",
    period: "Months 4-8",
    title: "Embed in Workflows",
    color: "text-emerald",
    bg: "bg-emerald/10",
    border: "border-emerald/20",
    strategy: "Make VaultLine the default choice in popular tools.",
    keywords: [],
    actions: [
      'Submit "Financial Dashboard" template to Vercel marketplace',
      "Build native connectors for Retool, Appsmith, Budibase",
      "Zapier / Make / n8n integrations for no-code builders",
      "Become the embedded financial data layer in every app marketplace",
    ],
  },
  {
    icon: Handshake,
    phase: "Phase 4",
    period: "Months 6-12",
    title: "Partnerships & B2B",
    color: "text-amber",
    bg: "bg-amber/10",
    border: "border-amber/20",
    strategy: "Go upstream to SaaS platforms.",
    keywords: [],
    actions: [
      "Pitch invoicing tools (Billbooks, Invoice Ninja, Zoho) as embedded rate provider",
      "Pitch SaaS pricing localization tools as exchange rate backend",
      'Co-branded widgets: "Exchange rates powered by VaultLine"',
      "Enterprise sales motion for higher ACV customers",
    ],
  },
];

const milestones = [
  { week: "Week 1-2", deliverable: "Project setup: Next.js, Clerk auth, MongoDB Atlas, Redis. Basic landing page." },
  { week: "Week 3-4", deliverable: "Data ingestion pipeline: All 4 asset classes ingesting to MongoDB + Redis." },
  { week: "Week 5-6", deliverable: "Core API: /rates, /convert, /batch endpoints live. Rate limiting. Auth middleware." },
  { week: "Week 7-8", deliverable: "Developer portal: Dashboard, API key management, usage charts, playground." },
  { week: "Week 9-10", deliverable: "Billing: Stripe integration (4 tiers), usage metering, customer portal." },
  { week: "Week 11-12", deliverable: "Webhook alerts: Alert CRUD, evaluation engine, signed webhook payloads." },
  { week: "Week 13-14", deliverable: "Documentation site (Mintlify), SDKs (npm + pip), status page, changelog." },
  { week: "Week 15-16", deliverable: "Polish: Landing page, SEO content, widget builder, Product Hunt prep. Launch." },
];

export default function GoToMarket() {
  return (
    <section id="gtm" className="py-24 sm:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald/[0.02] to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-accent-light text-sm font-medium uppercase tracking-widest mb-4">
            Go-To-Market Strategy
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            How we get the first{" "}
            <span className="gradient-text">300 paying users</span>
          </h2>
          <p className="mt-5 text-muted text-lg">
            Four phases, 12 months, from SEO to enterprise partnerships.
          </p>
        </div>

        {/* GTM Phases */}
        <div className="grid md:grid-cols-2 gap-6 mb-20">
          {phases.map((p) => (
            <div
              key={p.phase}
              className={`rounded-2xl border ${p.border} bg-card p-6`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl ${p.bg} flex items-center justify-center`}
                >
                  <p.icon className={`w-5 h-5 ${p.color}`} />
                </div>
                <div>
                  <div className="text-xs font-mono text-muted">
                    {p.phase} — {p.period}
                  </div>
                  <h3 className="font-semibold">{p.title}</h3>
                </div>
              </div>

              <p className="text-sm text-muted mb-4">{p.strategy}</p>

              {p.keywords.length > 0 && (
                <div className="mb-4 space-y-1.5">
                  {p.keywords.map((k) => (
                    <div
                      key={k}
                      className="text-xs font-mono text-cyan bg-cyan/5 px-3 py-1.5 rounded-md"
                    >
                      {k}
                    </div>
                  ))}
                </div>
              )}

              <ul className="space-y-2">
                {p.actions.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="w-3.5 h-3.5 text-muted shrink-0 mt-1" />
                    <span className="text-muted">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Viral Growth Loop */}
        <div className="rounded-2xl border border-accent/20 bg-accent/[0.03] p-8 mb-16 text-center">
          <h3 className="text-xl font-semibold mb-4">
            The Widget Viral Loop
          </h3>
          <p className="text-sm text-muted max-w-2xl mx-auto mb-6">
            Every website embedding our widget becomes a billboard for VaultLine.
            This is the &ldquo;Powered by Typeform&rdquo; strategy.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
            {[
              { icon: Package, label: "Developer embeds widget" },
              { icon: TrendingUp, label: "End users see rates" },
              { icon: FileText, label: '"Powered by VaultLine" badge' },
              { icon: MessageSquare, label: "New developers discover us" },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
                  <s.icon className="w-4 h-4 text-accent-light" />
                  <span className="text-muted">{s.label}</span>
                </div>
                {i < 3 && (
                  <ArrowRight className="w-4 h-4 text-muted hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Development Milestones */}
        <div>
          <h3 className="text-xl font-semibold text-center mb-8">
            Development Roadmap — 16 Weeks to Launch
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {milestones.map((m) => (
              <div key={m.week} className="rounded-xl bg-card border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-accent-light font-medium">
                    {m.week}
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {m.deliverable}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
