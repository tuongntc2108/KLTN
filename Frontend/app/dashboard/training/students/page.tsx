"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Search,
  Download,
  Mail,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Wallet,
  User,
  Pencil,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"

interface Student {
  student_id: number;
  name: string;
  email: string;
  wallet_address: string | null;
  created_at?: string;
  totalCertificates?: number;
  activeCertificates?: number;
  expiredCertificates?: number;
  pendingCertificates?: number;
  revokedCertificates?: number;
  courses?: string[];
  status?: string;
}

interface Certificate {
  token_id: string;
  status: string;
  metadata_uri: string;
  issuer: {
    name: string;
    id: string;
    url: string;
  };
  recipient: {
    full_name: string;
    wallet_address: string;
  };
  certificate_detail: {
    course_name: string;
    certificate_name: string;
    issued_date: string;
    expire_date: string;
    status: string;
  };
}

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [courseFilter, setCourseFilter] = useState("All")
  const [students, setStudents] = useState<Student[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { t } = useTranslation()

  // Form state for adding new student
  const [newStudent, setNewStudent] = useState({
    id: '',
    name: '',
    email: '',
    wallet_address: ''
  })

  // Form state for editing student
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editStudentData, setEditStudentData] = useState({
    name: '',
    email: ''
  })

  // State for delete confirmation
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch students data from API
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Construct API URLs with proper base URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

      // Fetch students with authentication
      const studentsResponse = await fetch(`${baseUrl}/api/students`, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!studentsResponse.ok) {
        if (studentsResponse.status === 401) {
          throw new Error('Authentication required. Please login first.')
        }
        throw new Error(`Failed to fetch students: ${studentsResponse.status}`)
      }

      const studentsData = await studentsResponse.json()

      // Fetch certificates for the current issuer to calculate student statistics
      const certificatesResponse = await fetch(`${baseUrl}/api/certificates/issuer/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      let certificatesData = []
      if (certificatesResponse.ok) {
        const certResponse = await certificatesResponse.json()
        certificatesData = certResponse.certificates || []
      }

      setCertificates(certificatesData)

      // Calculate statistics for each student based on API response
      const studentsWithStats = studentsData.map((student: Student) => {
        return {
          ...student,
          // The backend now provides these statistics directly
          totalCertificates: student.totalCertificates || 0,
          activeCertificates: student.activeCertificates || 0,
          expiredCertificates: student.expiredCertificates || 0,
          courses: student.courses || [],
          status: student.status || (student.wallet_address ? 'Active' : 'Issued')
        }
      })

      setStudents(studentsWithStats)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchData()
  }, [])

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setNewStudent(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Validate form data
  const validateForm = () => {
    const errors = []

    // Debug: log current form state
    console.log('Validating form with data:', newStudent)

    if (!newStudent.id || !newStudent.id.trim()) {
      errors.push(t('validation.studentIdRequired'))
    } else if (!/^\d+$/.test(newStudent.id.trim())) {
      errors.push(t('validation.studentIdNumber'))
    }

    if (!newStudent.name || !newStudent.name.trim()) {
      errors.push(t('validation.fullNameRequired'))
    }

    if (!newStudent.email || !newStudent.email.trim()) {
      errors.push(t('validation.emailRequired'))
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStudent.email.trim())) {
      errors.push(t('validation.emailInvalid'))
    }

    // Only validate wallet address if it's provided
    if (newStudent.wallet_address && newStudent.wallet_address.trim()) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(newStudent.wallet_address.trim())) {
        errors.push(t('validation.walletInvalid'))
      }
    }

    console.log('Validation errors:', errors)
    return errors
  }

  // Handle form submission
  const handleSubmit = async () => {
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      toast({
        title: t('common.error'),
        description: validationErrors.join(', '),
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

      const payload = {
        student_id: parseInt(newStudent.id.trim()),
        name: newStudent.name.trim(),
        email: newStudent.email.trim().toLowerCase(),
        wallet_address: newStudent.wallet_address && newStudent.wallet_address.trim() ? newStudent.wallet_address.trim() : null
      }

      console.log('Sending payload:', payload) // Debug log

      const response = await fetch(`${baseUrl}/api/students`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      console.log('Response status:', response.status) // Debug log

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          console.log('Error response:', errorData) // Debug log
          errorMessage = errorData.details || errorData.error || errorData.message || errorMessage
        } catch (parseError) {
          console.log('Could not parse error response')
          const textError = await response.text()
          console.log('Raw error response:', textError)
          errorMessage = textError || errorMessage
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('Success response:', result) // Debug log

      toast({
        title: t('common.success'),
        description: `${t('students.addSuccess')}: ${newStudent.name}`,
      })

      // Reset form
      setNewStudent({
        id: '',
        name: '',
        email: '',
        wallet_address: ''
      })

      // Close dialog
      setIsAddDialogOpen(false)

      // Refresh data
      fetchData()

    } catch (error) {
      console.error('Error adding student:', error)
      const errorMessage = error instanceof Error ? error.message : t('students.addFail')
      console.log('Final error message:', errorMessage) // Debug log

      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form when dialog closes
  const handleDialogClose = () => {
    setIsAddDialogOpen(false)
    setNewStudent({
      id: '',
      name: '',
      email: '',
      wallet_address: ''
    })
  }

  // Open edit dialog
  const openEditDialog = (student: Student) => {
    setEditingStudent(student)
    setEditStudentData({
      name: student.name,
      email: student.email
    })
    setIsEditDialogOpen(true)
  }

  // Handle edit form input changes
  const handleEditInputChange = (field: string, value: string) => {
    setEditStudentData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Validate edit form data
  const validateEditForm = () => {
    const errors = []

    if (!editStudentData.name || !editStudentData.name.trim()) {
      errors.push(t('validation.fullNameRequired'))
    }

    if (!editStudentData.email || !editStudentData.email.trim()) {
      errors.push(t('validation.emailRequired'))
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editStudentData.email.trim())) {
      errors.push(t('validation.emailInvalid'))
    }

    return errors
  }

  // Handle edit form submission
  const handleEditSubmit = async () => {
    if (!editingStudent) return

    const validationErrors = validateEditForm()
    if (validationErrors.length > 0) {
      toast({
        title: t('common.error'),
        description: validationErrors.join(', '),
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

      const payload = {
        name: editStudentData.name.trim(),
        email: editStudentData.email.trim().toLowerCase(),
      }

      const response = await fetch(`${baseUrl}/api/students/${editingStudent.student_id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.details || errorData.error || errorData.message || errorMessage
        } catch (parseError) {
          const textError = await response.text()
          errorMessage = textError || errorMessage
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      toast({
        title: t('common.success'),
        description: `${t('students.updateSuccess')}: ${editStudentData.name}`,
      })

      // Close dialog
      setIsEditDialogOpen(false)

      // Refresh data
      fetchData()

    } catch (error) {
      console.error('Error updating student:', error)
      const errorMessage = error instanceof Error ? error.message : t('students.updateFail')

      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open delete confirmation dialog
  const openDeleteDialog = (student: Student) => {
    setStudentToDelete(student)
    setIsDeleteDialogOpen(true)
  }

  // Handle delete student
  const handleDeleteStudent = async () => {
    if (!studentToDelete) return

    try {
      setIsDeleting(true)

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

      const response = await fetch(`${baseUrl}/api/students/${studentToDelete.student_id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.details || errorData.error || errorData.message || errorMessage
        } catch (parseError) {
          const textError = await response.text()
          errorMessage = textError || errorMessage
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      toast({
        title: t('common.success'),
        description: `${t('students.deleteSuccess')}: ${studentToDelete.name}`,
      })

      // Close dialog
      setIsDeleteDialogOpen(false)

      // Refresh data
      fetchData()

    } catch (error) {
      console.error('Error deleting student:', error)
      const errorMessage = error instanceof Error ? error.message : t('students.deleteFail')

      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toString().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "All" || student.status === statusFilter
    const matchesCourse =
      courseFilter === "All" ||
      (student.courses && student.courses.some((course) => course.toLowerCase().includes(courseFilter.toLowerCase())))

    return matchesSearch && matchesStatus && matchesCourse
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t('students.statusActive')}
          </Badge>
        )
      case "Issued":
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            {t('students.statusIssued')}
          </Badge>
        )
      case "Inactive":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            {t('students.statusInactive')}
          </Badge>
        )
      default:
        return <Badge variant="outline">{t('students.statusUnknown')}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('students.title')}</h1>
          <p className="text-muted-foreground">{t('students.subtitle')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('students.addStudent')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('students.addStudentTitle')}</DialogTitle>
              <DialogDescription>
                {t('students.addStudentDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="student-id" className="text-right">
                  {t('students.studentIdLabel')} *
                </Label>
                <Input
                  id="student-id"
                  placeholder={t('students.exampleId')}
                  className="col-span-3"
                  value={newStudent.id}
                  onChange={(e) => handleInputChange('id', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="student-name" className="text-right">
                  {t('students.fullNameLabel')} *
                </Label>
                <Input
                  id="student-name"
                  placeholder={t('students.exampleName')}
                  className="col-span-3"
                  value={newStudent.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="student-email" className="text-right">
                  {t('students.emailLabel')} *
                </Label>
                <Input
                  id="student-email"
                  type="email"
                  placeholder={t('students.exampleEmail')}
                  className="col-span-3"
                  value={newStudent.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleDialogClose}
                disabled={isSubmitting}
              >
                {t('students.cancel')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('students.saving')}
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 mr-2" />
                    {t('students.addStudent')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Student Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('students.editStudentTitle')}</DialogTitle>
              <DialogDescription>
                {t('students.editStudentDescPrefix')} {editingStudent?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-student-id" className="text-right">
                  {t('students.studentIdLabel')}
                </Label>
                <div className="col-span-3">
                  <Input
                    id="edit-student-id"
                    value={editingStudent?.student_id || ''}
                    readOnly
                    className="opacity-70 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-student-name" className="text-right">
                  {t('students.fullNameLabel')} *
                </Label>
                <Input
                  id="edit-student-name"
                  placeholder={t('students.exampleName')}
                  className="col-span-3"
                  value={editStudentData.name}
                  onChange={(e) => handleEditInputChange('name', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-student-email" className="text-right">
                  {t('students.emailLabel')} *
                </Label>
                <Input
                  id="edit-student-email"
                  type="email"
                  placeholder={t('students.exampleEmail')}
                  className="col-span-3"
                  value={editStudentData.email}
                  onChange={(e) => handleEditInputChange('email', e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSubmitting}
              >
                {t('students.cancel')}
              </Button>
              <Button
                onClick={handleEditSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('students.saving')}
                  </>
                ) : (
                  <>
                    <Pencil className="w-4 h-4 mr-2" />
                    {t('students.update')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('students.totalStudents')}</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : students.length}</div>
            <p className="text-xs text-muted-foreground">+{students.length > 0 ? Math.max(0, students.length - 1) : 0} {t('students.fromLastMonth')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('students.activeStudents')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : students.filter((s) => s.status === "Active").length}</div>
            <p className="text-xs text-muted-foreground">
              {students.length > 0 ? Math.round((students.filter((s) => s.status === "Active").length / students.length) * 100) : 0}% {t('students.percentageOfTotal')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('students.certificatesIssued')}</CardTitle>
            <Award className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : students.reduce((sum, s) => sum + (s.totalCertificates || 0), 0)}</div>
            <p className="text-xs text-muted-foreground">
              {t('common.average')} {students.length > 0 ? (students.reduce((sum, s) => sum + (s.totalCertificates || 0), 0) / students.length).toFixed(1) : 0}{" "}
              {t('students.averageCertificates')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('students.waitingWallet')}</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : students.filter((s) => !s.wallet_address).length}</div>
            <p className="text-xs text-muted-foreground">{t('students.needWalletHelp')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('students.listTitle')}</CardTitle>
          <CardDescription>{t('students.listDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t('students.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('students.statusPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">{t('students.statusAll')}</SelectItem>
                <SelectItem value="Active">{t('students.statusActive')}</SelectItem>
                <SelectItem value="Issued">{t('students.statusIssued')}</SelectItem>
                <SelectItem value="Inactive">{t('students.statusInactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">{t('students.loadingStudents')}</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <div className="mb-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <p className="text-red-500 font-medium">{t('students.errorTitle')}</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => window.location.reload()} variant="outline">
                  {t('students.retryButton')}
                </Button>
                {error.includes('Authentication') && (
                  <Button onClick={() => window.location.href = '/auth/login'}>
                    {t('students.relogin')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && students.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('students.empty')}</p>
            </div>
          )}

          {/* Students List */}
          {!loading && !error && (
            <div className="space-y-4">
              {filteredStudents.map((student) => (
                <Card key={student.student_id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src="/placeholder.svg" alt={student.name} />
                        <AvatarFallback>
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{student.name}</h3>
                          {getStatusBadge(student.status || 'unknown')}
                        </div>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {student.email}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span className="font-mono">{student.student_id}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div className="font-medium">{student.totalCertificates || 0} {t('students.certificatesLabel')}</div>
                        <div className="text-muted-foreground">
                          {student.activeCertificates || 0} {t('students.activeLabel')}, {student.expiredCertificates || 0} {t('students.expiredLabel')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(student)}>
                          <Pencil className="w-4 h-4 mr-1" />
                          {t('students.edit')}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => openDeleteDialog(student)}>
                              <Trash2 className="w-4 h-4 mr-1" />
                              {t('students.delete')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('students.confirmDeleteTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('students.confirmDeletePrefix')} <strong>{student.name}</strong>? {t('students.confirmDeleteSuffix')}

                                {student.totalCertificates != null && student.totalCertificates > 0 && (
                                  <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded-md text-sm">
                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                    {t('students.deleteRestrictionPrefix')} {student.totalCertificates} {t('students.certificatesLabel')}. {t('students.deleteRestrictionSuffix')}
                                  </div>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>{t('students.cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteStudent}
                                disabled={isDeleting || (student.totalCertificates != null && student.totalCertificates > 0)}
                                className={(student.totalCertificates != null && student.totalCertificates > 0) ? 'opacity-50 cursor-not-allowed' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
                              >
                                {isDeleting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t('students.deleting')}
                                  </>
                                ) : (
                                  'Delete student'
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium mb-1">{t('students.coursesLabel')}</p>
                        <div className="flex flex-wrap gap-1">
                          {student.courses && student.courses.length > 0 ? (
                            student.courses.map((course, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {course}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {t('students.noCourses')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium mb-1">{t('students.walletLabel')}</p>
                        {student.wallet_address ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {student.wallet_address.slice(0, 6)}...{student.wallet_address.slice(-4)}
                          </code>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {t('students.notConnected')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
