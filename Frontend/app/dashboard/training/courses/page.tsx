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
import { useTranslation } from "@/hooks/use-translation"
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
  const { t } = useTranslation()
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
  const [searchTerm, setSearchTerm] = useState("")

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
    // Validate all required fields
    if (!formData.course_name.trim()) {
      toast({
        title: t('common.error'),
        description: t('courses.courseNameRequired'),
        variant: "destructive"
      })
      return
    }

    if (!formData.course_description.trim()) {
      toast({
        title: t('common.error'),
        description: t('courses.courseDescRequired'),
        variant: "destructive"
      })
      return
    }

    if (!formData.duration.trim()) {
      toast({
        title: t('common.error'),
        description: t('courses.durationRequired'),
        variant: "destructive"
      })
      return
    }

    if (!formData.training_content.trim()) {
      toast({
        title: t('common.error'),
        description: t('courses.trainingContentRequired'),
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    const result = await createCourse({
      course_name: formData.course_name.trim(),
      course_description: formData.course_description.trim(),
      training_content: formData.training_content.trim(),
      duration: formData.duration.trim()
    })

    if (result) {
      toast({
        title: t('common.success'),
        description: t('courses.createSuccess')
      })
      setIsCreateDialogOpen(false)
      resetForm()
    }
    setSubmitting(false)
  }

  const handleEditCourse = async () => {
    if (!editingCourse) return

    // Validate all required fields
    if (!formData.course_name.trim()) {
      toast({
        title: t('common.error'),
        description: t('courses.courseNameRequired'),
        variant: "destructive"
      })
      return
    }

    if (!formData.course_description.trim()) {
      toast({
        title: t('common.error'),
        description: t('courses.courseDescRequired'),
        variant: "destructive"
      })
      return
    }

    if (!formData.duration.trim()) {
      toast({
        title: t('common.error'),
        description: t('courses.durationRequired'),
        variant: "destructive"
      })
      return
    }

    if (!formData.training_content.trim()) {
      toast({
        title: t('common.error'),
        description: t('courses.trainingContentRequired'),
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    const result = await updateCourse(editingCourse.id, {
      course_name: formData.course_name.trim(),
      course_description: formData.course_description.trim(),
      training_content: formData.training_content.trim(),
      duration: formData.duration.trim()
    })

    if (result) {
      toast({
        title: t('common.success'),
        description: t('courses.updateSuccess')
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
        title: t('common.success'),
        description: t('courses.deleteSuccess')
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

  // Filter courses based on search term
  const filteredCourses = courses.filter(course => 
    course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (course.course_description && course.course_description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">{t('courses.title')}</h1>
          <p className="text-muted-foreground">{t('courses.subtitle')}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t('courses.addNew')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('courses.addTitle')}</DialogTitle>
              <DialogDescription>
                {t('courses.addDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="create-course-name">{t('courses.courseNameLabel')} *</Label>
                <Input
                  id="create-course-name"
                  value={formData.course_name}
                  onChange={(e) => handleInputChange("course_name", e.target.value)}
                  placeholder={t('courses.courseNamePlaceholder')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-course-description">{t('courses.courseDescLabel')} *</Label>
                <Textarea
                  id="create-course-description"
                  value={formData.course_description}
                  onChange={(e) => handleInputChange("course_description", e.target.value)}
                  placeholder={t('courses.courseDescPlaceholder')}
                  rows={3}
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-duration">{t('courses.durationLabel')} *</Label>
                <Input
                  id="create-duration"
                  value={formData.duration}
                  onChange={(e) => handleInputChange("duration", e.target.value)}
                  placeholder={t('courses.durationPlaceholder')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-training-content">{t('courses.trainingContentLabel')} *</Label>
                <Textarea
                  id="create-training-content"
                  value={formData.training_content}
                  onChange={(e) => handleInputChange("training_content", e.target.value)}
                  placeholder={t('courses.trainingContentPlaceholder')}
                  rows={6}
                  required
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
                {t('courses.cancelButton')}
              </Button>
              <Button onClick={handleCreateCourse} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('courses.creating')}
                  </>
                ) : (
                  t('courses.createButton')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <Input
          placeholder={t('courses.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Courses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('courses.listTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && courses.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              {t('courses.loading')}
            </div>
          ) : error && courses.length === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">{t('courses.empty')}</p>
              <p className="text-sm">{t('courses.emptyDesc')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('courses.courseNameHeader')}</TableHead>
                  <TableHead>{t('courses.durationHeader')}</TableHead>
                  <TableHead>{t('courses.certificatesHeader')}</TableHead>
                  <TableHead>{t('courses.createdDateHeader')}</TableHead>
                  <TableHead className="text-right">{t('courses.actionsHeader')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
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
                        <span className="text-muted-foreground text-sm">{t('courses.notSpecified')}</span>
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
                          {t('courses.edit')}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-3 h-3 mr-1" />
                              {t('courses.delete')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('courses.confirmDeleteTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('courses.confirmDeletePrefix')} "{course.course_name}"?
                                {course.certificate_count > 0 && (
                                  <span className="block mt-2 text-red-600 font-medium">
                                    ⚠️ {t('courses.deleteRestriction')} {course.certificate_count} {t('courses.deleteRestrictionSuffix')}
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('courses.cancelButton')}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCourse(course)}
                                disabled={course.certificate_count > 0}
                                className={course.certificate_count > 0 ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                {t('courses.delete')}
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
            <DialogTitle>{t('courses.editTitle')}</DialogTitle>
            <DialogDescription>
              {t('courses.editDescPrefix')} "{editingCourse?.course_name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-course-name">{t('courses.courseNameLabel')} *</Label>
              <Input
                id="edit-course-name"
                value={formData.course_name}
                onChange={(e) => handleInputChange("course_name", e.target.value)}
                placeholder={t('courses.courseNamePlaceholder')}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-course-description">{t('courses.courseDescLabel')} *</Label>
              <Textarea
                id="edit-course-description"
                value={formData.course_description}
                onChange={(e) => handleInputChange("course_description", e.target.value)}
                placeholder={t('courses.courseDescPlaceholder')}
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-duration">{t('courses.durationLabel')} *</Label>
              <Input
                id="edit-duration"
                value={formData.duration}
                onChange={(e) => handleInputChange("duration", e.target.value)}
                placeholder={t('courses.durationPlaceholder')}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-training-content">{t('courses.trainingContentLabel')} *</Label>
              <Textarea
                id="edit-training-content"
                value={formData.training_content}
                onChange={(e) => handleInputChange("training_content", e.target.value)}
                placeholder={t('courses.trainingContentPlaceholder')}
                rows={6}
                required
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
              {t('courses.cancelButton')}
            </Button>
            <Button onClick={handleEditCourse} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('courses.updating')}
                </>
              ) : (
                t('courses.updateButton')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}