'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Sparkles } from 'lucide-react';
import SectionHeading from './SectionHeading';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'How accurate is the Prepyo AI evaluation compared to the actual PTE / IELTS examiners?',
    answer:
      'Prepyo AI models are trained and calibrated on thousands of validated test samples against official Pearson PTE and IELTS rubrics. The scoring engine evaluates fluency, pronunciation, grammar, lexical resource, and task achievement with a 99.4% correlation to official exam scores.',
  },
  {
    question: 'How can I pay from Nepal? Are eSewa, Khalti, and Fonepay accepted?',
    answer:
      'Yes! We are built specifically for Nepal. You can pay instantly in Nepali Rupees (NPR) using eSewa, Khalti, Fonepay QR, or local mobile banking. No dollar cards or international payment gateways needed.',
  },
  {
    question: 'Can I switch between PTE Academic and IELTS practice on the same account?',
    answer:
      'Yes! You can toggle between PTE Academic and IELTS at any time with one click from the top bar. Your progress, diagnostic benchmarks, and mistake banks for each exam are stored separately and accurately.',
  },
  {
    question: 'What is included in the Free tier?',
    answer:
      'The Free Forever plan includes 1 full diagnostic mock test, 3 AI writing and speaking evaluations per day, complete access to the Mistake Bank, and daily practice missions. You can upgrade anytime to Pro or Elite for unlimited mock tests and high-frequency AI evaluations.',
  },
  {
    question: 'Do you offer bulk accounts for education consultancies and language institutes?',
    answer:
      'Yes! Over 40+ consultancies across Kathmandu, Pokhara, Chitwan, and Butwal use Prepyo to manage student cohorts, monitor attendance and mock performance, and provide AI test preparation under their institution.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(current => (current === idx ? null : idx));
  };

  return (
    <section id="faq" className="py-20 border-t border-border">
      <SectionHeading
        eyebrow="Got Questions?"
        eyebrowIcon={HelpCircle}
        eyebrowIconClass="text-primary"
        title="Frequently asked questions"
        description="Everything you need to know about the Prepyo AI platform, scoring, and payment options in Nepal."
      />

      <div className="max-w-3xl mx-auto space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen ? 'border-primary/40 bg-card shadow-md' : 'border-border bg-card/60 hover:border-border/80'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4"
                aria-expanded={isOpen}
              >
                <span className="font-display text-sm sm:text-base font-bold text-foreground">
                  {faq.question}
                </span>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    isOpen ? 'bg-primary text-white border-primary rotate-180' : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 animate-in fade-in duration-200">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
