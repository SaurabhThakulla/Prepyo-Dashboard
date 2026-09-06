import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  ArrowLeft,
  ShieldCheck,
  Ban,
  DollarSign,
  FileText,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function TermsPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme, user } = useApp();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-violet-700 text-white font-black text-sm shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
                P
              </div>
              <span className="font-display text-xl font-black tracking-tight text-foreground">
                prep<span className="text-primary">yo</span>
              </span>
            </Link>
            <Badge variant="outline" className="hidden sm:inline-flex text-xs py-0.5 px-2 font-mono text-muted-foreground border-border">
              Legal
            </Badge>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </Button>

            <Button
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              variant="default"
              size="sm"
              className="font-bold text-xs sm:text-sm rounded-xl gap-1.5 shadow-sm shadow-primary/20"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{user ? 'Go to Dashboard' : 'Back to Sign In'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background py-10 sm:py-14 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-4">
            <FileText className="w-3.5 h-3.5" />
            <span>Effective Date: September 2026</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
            Terms & Conditions of Service
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Please read these terms carefully before accessing or using Prepyo. By accessing the platform, creating an account, or purchasing any subscription, you agree to be bound by these terms.
          </p>

          {/* Quick Notice Badges */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
              <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm leading-relaxed">
                <strong className="block font-bold mb-0.5">Strict No-Refund Policy</strong>
                All digital purchases, AI scoring tokens, and subscriptions are non-refundable once activated.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200">
              <Ban className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm leading-relaxed">
                <strong className="block font-bold mb-0.5">Anti-Theft & Copyright Protection</strong>
                Strictly no copying, scraping, sharing, or stealing of proprietary questions, audios, or AI explanations.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Document Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
        {/* Section 1 */}
        <section id="acceptance" className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground text-xs font-mono font-bold">1</span>
            Acceptance of Terms
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            These Terms & Conditions (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;Learner&quot;, or &quot;You&quot;) and Prepyo (&quot;Prepyo&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), headquartered in Kathmandu, Nepal. By creating an account, logging in via SMS verification, accessing practice modules, taking diagnostic/mock tests, or utilizing our AI tutoring technologies, you explicitly agree to adhere to and be bound by all terms, conditions, and policies stated herein.
          </p>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            If you do not agree with any part of these Terms, you must discontinue your use of Prepyo immediately.
          </p>
        </section>

        {/* Section 2: Strict No-Refund Policy */}
        <section id="no-refund" className="space-y-4 p-5 sm:p-6 rounded-2xl bg-amber-500/5 border-2 border-amber-500/30">
          <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
            <DollarSign className="w-6 h-6" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              2. Strict No-Refund Policy
            </h2>
          </div>
          <div className="space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">
              ALL SALES, SUBSCRIPTIONS, MOCK EXAM PURCHASES, AND AI CREDIT TRANSACTIONS ON PREPYO ARE FINAL AND STRICTLY NON-REFUNDABLE UNDER ALL CIRCUMSTANCES.
            </p>
            <p>
              Prepyo provides digital, intangible, and on-demand educational services, including instant access to curated question banks, automated speech-to-text evaluation models, proprietary acoustic grading engines, and real-time AI tutor interaction. Because these computational resources and proprietary datasets are instantly provisioned upon payment confirmation:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>
                <strong>No Refunds for Change of Mind:</strong> We do not offer refunds, credits, or prorated cancellations if you decide not to use the service, change exam plans, or take an earlier or later test date.
              </li>
              <li>
                <strong>Immediate Digital Fulfillment:</strong> Once your subscription or credit package is activated on your mobile account, access is deemed consumed in full.
              </li>
              <li>
                <strong>Technical Incompatibility or Inactive Use:</strong> Failure to utilize your active subscription, microphone configuration issues on your local device, or user-side internet connectivity problems do not qualify for any refund or extension.
              </li>
              <li>
                <strong>Account Termination for Policy Breach:</strong> If your account is suspended or terminated due to violation of our Terms (including content scraping, theft, or account sharing), all remaining balances and access periods are immediately forfeited without refund.
              </li>
            </ul>
            <p className="text-xs text-muted-foreground italic">
              Before purchasing a paid tier, we encourage all learners to experience our free diagnostic mock exam and sample practice questions to verify platform compatibility and utility.
            </p>
          </div>
        </section>

        {/* Section 3: Intellectual Property & Prohibition of Content Theft */}
        <section id="content-protection" className="space-y-4 p-5 sm:p-6 rounded-2xl bg-rose-500/5 border-2 border-rose-500/30">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <ShieldCheck className="w-6 h-6" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              3. Intellectual Property Protection & Absolute Prohibition of Content Theft
            </h2>
          </div>
          <div className="space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">
              ALL MATERIAL ON PREPYO IS THE EXCLUSIVE, PROPRIETARY INTELLECTUAL PROPERTY OF PREPYO. CONTENT THEFT, SCRAPING, UNAUTHORIZED REPRODUCTION, AND REDISTRIBUTION ARE STRICTLY FORBIDDEN AND SUBJECT TO IMMEDIATE LEGAL PROSECUTION.
            </p>
            <p>
              The platform contains proprietary educational materials developed through extensive academic research and machine learning engineering. This includes, but is not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>PTE and IELTS mock exam prompts, reading passages, lecture audio tracks, and repeat sentence items.</li>
              <li>AI-generated sample essays, vocabulary rubrics, grammatical corrections, and pronunciation scoring algorithms.</li>
              <li>Audio recordings, user interface designs, visual scorecards, software source code, trademarks, and branding.</li>
            </ul>

            <div className="p-4 rounded-xl bg-background/80 border border-border/80 space-y-2">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-500" />
                Explicitly Prohibited Actions (No Stealing):
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li>
                  <strong>No Automated Extraction / Scraping:</strong> You may not use bots, spiders, web scrapers, crawlers, automated scripts, or browser extensions to extract question sets, audio files, or scoring responses.
                </li>
                <li>
                  <strong>No Screen Recording or Mass Downloading:</strong> Recording, screenshotting in bulk, downloading, or capturing exam questions for offline distribution or public sharing is strictly illegal.
                </li>
                <li>
                  <strong>No Resale or Redistribution:</strong> You may not sell, sublicense, rent, republish, broadcast, or share any Prepyo material on social media, Telegram groups, WhatsApp, YouTube, tutoring centers, or any other medium.
                </li>
                <li>
                  <strong>No Reverse Engineering:</strong> You may not decompile, reverse engineer, or attempt to derive the underlying algorithms, AI prompts, or scoring weights of Prepyo.
                </li>
              </ul>
            </div>

            <p className="font-medium text-foreground text-sm">
              Legal Consequences of Theft: Any unauthorized distribution, theft, or scraping of Prepyo assets constitutes a criminal offense under the Copyright Act of Nepal (2059/2002) and international intellectual property treaties (including the Berne Convention and WIPO). Prepyo vigorously enforces its rights, tracks fraudulent IP/session signatures, and will pursue injunctive relief, account forfeiture, and statutory monetary damages to the fullest extent of the law.
            </p>
          </div>
        </section>

        {/* Section 4: Account Registration & Single-User License */}
        <section id="accounts" className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground text-xs font-mono font-bold">4</span>
            Account Registration & Single-User License
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            To use Prepyo, you authenticate using your valid Nepali mobile number via SMS One-Time Passcode (OTP). You agree to provide accurate registration information.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-muted-foreground">
            <li>
              <strong>Single-User License:</strong> Each account is granted for individual, personal use by a single learner only. Account sharing, credential passing, or multi-user logins from different physical locations are strictly prohibited.
            </li>
            <li>
              <strong>Security Monitoring:</strong> We implement automated session telemetry. If suspicious concurrent sessions or abnormal usage patterns are detected, your account will be automatically locked.
            </li>
          </ul>
        </section>

        {/* Section 5: AI Scoring Disclaimer */}
        <section id="ai-disclaimer" className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground text-xs font-mono font-bold">5</span>
            AI Scoring & Educational Disclaimer
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Prepyo is an independent AI-powered educational preparation platform. We are not endorsed by, directly affiliated with, or sponsored by Pearson PLC (administrators of PTE Academic), the British Council, IDP Education, or Cambridge English (administrators of IELTS).
          </p>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            All AI diagnostic scores, pronunciation evaluations, and predictive band scores are estimations designed for practice and benchmark purposes. Prepyo makes no guarantee that your actual official exam score will be identical to your practice diagnostic results.
          </p>
        </section>

        {/* Section 6: Limitation of Liability */}
        <section id="liability" className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground text-xs font-mono font-bold">6</span>
            Limitation of Liability
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            In no event shall Prepyo, its directors, developers, or partners be liable for any indirect, incidental, consequential, or punitive damages arising out of your access to or inability to access the platform, exam delays, or official test results. In any situation, Prepyo&apos;s total aggregate liability shall not exceed the amount paid by you in the preceding 30 days.
          </p>
        </section>

        {/* Section 7: Governing Law & Jurisdiction */}
        <section id="governing-law" className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground text-xs font-mono font-bold">7</span>
            Governing Law & Jurisdiction
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            These Terms and any disputes arising out of or related to your use of Prepyo shall be governed by and construed in accordance with the laws of Nepal. Any legal proceedings, dispute resolutions, or actions regarding intellectual property theft shall be subject to the exclusive jurisdiction of the competent courts in Kathmandu, Nepal.
          </p>
        </section>

        {/* Section 8: Contact Information */}
        <section id="contact" className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground text-xs font-mono font-bold">8</span>
            Contact & Legal Inquiries
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            For inquiries regarding these Terms of Service, licensing, or reports of intellectual property infringement, please contact:
          </p>
          <div className="p-4 rounded-xl bg-card border border-border text-sm space-y-1">
            <p className="font-semibold text-foreground">Prepyo Legal & Compliance</p>
            <p className="text-muted-foreground">Kathmandu, Nepal</p>
            <p className="text-muted-foreground">Email: legal@prepyo.com</p>
          </div>
        </section>
      </main>

      {/* Footer Navigation CTA */}
      <footer className="border-t border-border/70 bg-card/50 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-sm font-bold text-foreground">Ready to start your exam prep?</p>
            <p className="text-xs text-muted-foreground">
              Check our{' '}
              <Link to="/privacy" className="text-primary hover:underline font-semibold">
                Privacy Policy
              </Link>{' '}
              or continue directly to sign in.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl font-semibold"
            >
              <Link to="/privacy">Privacy Policy</Link>
            </Button>
            <Button
              asChild
              variant="default"
              size="sm"
              className="rounded-xl font-bold shadow-md shadow-primary/20"
            >
              <Link to="/login">Go to Sign In</Link>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
