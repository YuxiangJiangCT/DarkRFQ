import { useState, useEffect, useCallback } from 'react'

const SEPOLIA_CHAIN_ID = 11155111
const SEPOLIA_HEX = '0xaa36a7'

const NETWORK_NAMES: Record<number, string> = {
  1: 'Mainnet',
  5: 'Goerli',
  11155111: 'Sepolia',
  137: 'Polygon',
  42161: 'Arbitrum',
  10: 'Optimism',
  8453: 'Base',
  31337: 'Localhost',
}

export function useNetwork() {
  const [chainId, setChainId] = useState<number | null>(null)

  useEffect(() => {
    if (!window.ethereum) return

    // Get initial chain
    window.ethereum
      .request?.({ method: 'eth_chainId' })
      .then((hex: string) => setChainId(parseInt(hex, 16)))
      .catch(() => {})

    // Listen for changes
    const handleChainChanged = (...args: unknown[]) => {
      const hex = args[0] as string
      setChainId(parseInt(hex, 16))
    }

    window.ethereum.on('chainChanged', handleChainChanged)
    return () => {
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [])

  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID
  const networkName = chainId ? (NETWORK_NAMES[chainId] || `Chain ${chainId}`) : 'Unknown'

  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) return
    try {
      await window.ethereum.request?.({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_HEX }],
      })
    } catch (err: unknown) {
      // Chain not added — try adding it
      if ((err as { code?: number })?.code === 4902) {
        await window.ethereum.request?.({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: SEPOLIA_HEX,
            chainName: 'Sepolia Testnet',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        })
      }
    }
  }, [])

  return { chainId, isCorrectNetwork, networkName, switchToSepolia }
}
