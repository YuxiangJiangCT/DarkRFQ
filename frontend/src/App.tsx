import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { ethers } from 'ethers'
import Home from './pages/Home'
import CreateRFQ from './pages/CreateRFQ'
import RFQDetail from './pages/RFQDetail'
import { shortenAddress } from './contracts'

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
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">
          DarkRFQ
        </Link>
        <nav className="nav">
          <Link to="/">RFQs</Link>
          <Link to="/create">Create</Link>
        </nav>
        <div className="wallet">
          {account ? (
            <span className="account">{shortenAddress(account)}</span>
          ) : (
            <button onClick={connect} className="btn btn-primary">
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <main className="main">
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
