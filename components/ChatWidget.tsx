'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { MessageCircle, Sparkles, X, Send, Maximize2, Minimize2, Bot, Zap } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

const QUICK_SUGGESTIONS = [
  'Cara buat laporan',
  'Status laporan saya',
  'Apa fungsi blockchain di sini?',
  'Tips membuat laporan yang jelas',
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Halo! 👋 Saya Asisten LaporIn yang siap membantu Anda. Ada yang bisa dibantu hari ini? 😊' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(380); // Slightly wider default
  const [height, setHeight] = useState(500); // Taller default
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeStartRef.current) return;
      const deltaX = e.clientX - resizeStartRef.current.x;
      const deltaY = e.clientY - resizeStartRef.current.y;
      const newWidth = Math.max(320, Math.min(900, resizeStartRef.current.w + deltaX));
      const newHeight = Math.max(350, Math.min(window.innerHeight - 100, resizeStartRef.current.h - deltaY));
      setWidth(newWidth);
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'nwse-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    if (widgetRef.current) {
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: width,
        h: height,
      };
    }
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      setWidth(380);
      setHeight(500);
    } else {
      setWidth(Math.min(900, window.innerWidth - 40));
      setHeight(window.innerHeight - 100);
    }
    setIsMaximized(!isMaximized);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const next: Msg[] = [...messages, { role: 'user' as const, content: input }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post('/chat', { messages: next });
      setMessages([...next, { role: 'assistant' as const, content: data.reply }]);
      
      // Jika report berhasil dibuat otomatis
      if (data.reportCreated && data.reportId) {
        // Broadcast event agar daftar laporan refresh otomatis
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('report-created', { detail: { reportId: data.reportId } })
          );
          // Scroll ke top dan refresh
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        console.log('✅ Report auto-created:', data.reportId);
      }
      
      // Jika ada reportData tapi belum auto-create (fallback manual)
      if (data.reportData && !data.reportCreated && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('chat-report-data', { detail: data.reportData })
        );
      }
    } catch {
      setMessages([
        ...next,
        { role: 'assistant' as const, content: 'Maaf, terjadi kendala. Silakan coba lagi nanti.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div
          ref={widgetRef}
          className="bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col overflow-hidden animate-fade-in relative"
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          {/* Header dengan gradient yang lebih menarik */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 shadow-sm">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Asisten LaporIn
                </div>
                <div className="text-xs text-blue-100 mt-0.5">AI Assistant powered by Groq</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                aria-label={isMaximized ? 'Kecilkan' : 'Besarkan'}
                onClick={toggleMaximize}
                className="hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                aria-label="Tutup chat"
                onClick={() => setOpen(false)}
                className="hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages area dengan background yang lebih menarik */}
          <div className="flex-1 p-4 space-y-3 overflow-auto bg-gradient-to-b from-gray-50 to-white">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {m.role === 'assistant' && (
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-1.5 shadow-sm mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-tr-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  </div>
                  {m.role === 'user' && (
                    <div className="bg-gray-200 rounded-full p-1.5 mt-0.5">
                      <div className="h-3.5 w-3.5 rounded-full bg-blue-600"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 px-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>Asisten sedang mengetik...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick suggestions dengan design yang lebih menarik */}
          {messages.length <= 2 && (
            <div className="px-4 py-3 border-t bg-white border-gray-100">
              <div className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Coba pertanyaan ini:
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                      setTimeout(() => send(), 50);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all font-medium"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area dengan design yang lebih modern */}
          <div className="p-3 border-t bg-white border-gray-100">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => (e.key === 'Enter' && !e.shiftKey ? send() : undefined)}
                placeholder="Tulis pertanyaan Anda di sini..."
                disabled={loading}
                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                aria-label="Ketik pesan"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl px-5 py-2.5 text-sm font-medium flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Kirim"
              >
                <Send className="h-4 w-4" />
                Kirim
              </button>
            </div>
            
            {/* Powered by Groq badge */}
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-indigo-500" />
                <span>Powered by</span>
              </div>
              <a
                href="https://groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Groq AI
              </a>
            </div>
          </div>

          {/* Resize handle dengan design yang lebih jelas */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize bg-transparent hover:bg-blue-100/50 rounded-tl-lg transition-colors"
            style={{
              background: 'linear-gradient(135deg, transparent 0%, transparent 45%, rgba(59,130,246,0.4) 45%, rgba(59,130,246,0.4) 100%)',
            }}
            aria-label="Resize chat window"
          />
        </div>
      )}
      
      {/* Floating button dengan design yang lebih menarik */}
      <button
        onClick={() => setOpen(!open)}
        className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full px-5 py-3 shadow-lg hover:shadow-xl flex items-center gap-2 transition-all ${
          open ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-expanded={open}
        aria-controls="chat-widget"
      >
        <div className="relative">
          <MessageCircle className="h-5 w-5" />
          {!open && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          )}
        </div>
        <span className="font-medium">Chat Asisten</span>
      </button>
    </div>
  );
}
