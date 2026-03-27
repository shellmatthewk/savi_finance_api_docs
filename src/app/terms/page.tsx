"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <div className="pt-24 pb-16 bg-background">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Terms of <span className="gradient-text">Service</span>
            </h1>
            <p className="text-muted text-lg">
              Last updated: March 2025
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none space-y-8">
            {/* Section 1 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-foreground/80">
                By accessing and using the VaultLine API and services (&quot;Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">2. API Usage Limits</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  Your use of the VaultLine API is subject to rate limits and quotas based on your subscription plan:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong>Sandbox Plan:</strong> 1,000 calls per day, 10 calls per minute</li>
                  <li><strong>Standard Plan:</strong> Unlimited calls per day</li>
                  <li><strong>Enterprise Plan:</strong> Custom limits negotiated per contract</li>
                </ul>
                <p>
                  Exceeding rate limits will result in HTTP 429 (Too Many Requests) responses. You agree not to circumvent rate limiting through any means, including distributed requests or API key sharing.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">3. Data Accuracy Disclaimer</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  VaultLine aggregates financial rate data from multiple third-party providers. While we make reasonable efforts to ensure data accuracy, we do not guarantee the accuracy, completeness, or timeliness of any data provided through the Service.
                </p>
                <p>
                  <strong>You acknowledge that:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Financial data may be delayed or stale</li>
                  <li>Cross-currency triangulations are calculated estimates</li>
                  <li>Historical data may have gaps or be unavailable</li>
                  <li>Market data is subject to change without notice</li>
                </ul>
                <p>
                  YOU USE THE SERVICE AND ALL DATA PROVIDED &quot;AS IS&quot; WITHOUT WARRANTY OF ANY KIND.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">4. Prohibited Uses</h2>
              <div className="space-y-3 text-foreground/80">
                <p>You agree not to use the Service:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>To republish or resell the data without explicit written permission</li>
                  <li>To compete with VaultLine or build derivative products</li>
                  <li>To perform denial-of-service attacks or overload the Service</li>
                  <li>To access the Service with automated tools without authorization</li>
                  <li>For illegal activities or in violation of any laws</li>
                  <li>To reverse-engineer, decompile, or discover our algorithms</li>
                  <li>To share your API keys with unauthorized third parties</li>
                  <li>To make trading or financial decisions based solely on our data</li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">5. Termination Policy</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  VaultLine may terminate or suspend your account and access to the Service immediately, without prior notice, if:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>You violate these Terms of Service</li>
                  <li>You engage in abusive or harmful behavior</li>
                  <li>You exceed reasonable usage patterns</li>
                  <li>Payment for your subscription fails</li>
                  <li>We determine your use violates legal requirements</li>
                </ul>
                <p>
                  Upon termination, your right to use the Service ceases immediately. Unused portions of your subscription are non-refundable except as required by law.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">6. Liability Limitations</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>VaultLine's total liability to you shall not exceed the amount paid for the Service in the past 12 months</li>
                  <li>VaultLine is not liable for indirect, incidental, special, consequential, or punitive damages</li>
                  <li>VaultLine is not liable for damages from inaccurate data, service interruptions, or data loss</li>
                  <li>VaultLine is not liable for third-party services or data providers</li>
                </ul>
                <p>
                  Some jurisdictions do not allow exclusion of implied warranties or limitation of liability, so the above limitations may not apply to you.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">7. Intellectual Property Rights</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  VaultLine retains all ownership rights to the Service, its algorithms, aggregation methods, and database. Your subscription grants you a limited, non-exclusive, non-transferable license to use the Service.
                </p>
                <p>
                  You may not copy, modify, distribute, or create derivative works from the Service or its data.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">8. Modifications to Terms</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  VaultLine reserves the right to modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use of the Service constitutes acceptance of the modified terms.
                </p>
              </div>
            </section>

            {/* Section 9 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">9. Governing Law</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  These Terms of Service are governed by and construed in accordance with the laws of the jurisdiction where VaultLine is incorporated, without regard to its conflicts of law provisions.
                </p>
              </div>
            </section>

            {/* Section 10 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">10. Contact</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  If you have questions about these Terms of Service, please contact us at:
                </p>
                <p className="text-accent">
                  legal@vaultline.io
                </p>
              </div>
            </section>

            {/* Footer links */}
            <div className="pt-8 border-t border-border mt-12">
              <p className="text-sm text-muted">
                Also see our <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
