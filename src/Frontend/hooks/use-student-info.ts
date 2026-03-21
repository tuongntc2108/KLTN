// hooks/use-student-info.ts
import { useState, useCallback } from 'react'

interface Student {
  student_id: number
  name: string
  email: string
  wallet_address: string | null
  created_at: string
  has_wallet: boolean
}

interface StudentInfoState {
  student: Student | null
  loading: boolean
  error: string | null
}

export function useStudentInfo() {
  const [state, setState] = useState<StudentInfoState>({
    student: null,
    loading: false,
    error: null
  })

  const fetchStudentInfo = useCallback(async (studentId: string) => {
    if (!studentId || studentId.trim() === '') {
      setState({
        student: null,
        loading: false,
        error: null
      })
      return
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }))

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Không tìm thấy học viên với mã này')
        } else if (response.status === 400) {
          throw new Error('Mã học viên không hợp lệ')
        } else {
          throw new Error('Lỗi khi truy vấn thông tin học viên')
        }
      }

      const data = await response.json()

      if (data.success && data.student) {
        setState({
          student: data.student,
          loading: false,
          error: null
        })
      } else {
        throw new Error('Dữ liệu trả về không hợp lệ')
      }
    } catch (error) {
      console.error('Error fetching student info:', error)
      setState({
        student: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      })
    }
  }, [])

  const clearStudent = useCallback(() => {
    setState({
      student: null,
      loading: false,
      error: null
    })
  }, [])

  return {
    student: state.student,
    loading: state.loading,
    error: state.error,
    fetchStudentInfo,
    clearStudent
  }
}