import React from 'react';
import Hero from '@/components/landing/Hero';
import ExamsSection from '@/components/landing/ExamsSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import PricingSection from '@/components/landing/PricingSection';
import StatsBand from '@/components/landing/StatsBand';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import TrustBadges from '@/components/landing/TrustBadges';
import InstitutionsSection from '@/components/landing/InstitutionsSection';
import FAQSection from '@/components/landing/FAQSection';
import FinalCTA from '@/components/landing/FinalCTA';

/**
 * The public landing page for Prepyo.
 *
 * Top navigation links smoothly scroll directly to each respective section
 * on this page (#products, #features, #how-it-works, #pricing, #testimonials, #institutions, #faq).
 */
export default function HomePage() {
  return (
    <div className="w-full space-y-4">
      <Hero />
      <ExamsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsBand />
      <PricingSection />
      <TestimonialsSection />
      <TrustBadges />
      <InstitutionsSection />
      <FAQSection />
      <FinalCTA />
      <div className="pb-8" />
    </div>
  );
}
