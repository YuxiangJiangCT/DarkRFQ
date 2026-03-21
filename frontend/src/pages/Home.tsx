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

  const totalQuotes = rfqs.reduce((sum, r) => sum + Number(r.quoteCount), 0)

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between mb-8 pb-6 border-b border-border">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight mb-1">
            Request for <span className="bg-gradient-to-r from-accent to-accent/60 bg-clip-text text-transparent">Quotes</span>
          </h1>
          <p className="text-sm text-text-muted max-w-md">
            Encrypted bidding powered by Fhenix FHE &mdash; only the winning quote is revealed.
          </p>
        </div>
        <div className="flex items-center gap-6">
          {provider && (
            <div className="flex items-center gap-4 text-xs text-text-dim">
              <span><span className="font-mono text-text-primary">{rfqs.length}</span> RFQs</span>
              <span><span className="font-mono text-text-primary">{totalQuotes}</span> quotes</span>
            </div>
          )}
          <Link
            to="/create"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-accent-hover text-base text-sm font-medium no-underline transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.15)] hover:shadow-[0_0_30px_rgba(0,255,163,0.25)]"
          >
            + New RFQ
          </Link>
        </div>
      </div>

      {/* Content */}
      {!provider && (
        <div className="text-center py-20">
          <p className="text-text-muted text-sm mb-2">Connect your wallet to view active RFQs.</p>
          <p className="text-text-dim text-xs">Makers submit encrypted quotes. The contract selects the best price homomorphically.</p>
        </div>
      )}

      {provider && loading && (
        <div className="text-center py-20 text-text-muted text-sm">Loading...</div>
      )}

      {provider && !loading && rfqs.length === 0 && (
        <div className="text-center py-20">
          <p className="text-text-muted text-sm mb-4">No active RFQs. Create the first one.</p>
        </div>
      )}

      {provider && !loading && rfqs.length > 0 && (
        <div className="flex flex-col gap-3">
          {rfqs.map((rfq, i) => (
            <RFQCard key={rfq.id} rfq={rfq} index={i} />
          ))}
        </div>
      )}

      {/* Protocol info */}
      <div className="mt-16 pt-8 border-t border-border">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1 h-1 rounded-full bg-accent" />
              <h3 className="font-display font-semibold text-accent text-sm">FHE Encryption</h3>
            </div>
            <p className="text-text-dim text-xs leading-relaxed">Prices encrypted client-side with Fhenix CoFHE. Comparisons happen entirely in the encrypted domain.</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1 h-1 rounded-full bg-accent" />
              <h3 className="font-display font-semibold text-accent text-sm">Sealed-Bid Fairness</h3>
            </div>
            <p className="text-text-dim text-xs leading-relaxed">No front-running, no information leakage. Every maker competes on equal footing.</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1 h-1 rounded-full bg-accent" />
              <h3 className="font-display font-semibold text-accent text-sm">Selective Reveal</h3>
            </div>
            <p className="text-text-dim text-xs leading-relaxed">Choose what to reveal — price only, maker only, or both. Unrevealed fields stay encrypted forever.</p>
          </div>
        </div>
      </div>
    </>
  )
}
