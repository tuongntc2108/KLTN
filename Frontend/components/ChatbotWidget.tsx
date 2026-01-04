"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';

type Message = {
  role: 'user' | 'bot';
  text: string;
  sources?: Array<{ id: number | string; title?: string; source_file?: string }>;
};

const DEFAULT_API = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_CHAT_API_URL || 'http://localhost:4000/api/chat');

function escapeHtml(unsafe: string) {
  return unsafe.replace(/[&<>"']/g, function (m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}

/** Minimal markdown -> HTML converter supporting headings, lists and code blocks */
function inlineFormat(text: string) {
  // Escape first
  let t = escapeHtml(text);

  // Bold **text**
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Inline code `code`
  t = t.replace(/`([^`]+?)`/g, '<code class="px-1 rounded bg-gray-100 text-sm">$1</code>');

  // Links [text](url)
  t = t.replace(/\[([^\]]+?)\]\((https?:\/\/[^)]+?)\)/g, '<a class="text-blue-600 underline" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  return t;
}

function markdownToHtml(md: string) {
  if (!md) return '';
  // Normalize newlines
  const lines = md.replace(/\r/g, '').split('\n');

  let inCode = false;
  let codeBuffer: string[] = [];
  let html: string[] = [];
  let listOpen = false;

  function closeCode() {
    if (codeBuffer.length) {
      html.push('<pre class="bg-gray-900 text-white p-3 rounded-md overflow-auto"><code>' + escapeHtml(codeBuffer.join('\n')) + '</code></pre>');
      codeBuffer = [];
    }
    inCode = false;
  }

  for (let raw of lines) {
    const line = raw;
    if (line.trim().startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeBuffer = [];
      } else {
        closeCode();
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    // Headings
    if (/^#{1,3}\s+/.test(line)) {
      if (listOpen) { html.push('</ul>'); listOpen = false; }
      const level = line.match(/^#{1,3}/)![0].length;
      const rawText = line.replace(/^#{1,3}\s+/, '');
      const text = inlineFormat(rawText);
      html.push(`<h${level} class="font-semibold mt-2 mb-1 text-sm">${text}</h${level}>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const rawItem = line.replace(/^\s*[-*]\s+/, '');
      const item = inlineFormat(rawItem);
      if (!listOpen) { html.push('<ul class="list-disc ml-5">'); listOpen = true; }
      html.push(`<li class="text-sm mb-1">${item}</li>`);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      if (listOpen) { html.push('</ul>'); listOpen = false; }
      html.push('<p class="my-2"></p>');
      continue;
    }

    // Paragraph
    html.push(`<p class="text-sm break-words">${inlineFormat(line)}</p>`);
  }

  if (inCode) closeCode();
  if (listOpen) html.push('</ul>');

  return html.join('');
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('chat_history_v1');
      if (saved) setMessages(JSON.parse(saved));
    } catch (e) {}
  }, []);

  useEffect(() => {
    localStorage.setItem('chat_history_v1', JSON.stringify(messages));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const samplePrompts = [
    'Cách nhận chứng chỉ',
    'Cách xác minh chứng chỉ NFT',
    'Tôi nhận chứng chỉ gặp lỗi'
  ];

  const sendMessage = async (text: string) => {
    if (!text || loading) return;
    const newUserMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(String(process.env.NEXT_PUBLIC_CHAT_API_URL || DEFAULT_API), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        const err = data?.message || 'Lỗi khi gọi API';
        setMessages(prev => [...prev, { role: 'bot', text: `Lỗi: ${err}` }]);
        setLoading(false);
        return;
      }

      const answer = data?.data?.answer || data?.data?.response || 'Xin lỗi, không có trả lời.';
      const sources = data?.data?.sources || [];
      const sid = data?.data?.sessionId || sessionId;
      if (sid && !sessionId) setSessionId(sid);

      setMessages(prev => [...prev, { role: 'bot', text: answer, sources }]);
    } catch (error) {
      console.error('Chat widget error:', error);
      setMessages(prev => [...prev, { role: 'bot', text: 'Lỗi kết nối đến API' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
  };

  const clearHistory = () => { setMessages([]); localStorage.removeItem('chat_history_v1'); };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="w-14 h-14 rounded-full bg-[#3B82F6] shadow-lg flex items-center justify-center text-white"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div className="w-[92vw] sm:w-96 md:w-[420px] h-[520px] bg-[#F7F9FC] text-black shadow-lg rounded-[16px] border border-transparent overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white font-semibold">AI</div>
              <div>
                <div className="text-sm font-medium">Trợ lý CertChain</div>
                <div className="text-xs text-gray-500">Hỏi gì đó — tôi sẽ hỗ trợ bạn</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearHistory} className="text-xs text-gray-500 hover:text-gray-700">Xóa</button>
              <button onClick={() => setOpen(false)} className="p-2 rounded-md hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="p-4 overflow-y-auto h-[360px] space-y-3">
            {messages.length === 0 && (
              <div className="text-sm text-gray-600">Bạn có thể hỏi tôi về hệ thống. Gợi ý nhanh nằm ở dưới.</div>
            )}

            {messages.map((m, idx) => (
              <div key={idx} style={{ animationDelay: `${idx * 60}ms` }} className={`animate-chat-fade` }>
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`${m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'} p-3 text-[15px] max-w-[70%] whitespace-pre-wrap` }>
                    {/* Render markdown-like content */}
                    <div className="text-black" dangerouslySetInnerHTML={{ __html: markdownToHtml(m.text) }} />
                   
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="px-3 py-2 border-t bg-white flex gap-2 overflow-x-auto">
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => sendMessage(p)}
                className="flex-shrink-0 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm hover:shadow-sm transition"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input area (fixed bottom of widget) */}
          <div className="px-3 py-3 bg-white/80 border-t">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi..."
                className="flex-1 bg-white text-black border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#60A5FA]"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 bg-[#3B82F6] text-white px-3 py-2 rounded-lg hover:bg-[#2563EB] disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                <span className="text-sm">{loading ? 'Đang gửi' : 'Gửi'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatbotWidget;
