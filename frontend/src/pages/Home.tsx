import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import {
  getContract,
  parseRFQInfo,
  statusLabel,
  timeRemaining,
  RFQStatus,
  type RFQInfo,
} from '../contracts'

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
        <Link to="/create" className="btn btn-primary">
          Create the first one
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
          <Link to={`/rfq/${rfq.id}`} key={rfq.id} className="rfq-card">
            <div className="card-top">
              <span className={`badge badge-${rfq.isBuy ? 'buy' : 'sell'}`}>
                {rfq.isBuy ? 'BUY' : 'SELL'}
              </span>
              <span className={`badge badge-status-${rfq.status}`}>
                {statusLabel(rfq.status)}
              </span>
            </div>
            <h3 className="card-label">{rfq.label}</h3>
            <div className="card-details">
              <div className="detail">
                <span className="detail-label">Amount</span>
                <span className="detail-value">{rfq.amount.toString()}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Quotes</span>
                <span className="detail-value">
                  {rfq.quoteCount.toString()}
                </span>
              </div>
              <div className="detail">
                <span className="detail-label">
                  {rfq.status === RFQStatus.OPEN ? 'Ends in' : 'Deadline'}
                </span>
                <span className="detail-value">
                  {rfq.status === RFQStatus.OPEN
                    ? timeRemaining(rfq.deadline)
                    : 'Passed'}
                </span>
              </div>
            </div>
            {rfq.status === RFQStatus.REVEALED && (
              <div className="card-winner">
                Winner: {rfq.revealedWinningPrice.toString()} by{' '}
                {rfq.revealedWinningMaker.slice(0, 8)}...
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
