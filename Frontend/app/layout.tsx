import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AIChatbot } from "@/components/ai/chatbot"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: "CertChain - Hệ thống chứng chỉ số Blockchain",
  description: "Hệ thống cấp phát chứng chỉ số an toàn và minh bạch sử dụng công nghệ Blockchain và NFT",
  generator: "v0.app",
}

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`font-sans ${inter.variable} ${GeistMono.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <AIChatbot />
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
