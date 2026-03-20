import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { getContract, parseRFQInfo, type RFQInfo } from '../contracts'
import RFQCard from '../components/RFQCard'

interface Props {
  provider: ethers.BrowserProvider | null
}

export default function Home({ provider }: Props) {
  const [rfqs, setRfqs] = useState<RFQInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!provider) {
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        const contract = getContract(provider)
        const count = await contract.nextRfqId()
        const n = Number(count)
        const items: RFQInfo[] = []
        for (let i = 0; i < n; i++) {
          const result = await contract.getRFQInfo(i)
          items.push(parseRFQInfo(i, result))
        }
        setRfqs(items.reverse())
      } catch (err) {
        console.error('Failed to load RFQs:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [provider])

  if (!provider) {
    return (
      <div className="center-message">
        <h2>Connect your wallet to view RFQs</h2>
        <p className="subtitle">
          DarkRFQ is a privacy-native RFQ protocol. Makers submit encrypted
          quotes — only the winning quote is ever revealed.
        </p>
      </div>
    )
  }

  if (loading) {
    return <div className="center-message">Loading RFQs...</div>
  }

  if (rfqs.length === 0) {
    return (
      <div className="center-message">
        <h2>No RFQs yet</h2>
        <p className="subtitle">Create the first privacy-native RFQ.</p>
        <Link to="/create" className="btn btn-primary" style={{ marginTop: 16 }}>
          + New RFQ
        </Link>
      </div>
    )
  }

  return (
    <div className="rfq-list">
      <div className="page-header">
        <h1>Active RFQs</h1>
        <Link to="/create" className="btn btn-primary">
          + New RFQ
        </Link>
      </div>
      <div className="card-grid">
        {rfqs.map((rfq) => (
          <RFQCard key={rfq.id} rfq={rfq} />
        ))}
      </div>
    </div>
  )
}
