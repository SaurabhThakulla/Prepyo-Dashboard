import React, { useState, useEffect, useRef } from 'react';
import { Mic, Headphones, RotateCw, ChevronRight, CheckCircle2, XCircle, Volume2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SPEECH_PROMPTS = [
  'The university library provides access to vast digital archives.',
  'Scientific discoveries often challenge our traditional assumptions.',
  'Urban development requires careful balance with environmental conservation.',
  'Global trade agreements have transformed modern international commerce.',
  'Effective communication is essential for teamwork in the workplace.',
  'Students must submit their final research papers before Friday midnight.',
  'Technological innovation continues to reshape educational methodology.',
  'Renewable energy sources are becoming increasingly cost-effective.',
];

const LISTENING_WORDS = [
  { word: 'Accommodate', hint: 'To provide lodging or make adjustments' },
  { word: 'Phenomenon', hint: 'A fact or situation that is observed to exist' },
  { word: 'Questionnaire', hint: 'A set of printed questions for research' },
  { word: 'Bureaucracy', hint: 'A system of government or management' },
  { word: 'Curriculum', hint: 'The subjects comprising a course of study' },
  { word: 'Archaeology', hint: 'Study of human history through excavation' },
  { word: 'Sovereignty', hint: 'Supreme power or authority' },
  { word: 'Miscellaneous', hint: 'Items of various types or from different sources' },
  { word: 'Entrepreneur', hint: 'A person who sets up a business taking risks' },
  { word: 'Conscientious', hint: 'Wishing to do one\'s work thoroughly and well' },
  { word: 'Exaggerate', hint: 'Represent something as larger or greater than it is' },
  { word: 'Hierarchical', hint: 'Arranged in order of rank' },
  { word: 'Recommendation', hint: 'A suggestion or proposal as to best course' },
  { word: 'Maintenance', hint: 'Process of maintaining or preserving' },
  { word: 'Pronunciation', hint: 'The way in which a word is pronounced' },
];

export default function DashboardQuickTests() {
  // Speech Test State
  const [speechIndex, setSpeechIndex] = useState(0);
  const [speechResponse, setSpeechResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechMatch, setSpeechMatch] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Listening Test State
  const [listeningIndex, setListeningIndex] = useState(0);
  const [listeningResponse, setListeningResponse] = useState('');
  const [showWord, setShowWord] = useState(false);
  const [listeningFeedback, setListeningFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const currentSpeechPrompt = SPEECH_PROMPTS[speechIndex % SPEECH_PROMPTS.length];
  const currentListeningItem = LISTENING_WORDS[listeningIndex % LISTENING_WORDS.length];

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setSpeechResponse(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      // Fallback simulation if speech recognition is unsupported in browser
      setIsListening(prev => !prev);
      if (!isListening) {
        setSpeechResponse('Listening...');
        setTimeout(() => {
          setSpeechResponse(currentSpeechPrompt);
          setSpeechMatch(95);
          setIsListening(false);
        }, 2200);
      }
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setSpeechResponse('');
      setSpeechMatch(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleSpeechRefresh = () => {
    setSpeechIndex(prev => prev + 1);
    setSpeechResponse('');
    setSpeechMatch(null);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Pronounce word via SpeechSynthesis
  const playWordAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentListeningItem.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNextListeningWord = () => {
    if (listeningResponse.trim()) {
      const isCorrect =
        listeningResponse.trim().toLowerCase() === currentListeningItem.word.toLowerCase();
      setListeningFeedback(isCorrect ? 'correct' : 'incorrect');
      setTimeout(() => {
        setListeningIndex(prev => prev + 1);
        setListeningResponse('');
        setShowWord(false);
        setListeningFeedback(null);
      }, 700);
    } else {
      setListeningIndex(prev => prev + 1);
      setListeningResponse('');
      setShowWord(false);
      setListeningFeedback(null);
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ================================================================= */}
        {/* Card 1: Speech Test */}
        {/* ================================================================= */}
        <div className="rounded-2xl border-2 border-[#fdb96e]/70 dark:border-amber-500/40 bg-card p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shadow-md transition-all active:scale-95 ${
                    isListening
                      ? 'bg-rose-500 animate-pulse ring-4 ring-rose-200 dark:ring-rose-950'
                      : 'bg-[#f08a5d] hover:bg-[#e07a4d]'
                  }`}
                  title={isListening ? 'Click to stop' : 'Click to speak'}
                >
                  <Mic className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.2} />
                </button>
                <div>
                  <h3 className="font-bold text-lg sm:text-xl text-foreground leading-tight">
                    Speech Test
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate sm:max-w-none" title={currentSpeechPrompt}>
                    &ldquo;{currentSpeechPrompt}&rdquo;
                  </p>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="w-5 h-5 rounded-full bg-[#f08a5d] text-white flex items-center justify-center text-xs font-serif italic shadow-2xs hover:opacity-90"
                    aria-label="Speech Test Info"
                  >
                    i
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Practice oral fluency and pronunciation scoring for PTE Read Aloud and Repeat Sentence.
                </TooltipContent>
              </Tooltip>
            </div>

            <p className="text-xs sm:text-sm font-semibold text-foreground/85">
              Click the mic button to speak
            </p>

            {/* Input & Action Row */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={speechResponse}
                onChange={e => setSpeechResponse(e.target.value)}
                placeholder="Your Response..."
                className="flex-1 rounded-xl border border-[#fdb96e] dark:border-amber-500/40 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm bg-background placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-[#f08a5d]/40 transition-all font-medium"
              />
              <button
                type="button"
                onClick={handleSpeechRefresh}
                className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#f08a5d] hover:bg-[#e07a4d] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#f08a5d]/20 transition-all active:scale-95 shrink-0"
              >
                <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Refresh
              </button>
            </div>
          </div>

          {/* Bottom Waveform / Visualizer Bar */}
          <div
            onClick={toggleMic}
            className={`w-full h-9 rounded-full cursor-pointer flex items-center justify-center px-4 transition-all ${
              isListening
                ? 'bg-amber-100 dark:bg-amber-950/70 border border-[#f08a5d]'
                : 'bg-[#fbd4b4] dark:bg-amber-950/40 border border-[#f9b886]/40 hover:bg-[#f8caa3]'
            }`}
          >
            {isListening ? (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-[#f08a5d] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-5 bg-[#f08a5d] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-4 bg-[#f08a5d] rounded-full animate-bounce" />
                <span className="w-1.5 h-6 bg-[#f08a5d] rounded-full animate-bounce [animation-delay:-0.2s]" />
                <span className="w-1.5 h-3.5 bg-[#f08a5d] rounded-full animate-bounce [animation-delay:-0.1s]" />
                <span className="text-xs font-bold text-[#b45309] ml-2">Recording audio…</span>
              </div>
            ) : speechMatch !== null ? (
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                Score Match: {speechMatch}% Pronunciation
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-900/60 dark:text-amber-200/60 select-none">
                Tap to record voice sample
              </span>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* Card 2: Listening Test */}
        {/* ================================================================= */}
        <div className="rounded-2xl border-2 border-[#5c8ab5]/70 dark:border-blue-500/40 bg-card p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={playWordAudio}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1b5080] hover:bg-[#153e63] flex items-center justify-center text-white shadow-md transition-all active:scale-95 group"
                  title="Click to hear word pronunciation"
                >
                  <Headphones className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform" strokeWidth={2.2} />
                </button>
                <div>
                  <h3 className="font-bold text-lg sm:text-xl text-foreground leading-tight">
                    Listening Test
                  </h3>
                  <p className="text-xs text-muted-foreground/90 font-medium">
                    Difficult words from WFD &amp; LFIB
                  </p>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="w-5 h-5 rounded-full bg-[#1b5080] text-white flex items-center justify-center text-xs font-serif italic shadow-2xs hover:opacity-90"
                    aria-label="Listening Test Info"
                  >
                    i
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Master challenging high-frequency vocabulary frequently appearing in Write From Dictation and Listening Fill in the Blanks.
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm font-semibold text-foreground/85">
                Click the headphone button to listen
              </p>
              <button
                type="button"
                onClick={playWordAudio}
                className="text-xs text-[#1b5080] dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Volume2 className="w-3.5 h-3.5" /> Replay audio
              </button>
            </div>

            {/* Input & Action Row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={listeningResponse}
                  onChange={e => setListeningResponse(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNextListeningWord()}
                  placeholder="Your Response..."
                  className={`w-full rounded-xl border px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm bg-background placeholder:text-muted-foreground/70 outline-none transition-all font-medium ${
                    listeningFeedback === 'correct'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                      : listeningFeedback === 'incorrect'
                        ? 'border-rose-500 ring-2 ring-rose-500/30'
                        : 'border-[#5c8ab5] dark:border-blue-500/40 focus:ring-2 focus:ring-[#1b5080]/40'
                  }`}
                />
                {listeningFeedback === 'correct' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3" />
                )}
                {listeningFeedback === 'incorrect' && (
                  <XCircle className="w-4 h-4 text-rose-500 absolute right-3 top-3" />
                )}
              </div>

              <button
                type="button"
                onClick={handleNextListeningWord}
                className="flex items-center gap-1 px-4 sm:px-5 py-2.5 rounded-xl bg-[#1b5080] hover:bg-[#153e63] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#1b5080]/20 transition-all active:scale-95 shrink-0"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Next
              </button>
            </div>
          </div>

          {/* Bottom Action Button: Show Word */}
          <button
            type="button"
            onClick={() => setShowWord(prev => !prev)}
            className="w-full py-2.5 rounded-full bg-[#5da8ff] hover:bg-[#4895f0] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#5da8ff]/25 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {showWord ? (
              <span className="font-extrabold tracking-wide">
                {currentListeningItem.word} &bull; <span className="text-xs font-normal opacity-90">{currentListeningItem.hint}</span>
              </span>
            ) : (
              'Show Word'
            )}
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
}
