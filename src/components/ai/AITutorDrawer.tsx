'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Bot, Send, X, Sparkles, BookOpen, Lightbulb, RefreshCw } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AITutorDrawer() {
  const { isTutorOpen, setIsTutorOpen, activeExam, tutorContextPrompt } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Namaste! 🙏 I am your **Prepyo AI Coach** for **${activeExam} Academic**. Ask me for 79+ / Band 8.0 templates, essay breakdowns, grammar rules, or advice on your weak areas!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isTutorOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          contextPrompt: tutorContextPrompt,
          exam: activeExam,
        }),
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: 'Prepyo AI Coach encountered a temporary glitch. Please try asking again!' },
        ]);
      }
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Connection issue. Please check your internet connection.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = activeExam === 'PTE' ? [
    'Give me the 90/90 Describe Image template',
    'How to score 79+ in Read Aloud oral fluency?',
    'Summarize Written Text rules & 1-sentence tips',
    'Write from Dictation spelling list',
  ] : [
    'IELTS Writing Task 2 Band 8.0 Essay structure',
    'Speaking Part 2 Cue Card preparation strategy',
    'Difference between FALSE and NOT GIVEN in Reading',
    'Listening Section 3 Academic Discussion tips',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsTutorOpen(false)} />

      <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-surface-900 border-l border-white/10 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-surface-950/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-purple-600 text-white shadow-lg shadow-brand-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-sm text-white">Prepyo AI Tutor</h3>
                <span className="text-[10px] font-extrabold uppercase bg-brand-500/20 text-brand-300 border border-brand-500/40 px-1.5 py-0.5 rounded">
                  {activeExam} Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">Contextual exam coach & instant feedback</p>
            </div>
          </div>
          <button
            onClick={() => setIsTutorOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2.5 bg-surface-950/40 border-b border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-[11px] font-medium text-slate-300 hover:text-white bg-surface-900 hover:bg-brand-600/30 border border-white/10 hover:border-brand-500/50 px-2.5 py-1 rounded-full whitespace-nowrap transition-all shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {m.role === 'assistant' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                    <span className="text-[11px] font-semibold text-brand-300">Prepyo AI Coach</span>
                  </>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">You</span>
                )}
              </div>
              <div
                className={`p-3.5 rounded-2xl max-w-[90%] text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-none'
                    : 'bg-surface-950 border border-white/10 text-slate-200 rounded-tl-none prose-invert'
                }`}
              >
                <div className="whitespace-pre-line">{m.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-brand-400 bg-surface-950 p-3 rounded-2xl border border-white/10 w-fit">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
              <span>Thinking & formulating guidance...</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="p-3 border-t border-white/10 bg-surface-950">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask anything about ${activeExam} scoring, tasks, or strategy...`}
              className="flex-1 bg-surface-900 border border-white/10 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all shadow-md shadow-brand-600/30 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
