import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

interface WalletInfo {
  address: string
  network: string
  balance: string
  isConnected: boolean
  chainId?: string
}

interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>
  on: (event: string, callback: (...args: any[]) => void) => void
  removeListener: (event: string, callback: (...args: any[]) => void) => void
  isMetaMask?: boolean
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

export function useWallet() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const { toast } = useToast()

  const getNetworkName = useCallback((chainId: string): string => {
    const networks: { [key: string]: string } = {
      '0x1': 'Ethereum Mainnet',
      '0x89': 'Polygon Mainnet',
      '0x13881': 'Polygon Mumbai Testnet',
      '0xaa36a7': 'Sepolia Testnet',
      '0x5': 'Goerli Testnet'
    }
    return networks[chainId] || `Unknown Network (${chainId})`
  }, [])

  const saveWalletToBackend = useCallback(async (walletAddress: string): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/students/me/wallet`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ wallet_address: walletAddress }),
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        toast({
          title: "Kết nối ví thành công",
          description: "Địa chỉ ví đã được lưu vào hệ thống.",
        })
        return true
      } else {
        throw new Error(data.details || data.error || 'Failed to save wallet address')
      }
    } catch (error) {
      console.error('Error saving wallet to backend:', error)
      toast({
        title: "Cảnh báo",
        description: "Ví đã kết nối nhưng không thể lưu vào hệ thống. Vui lòng liên hệ hỗ trợ.",
        variant: "destructive",
      })
      return false
    }
  }, [toast])

  const updateWalletInfo = useCallback(async (address: string): Promise<void> => {
    try {
      if (!window.ethereum) return

      // Get network info
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      })

      // Convert balance from wei to ether
      const balanceInEther = parseInt(balance, 16) / Math.pow(10, 18)
      
      // Get network name
      const networkName = getNetworkName(chainId)
      
      const walletData: WalletInfo = {
        address,
        network: networkName,
        balance: `${balanceInEther.toFixed(4)} ETH`,
        isConnected: true,
        chainId
      }

      setWalletInfo(walletData)
      setError(null)
      
      // Save wallet address to backend
      await saveWalletToBackend(address)
      
    } catch (error) {
      console.error('Error updating wallet info:', error)
      toast({
        title: "Lỗi cập nhật thông tin ví",
        description: "Không thể lấy thông tin ví. Vui lòng thử lại.",
        variant: "destructive",
      })
    }
  }, [getNetworkName, saveWalletToBackend, toast])

  const checkConnection = useCallback(async (): Promise<void> => {
    try {
      if (!window.ethereum) return
      
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length > 0) {
        await updateWalletInfo(accounts[0])
      }
    } catch (error) {
      console.error('Error checking connection:', error)
    }
  }, [updateWalletInfo])

  const connectWallet = useCallback(async (): Promise<void> => {
    if (!isMetaMaskInstalled) {
      toast({
        title: "MetaMask không được cài đặt",
        description: "Vui lòng cài đặt MetaMask để tiếp tục.",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    setError(null)
    
    try {
      // Clear any existing wallet state first
      setWalletInfo(null)
      
      // Method 1: Try to use wallet_requestPermissions to force account selection
      let accounts: string[] = []
      try {
        console.log('Attempting to request wallet permissions...')
        await window.ethereum!.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        })
        
        // After permissions, get accounts
        accounts = await window.ethereum!.request({
          method: 'eth_accounts'
        })
        
        console.log('Accounts after permission request:', accounts)
      } catch (permError: any) {
        console.log('Wallet permissions request failed:', permError)
        
        // Method 2: Fall back to standard request which should still show selection
        try {
          accounts = await window.ethereum!.request({
            method: 'eth_requestAccounts'
          })
          console.log('Accounts from standard request:', accounts)
        } catch (requestError) {
          console.log('Standard request also failed, trying alternative approach')
          
          // Method 3: Try to disconnect first, then reconnect
          try {
            // This might help reset the connection
            await window.ethereum!.request({
              method: 'eth_accounts'
            })
            
            accounts = await window.ethereum!.request({
              method: 'eth_requestAccounts'
            })
            console.log('Accounts after reset approach:', accounts)
          } catch (finalError) {
            throw finalError
          }
        }
      }

      if (accounts.length === 0) {
        throw new Error('No accounts found or selected')
      }

      console.log('Final selected account:', accounts[0])
      toast({
        title: "Đang kết nối...",
        description: `Kết nối với account: ${accounts[0].slice(0, 8)}...${accounts[0].slice(-4)}`,
      })
      
      await updateWalletInfo(accounts[0])
      
      // After successful connection, refresh from backend to ensure sync
      setTimeout(() => {
        loadWalletFromBackend()
      }, 1000)
      
    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      let errorMessage = "Không thể kết nối với ví MetaMask."
      
      if (error.code === 4001) {
        errorMessage = "Kết nối bị từ chối bởi người dùng."
      } else if (error.code === -32002) {
        errorMessage = "Yêu cầu kết nối đang chờ xử lý. Vui lòng kiểm tra MetaMask."
      } else if (error.code === 4100) {
        errorMessage = "Account chưa được authorize. Vui lòng mở MetaMask và kết nối account."
      }
      
      setError(errorMessage)
      toast({
        title: "Lỗi kết nối ví",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }, [isMetaMaskInstalled, updateWalletInfo, toast])



  const copyAddress = useCallback((): void => {
    if (walletInfo?.address) {
      navigator.clipboard.writeText(walletInfo.address)
      toast({
        title: "Đã sao chép",
        description: "Địa chỉ ví đã được sao chép vào clipboard",
      })
    }
  }, [walletInfo?.address, toast])

  const openInExplorer = useCallback((): void => {
    if (walletInfo?.address) {
      let explorerUrl = ''
      if (walletInfo.chainId === '0x89') {
        explorerUrl = `https://polygonscan.com/address/${walletInfo.address}`
      } else if (walletInfo.chainId === '0x1') {
        explorerUrl = `https://etherscan.io/address/${walletInfo.address}`
      } else {
        toast({
          title: "Không hỗ trợ",
          description: "Explorer không hỗ trợ cho mạng này.",
          variant: "destructive",
        })
        return
      }
      window.open(explorerUrl, '_blank')
    }
  }, [walletInfo, toast])

  const formatAddress = useCallback((address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [])

  const clearWalletFromBackend = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/students/me/wallet`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ wallet_address: null }),
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        // Clear wallet info after successful removal from backend
        setWalletInfo(null)
        setError(null)
        
        toast({
          title: "Đã xóa kết nối ví",
          description: "Địa chỉ ví đã được xóa khỏi hệ thống.",
        })
        return true
      } else {
        throw new Error(data.details || data.error || 'Failed to clear wallet address')
      }
    } catch (error) {
      console.error('Error clearing wallet from backend:', error)
      toast({
        title: "Lỗi",
        description: "Không thể xóa địa chỉ ví khỏi hệ thống.",
        variant: "destructive",
      })
      return false
    }
  }, [toast])

  // Load wallet info from backend on component mount
  const loadWalletFromBackend = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/students/me/wallet`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      const data = await response.json()
      
      if (response.ok && data.success && data.student.wallet_address) {
        console.log('Backend has wallet address:', data.student.wallet_address)
        
        // Check if MetaMask is connected to the same address
        try {
          const accounts = await window.ethereum?.request({ method: 'eth_accounts' }) || []
          if (accounts.length > 0) {
            const currentAccount = accounts[0].toLowerCase()
            const savedWallet = data.student.wallet_address.toLowerCase()
            
            console.log('Current MetaMask account:', currentAccount)
            console.log('Saved wallet address:', savedWallet)
            
            if (currentAccount === savedWallet) {
              console.log('Addresses match, updating wallet info...')
              await updateWalletInfo(accounts[0])
            } else {
              console.log('Addresses do not match, user needs to connect the correct account')
            }
          } else {
            console.log('No MetaMask accounts connected')
          }
        } catch (error) {
          console.error('Error checking MetaMask accounts:', error)
        }
      } else {
        console.log('No wallet address in backend')
      }
    } catch (error) {
      console.error('Error loading wallet from backend:', error)
    }
  }, [updateWalletInfo])

  // Initialize
  useEffect(() => {
    const checkMetaMask = () => {
      if (typeof window !== 'undefined' && window.ethereum?.isMetaMask) {
        setIsMetaMaskInstalled(true)
      } else {
        setIsMetaMaskInstalled(false)
      }
    }

    checkMetaMask()

    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected - clear wallet info
          setWalletInfo(null)
          setError(null)
        } else {
          // Account changed, update wallet info
          updateWalletInfo(accounts[0])
        }
      }

      const handleChainChanged = (chainId: string) => {
        // Update network info when chain changes
        // Get the current account from MetaMask instead of using walletInfo
        window.ethereum?.request({ method: 'eth_accounts' })
          .then((accounts: string[]) => {
            if (accounts.length > 0) {
              updateWalletInfo(accounts[0])
            }
          })
          .catch((error: any) => {
            console.error('Error getting accounts after chain change:', error)
          })
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
          window.ethereum.removeListener('chainChanged', handleChainChanged)
        }
      }
    }
  }, []) // Only run once on mount

  // Separate effect for initial wallet loading
  useEffect(() => {
    if (isMetaMaskInstalled && !isInitialized) {
      setIsInitialized(true)
      loadWalletFromBackend()
    }
  }, [isMetaMaskInstalled, isInitialized, loadWalletFromBackend])

  const refreshWalletState = useCallback(async (): Promise<void> => {
    console.log('Refreshing wallet state...')
    await loadWalletFromBackend()
  }, [loadWalletFromBackend])

  return {
    walletInfo,
    isConnecting,
    error,
    isMetaMaskInstalled,
    connectWallet,
    copyAddress,
    openInExplorer,
    formatAddress,
    clearWalletFromBackend,
    refreshWallet: checkConnection,
    refreshWalletState
  }
}