// hooks/use-certificates.ts
import { useState, useEffect } from 'react'
import { useMetaMask } from './use-metamask'

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
  
  const { claimCertificate: metamaskClaim, isConnected, account } = useMetaMask()

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
      // First, claim on blockchain using MetaMask
      if (!isConnected || !account) {
        return {
          success: false,
          error: 'Please connect your MetaMask wallet first'
        }
      }

      console.log(`🔄 Claiming certificate ${tokenId} via MetaMask...`)
      const blockchainResult = await metamaskClaim(tokenId)
      
      if (!blockchainResult.success) {
        return {
          success: false,
          error: 'Failed to claim certificate on blockchain'
        }
      }

      console.log(`✅ Certificate ${tokenId} claimed on blockchain:`, blockchainResult.transactionHash)

      // Then, sync the status with backend
      const syncResponse = await fetch(`/api/certificates/${tokenId}/sync-status`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionHash: blockchainResult.transactionHash,
          blockNumber: blockchainResult.blockNumber
        })
      })

      if (syncResponse.ok) {
        // Refresh certificates after successful claim
        await fetchCertificates()
        return { 
          success: true, 
          data: {
            token_id: tokenId,
            status: "Active",
            transaction_hash: blockchainResult.transactionHash,
            claimed_at: new Date().toISOString()
          }
        }
      } else {
        console.warn('Failed to sync with backend, but blockchain claim was successful')
        // Still return success since blockchain claim worked
        await fetchCertificates()
        return { 
          success: true, 
          data: {
            token_id: tokenId,
            status: "Active",
            transaction_hash: blockchainResult.transactionHash,
            claimed_at: new Date().toISOString()
          }
        }
      }
    } catch (error: any) {
      console.error('Error claiming certificate:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to claim certificate' 
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