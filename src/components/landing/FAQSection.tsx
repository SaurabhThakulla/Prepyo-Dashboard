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
    <section id="faq" className="py-24 sm:py-32 border-t border-border">
      <div className="text-center space-y-4 mb-16 max-w-3xl mx-auto px-4">
        <span className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-5 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground shadow-xs">
          <HelpCircle className="w-4 h-4 text-primary" />
          Got Questions?
        </span>

        <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tight">
          Frequently asked questions
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Everything you need to know about the Prepyo AI platform, scoring accuracy, and local Nepal payment options.
        </p>
      </div>

      <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-4 px-4 sm:px-6">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl sm:rounded-3xl border transition-all duration-300 overflow-hidden ${
                isOpen
                  ? 'border-primary/50 bg-card shadow-xl shadow-primary/5 ring-1 ring-primary/20'
                  : 'border-border bg-card/70 hover:bg-card hover:border-border/80 hover:shadow-md'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full p-6 sm:p-7 text-left flex items-center justify-between gap-6 cursor-pointer"
                aria-expanded={isOpen}
              >
                <span className="font-display text-base sm:text-lg lg:text-xl font-bold text-foreground leading-snug">
                  {faq.question}
                </span>
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
                    isOpen
                      ? 'bg-primary text-white border-primary rotate-180 shadow-md shadow-primary/30'
                      : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  <ChevronDown className="w-5 h-5" />
                </div>
              </button>

              {isOpen && (
                <div className="px-6 sm:px-7 pb-7 pt-2 text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed border-t border-border/40 animate-in fade-in slide-in-from-top-1 duration-200">
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
