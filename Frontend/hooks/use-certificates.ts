// hooks/use-certificates.ts
import { useState, useEffect } from 'react'

interface Certificate {
  id: number
  name: string
  issuer: string
  issueDate: string
  expiryDate: string
  status: string
  tokenId: string
  description: string
  course: string
  grade: string
  recipient_name?: string
  metadata_uri?: string
}

interface Student {
  name: string
  email: string
  wallet_address: string
}

interface CertificatesResponse {
  success: boolean
  message: string
  student?: Student
  certificates: Certificate[]
}

interface CertificatesState {
  certificates: Certificate[]
  student: Student | null
  loading: boolean
  error: string | null
}

export function useCertificates() {
  const [state, setState] = useState<CertificatesState>({
    certificates: [],
    student: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    fetchCertificates()
  }, [])

  const fetchCertificates = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const response = await fetch(`/api/certificates/my`, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: CertificatesResponse = await response.json()
      
      if (data.success) {
        setState({
          certificates: data.certificates || [],
          student: data.student || null,
          loading: false,
          error: null
        })
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.message || 'Failed to fetch certificates'
        }))
      }
    } catch (error) {
      console.error('Error fetching certificates:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch certificates'
      }))
    }
  }

  const refreshCertificates = () => {
    fetchCertificates()
  }

  const claimCertificate = async (tokenId: string) => {
    try {
      const response = await fetch(`/api/certificates/${tokenId}/claim`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        // Refresh certificates after successful claim
        await fetchCertificates()
        return { success: true, data: data.data }
      } else {
        return { 
          success: false, 
          error: data.error || data.message || 'Failed to claim certificate' 
        }
      }
    } catch (error) {
      console.error('Error claiming certificate:', error)
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      }
    }
  }

  return {
    certificates: state.certificates,
    student: state.student,
    loading: state.loading,
    error: state.error,
    refreshCertificates,
    claimCertificate
  }
}