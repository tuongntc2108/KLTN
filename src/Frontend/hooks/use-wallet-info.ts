// hooks/use-wallet-info.ts
"use client"

import { useState, useEffect, useCallback } from 'react'
import { useMetaMask } from './use-metamask'

interface WalletInfo {
  address: string | null
  network: string
  balance: string
  isConnected: boolean
  isMetaMaskConnected: boolean
}

export function useWalletInfo(studentWalletAddress?: string | null) {
  const { account, isConnected: metaMaskConnected, chainId } = useMetaMask()
  
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    address: null,
    network: 'Sepolia Testnet',
    balance: '0.00 ETH',
    isConnected: false,
    isMetaMaskConnected: false
  })

  const getNetworkName = useCallback((chainId: string): string => {
    const networks: { [key: string]: string } = {
      '0x1': 'Ethereum Mainnet',
      '0x89': 'Polygon Mainnet',
      '0x13881': 'Polygon Mumbai Testnet',
      '0xaa36a7': 'Sepolia Testnet',
      '0x5': 'Goerli Testnet'
    }
    return networks[chainId] || 'Sepolia Testnet'
  }, [])

  const getWalletBalance = useCallback(async (address: string): Promise<string> => {
    try {
      if (!window.ethereum) {
        return 'Cần kết nối ví để xem số dư'
      }

      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      })

      // Convert balance from wei to ether
      const balanceInEther = parseInt(balance, 16) / Math.pow(10, 18)
      return `${balanceInEther.toFixed(4)} ETH`
    } catch (error) {
      console.warn('Failed to fetch wallet balance:', error)
      return 'Không thể lấy số dư'
    }
  }, [])

  useEffect(() => {
    const updateWalletInfo = async () => {
      let address = null
      let balance = '0.00 ETH'
      let network = 'Sepolia Testnet'
      let isConnected = false
      let isMetaMaskConnected = false

      if (metaMaskConnected && account) {
        // Use MetaMask wallet if connected
        address = account
        network = getNetworkName(chainId || '0xaa36a7')
        isConnected = true
        isMetaMaskConnected = true
        
        // Get real balance from blockchain
        balance = await getWalletBalance(account)
      } else if (studentWalletAddress) {
        // Use database stored wallet address
        address = studentWalletAddress
        balance = 'Cần kết nối ví để xem số dư'
        network = 'Sepolia Testnet'
        isConnected = true
        isMetaMaskConnected = false
      }

      setWalletInfo({
        address,
        network,
        balance,
        isConnected,
        isMetaMaskConnected
      })
    }

    updateWalletInfo()
  }, [account, metaMaskConnected, chainId, studentWalletAddress, getNetworkName, getWalletBalance])

  return walletInfo
}