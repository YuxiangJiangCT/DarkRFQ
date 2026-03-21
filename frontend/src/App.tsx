import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ethers } from 'ethers'
import Header from './components/Header'
import Home from './pages/Home'
import CreateRFQ from './pages/CreateRFQ'
import RFQDetail from './pages/RFQDetail'

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      on: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void
    }
  }
}

function App() {
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask')
      return
    }
    const p = new ethers.BrowserProvider(window.ethereum)
    const accounts: string[] = await p.send('eth_requestAccounts', [])
    const s = await p.getSigner()
    setProvider(p)
    setSigner(s)
    setAccount(accounts[0])
  }, [])

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
  }, [])

  return (
    <div className="max-w-[1120px] mx-auto px-5">
      <Header account={account} onConnect={connect} />

      <main className="py-8 min-h-[calc(100vh-80px)] animate-page-fade">
        <Routes>
          <Route path="/" element={<Home provider={provider} />} />
          <Route
            path="/create"
            element={<CreateRFQ signer={signer} account={account} />}
          />
          <Route
            path="/rfq/:id"
            element={
              <RFQDetail
                provider={provider}
                signer={signer}
                account={account}
              />
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App
