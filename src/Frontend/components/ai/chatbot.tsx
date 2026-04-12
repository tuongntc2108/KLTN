"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Send, X, Bot, User, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: Date
  type?: "text" | "suggestion" | "error"
}

const quickSuggestions = [
  "Làm thế nào để kết nối ví blockchain?",
  "Cách xác minh chứng chỉ?",
  "Tôi không nhận được chứng chỉ NFT",
  "Hướng dẫn cấp chứng chỉ mới",
  "Liên hệ hỗ trợ kỹ thuật",
]

const aiResponses: Record<string, string> = {
  "kết nối ví":
    "Để kết nối ví blockchain:\n1. Đảm bảo bạn đã cài đặt MetaMask\n2. Vào trang Ví Blockchain trong dashboard\n3. Click 'Kết nối ví MetaMask'\n4. Xác nhận kết nối trong MetaMask\n\nNếu gặp lỗi, hãy kiểm tra mạng Polygon đã được thêm vào ví chưa.",
  "xác minh chứng chỉ":
    "Để xác minh chứng chỉ:\n1. Truy cập trang Xác minh chứng chỉ\n2. Nhập mã xác minh hoặc Token ID\n3. Hoặc tải lên file PDF chứng chỉ\n4. Hệ thống sẽ kiểm tra trên blockchain và hiển thị kết quả\n\nBạn cũng có thể quét mã QR từ chứng chỉ để xác minh nhanh.",
  "không nhận được nft":
    "Nếu bạn không nhận được chứng chỉ NFT:\n1. Kiểm tra địa chỉ ví đã đúng chưa\n2. Đảm bảo ví đã kết nối mạng Polygon\n3. Kiểm tra trạng thái chứng chỉ trong dashboard\n4. Nếu trạng thái 'Chờ nhận', click 'Nhận NFT'\n\nNếu vẫn gặp vấn đề, liên hệ đơn vị đào tạo hoặc hỗ trợ kỹ thuật.",
  "cấp chứng chỉ":
    "Để cấp chứng chỉ mới:\n1. Vào Dashboard đơn vị đào tạo\n2. Chọn 'Cấp chứng chỉ mới'\n3. Điền thông tin học viên và khóa học\n4. Kiểm tra địa chỉ ví blockchain của học viên\n5. Click 'Cấp chứng chỉ NFT'\n\nHệ thống sẽ tự động mint NFT và gửi thông báo cho học viên.",
  "hỗ trợ":
    "Bạn có thể liên hệ hỗ trợ qua:\n📧 Email: support@certchain.vn\n📞 Hotline: 1900-xxxx\n🕐 Thời gian: 8:00 - 17:00 (T2-T6)\n\nHoặc gửi báo cáo lỗi trực tiếp trong hệ thống. Chúng tôi sẽ phản hồi trong vòng 24h.",
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content:
        "Xin chào! Tôi là trợ lý AI của CertChain. Tôi có thể giúp bạn:\n\n• Hướng dẫn sử dụng hệ thống\n• Giải đáp thắc mắc về blockchain\n• Hỗ trợ xử lý lỗi\n• Tìm hiểu về chứng chỉ NFT\n\nBạn cần hỗ trợ gì?",
      sender: "ai",
      timestamp: new Date(),
      type: "text",
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase()

    for (const [key, response] of Object.entries(aiResponses)) {
      if (lowerMessage.includes(key)) {
        return response
      }
    }

    // Default responses for common patterns
    if (lowerMessage.includes("lỗi") || lowerMessage.includes("error")) {
      return "Tôi hiểu bạn đang gặp lỗi. Để hỗ trợ tốt nhất:\n\n1. Mô tả chi tiết lỗi bạn gặp phải\n2. Cho biết bạn đang ở trang nào\n3. Trình duyệt và thiết bị bạn sử dụng\n\nHoặc liên hệ hỗ trợ kỹ thuật qua email: support@certchain.vn"
    }

    if (lowerMessage.includes("cảm ơn") || lowerMessage.includes("thanks")) {
      return "Rất vui được hỗ trợ bạn! Nếu có thêm câu hỏi nào khác, đừng ngần ngại hỏi tôi nhé. Chúc bạn sử dụng CertChain hiệu quả! 🎓"
    }

    return "Tôi chưa hiểu rõ câu hỏi của bạn. Bạn có thể:\n\n• Chọn một trong các gợi ý bên dưới\n• Mô tả chi tiết hơn vấn đề\n• Liên hệ hỗ trợ trực tiếp\n\nTôi luôn sẵn sàng giúp đỡ!"
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate AI thinking time
    setTimeout(
      () => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: generateAIResponse(inputValue),
          sender: "ai",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiResponse])
        setIsTyping(false)
      },
      1000 + Math.random() * 1000,
    )
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-all",
          isOpen && "scale-0",
        )}
        size="lg"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-2xl z-50 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-secondary/10">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-secondary rounded-full">
                <Bot className="w-4 h-4 text-secondary-foreground" />
              </div>
              CertChain AI
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Online
              </Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex gap-2", message.sender === "user" ? "justify-end" : "justify-start")}
                >
                  {message.sender === "ai" && (
                    <div className="flex items-center justify-center w-6 h-6 bg-secondary rounded-full flex-shrink-0 mt-1">
                      <Bot className="w-3 h-3 text-secondary-foreground" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-line",
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {message.content}
                  </div>
                  {message.sender === "user" && (
                    <div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full flex-shrink-0 mt-1">
                      <User className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2 justify-start">
                  <div className="flex items-center justify-center w-6 h-6 bg-secondary rounded-full flex-shrink-0 mt-1">
                    <Bot className="w-3 h-3 text-secondary-foreground" />
                  </div>
                  <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            <div className="border-t p-3">
              <p className="text-xs text-muted-foreground mb-2">Gợi ý câu hỏi:</p>
              <div className="flex flex-wrap gap-1">
                {quickSuggestions.slice(0, 3).map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 bg-transparent"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập câu hỏi của bạn..."
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
