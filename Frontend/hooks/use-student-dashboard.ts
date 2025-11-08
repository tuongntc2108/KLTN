// hooks/use-student-dashboard.ts
"use client"

import { useState, useEffect } from 'react'
import { useWalletInfo } from './use-wallet-info'

interface StudentStats {
  totalCertificates: number
  activeCertificates: number
  pendingCertificates: number
  expiringCertificates: number
}

interface RecentCertificate {
  id: number
  name: string
  issuer: string
  issue_date: string
  status: 'Active' | 'Pending' | 'Expired' | 'Revoked' | 'Replaced'
  token_id: string
  course: string
}

interface WalletInfo {
  address: string | null
  network: string
  balance: string
  isConnected: boolean
}

interface StudentDashboardData {
  stats: StudentStats
  recentCertificates: RecentCertificate[]
  walletInfo: WalletInfo
  loading: boolean
  error: string | null
}

export function useStudentDashboard() {
  const [studentWalletAddress, setStudentWalletAddress] = useState<string | null>(null)
  const walletInfo = useWalletInfo(studentWalletAddress)
  
  const [state, setState] = useState<StudentDashboardData>({
    stats: {
      totalCertificates: 0,
      activeCertificates: 0,
      pendingCertificates: 0,
      expiringCertificates: 0,
    },
    recentCertificates: [],
    walletInfo: {
      address: null,
      network: 'Polygon Testnet',
      balance: '0.00 MATIC',
      isConnected: false,
    },
    loading: true,
    error: null
  })

  useEffect(() => {
    fetchStudentDashboard()
  }, [])

  const fetchStudentDashboard = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Fetch student certificates and stats
      const certificatesResponse = await fetch('/api/certificates/my', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!certificatesResponse.ok) {
        throw new Error('Failed to fetch certificates')
      }

      const certificatesData = await certificatesResponse.json()
      
      if (certificatesData.success) {
        const certificates = certificatesData.certificates || []
        const student = certificatesData.student

        // Calculate stats
        const totalCertificates = certificates.length
        const activeCertificates = certificates.filter((cert: any) => cert.status === 'Active').length
        const pendingCertificates = certificates.filter((cert: any) => cert.status === 'Pending').length
        
        // Calculate expiring certificates (within 30 days)
        const now = new Date()
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
        const expiringCertificates = certificates.filter((cert: any) => {
          if (cert.expiry_date) {
            const expiryDate = new Date(cert.expiry_date)
            return expiryDate <= thirtyDaysFromNow && expiryDate > now
          }
          return false
        }).length

        // Get recent certificates (last 3)
        const recentCertificates = certificates
          .sort((a: any, b: any) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())
          .slice(0, 3)
          .map((cert: any) => ({
            id: cert.id,
            name: cert.name || cert.course || 'Unnamed Certificate',
            issuer: cert.issuer || 'Unknown Issuer',
            issue_date: cert.issue_date,
            status: cert.status,
            token_id: cert.token_id || '',
            course: cert.course || cert.name || 'Unknown Course'
          }))

        // Update student wallet address for wallet info hook
        setStudentWalletAddress(student?.wallet_address || null)

        setState({
          stats: {
            totalCertificates,
            activeCertificates,
            pendingCertificates,
            expiringCertificates,
          },
          recentCertificates,
          walletInfo: {
            address: null,
            network: 'Polygon Testnet',
            balance: '0.00 MATIC',
            isConnected: false,
          },
          loading: false,
          error: null
        })
      } else {
        throw new Error(certificatesData.message || 'Failed to fetch dashboard data')
      }
    } catch (error) {
      console.error('Error fetching student dashboard:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      }))
    }
  }

  const refreshData = () => {
    fetchStudentDashboard()
  }

  return {
    stats: state.stats,
    recentCertificates: state.recentCertificates,
    walletInfo: walletInfo, // Use real wallet info from useWalletInfo hook
    loading: state.loading,
    error: state.error,
    refreshData
  }
}