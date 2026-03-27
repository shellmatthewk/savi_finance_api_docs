"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <div className="pt-24 pb-16 bg-background">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Privacy <span className="gradient-text">Policy</span>
            </h1>
            <p className="text-muted text-lg">
              Last updated: March 2025
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none space-y-8">
            {/* Section 1 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">1. Introduction</h2>
              <p className="text-foreground/80">
                VaultLine (&quot;we,&quot; &quot;us,&quot; &quot;our,&quot; or &quot;Company&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">2. Data We Collect</h2>
              <div className="space-y-4 text-foreground/80">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Account Information</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Email address</li>
                    <li>Name</li>
                    <li>Company name (if applicable)</li>
                    <li>Password (hashed, never stored in plaintext)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Usage Data</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>API calls made and their timestamps</li>
                    <li>Symbols and rates requested</li>
                    <li>API key usage patterns</li>
                    <li>IP addresses making requests</li>
                    <li>Error responses and failed requests</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Billing Information</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Billing address</li>
                    <li>Subscription plan details</li>
                    <li>Payment method (processed securely via Stripe)</li>
                    <li>Invoice history</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Device Information</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Browser type and version</li>
                    <li>Operating system</li>
                    <li>Device identifiers</li>
                    <li>Referring website</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">3. How We Use Your Data</h2>
              <div className="space-y-3 text-foreground/80">
                <p>We use the data we collect to:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Provide and maintain the VaultLine Service</li>
                  <li>Process your subscription and billing</li>
                  <li>Authenticate your identity and prevent fraud</li>
                  <li>Enforce rate limits and usage policies</li>
                  <li>Monitor API performance and reliability</li>
                  <li>Send transactional emails (confirmations, receipts, notifications)</li>
                  <li>Respond to support requests</li>
                  <li>Improve and optimize our Service</li>
                  <li>Comply with legal obligations</li>
                  <li>Detect and prevent abuse or security threats</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">4. Third-Party Sharing</h2>
              <div className="space-y-3 text-foreground/80">
                <p>We do not sell your personal data. We only share data with trusted third parties when necessary:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong>Payment Processors:</strong> Stripe (for billing)</li>
                  <li><strong>Cloud Providers:</strong> Vercel, Upstash, Neon (for hosting and infrastructure)</li>
                  <li><strong>Analytics:</strong> Sentry (for error tracking)</li>
                  <li><strong>Legal Requirements:</strong> Law enforcement (with proper legal process)</li>
                  <li><strong>Service Providers:</strong> Email providers, monitoring tools</li>
                </ul>
                <p>
                  All third parties are contractually obligated to protect your data and use it only for the purposes we specify.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">5. Your Rights (GDPR & Privacy Laws)</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  If you are in the European Union, United Kingdom, or other jurisdictions with privacy rights, you have the right to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong>Access:</strong> Request a copy of all data we hold about you</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate data</li>
                  <li><strong>Deletion:</strong> Request deletion of your data (right to be forgotten)</li>
                  <li><strong>Portability:</strong> Receive your data in a portable format</li>
                  <li><strong>Objection:</strong> Opt-out of certain processing activities</li>
                  <li><strong>Withdraw Consent:</strong> Revoke consent at any time</li>
                </ul>
                <p>
                  To exercise these rights, email us at privacy@vaultline.io with your request. We will respond within 30 days.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">6. Data Retention</h2>
              <div className="space-y-3 text-foreground/80">
                <p>We retain your data as follows:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong>Account Data:</strong> Retained while your account is active, deleted upon termination</li>
                  <li><strong>API Usage Logs:</strong> Retained for 90 days for security and troubleshooting</li>
                  <li><strong>Billing Data:</strong> Retained for 7 years as required by law</li>
                  <li><strong>Error Logs:</strong> Retained for 30 days</li>
                </ul>
              </div>
            </section>

            {/* Section 7 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">7. Security</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>HTTPS encryption for all data in transit</li>
                  <li>Passwords hashed with bcrypt</li>
                  <li>API keys encrypted at rest</li>
                  <li>Regular security audits and penetration testing</li>
                  <li>Role-based access control for employees</li>
                  <li>Secure authentication with rate limiting</li>
                </ul>
                <p>
                  While we take security seriously, no system is completely secure. If you believe your data has been compromised, contact us immediately.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">8. Cookies & Tracking</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  We use cookies and similar technologies to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Keep you logged in (session cookies)</li>
                  <li>Remember your preferences (functional cookies)</li>
                  <li>Analyze usage patterns (analytical cookies)</li>
                </ul>
                <p>
                  You can disable cookies in your browser settings, but this may affect functionality.
                </p>
              </div>
            </section>

            {/* Section 9 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">9. Children&apos;s Privacy</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  VaultLine is not intended for users under 13 years old. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal information, we will delete it immediately.
                </p>
              </div>
            </section>

            {/* Section 10 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">10. International Data Transfers</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  Your data may be transferred to, stored in, and processed in countries other than the country in which you reside. By using VaultLine, you consent to the transfer of your information to countries outside your country of residence.
                </p>
              </div>
            </section>

            {/* Section 11 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">11. Changes to This Policy</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  We may update this Privacy Policy periodically. We will notify you of any material changes by posting the updated policy here and updating the &quot;Last Updated&quot; date. Your continued use of the Service constitutes acceptance of the updated policy.
                </p>
              </div>
            </section>

            {/* Section 12 */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">12. Contact Us</h2>
              <div className="space-y-3 text-foreground/80">
                <p>
                  If you have questions about this Privacy Policy or our privacy practices, please contact us:
                </p>
                <div className="space-y-2">
                  <p className="text-accent">
                    Email: privacy@vaultline.io
                  </p>
                  <p className="text-accent">
                    Email: legal@vaultline.io
                  </p>
                </div>
              </div>
            </section>

            {/* Footer links */}
            <div className="pt-8 border-t border-border mt-12">
              <p className="text-sm text-muted">
                Also see our <Link href="/terms" className="text-accent hover:underline">Terms of Service</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
