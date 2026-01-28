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
      errors.push('Mã sinh viên là bắt buộc')
    } else if (!/^\d+$/.test(newStudent.id.trim())) {
      errors.push('Mã sinh viên phải là số')
    }
    
    if (!newStudent.name || !newStudent.name.trim()) {
      errors.push('Họ tên là bắt buộc')
    }
    
    if (!newStudent.email || !newStudent.email.trim()) {
      errors.push('Email là bắt buộc')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStudent.email.trim())) {
      errors.push('Email không hợp lệ')
    }
    
    // Only validate wallet address if it's provided
    if (newStudent.wallet_address && newStudent.wallet_address.trim()) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(newStudent.wallet_address.trim())) {
        errors.push('Địa chỉ ví không hợp lệ (phải có định dạng 0x...)')
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
        title: "Lỗi validation",
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
        title: "Thành công",
        description: `Đã thêm học viên ${newStudent.name}`,
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
      const errorMessage = error instanceof Error ? error.message : 'Không thể thêm học viên'
      console.log('Final error message:', errorMessage) // Debug log
      
      toast({
        title: "Lỗi",
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
      errors.push('Họ tên là bắt buộc')
    }
    
    if (!editStudentData.email || !editStudentData.email.trim()) {
      errors.push('Email là bắt buộc')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editStudentData.email.trim())) {
      errors.push('Email không hợp lệ')
    }
    
    return errors
  }

  // Handle edit form submission
  const handleEditSubmit = async () => {
    if (!editingStudent) return
    
    const validationErrors = validateEditForm()
    if (validationErrors.length > 0) {
      toast({
        title: "Lỗi validation",
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
        title: "Thành công",
        description: `Thông tin học viên ${editStudentData.name} đã được cập nhật`,
      })
      
      // Close dialog
      setIsEditDialogOpen(false)
      
      // Refresh data
      fetchData()
      
    } catch (error) {
      console.error('Error updating student:', error)
      const errorMessage = error instanceof Error ? error.message : 'Không thể cập nhật học viên'
      
      toast({
        title: "Lỗi",
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
        title: "Thành công",
        description: `Học viên ${studentToDelete.name} đã được xóa`,
      })
      
      // Close dialog
      setIsDeleteDialogOpen(false)
      
      // Refresh data
      fetchData()
      
    } catch (error) {
      console.error('Error deleting student:', error)
      const errorMessage = error instanceof Error ? error.message : 'Không thể xóa học viên'
      
      toast({
        title: "Lỗi",
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
            Hoạt động
          </Badge>
        )
      case "Issued":
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            Chờ xử lý
          </Badge>
        )
      case "Inactive":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Không hoạt động
          </Badge>
        )
      default:
        return <Badge variant="outline">Không xác định</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Học viên</h1>
          <p className="text-muted-foreground">Quản lý thông tin học viên và theo dõi tiến độ học tập</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm học viên
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Thêm học viên mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin của học viên mới.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="student-id" className="text-right">
                  Mã sinh viên *
                </Label>
                <Input
                  id="student-id"
                  placeholder="VD: 12345"
                  className="col-span-3"
                  value={newStudent.id}
                  onChange={(e) => handleInputChange('id', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="student-name" className="text-right">
                  Họ tên *
                </Label>
                <Input
                  id="student-name"
                  placeholder="VD: Nguyễn Văn An"
                  className="col-span-3"
                  value={newStudent.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="student-email" className="text-right">
                  Email *
                </Label>
                <Input
                  id="student-email"
                  type="email"
                  placeholder="VD: an.nguyen@vnu.edu.vn"
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
                Hủy
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 mr-2" />
                    Thêm học viên
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
              <DialogTitle>Sửa thông tin học viên</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin của học viên {editingStudent?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-student-id" className="text-right">
                  Mã sinh viên
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
                  Họ tên *
                </Label>
                <Input
                  id="edit-student-name"
                  placeholder="VD: Nguyễn Văn An"
                  className="col-span-3"
                  value={editStudentData.name}
                  onChange={(e) => handleEditInputChange('name', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-student-email" className="text-right">
                  Email *
                </Label>
                <Input
                  id="edit-student-email"
                  type="email"
                  placeholder="VD: an.nguyen@vnu.edu.vn"
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
                Hủy
              </Button>
              <Button 
                onClick={handleEditSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Pencil className="w-4 h-4 mr-2" />
                    Cập nhật
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
            <CardTitle className="text-sm font-medium">Tổng học viên</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : students.length}</div>
            <p className="text-xs text-muted-foreground">+{students.length > 0 ? Math.max(0, students.length - 1) : 0} từ tháng trước</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : students.filter((s) => s.status === "Active").length}</div>
            <p className="text-xs text-muted-foreground">
              {students.length > 0 ? Math.round((students.filter((s) => s.status === "Active").length / students.length) * 100) : 0}% tổng số
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chứng chỉ đã cấp</CardTitle>
            <Award className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : students.reduce((sum, s) => sum + (s.totalCertificates || 0), 0)}</div>
            <p className="text-xs text-muted-foreground">
              Trung bình {students.length > 0 ? (students.reduce((sum, s) => sum + (s.totalCertificates || 0), 0) / students.length).toFixed(1) : 0}{" "}
              chứng chỉ/học viên
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ kết nối ví</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : students.filter((s) => !s.wallet_address).length}</div>
            <p className="text-xs text-muted-foreground">Cần hướng dẫn kết nối</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Học viên</CardTitle>
          <CardDescription>Tìm kiếm và lọc học viên theo các tiêu chí khác nhau</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Tìm kiếm theo tên, email hoặc mã sinh viên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Tất cả trạng thái</SelectItem>
                <SelectItem value="Active">Hoạt động</SelectItem>
                <SelectItem value="Issued">Chờ xử lý</SelectItem>
                <SelectItem value="Inactive">Không hoạt động</SelectItem>
              </SelectContent>
            </Select>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Khóa học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả khóa học</SelectItem>
                <SelectItem value="digital">Digital Marketing</SelectItem>
                <SelectItem value="english">English Communication</SelectItem>
                <SelectItem value="web">Web Development</SelectItem>
                <SelectItem value="data">Data Analytics</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Xuất Excel
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Đang tải dữ liệu học viên...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <div className="mb-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <p className="text-red-500 font-medium">Có lỗi xảy ra</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => window.location.reload()} variant="outline">
                  Thử lại
                </Button>
                {error.includes('Authentication') && (
                  <Button onClick={() => window.location.href = '/auth/login'}>
                    Đăng nhập lại
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && students.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Không có học viên nào được tìm thấy.</p>
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
                      <div className="font-medium">{student.totalCertificates || 0} chứng chỉ</div>
                      <div className="text-muted-foreground">
                        {student.activeCertificates || 0} hoạt động, {student.expiredCertificates || 0} hết hạn
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Xem
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(student)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Sửa
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => openDeleteDialog(student)}>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Xóa
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xác nhận xóa học viên</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc chắn muốn xóa học viên <strong>{student.name}</strong>? Hành động này không thể hoàn tác.
                                              
                              {student.totalCertificates != null && student.totalCertificates > 0 && (
                                <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded-md text-sm">
                                  <AlertCircle className="w-4 h-4 inline mr-1" />
                                  Học viên này hiện có {student.totalCertificates} chứng chỉ. Chỉ những học viên không có chứng chỉ mới có thể bị xóa.
                                </div>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Hủy</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleDeleteStudent}
                              disabled={isDeleting || (student.totalCertificates != null && student.totalCertificates > 0)}
                              className={(student.totalCertificates != null && student.totalCertificates > 0) ? 'opacity-50 cursor-not-allowed' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Đang xóa...
                                </>
                              ) : (
                                'Xóa học viên'
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
                      <p className="text-sm font-medium mb-1">Khóa học đã tham gia:</p>
                      <div className="flex flex-wrap gap-1">
                        {student.courses && student.courses.length > 0 ? (
                          student.courses.map((course, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {course}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Chưa có khóa học
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium mb-1">Địa chỉ ví:</p>
                      {student.wallet_address ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {student.wallet_address.slice(0, 6)}...{student.wallet_address.slice(-4)}
                        </code>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Chưa kết nối
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
