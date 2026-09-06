import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Eye,
  Database,
  Mic,
  FileText,
  UserCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function PrivacyPage() {
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
              Privacy
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
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Effective Date: September 2026</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
            Privacy Policy
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Your privacy and exam preparation integrity are our top priorities. Learn how Prepyo collects, uses, protects, and handles your personal information.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-card border border-border text-xs font-medium text-foreground">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>256-bit End-to-End Encryption</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-card border border-border text-xs font-medium text-foreground">
              <Mic className="w-3.5 h-3.5 text-primary" />
              <span>Audio Data Strictly for Scoring</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-card border border-border text-xs font-medium text-foreground">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              <span>No Selling of Personal Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Document Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
        {/* Section 1: Overview */}
        <section id="overview" className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground text-xs font-mono font-bold">1</span>
            Introduction & Scope
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Prepyo operates an AI-assisted language test prep platform designed for candidates taking PTE Academic and IELTS examinations. This Privacy Policy describes how we collect, process, and protect your information when you access our web application, mobile interfaces, and AI evaluation services.
          </p>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            By creating an account, entering your mobile number, or completing mock tests on Prepyo, you acknowledge the terms described in this policy as well as our{' '}
            <Link to="/terms" className="text-primary font-semibold hover:underline">
              Terms & Conditions
            </Link>
            .
          </p>
        </section>

        {/* Section 2: Information We Collect */}
        <section id="collection" className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground text-xs font-mono font-bold">2</span>
            Information We Collect
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            We collect only the minimum personal data required to deliver reliable OTP authentication and accurate exam scoring:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                <FileText className="w-4 h-4 text-primary" />
                Account & Profile Information
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Nepali mobile number (used as your primary account identifier and for SMS OTP verification), optional full name, email address, target exam (PTE/IELTS), and target band score.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                <Mic className="w-4 h-4 text-primary" />
                Audio & Speaking Responses
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                When you practice speaking questions (Read Aloud, Repeat Sentence, Describe Image), audio recordings are captured via your browser microphone to generate acoustic and pronunciation feedback.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                <Database className="w-4 h-4 text-primary" />
                Practice Data & Diagnostic Analytics
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Written essays, summaries, reading selections, mock test completion history, error logs, and AI evaluation feedback to build your personalized learning progress chart.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                <Eye className="w-4 h-4 text-primary" />
                Security & Anti-Theft Telemetry
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                IP address, device metadata, browser type, and session timestamps. These logs are monitored exclusively to detect concurrent account sharing, scraping bots, or content theft attempts.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Audio Processing & AI Data Handling */}
        <section id="audio-ai" className="space-y-4 p-5 sm:p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2.5 text-primary">
            <Mic className="w-5 h-5" />
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              3. Speaking Recordings & AI Model Processing
            </h2>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Your spoken audio is converted to digital streams and processed by speech-to-text models and acoustic phoneme aligners to compute pronunciation, fluency, and content accuracy metrics.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Recordings are used strictly for your own evaluation and diagnostic scorecards.</li>
              <li>We never sell or publicly broadcast your voice files.</li>
              <li>Audio data is encrypted during transit and at rest using standard 256-bit encryption.</li>
            </ul>
          </div>
        </section>

        {/* Section 4: Content Security, Anti-Abuse & Anti-Piracy */}
        <section id="security-monitoring" className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground text-xs font-mono font-bold">4</span>
            Content Security & Anti-Piracy Monitoring
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            To enforce our intellectual property rights and maintain platform security, we utilize automated logging to prevent unauthorized access, content scraping, and multi-user credential sharing. If automated scripts, scrapers, or multiple geographical logins on a single account are detected, the system records forensic telemetry to protect proprietary study materials.
          </p>
        </section>

        {/* Section 5: Billing & No-Refund Transaction Records */}
        <section id="billing" className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground text-xs font-mono font-bold">5</span>
            Payment Records & Non-Refundable Transactions
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            When you purchase subscription plans or mock exam packages via Fonepay, eSewa, Khalti, or manual bank QR, we record transaction reference IDs, date, plan type, and payment status for accounting and tax compliance. In accordance with our{' '}
            <Link to="/terms" className="text-primary font-semibold hover:underline">
              Terms & Conditions
            </Link>
            , all digital purchases are final and non-refundable. Billing records are preserved for audit purposes.
          </p>
        </section>

        {/* Section 6: Data Retention & User Rights */}
        <section id="rights" className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground text-xs font-mono font-bold">6</span>
            Data Retention & Your Rights
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            You maintain control over your personal information:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-muted-foreground">
            <li>
              <strong>Profile Updates:</strong> You may update your display name and email address at any time through your Profile settings.
            </li>
            <li>
              <strong>Account Deletion:</strong> You may request complete deletion of your account and associated practice history by submitting a request to privacy@prepyo.com.
            </li>
            <li>
              <strong>Data Retention:</strong> Active account data is retained as long as your account remains open to preserve your practice trends and diagnostic records.
            </li>
          </ul>
        </section>

        {/* Section 7: Contact Us */}
        <section id="contact" className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground text-xs font-mono font-bold">7</span>
            Contact Our Data Protection Team
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            If you have questions about this Privacy Policy or how your data is managed, please contact:
          </p>
          <div className="p-4 rounded-xl bg-card border border-border text-sm space-y-1">
            <p className="font-semibold text-foreground">Prepyo Privacy Officer</p>
            <p className="text-muted-foreground">Kathmandu, Nepal</p>
            <p className="text-muted-foreground">Email: privacy@prepyo.com</p>
          </div>
        </section>
      </main>

      {/* Footer Navigation CTA */}
      <footer className="border-t border-border/70 bg-card/50 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-sm font-bold text-foreground">Have questions about our terms?</p>
            <p className="text-xs text-muted-foreground">
              Review our{' '}
              <Link to="/terms" className="text-primary hover:underline font-semibold">
                Terms of Service
              </Link>{' '}
              or return to sign in.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl font-semibold"
            >
              <Link to="/terms">Terms of Service</Link>
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
