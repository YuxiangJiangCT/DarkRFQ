import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ethers } from 'ethers'
import { useToast } from './contexts/ToastContext'
import { useNetwork } from './hooks/useNetwork'
import Header from './components/Header'
import Home from './pages/Home'
import CreateRFQ from './pages/CreateRFQ'
import RFQDetail from './pages/RFQDetail'

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      on: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

function App() {
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const { addToast } = useToast()
  const { isCorrectNetwork, networkName, switchToSepolia } = useNetwork()

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      addToast('error', 'Please install MetaMask to use DarkRFQ')
      return
    }
    try {
      const p = new ethers.BrowserProvider(window.ethereum)
      const accounts: string[] = await p.send('eth_requestAccounts', [])
      const s = await p.getSigner()
      setProvider(p)
      setSigner(s)
      setAccount(accounts[0])
      addToast('success', 'Wallet connected')
    } catch {
      addToast('error', 'Failed to connect wallet')
    }
  }, [addToast])

  useEffect(() => {
    if (!window.ethereum) return
    const p = new ethers.BrowserProvider(window.ethereum)
    p.send('eth_accounts', []).then((accounts: string[]) => {
      if (accounts.length > 0) {
        p.getSigner().then((s) => {
          setProvider(p)
          setSigner(s)
          setAccount(accounts[0])
        })
      }
    })

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[]
      if (accounts.length === 0) {
        setAccount(null)
        setSigner(null)
        addToast('info', 'Wallet disconnected')
      } else {
        const newP = new ethers.BrowserProvider(window.ethereum!)
        newP.getSigner().then((s) => {
          setProvider(newP)
          setSigner(s)
          setAccount(accounts[0])
        })
      }
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
    }
  }, [addToast])

  return (
    <div className="max-w-[1120px] mx-auto px-5">
      <Header account={account} onConnect={connect} networkName={account ? networkName : undefined} />

      {/* Wrong network banner */}
      {account && !isCorrectNetwork && (
        <div className="mt-4 p-4 rounded-xl bg-sell/10 border border-sell/20 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-sell font-medium">Wrong Network</p>
            <p className="text-xs text-text-dim mt-0.5">DarkRFQ is deployed on Sepolia. Please switch to continue.</p>
          </div>
          <button
            onClick={switchToSepolia}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-accent-hover text-[#08090D] text-sm font-semibold cursor-pointer transition-all duration-200 border-none whitespace-nowrap"
          >
            Switch to Sepolia
          </button>
        </div>
      )}

      <main className="py-8 min-h-[calc(100vh-80px)] animate-page-fade">
        <Routes>
          <Route path="/" element={<Home provider={provider} />} />
          <Route
            path="/create"
            element={<CreateRFQ signer={signer} account={account} isCorrectNetwork={isCorrectNetwork} />}
          />
          <Route
            path="/rfq/:id"
            element={
              <RFQDetail
                provider={provider}
                signer={signer}
                account={account}
                isCorrectNetwork={isCorrectNetwork}
              />
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App
