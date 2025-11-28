'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { MessageCircle, Sparkles, X, Send, Maximize2, Minimize2, Bot, Zap, CheckCircle2, XCircle, Image as ImageIcon, Paperclip, Edit2, Save, MapPin, Tag, AlertTriangle, FileImage, Clock3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from './Toast';

type Msg = { role: 'user' | 'assistant'; content: string; reportData?: any; awaitingConfirmation?: boolean; imageUrl?: string; timestamp?: string };

const createMessage = (msg: Omit<Msg, 'timestamp'> & { timestamp?: string }): Msg => ({
  ...msg,
  timestamp: msg.timestamp ?? new Date().toISOString(),
});

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDateHeader = (date: Date) =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

const formatTimestampLabel = (date: Date) => {
  const datePart = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return `${datePart} • ${timePart} WIB`;
};

const QUICK_SUGGESTIONS = [
  'Cara buat laporan',
  'Status laporan saya',
  'Apa fungsi blockchain di sini?',
  'Tips membuat laporan yang jelas',
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    createMessage({
      role: 'assistant',
      content: 'Halo! 👋 Saya Asisten LaporIn yang siap membantu Anda. Ada yang bisa dibantu hari ini? 😊',
    }),
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(380); // Slightly wider default
  const [height, setHeight] = useState(500); // Taller default
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<any>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editedDraft, setEditedDraft] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mounted, setMounted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const { toasts, success, error: showError, removeToast } = useToast();

  // Fix hydration mismatch: hanya render setelah client mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      const handleResize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Debug: Log pendingDraft changes
  useEffect(() => {
    if (pendingDraft) {
      console.log('🔍 [ChatWidget] pendingDraft updated:', {
        hasTitle: !!pendingDraft.title,
        hasLocation: !!pendingDraft.location,
        hasDescription: !!pendingDraft.description,
        hasImage: !!pendingDraft.imageUrl,
        isEditing: isEditingDraft,
        loading: loading
      });
    } else {
      console.log('🔍 [ChatWidget] pendingDraft cleared');
    }
  }, [pendingDraft, isEditingDraft, loading]);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran gambar maksimal 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const send = async () => {
    if ((!input.trim() && !imageFile) || loading) return;
    
    // Convert image to base64 if exists
    let imageBase64 = null;
    if (imageFile) {
      const reader = new FileReader();
      imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
    }
    
    const userMsg = createMessage({ 
      role: 'user' as const, 
      content: input || (imageFile ? '[Gambar terlampir]' : ''),
      imageUrl: imageBase64 || undefined
    });
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setInput('');
    removeImage();
    setLoading(true);
    try {
      const { data } = await api.post('/chat', { 
        messages: next.map(m => ({
          role: m.role,
          content: m.content,
          imageUrl: m.imageUrl
        }))
      });
      const assistantMsg = createMessage({ 
        role: 'assistant' as const, 
        content: data.reply,
        reportData: data.reportData,
        awaitingConfirmation: data.awaitingConfirmation || data.previewMode
      });
      setMessages([...next, assistantMsg]);
      
      // SELALU set pendingDraft jika ada reportData (untuk CTA button)
      // User HARUS konfirmasi via button sebelum laporan dikirim
      console.log('🔍 [ChatWidget] Response data:', {
        hasReportData: !!data.reportData,
        reportCreated: data.reportCreated,
        awaitingConfirmation: data.awaitingConfirmation,
        previewMode: data.previewMode,
        reportDataKeys: data.reportData ? Object.keys(data.reportData) : []
      });
      
      // PRIORITAS: Jika report sudah dibuat (auto-send) tanpa awaitingConfirmation, clear draft dan show success
      if (data.reportCreated && data.reportId && !data.awaitingConfirmation && !data.previewMode) {
        setPendingDraft(null);
        success('Laporan berhasil dibuat via chatbot!');
        // Broadcast event agar daftar laporan refresh otomatis
        if (mounted) {
          window.dispatchEvent(
            new CustomEvent('report-created', { 
              detail: { 
                reportId: data.reportId,
                blockchainTxHash: data.blockchainTxHash 
              } 
            })
          );
          // Scroll ke top dan refresh
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        console.log('✅ [ChatWidget] Report auto-created:', data.reportId);
        if (data.blockchainTxHash) {
          console.log('🔐 [ChatWidget] Blockchain hash:', data.blockchainTxHash);
        }
      }
      // SELALU set pendingDraft jika ada reportData (untuk CTA button)
      else if (data.reportData) {
        // Pastikan reportData memiliki minimal data yang diperlukan
        const draftData = {
          ...data.reportData,
          // Pastikan ada minimal title atau description
          title: data.reportData.title || data.reportData.judul || 'Laporan Baru',
          description: data.reportData.description || data.reportData.deskripsi || '',
          location: data.reportData.location || data.reportData.lokasi || '',
          category: data.reportData.category || data.reportData.kategori || '',
          urgency: data.reportData.urgency || data.reportData.urgensi || '',
          imageUrl: data.reportData.imageUrl || data.reportData.image_url || null
        };
        
        setPendingDraft(draftData);
        console.log('✅ [ChatWidget] Draft SET untuk CTA button:', {
          title: draftData.title,
          location: draftData.location,
          hasImage: !!draftData.imageUrl,
          awaitingConfirmation: data.awaitingConfirmation,
          previewMode: data.previewMode,
          reportCreated: data.reportCreated
        });
        // Auto-scroll ke draft preview setelah 300ms
        setTimeout(() => {
          endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 300);
      } else {
        // Jika tidak ada reportData, clear draft
        setPendingDraft(null);
        console.log('❌ [ChatWidget] Tidak ada reportData, draft cleared');
      }
      
      // Jika ada reportData tapi belum auto-create (fallback manual)
      if (data.reportData && !data.reportCreated && !data.awaitingConfirmation && mounted) {
        window.dispatchEvent(
          new CustomEvent('chat-report-data', { detail: data.reportData })
        );
      }
    } catch (err: any) {
      const errorMsg = 'Gagal membuat laporan. Silakan coba lagi.';
      setMessages([
        ...next,
        createMessage({ role: 'assistant' as const, content: 'Maaf, terjadi kendala. Silakan coba lagi nanti.' }),
      ]);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDraft = async () => {
    if (!pendingDraft || loading) return;
    setLoading(true);
    try {
      // Kirim langsung ke endpoint reports dengan data draft
      const { data } = await api.post('/reports', {
        title: pendingDraft.title,
        description: pendingDraft.description,
        location: pendingDraft.location,
        category: pendingDraft.category,
        urgency: pendingDraft.urgency,
        imageUrl: pendingDraft.imageUrl
      });
      
      // Tambahkan pesan konfirmasi ke chat
      const next: Msg[] = [...messages, createMessage({ role: 'user' as const, content: 'kirim laporan' })];
      setMessages([...next, createMessage({ 
        role: 'assistant' as const, 
        content: `✅ Laporan Anda telah berhasil dikirim!\n\n**Judul:** ${pendingDraft.title}\n**Lokasi:** ${pendingDraft.location}\n**Status:** ${data.status || 'pending'}\n\nLaporan Anda sedang diproses oleh admin.`
      })]);
      
      setPendingDraft(null);
      setIsEditingDraft(false);
      setEditedDraft(null);
      
      if (data.id) {
        success('Laporan berhasil dibuat via chatbot!');
        if (mounted) {
          window.dispatchEvent(
            new CustomEvent('report-created', { 
              detail: { 
                reportId: data.id,
                blockchainTxHash: data.blockchain_tx_hash || data.blockchainTxHash 
              } 
            })
          );
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        console.log('✅ Report created via button:', data.id);
        if (data.blockchain_tx_hash || data.blockchainTxHash) {
          console.log('🔐 Blockchain hash:', data.blockchain_tx_hash || data.blockchainTxHash);
        }
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || 'Gagal membuat laporan. Silakan coba lagi.';
      setMessages([
        ...messages,
        createMessage({ role: 'assistant' as const, content: `❌ Maaf, terjadi kendala saat mengirim laporan: ${errorMsg}` }),
      ]);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDraft = async () => {
    if (loading) return;
    setPendingDraft(null);
    setIsEditingDraft(false);
    setEditedDraft(null);
    setLoading(true);
    try {
      const cancelMessage = 'batal';
      const next: Msg[] = [...messages, createMessage({ role: 'user' as const, content: cancelMessage })];
      setMessages(next);
      
      const { data } = await api.post('/chat', { messages: next });
      setMessages([...next, createMessage({ role: 'assistant' as const, content: data.reply })]);
    } catch {
      setMessages([
        ...messages,
        createMessage({ role: 'assistant' as const, content: 'Draft laporan dibatalkan.' }),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDraft = () => {
    setIsEditingDraft(true);
    setEditedDraft({ ...pendingDraft });
    // Auto-scroll ke input setelah 100ms
    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  const handleSaveEdit = () => {
    if (!editedDraft) return;
    setPendingDraft(editedDraft);
    setIsEditingDraft(false);
    setEditedDraft(null);
    success('Draft laporan berhasil diupdate!');
    // Auto-scroll ke preview setelah 100ms
    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  const handleCancelEdit = () => {
    setIsEditingDraft(false);
    setEditedDraft(null);
  };

  // Prevent hydration mismatch: jangan render widget sampai mounted
  if (!mounted) {
    return null;
  }

  // Responsive width/height untuk mobile
  const isMobile = mounted && windowSize.width > 0 && windowSize.width < 640;
  const widgetWidth = isMaximized ? '100%' : isMobile ? 'calc(100vw - 1rem)' : `${width}px`;
  const widgetHeight = isMaximized ? '100vh' : isMobile ? 'calc(100vh - 2rem)' : `${height}px`;
  const widgetMaxWidth = isMobile ? 'calc(100vw - 1rem)' : '900px';
  const widgetMaxHeight = isMobile ? 'calc(100vh - 2rem)' : '90vh';

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className={`fixed ${isMobile && open ? 'inset-0' : 'bottom-4 right-4'} z-50 ${isMobile && open ? 'w-full h-full' : 'w-full max-w-[calc(100vw-2rem)] sm:max-w-none sm:w-auto'}`}>
      {open && (
        <div
          ref={widgetRef}
          className={`bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-fade-in relative ${isMobile ? 'w-full h-full rounded-none' : 'rounded-2xl w-full sm:w-auto'}`}
          style={{ 
            width: isMobile ? '100%' : widgetWidth,
            height: isMobile ? '100%' : widgetHeight,
            maxWidth: isMobile ? '100%' : widgetMaxWidth,
            maxHeight: isMobile ? '100%' : widgetMaxHeight
          }}
        >
          {/* Header dengan gradient yang lebih menarik */}
          <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shadow-lg relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                animation: 'float 20s ease-in-out infinite'
              }}></div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 relative z-10 flex-1 min-w-0">
              <div className="bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-2.5 shadow-lg ring-2 ring-white/30 flex-shrink-0">
                <Bot className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm sm:text-lg flex items-center gap-1 sm:gap-2 truncate">
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 animate-spin-slow flex-shrink-0" />
                  <span className="truncate">Asisten LaporIn</span>
                </div>
                <div className="text-xs text-blue-100/90 mt-0.5 font-medium truncate">AI Assistant powered by Groq</div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 relative z-10 flex-shrink-0">
              <button
                aria-label={isMaximized ? 'Kecilkan' : 'Besarkan'}
                onClick={toggleMaximize}
                className="hover:bg-white/20 rounded-lg sm:rounded-xl p-1.5 sm:p-2 transition-all hover:scale-110 active:scale-95"
              >
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                aria-label="Tutup chat"
                onClick={() => setOpen(false)}
                className="hover:bg-white/20 rounded-lg sm:rounded-xl p-1.5 sm:p-2 transition-all hover:scale-110 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages area dengan background yang lebih menarik */}
          <div className="flex-1 p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-auto bg-gradient-to-b from-gray-50 via-white to-gray-50">
            {messages.map((m, i) => {
              const currentDate = m.timestamp ? new Date(m.timestamp) : undefined;
              const previousDate =
                i > 0 && messages[i - 1]?.timestamp ? new Date(messages[i - 1].timestamp as string) : undefined;
              const showDateSeparator = currentDate && (!previousDate || !isSameDay(currentDate, previousDate));
              const timestampLabel = currentDate ? formatTimestampLabel(currentDate) : null;
              const isUser = m.role === 'user';

              return (
                <div key={`${i}-${m.timestamp ?? 'msg'}`} className="space-y-2 animate-fade-in">
                  {showDateSeparator && currentDate && (
                    <div className="flex items-center gap-3 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gray-500 px-2">
                      <div className="flex-1 border-t border-gray-200" />
                      <span className="px-3 py-1 rounded-full bg-white shadow text-gray-600 font-semibold">
                        {formatDateHeader(currentDate)}
                      </span>
                      <div className="flex-1 border-t border-gray-200" />
                    </div>
                  )}
                  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      {m.role === 'assistant' && (
                        <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-full p-1.5 sm:p-2 shadow-lg ring-2 ring-blue-200/50 mt-0.5 flex-shrink-0">
                          <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                      )}
                      <div
                        className={`px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm shadow-md transition-all hover:shadow-lg break-words ${
                          isUser
                            ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white rounded-tr-sm'
                            : 'bg-white border-2 border-gray-100 text-gray-800 rounded-tl-sm shadow-sm hover:border-blue-200'
                        }`}
                      >
                        {m.role === 'assistant' ? (
                          <div className="markdown-content break-words">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1 ml-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1 ml-1">{children}</ol>,
                                li: ({ children }) => <li className="ml-1">{children}</li>,
                                code: ({ children, className }) => {
                                  const isInline = !className;
                                  return isInline ? (
                                    <code className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs font-mono font-semibold">{children}</code>
                                  ) : (
                                    <code className="block bg-gray-100 text-gray-800 p-2 rounded text-xs font-mono overflow-x-auto">{children}</code>
                                  );
                                },
                                h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0 text-gray-900">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0 text-gray-900">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0 text-gray-900">{children}</h3>,
                                blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 pl-3 my-2 italic text-gray-700">{children}</blockquote>,
                                hr: () => <hr className="my-3 border-gray-200" />,
                              }}
                            >
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {m.imageUrl && (
                              <div className="relative rounded-lg overflow-hidden border border-gray-300 max-w-xs">
                                <img
                                  src={m.imageUrl}
                                  alt="Attached"
                                  className="w-full h-auto max-h-48 object-contain bg-gray-50"
                                />
                              </div>
                            )}
                            {m.content && m.content !== '[Gambar terlampir]' && (
                              <div className="whitespace-pre-wrap break-words">{m.content}</div>
                            )}
                          </div>
                        )}
                        {timestampLabel && (
                          <div
                            className={`mt-2 flex items-center gap-1 text-[10px] sm:text-xs font-medium ${
                              isUser ? 'justify-end text-white/80' : 'justify-start text-gray-500'
                            }`}
                          >
                            <Clock3 className="w-3 h-3" />
                            <span>{timestampLabel}</span>
                          </div>
                        )}
                      </div>
                      {isUser && (
                        <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-full p-1.5 sm:p-2 shadow-md mt-0.5 flex-shrink-0 ring-2 ring-gray-100">
                          <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex items-center gap-3 text-sm text-gray-600 px-4 py-2 bg-white/50 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="font-medium">🤖 AI sedang menganalisis laporan Anda...</span>
              </div>
            )}
            
            {/* Form Edit Draft */}
            {isEditingDraft && editedDraft && (
              <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-2 border-blue-300 rounded-xl sm:rounded-2xl mx-2 sm:mx-4 mb-2 sm:mb-3 shadow-lg animate-fade-in">
                <div className="flex items-start gap-2 sm:gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-2 sm:p-2.5 shadow-lg ring-2 ring-blue-200/50 flex-shrink-0">
                    <Edit2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base flex items-center gap-1 sm:gap-2 flex-wrap">
                      <span className="truncate">✏️ Edit Draft Laporan</span>
                    </h4>
                    
                    <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border border-blue-200 space-y-3">
                      {/* Edit Title */}
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">📝 Judul:</label>
                        <input
                          type="text"
                          value={editedDraft.title || ''}
                          onChange={(e) => setEditedDraft({ ...editedDraft, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Masukkan judul laporan"
                        />
                      </div>

                      {/* Edit Description */}
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">📄 Deskripsi:</label>
                        <textarea
                          value={editedDraft.description || ''}
                          onChange={(e) => setEditedDraft({ ...editedDraft, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px] resize-y"
                          placeholder="Masukkan deskripsi laporan"
                        />
                      </div>

                      {/* Edit Location */}
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Lokasi:
                        </label>
                        <input
                          type="text"
                          value={editedDraft.location || ''}
                          onChange={(e) => setEditedDraft({ ...editedDraft, location: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Masukkan lokasi laporan"
                        />
                      </div>

                      {/* Category & Urgency (Read-only - ditentukan oleh AI) */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1 block flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            <span>Kategori:</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                          </label>
                          <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700 font-medium capitalize">
                            {editedDraft.category || 'Belum ditentukan'}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Ditentukan otomatis oleh AI</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1 block flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            <span>Urgensi:</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                          </label>
                          <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700 font-medium capitalize">
                            {editedDraft.urgency === 'high' ? 'Tinggi' : 
                             editedDraft.urgency === 'medium' ? 'Sedang' : 
                             editedDraft.urgency === 'low' ? 'Rendah' : 'Belum ditentukan'}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Ditentukan otomatis oleh AI</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={handleSaveEdit}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98] min-h-[40px]"
                      >
                        <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">Simpan Perubahan</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={loading}
                        className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] min-h-[40px]"
                      >
                        <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">Batal Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CTA untuk submit draft laporan - Preview Data Lebih Jelas */}
            {pendingDraft && !isEditingDraft && (
              <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-2 border-green-300 rounded-xl sm:rounded-2xl mx-2 sm:mx-4 mb-2 sm:mb-3 shadow-lg animate-fade-in">
                <div className="flex items-start gap-2 sm:gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-full p-2 sm:p-2.5 shadow-lg ring-2 ring-green-200/50 flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-1 sm:gap-2 flex-wrap">
                      <span className="truncate">Preview Draft Laporan</span>
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 sm:px-2 py-0.5 rounded-full font-medium flex-shrink-0">Review Sebelum Kirim</span>
                    </h4>
                    
                    {/* Preview Data Lengkap */}
                    <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border border-green-200 space-y-2 sm:space-y-3">
                      {/* Title */}
                      <div className={`p-2 rounded-lg border ${pendingDraft.title ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
                        <div className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                          <span>Judul:</span>
                          {pendingDraft.title ? (
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-yellow-600" />
                          )}
                          <span className={pendingDraft.title ? "text-green-600" : "text-yellow-600"}>
                            {pendingDraft.title ? "Terisi" : "Belum terisi"}
                          </span>
                        </div>
                        <div className={`text-sm font-medium ${pendingDraft.title ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                          {pendingDraft.title || 'Belum ada judul'}
                        </div>
                      </div>

                      {/* Description */}
                      <div className={`p-2 rounded-lg border ${pendingDraft.description ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
                        <div className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                          <span>Deskripsi:</span>
                          {pendingDraft.description ? (
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-yellow-600" />
                          )}
                          <span className={pendingDraft.description ? "text-green-600" : "text-yellow-600"}>
                            {pendingDraft.description ? "Terisi" : "Belum terisi"}
                          </span>
                        </div>
                        <div className={`text-xs ${pendingDraft.description ? 'text-gray-700 line-clamp-2' : 'text-gray-400 italic'}`}>
                          {pendingDraft.description || 'Belum ada deskripsi'}
                        </div>
                      </div>

                      {/* Location */}
                      <div className={`p-2 rounded-lg border ${pendingDraft.location ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
                        <div className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>Lokasi:</span>
                          {pendingDraft.location ? (
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-yellow-600" />
                          )}
                          <span className={pendingDraft.location ? "text-green-600" : "text-yellow-600"}>
                            {pendingDraft.location ? "Terisi" : "Belum terisi"}
                          </span>
                        </div>
                        <div className={`text-sm font-medium ${pendingDraft.location ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                          {pendingDraft.location || 'Belum ada lokasi'}
                        </div>
                      </div>

                      {/* Category & Urgency (Ditentukan oleh AI - Read-only) */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`p-2 rounded-lg border ${pendingDraft.category ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
                          <div className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            <span>Kategori:</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                          </div>
                          <div className={`text-xs font-medium ${pendingDraft.category ? 'text-gray-900 capitalize' : 'text-gray-400 italic'}`}>
                            {pendingDraft.category || 'Belum ditentukan'}
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg border ${pendingDraft.urgency ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
                          <div className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            <span>Urgensi:</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                          </div>
                          <div className={`text-xs font-medium ${pendingDraft.urgency ? 'text-gray-900 capitalize' : 'text-gray-400 italic'}`}>
                            {pendingDraft.urgency === 'high' ? 'Tinggi' : 
                             pendingDraft.urgency === 'medium' ? 'Sedang' : 
                             pendingDraft.urgency === 'low' ? 'Rendah' : 'Belum ditentukan'}
                          </div>
                        </div>
                      </div>

                      {/* Image Preview */}
                      {pendingDraft.imageUrl && (
                        <div className="p-2 rounded-lg border bg-green-50 border-green-300">
                          <div className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                            <FileImage className="w-3 h-3" />
                            <span>Foto:</span>
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span className="text-green-600">Terlampir</span>
                          </div>
                          <div className="relative w-full h-24 rounded-lg overflow-hidden border border-green-200 mt-1">
                            <img
                              src={pendingDraft.imageUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                      Review draft laporan di atas. Jika sudah sesuai, klik tombol di bawah untuk mengirim.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={handleEditDraft}
                        disabled={loading}
                        className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-600 hover:border-blue-700 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] min-h-[40px] w-full sm:w-auto"
                        title="Edit draft laporan"
                      >
                        <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">Edit</span>
                      </button>
                      <button
                        onClick={handleConfirmDraft}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 hover:from-green-700 hover:via-emerald-700 hover:to-green-800 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] min-h-[40px] w-full sm:w-auto"
                        title="Kirim laporan"
                      >
                        {loading ? (
                          <>
                            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                            <span className="truncate">Mengirim...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">Kirim Laporan</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancelDraft}
                        disabled={loading}
                        className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] min-h-[40px] w-full sm:w-auto"
                        title="Batal kirim laporan"
                      >
                        <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">Batal</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={endRef} />
          </div>

          {/* Quick suggestions dengan design yang lebih menarik */}
          {messages.length <= 2 && (
            <div className="px-3 sm:px-5 py-3 sm:py-4 border-t-2 bg-gradient-to-b from-white to-gray-50 border-gray-200">
              <div className="text-xs font-bold text-gray-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-500 flex-shrink-0" />
                <span>Coba pertanyaan ini:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2.5">
                {QUICK_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                      setTimeout(() => send(), 50);
                    }}
                    className="text-xs px-4 py-2 rounded-full border-2 border-gray-200 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-400 hover:text-blue-700 transition-all font-semibold shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Image Preview */}
          {imagePreview && (
            <div className="px-5 py-3 border-t-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-300 shadow-md ring-2 ring-blue-100">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-700 font-semibold truncate">{imageFile?.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{((imageFile?.size || 0) / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={removeImage}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 transition-all transform hover:scale-110 active:scale-95"
                  aria-label="Hapus gambar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Input area dengan design yang lebih modern */}
          <div className="p-4 border-t-2 bg-white border-gray-200">
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="p-3 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                aria-label="Attach gambar"
                title="Attach gambar"
              >
                <Paperclip className="h-4 w-4 text-gray-600" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => (e.key === 'Enter' && !e.shiftKey ? send() : undefined)}
                placeholder="Tulis pertanyaan Anda di sini..."
                disabled={loading}
                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed shadow-sm focus:shadow-md"
                aria-label="Ketik pesan"
              />
              <button
                onClick={send}
                disabled={loading || (!input.trim() && !imageFile)}
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white rounded-xl px-6 py-3 text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                aria-label="Kirim"
              >
                <Send className="h-4 w-4" />
                Kirim
              </button>
            </div>
            
            {/* Powered by Groq badge */}
            <div className="mt-3 flex items-center justify-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Zap className="h-3.5 w-3.5 text-indigo-500" />
                <span className="font-medium">Powered by</span>
              </div>
              <a
                href="https://groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all"
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
      
      {/* Floating button dengan design yang lebih menarik - Responsive */}
      {!open && (
        <button
          onClick={() => setOpen(!open)}
          className={`bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white rounded-full px-4 sm:px-6 py-2.5 sm:py-3.5 shadow-2xl hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] flex items-center gap-2 sm:gap-3 transition-all transform hover:scale-105 active:scale-95 ${
            isMobile ? 'fixed bottom-4 right-4' : ''
          }`}
          aria-expanded={open}
          aria-controls="chat-widget"
        >
          <div className="relative">
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-white animate-pulse ring-2 ring-green-300"></div>
          </div>
          <span className="font-semibold text-sm sm:text-base">Chat Asisten</span>
        </button>
      )}
      </div>
    </>
  );
}
