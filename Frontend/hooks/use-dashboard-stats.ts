// hooks/use-dashboard-stats.ts
import { useState, useEffect } from 'react'

interface DashboardStats {
  totalStudents: number
  totalCertificatesIssued: number
  totalCourses: number
  activeCertificates: number
  studentsGrowth: number
  certificatesGrowth: number
  coursesGrowth: number
  activeCertificatesGrowth: number
}

interface RecentCertificate {
  id: number
  student_name: string
  course_name: string
  issue_date: string
  status: 'active' | 'pending'
}

interface RecentStudent {
  student_id: number
  name: string
  email: string
  created_at: string
  wallet_address: string | null
  has_wallet: boolean
}

interface DashboardData {
  stats: DashboardStats
  recentCertificates: RecentCertificate[]
  recentStudents: RecentStudent[]
  loading: boolean
  error: string | null
}

export function useDashboardStats() {
  const [state, setState] = useState<DashboardData>({
    stats: {
      totalStudents: 0,
      totalCertificatesIssued: 0,
      totalCourses: 0,
      activeCertificates: 0,
      studentsGrowth: 0,
      certificatesGrowth: 0,
      coursesGrowth: 0,
      activeCertificatesGrowth: 0,
    },
    recentCertificates: [],
    recentStudents: [],
    loading: true,
    error: null
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Fetch dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }

      const statsData = await statsResponse.json()

      // Fetch recent certificates
      const certificatesResponse = await fetch('/api/dashboard/recent-certificates', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!certificatesResponse.ok) {
        throw new Error('Failed to fetch recent certificates')
      }

      const certificatesData = await certificatesResponse.json()

      // Fetch recent students
      const studentsResponse = await fetch('/api/dashboard/recent-students', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!studentsResponse.ok) {
        throw new Error('Failed to fetch recent students')
      }

      const studentsData = await studentsResponse.json()

      setState({
        stats: statsData.stats || {
          totalStudents: 0,
          totalCertificatesIssued: 0,
          totalCourses: 0,
          activeCertificates: 0,
          studentsGrowth: 0,
          certificatesGrowth: 0,
          coursesGrowth: 0,
          activeCertificatesGrowth: 0,
        },
        recentCertificates: certificatesData.certificates || [],
        recentStudents: studentsData.students || [],
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      }))
    }
  }

  const refreshData = () => {
    fetchDashboardData()
  }

  return {
    stats: state.stats,
    recentCertificates: state.recentCertificates,
    recentStudents: state.recentStudents,
    loading: state.loading,
    error: state.error,
    refreshData
  }
}