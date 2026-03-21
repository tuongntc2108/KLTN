"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, X, MessageSquare, Sparkles, Bot, User, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "bot";
  text: string;
  sources?: Array<{ id: number | string; title?: string; source_file?: string }>;
};

const DEFAULT_API =
  typeof window !== "undefined" &&
  (process.env.NEXT_PUBLIC_CHAT_API_URL || "http://localhost:4000/api/chat");

// --- Markdown Helper Functions ---
function escapeHtml(unsafe: string) {
  return unsafe.replace(/[&<>"']/g, function (m) {
    switch (m) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#039;";
      default: return m;
    }
  });
}

function inlineFormat(text: string) {
  let t = escapeHtml(text);

  // 1. Raw URLs (must be first to avoid breaking existing tags)
  // Match http/https that are not preceded by "href="
  t = t.replace(
    /(?<!href=")(https?:\/\/[^\s<]+)/g,
    '<a class="text-blue-500 underline hover:text-blue-600 break-all" href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // 2. Bold
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // 3. Inline code
  t = t.replace(/`([^`]+?)`/g, '<code class="px-1 py-0.5 rounded bg-muted font-mono text-sm text-primary break-all">$1</code>');

  // 4. Markdown Links [text](url) - Apply styling
  t = t.replace(
    /\[([^\]]+?)\]\((https?:\/\/[^)]+?)\)/g,
    '<a class="text-blue-500 underline hover:text-blue-600 break-all" href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  return t;
}

function markdownToHtml(md: string) {
  if (!md) return "";
  const lines = md.replace(/\r/g, "").split("\n");
  let inCode = false;
  let codeBuffer: string[] = [];
  let html: string[] = [];
  let listOpen = false;

  function closeCode() {
    if (codeBuffer.length) {
      html.push(
        '<pre class="bg-slate-950 text-slate-50 p-3 rounded-lg overflow-x-auto my-2 text-xs w-full"><code class="break-words whitespace-pre-wrap">' +
        escapeHtml(codeBuffer.join("\n")) +
        "</code></pre>"
      );
      codeBuffer = [];
    }
    inCode = false;
  }

  for (let raw of lines) {
    const line = raw;
    if (line.trim().startsWith("```")) {
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
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      const level = line.match(/^#{1,3}/)![0].length;
      const rawText = line.replace(/^#{1,3}\s+/, "");
      const text = inlineFormat(rawText);
      const sizes = ["text-lg", "text-base", "text-sm"];
      html.push(`<h${level} class="font-bold mt-3 mb-1 ${sizes[level - 1]} break-words">${text}</h${level}>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const rawItem = line.replace(/^\s*[-*]\s+/, "");
      const item = inlineFormat(rawItem);
      if (!listOpen) {
        html.push('<ul class="list-disc ml-5 space-y-1 mb-2">');
        listOpen = true;
      }
      html.push(`<li class="text-sm break-words">${item}</li>`);
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      continue;
    }

    // Paragraph
    html.push(`<p class="text-sm leading-relaxed mb-2 last:mb-0 break-words">${inlineFormat(line)}</p>`);
  }

  if (inCode) closeCode();
  if (listOpen) html.push("</ul>");

  return html.join("");
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("chat_history_v1");
      if (saved) setMessages(JSON.parse(saved));
    } catch (e) { }
  }, []);

  useEffect(() => {
    localStorage.setItem("chat_history_v1", JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      scrollToBottom();
    }
  }, [open]);

  const scrollToBottom = () => {
    if (scrollViewportRef.current) {
      const viewport = scrollViewportRef.current;
      viewport.scrollTop = viewport.scrollHeight;
    }
  };

  const samplePrompts = [
    "Cách nhận chứng chỉ",
    "Cách xác minh chứng chỉ NFT",
    "Tôi gặp lỗi khi kết nối ví",
  ];

  const sendMessage = async (text: string) => {
    if (!text || loading) return;
    const newUserMsg: Message = { role: "user", text };
    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(String(process.env.NEXT_PUBLIC_CHAT_API_URL || DEFAULT_API), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        const err = data?.message || "Hệ thống gặp lỗi. Vui lòng thử lại sau.";
        setMessages((prev) => [...prev, { role: "bot", text: `Lỗi: ${err}` }]);
        return;
      }

      const answer = data?.data?.answer || data?.data?.response || "Hệ thống gặp lỗi. Vui lòng thử lại sau.";
      const sources = data?.data?.sources || [];
      const sid = data?.data?.sessionId || sessionId;
      if (sid && !sessionId) setSessionId(sid);

      setMessages((prev) => [...prev, { role: "bot", text: answer, sources }]);
    } catch (error) {
      console.error("Chat widget error:", error);
      setMessages((prev) => [...prev, { role: "bot", text: "Hệ thống gặp sự cố. Vui lòng thử lại." }]);
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

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem("chat_history_v1");
  };

  return (
    <div className="fixed bottom-0 right-6 z-50 flex flex-col items-end gap-4">
      {/* Chat Window */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out origin-bottom-right",
          open
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-10 pointer-events-none absolute bottom-0 right-0"
        )}
      >
        <Card className="w-[90vw] sm:w-[380px] h-[500px] max-h-[600px] shadow-2xl border-0 overflow-hidden flex flex-col bg-white/95 backdrop-blur-sm dark:bg-slate-950/95 ring-1 ring-slate-200 dark:ring-slate-800 py-0 gap-0">
          {/* Header */}
          <CardHeader className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-indigo-600 rounded-full"></span>
                </div>
                <div>
                  <CardTitle className="text-base font-bold">CertChain AI</CardTitle>
                  <p className="text-xs text-blue-100 font-medium opacity-90">Luôn sẵn sàng hỗ trợ</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                  onClick={clearHistory}
                  title="Xóa lịch sử chat"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                  onClick={() => setOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50" ref={scrollViewportRef}>
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Xin chào!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Tôi có thể giúp bạn giải đáp thắc mắc về chứng chỉ, khóa học và cách sử dụng hệ thống.
                </p>
              </div>
            )}

            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex w-full animate-in slide-in-from-bottom-2 duration-300",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn("flex max-w-[85%] gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  {/* Avatar */}
                  <Avatar className="w-8 h-8 border border-white shadow-sm shrink-0">
                    {m.role === 'user' ? (
                      <>
                        <AvatarImage src="/placeholder-user.jpg" />
                        <AvatarFallback className="bg-slate-200 text-slate-600"><User className="w-4 h-4" /></AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarImage src="/bot-avatar.png" />
                        <AvatarFallback className="bg-blue-100 text-blue-600"><Bot className="w-4 h-4" /></AvatarFallback>
                      </>
                    )}
                  </Avatar>

                  {/* Bubble */}
                  <div
                    className={cn(
                      "p-3 text-[15px] shadow-sm relative group break-words min-w-0",
                      m.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm"
                        : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-sm"
                    )}
                  >
                    <div
                      className={cn("prose prose-sm max-w-none dark:prose-invert break-words", m.role === "user" ? "text-blue-50" : "")}
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(m.text) }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex w-full justify-start animate-in fade-in duration-300">
                <div className="flex max-w-[85%] gap-2">
                  <Avatar className="w-8 h-8 border border-white shadow-sm shrink-0">
                    <AvatarFallback className="bg-blue-100 text-blue-600"><Bot className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-10">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions (only if empty or last message was bot) */}
          {(!loading && messages.length > 0 && messages[messages.length - 1].role === 'bot' || messages.length === 0) && (
            <div className="bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <div className="flex gap-2">
                {samplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200 transition-colors animate-in slide-in-from-bottom-2 fade-in duration-500 cursor-pointer"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}


          {/* Input Footer */}
          <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
            <form onSubmit={handleSubmit} className="flex gap-2 relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi của bạn..."
                className="pr-12 bg-slate-50 dark:bg-slate-900 border-slate-200 focus-visible:ring-blue-500"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !input.trim()}
                className={cn(
                  "absolute right-1 top-1 h-8 w-8 rounded-md transition-all",
                  input.trim() ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-transparent text-slate-400 hover:bg-slate-100"
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* Floating Toggle Button */}
      <Button
        onClick={() => setOpen(!open)}
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 z-50",
          open ? "bg-red-500 hover:bg-red-600 rotate-90" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-2xl hover:shadow-blue-500/30",
          "flex items-center justify-center p-0"
        )}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white animate-pulse" />}
      </Button>
    </div>
  );
}

export default ChatbotWidget;
