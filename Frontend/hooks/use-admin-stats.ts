import { useState, useEffect } from 'react'

export interface DashboardStats {
  totalStudents: number
  totalCertificates: number
  totalCourses: number
  totalIssuers: number
  activeCertificates: number
  studentsGrowth: number
  certificatesGrowth: number
  coursesGrowth: number
  issuersGrowth: number
  activeCertificatesGrowth: number
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard/stats', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }

      const data = await response.json()

      if (data.success && data.stats) {
        setStats(data.stats)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching statistics'
      setError(errorMessage)
      console.error('Admin stats error:', err)
    } finally {
      setLoading(false)
    }
  }

  const retry = () => {
    fetchStats()
  }

  return { stats, loading, error, retry }
}
