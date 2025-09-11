"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Loader2, BookOpen, Target, Award, TrendingUp } from "lucide-react"

interface CourseSummaryProps {
  courseData: {
    name: string
    description: string
    duration: string
    skills: string[]
    grade: string
    issuer: string
  }
}

export function CourseSummary({ courseData }: CourseSummaryProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [summary, setSummary] = useState<any>(null)

  const generateSummary = async () => {
    setIsGenerating(true)

    // Simulate AI processing
    setTimeout(() => {
      const aiSummary = {
        overview: `Ứng viên đã hoàn thành xuất sắc khóa học "${courseData.name}" với kết quả ${courseData.grade}. Đây là chương trình đào tạo chất lượng cao từ ${courseData.issuer}, trang bị cho học viên những kỹ năng thực tế và cần thiết trong môi trường làm việc hiện đại.`,
        keySkills: [
          {
            skill: "Kỹ năng chuyên môn",
            description: "Nắm vững kiến thức cốt lõi của lĩnh vực, có khả năng áp dụng vào thực tế",
            level: "Thành thạo",
          },
          {
            skill: "Kỹ năng giao tiếp",
            description: "Giao tiếp hiệu quả, thuyết trình và làm việc nhóm tốt",
            level: "Giỏi",
          },
          {
            skill: "Tư duy phản biện",
            description: "Phân tích vấn đề logic, đưa ra giải pháp sáng tạo",
            level: "Tốt",
          },
        ],
        recommendations: [
          "Phù hợp cho các vị trí yêu cầu kỹ năng chuyên môn cao",
          "Có thể làm việc độc lập và trong môi trường nhóm",
          "Tiềm năng phát triển và học hỏi tốt",
          "Đáng tin cậy và có trách nhiệm với công việc",
        ],
        marketValue: {
          demandLevel: "Cao",
          salaryRange: "Cạnh tranh",
          careerPath: "Rộng mở",
          industryRelevance: "Phù hợp với xu hướng thị trường",
        },
      }

      setSummary(aiSummary)
      setIsGenerating(false)
    }, 2000)
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            Tóm tắt AI cho nhà tuyển dụng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Phân tích thông minh</h3>
            <p className="text-muted-foreground mb-4">
              AI sẽ phân tích chương trình đào tạo và đưa ra đánh giá chi tiết về năng lực ứng viên
            </p>
            <Button onClick={generateSummary} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang phân tích...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Tạo tóm tắt AI
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="border-secondary/20 bg-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            Tóm tắt tổng quan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{summary.overview}</p>
        </CardContent>
      </Card>

      {/* Key Skills Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Phân tích kỹ năng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.keySkills.map((skill: any, index: number) => (
              <div key={index} className="flex items-start gap-4 p-3 border rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-secondary/20 rounded-full flex-shrink-0">
                  <Award className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm">{skill.skill}</h4>
                    <Badge variant="secondary">{skill.level}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{skill.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Khuyến nghị tuyển dụng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {summary.recommendations.map((rec: string, index: number) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-secondary rounded-full flex-shrink-0"></div>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Market Value */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Giá trị thị trường
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Mức độ cần thiết:</span>
                <Badge variant="default">{summary.marketValue.demandLevel}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Mức lương:</span>
                <Badge variant="secondary">{summary.marketValue.salaryRange}</Badge>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Lộ trình sự nghiệp:</span>
                <Badge variant="default">{summary.marketValue.careerPath}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Phù hợp ngành:</span>
                <Badge variant="secondary">Cao</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setSummary(null)} className="bg-transparent">
          <Sparkles className="w-4 h-4 mr-2" />
          Tạo lại phân tích
        </Button>
        <Button>Tải báo cáo chi tiết</Button>
      </div>
    </div>
  )
}
