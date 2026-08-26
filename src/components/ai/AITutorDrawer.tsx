'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Bot, Send, X, Sparkles, RefreshCw, Zap, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, ApiError, errorMessage } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AITutorDrawer() {
  const { isTutorOpen, setIsTutorOpen, activeExam, tutorContextPrompt } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Namaste! 🙏 I am your **Prepyo AI Coach** for **${activeExam} Academic**.\n\nAsk me for 79+ / Band 8.0 scoring templates, essay breakdowns, grammar rules, or advice on your weak areas!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isTutorOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [messages, isTutorOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTutorOpen) {
        setIsTutorOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTutorOpen, setIsTutorOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // The exam comes from the signed-in account server-side, so it is not
      // sent here — the endpoint rejects unknown fields.
      const data = await api.post<{ reply: string }>('/ai/tutor', {
        messages: newMessages,
        taskContext: tutorContextPrompt,
      });
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const message =
        err instanceof ApiError && err.isAIUnavailable
          ? 'The AI coach is unavailable right now, so I cannot answer this one. Please try again in a few minutes.'
          : errorMessage(err, 'I could not reach the AI coach. Please try again.');
      setMessages([...newMessages, { role: 'assistant', content: message }]);
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
    <div
      className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${
        isTutorOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
      }`}
      aria-hidden={!isTutorOpen}
    >
      {/* Dim Backdrop with Fade Animation */}
      <div
        onClick={() => setIsTutorOpen(false)}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          isTutorOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Slide-in Drawer Container */}
      <div
        className={`fixed inset-y-0 right-0 max-w-lg w-full bg-card/95 backdrop-blur-2xl border-l border-border shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-out ${
          isTutorOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 blur-3xl rounded-full pointer-events-none -z-10" />

        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/80 bg-card/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary via-indigo-600 to-emerald-500 text-white shadow-lg shadow-primary/25">
              <Bot className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-card" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-sm text-foreground">Prepyo AI Coach</h3>
                <Badge variant="indigo" className="text-[9px] px-1.5 py-0 font-bold uppercase">
                  {activeExam} Engine
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">24/7 Contextual exam tutor & scoring mentor</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsTutorOpen(false)}
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            title="Close Coach (Esc)"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2.5 bg-muted/40 border-b border-border/80 flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q)}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground bg-card hover:bg-primary/10 border border-border hover:border-primary/40 px-3 py-1 rounded-full whitespace-nowrap transition-all duration-200 shrink-0 hover:scale-[1.02] active:scale-[0.98]"
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
              className={`flex flex-col animate-in fade-in-50 slide-in-from-bottom-2 duration-300 ${
                m.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {m.role === 'assistant' ? (
                  <>
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[11px] font-bold text-primary">Prepyo AI Coach</span>
                  </>
                ) : (
                  <span className="text-[11px] font-bold text-muted-foreground">You</span>
                )}
              </div>

              <div
                className={`p-3.5 rounded-2xl max-w-[90%] text-xs leading-relaxed shadow-sm transition-all ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none font-medium'
                    : 'bg-background/90 border border-border text-foreground rounded-tl-none prose prose-invert'
                }`}
              >
                <div className="whitespace-pre-line">{m.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2.5 text-xs text-primary bg-background/90 p-3 rounded-2xl border border-border w-fit animate-pulse shadow-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-primary shrink-0" />
              <span>Analyzing rubric & formulating response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-3 border-t border-border/80 bg-card/90 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask anything about ${activeExam} scoring, templates, or strategy...`}
              className="flex-1 bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              size="icon"
              className="h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 shrink-0 transition-transform active:scale-95"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
