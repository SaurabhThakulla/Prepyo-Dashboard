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

      <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-card border-l border-border shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-emerald-600 text-white shadow-lg shadow-primary/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-sm text-foreground">Prepyo AI Tutor</h3>
                <span className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/30 px-1.5 py-0.5 rounded">
                  {activeExam} Engine
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Contextual exam coach & instant feedback</p>
            </div>
          </div>
          <button
            onClick={() => setIsTutorOpen(false)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex gap-1.5 overflow-x-auto no-scrollbar">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground bg-card hover:bg-primary/10 border border-border hover:border-primary/40 px-2.5 py-1 rounded-full whitespace-nowrap transition-all shrink-0"
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
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-semibold text-primary">Prepyo AI Coach</span>
                  </>
                ) : (
                  <span className="text-[11px] font-semibold text-muted-foreground">You</span>
                )}
              </div>
              <div
                className={`p-3.5 rounded-2xl max-w-[90%] text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-background border border-border text-foreground rounded-tl-none prose-invert'
                }`}
              >
                <div className="whitespace-pre-line">{m.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-primary bg-background p-3 rounded-2xl border border-border w-fit">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              <span>Thinking & formulating guidance...</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="p-3 border-t border-border bg-card">
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
              className="flex-1 bg-background border border-border focus:border-primary rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground p-2.5 rounded-xl transition-all shadow-md shadow-primary/30 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
