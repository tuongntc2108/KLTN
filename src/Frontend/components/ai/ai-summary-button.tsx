"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, Brain, Sparkles, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AISummaryProps {
  certificateId: string
  certificateName?: string
}

export function AISummaryButton({ certificateId, certificateName }: AISummaryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchAISummary = async () => {
    if (summary) return // Already loaded
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/certificates/${certificateId}/ai-summary`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setSummary(data.ai_summary)
      } else {
        throw new Error(data.error || 'Failed to get AI summary')
      }
    } catch (err) {
      console.error('Error fetching AI summary:', err)
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải tóm tắt AI'
      setError(errorMessage)
      toast({
        title: "Lỗi",
        description: "Không thể tạo tóm tắt AI. Vui lòng thử lại.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && !summary && !error) {
      fetchAISummary()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Brain className="w-4 h-4" />
          🧠 Tóm tắt chứng chỉ bằng AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Tóm tắt chứng chỉ bằng AI
          </DialogTitle>
          <DialogDescription>
            {certificateName && `Chứng chỉ: ${certificateName}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
                  <p className="text-sm text-muted-foreground">
                    AI đang phân tích và tạo tóm tắt...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-800">Có lỗi xảy ra</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {summary && (
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    Tóm tắt AI
                  </CardTitle>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Generated
                  </Badge>
                </div>
                <CardDescription>
                  Tóm tắt được tạo bởi OpenAI ChatGPT
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed">
                    {summary}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!isLoading && !summary && !error && (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Click để tạo tóm tắt AI cho chứng chỉ này
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          {/* {summary && (
            <Button
              variant="outline"
              onClick={() => {
                setSummary(null)
                setError(null)
                fetchAISummary()
              }}
              disabled={isLoading}
            >
              Tạo lại tóm tắt
            </Button>
          )} */}
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AISummaryButton