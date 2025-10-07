"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { BookOpen, Plus, Edit, Trash2, Clock, Calendar, Award, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCourses } from "@/hooks/use-courses"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CourseFormData {
  course_name: string
  course_description: string
  training_content: string
  duration: string
}

export default function CoursesPage() {
  const { courses, loading, error, fetchCourses, createCourse, updateCourse, deleteCourse, clearError } = useCourses()
  const { toast } = useToast()
  const router = useRouter()

  // Form state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [formData, setFormData] = useState<CourseFormData>({
    course_name: "",
    course_description: "",
    training_content: "",
    duration: ""
  })
  const [submitting, setSubmitting] = useState(false)

  // Load courses on mount
  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  // Clear error when dialog opens
  useEffect(() => {
    if (isCreateDialogOpen || isEditDialogOpen) {
      clearError()
    }
  }, [isCreateDialogOpen, isEditDialogOpen, clearError])

  const resetForm = () => {
    setFormData({
      course_name: "",
      course_description: "",
      training_content: "",
      duration: ""
    })
  }

  const handleInputChange = (field: keyof CourseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateCourse = async () => {
    if (!formData.course_name.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên khóa học là bắt buộc",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    const result = await createCourse({
      course_name: formData.course_name.trim(),
      course_description: formData.course_description.trim() || undefined,
      training_content: formData.training_content.trim() || undefined,
      duration: formData.duration.trim() || undefined
    })

    if (result) {
      toast({
        title: "Thành công",
        description: "Khóa học đã được tạo"
      })
      setIsCreateDialogOpen(false)
      resetForm()
    }
    setSubmitting(false)
  }

  const handleEditCourse = async () => {
    if (!editingCourse || !formData.course_name.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên khóa học là bắt buộc",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    const result = await updateCourse(editingCourse.id, {
      course_name: formData.course_name.trim(),
      course_description: formData.course_description.trim() || undefined,
      training_content: formData.training_content.trim() || undefined,
      duration: formData.duration.trim() || undefined
    })

    if (result) {
      toast({
        title: "Thành công",
        description: "Khóa học đã được cập nhật"
      })
      setIsEditDialogOpen(false)
      setEditingCourse(null)
      resetForm()
    }
    setSubmitting(false)
  }

  const handleDeleteCourse = async (course: any) => {
    const success = await deleteCourse(course.id)
    if (success) {
      toast({
        title: "Thành công",
        description: "Khóa học đã được xóa"
      })
    }
  }

  const startEditCourse = (course: any) => {
    setEditingCourse(course)
    setFormData({
      course_name: course.course_name || "",
      course_description: course.course_description || "",
      training_content: course.training_content || "",
      duration: course.duration || ""
    })
    setIsEditDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Quản lý khóa học</h1>
          <p className="text-muted-foreground">Tạo và quản lý các khóa học của đơn vị đào tạo</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Thêm khóa học mới
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Thêm khóa học mới</DialogTitle>
              <DialogDescription>
                Tạo khóa học mới để quản lý chương trình đào tạo và cấp chứng chỉ
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="create-course-name">Tên khóa học *</Label>
                <Input
                  id="create-course-name"
                  value={formData.course_name}
                  onChange={(e) => handleInputChange("course_name", e.target.value)}
                  placeholder="Ví dụ: Tiếng Anh Giao Tiếp Cấp độ B2"
                />
              </div>
              <div>
                <Label htmlFor="create-course-description">Mô tả khóa học</Label>
                <Textarea
                  id="create-course-description"
                  value={formData.course_description}
                  onChange={(e) => handleInputChange("course_description", e.target.value)}
                  placeholder="Mô tả tổng quan về khóa học..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="create-duration">Thời lượng</Label>
                <Input
                  id="create-duration"
                  value={formData.duration}
                  onChange={(e) => handleInputChange("duration", e.target.value)}
                  placeholder="Ví dụ: 40 giờ, 3 tháng, 6 tuần"
                />
              </div>
              <div>
                <Label htmlFor="create-training-content">Nội dung chương trình đào tạo</Label>
                <Textarea
                  id="create-training-content"
                  value={formData.training_content}
                  onChange={(e) => handleInputChange("training_content", e.target.value)}
                  placeholder="Chi tiết nội dung đào tạo, mục tiêu học tập, kỹ năng đạt được..."
                  rows={6}
                />
              </div>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  resetForm()
                }}
                disabled={submitting}
              >
                Hủy
              </Button>
              <Button onClick={handleCreateCourse} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  "Tạo khóa học"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Courses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Danh sách khóa học
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && courses.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Đang tải danh sách khóa học...
            </div>
          ) : error && courses.length === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : courses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Chưa có khóa học nào</p>
              <p className="text-sm">Tạo khóa học đầu tiên để bắt đầu quản lý chương trình đào tạo</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên khóa học</TableHead>
                  <TableHead>Thời lượng</TableHead>
                  <TableHead>Chứng chỉ đã cấp</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{course.course_name}</p>
                        {course.course_description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {course.course_description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {course.duration ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3" />
                          {course.duration}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Chưa xác định</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <Award className="w-3 h-3" />
                        {course.certificate_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(course.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditCourse(course)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Sửa
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-3 h-3 mr-1" />
                              Xóa
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xác nhận xóa khóa học</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc chắn muốn xóa khóa học "{course.course_name}"?
                                {course.certificate_count > 0 && (
                                  <span className="block mt-2 text-red-600 font-medium">
                                    ⚠️ Khóa học này có {course.certificate_count} chứng chỉ liên kết và không thể xóa.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCourse(course)}
                                disabled={course.certificate_count > 0}
                                className={course.certificate_count > 0 ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                Xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa khóa học</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin khóa học "{editingCourse?.course_name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-course-name">Tên khóa học *</Label>
              <Input
                id="edit-course-name"
                value={formData.course_name}
                onChange={(e) => handleInputChange("course_name", e.target.value)}
                placeholder="Ví dụ: Tiếng Anh Giao Tiếp Cấp độ B2"
              />
            </div>
            <div>
              <Label htmlFor="edit-course-description">Mô tả khóa học</Label>
              <Textarea
                id="edit-course-description"
                value={formData.course_description}
                onChange={(e) => handleInputChange("course_description", e.target.value)}
                placeholder="Mô tả tổng quan về khóa học..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-duration">Thời lượng</Label>
              <Input
                id="edit-duration"
                value={formData.duration}
                onChange={(e) => handleInputChange("duration", e.target.value)}
                placeholder="Ví dụ: 40 giờ, 3 tháng, 6 tuần"
              />
            </div>
            <div>
              <Label htmlFor="edit-training-content">Nội dung chương trình đào tạo</Label>
              <Textarea
                id="edit-training-content"
                value={formData.training_content}
                onChange={(e) => handleInputChange("training_content", e.target.value)}
                placeholder="Chi tiết nội dung đào tạo, mục tiêu học tập, kỹ năng đạt được..."
                rows={6}
              />
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setEditingCourse(null)
                resetForm()
              }}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button onClick={handleEditCourse} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                "Cập nhật"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}