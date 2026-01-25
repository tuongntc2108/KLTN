"use client"

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      on: (event: string, callback: (...args: any[]) => void) => void
      removeListener: (event: string, callback: (...args: any[]) => void) => void
    }
  }
}

interface MetaMaskState {
  isConnected: boolean
  account: string | null
  chainId: string | null
  isLoading: boolean
  error: string | null
}

const SEPOLIA_CHAIN_ID = '0xaa36a7' // 11155111 in hex
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xBe34829265F8a0609bd52e592CF43428056AE88a'

// Contract ABI for claimCertificate function
const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "claimCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

export function useMetaMask() {
  const [state, setState] = useState<MetaMaskState>({
    isConnected: false,
    account: null,
    chainId: null,
    isLoading: false,
    error: null
  })

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
  }

  // Connect to MetaMask
  const connect = async () => {
    if (!isMetaMaskInstalled()) {
      setState(prev => ({ ...prev, error: 'MetaMask is not installed' }))
      return false
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found')
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      const account = accounts[0]
      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      })

      setState({
        isConnected: true,
        account,
        chainId,
        isLoading: false,
        error: null
      })

      return true
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to connect to MetaMask'
      }))
      return false
    }
  }

  // Switch to Sepolia network
  const switchToSepolia = async () => {
    if (!isMetaMaskInstalled() || !window.ethereum) return false

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }]
      })
      return true
    } catch (error: any) {
      // If network doesn't exist, add it
      if (error.code === 4902) {
        try {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }
            ]
          })
          return true
        } catch (addError) {
          console.error('Failed to add Sepolia network:', addError)
          return false
        }
      }
      console.error('Failed to switch to Sepolia:', error)
      return false
    }
  }

  // Claim certificate using MetaMask
  const claimCertificate = async (tokenId: string) => {
    if (!state.isConnected || !state.account) {
      throw new Error('MetaMask not connected')
    }

    if (state.chainId !== SEPOLIA_CHAIN_ID) {
      const switched = await switchToSepolia()
      if (!switched) {
        throw new Error('Failed to switch to Sepolia network')
      }
    }

      try {
        if (!window.ethereum) {
          throw new Error('MetaMask not found')
        }

        // Create provider and signer using ethers.js v6
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()
        
        // Create contract instance
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

        // Call the function and wait for transaction
        const tx = await contract.claimCertificate(tokenId)
        console.log(`🔄 Transaction submitted: ${tx.hash}`)
        
        // Wait for transaction confirmation
        const receipt = await tx.wait()
        console.log("✅ Certificate claimed:", receipt.hash)

        return {
          success: true,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber
        }
    } catch (error: any) {
      console.error('Claim certificate error:', error)
      
      // Parse common errors
      if (error.code === 'ACTION_REJECTED' || error.message?.includes('User denied')) {
        throw new Error('Transaction was cancelled by user')
      }
      if (error.code === 'INSUFFICIENT_FUNDS' || error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient ETH for gas fees')
      }
      if (error.message?.includes('Certificate does not exist')) {
        throw new Error('Certificate does not exist')
      }
      if (error.message?.includes('Not the designated holder')) {
        throw new Error('You are not the designated holder of this certificate')
      }
      if (error.message?.includes('Certificate not available')) {
        throw new Error('Certificate is not available for claiming')
      }
      if (error.message?.includes('Certificate expired')) {
        throw new Error('Certificate has expired')
      }

      // Handle ethers.js v6 specific errors
      if (error.reason) {
        throw new Error(error.reason)
      }

      throw new Error(error.message || 'Failed to claim certificate')
    }
  }



  // Check connection status on mount
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      const checkConnection = async () => {
        try {
          if (window.ethereum) {
            const accounts = await window.ethereum.request({
              method: 'eth_accounts'
            })
            
            if (accounts.length > 0) {
              const chainId = await window.ethereum.request({
                method: 'eth_chainId'
              })
            
              setState({
                isConnected: true,
                account: accounts[0],
                chainId,
                isLoading: false,
                error: null
              })
            }
          }
        } catch (error) {
          console.error('Error checking MetaMask connection:', error)
        }
      }

      checkConnection()

      // Listen for account changes
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setState(prev => ({
            ...prev,
            isConnected: false,
            account: null,
            chainId: null,
            isLoading: false,
            error: null
          }))
        } else {
          setState(prev => ({ ...prev, account: accounts[0] }))
        }
      }

      // Listen for chain changes
      const handleChainChanged = (chainId: string) => {
        setState(prev => ({ ...prev, chainId }))
      }

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged)
        window.ethereum.on('chainChanged', handleChainChanged)

        return () => {
          if (window.ethereum) {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
            window.ethereum.removeListener('chainChanged', handleChainChanged)
          }
        }
      }
    }
  }, [])

  return {
    ...state,
    connect,
    switchToSepolia,
    claimCertificate,
    isMetaMaskInstalled: isMetaMaskInstalled()
  }
}
