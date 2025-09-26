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
      // Request account access
      const accounts = await window.ethereum!.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      await updateWalletInfo(accounts[0])
      
    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      let errorMessage = "Không thể kết nối với ví MetaMask."
      
      if (error.code === 4001) {
        errorMessage = "Kết nối bị từ chối bởi người dùng."
      } else if (error.code === -32002) {
        errorMessage = "Yêu cầu kết nối đang chờ xử lý. Vui lòng kiểm tra MetaMask."
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

  const disconnectWallet = useCallback((): void => {
    setWalletInfo(null)
    setError(null)
    toast({
      title: "Đã ngắt kết nối ví",
      description: "Ví blockchain đã được ngắt kết nối",
    })
  }, [toast])

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
        // If user has a wallet address in the backend, try to connect to it
        await checkConnection()
      }
    } catch (error) {
      console.error('Error loading wallet from backend:', error)
      // Don't show error toast here as this is background loading
    }
  }, [checkConnection])

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
          // User disconnected
          disconnectWallet()
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

  return {
    walletInfo,
    isConnecting,
    error,
    isMetaMaskInstalled,
    connectWallet,
    disconnectWallet,
    copyAddress,
    openInExplorer,
    formatAddress,
    refreshWallet: checkConnection
  }
}