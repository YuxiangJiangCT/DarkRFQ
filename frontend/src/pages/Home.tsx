import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { getContract, parseRFQInfo, RFQStatus, type RFQInfo } from '../contracts'
import RFQCard from '../components/RFQCard'
import { SkeletonCard } from '../components/Skeleton'

interface Props {
  provider: ethers.BrowserProvider | null
}

type StatusFilter = 'all' | 'open' | 'closed' | 'revealed'

const filterMap: Record<StatusFilter, number | null> = {
  all: null,
  open: RFQStatus.OPEN,
  closed: RFQStatus.CLOSED,
  revealed: RFQStatus.REVEALED,
}

export default function Home({ provider }: Props) {
  const [rfqs, setRfqs] = useState<RFQInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

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

  const filtered = rfqs
    .filter(r => {
      const target = filterMap[statusFilter]
      return target === null || r.status === target
    })
    .filter(r => !search || r.label.toLowerCase().includes(search.toLowerCase()))

  const filterBtn = (value: StatusFilter, label: string) => (
    <button
      onClick={() => setStatusFilter(value)}
      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors border-none ${
        statusFilter === value
          ? 'bg-accent/10 text-accent'
          : 'bg-transparent text-text-dim hover:text-text-muted'
      }`}
    >
      {label}
    </button>
  )

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-6 border-b border-border gap-4">
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
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-accent-hover text-[#08090D] text-sm font-semibold no-underline transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.15)] hover:shadow-[0_0_30px_rgba(0,255,163,0.25)]"
          >
            + New RFQ
          </Link>
        </div>
      </div>

      {/* Search + Filter */}
      {provider && !loading && rfqs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RFQs..."
            className="px-3 py-1.5 rounded-lg border border-border bg-base/80 text-text-primary text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-text-dim w-full sm:w-56"
          />
          <div className="flex gap-1">
            {filterBtn('all', 'All')}
            {filterBtn('open', 'Open')}
            {filterBtn('closed', 'Closed')}
            {filterBtn('revealed', 'Revealed')}
          </div>
        </div>
      )}

      {/* Content */}
      {!provider && (
        <div className="text-center py-20">
          <p className="text-text-muted text-sm mb-2">Connect your wallet to view active RFQs.</p>
          <p className="text-text-dim text-xs">Makers submit encrypted quotes. The contract selects the best price homomorphically.</p>
        </div>
      )}

      {provider && loading && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} index={i} />)}
        </div>
      )}

      {provider && !loading && rfqs.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="border border-dashed border-border rounded-2xl p-12 flex flex-col items-center gap-4">
            <svg className="w-12 h-12 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <h2 className="font-display text-xl font-semibold text-text-primary">No RFQs yet</h2>
            <p className="text-sm text-text-muted text-center max-w-xs">Create the first encrypted RFQ on Fhenix. Makers will submit sealed-bid quotes using FHE.</p>
            <Link
              to="/create"
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-accent to-accent-hover text-[#08090D] text-sm font-semibold no-underline transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.15)] hover:shadow-[0_0_30px_rgba(0,255,163,0.25)]"
            >
              + Create First RFQ
            </Link>
          </div>
        </div>
      )}

      {provider && !loading && rfqs.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.length > 0 ? (
            filtered.map((rfq, i) => (
              <RFQCard key={rfq.id} rfq={rfq} index={i} />
            ))
          ) : (
            <div className="text-center py-12 text-text-dim text-sm">
              No RFQs match your search.
            </div>
          )}
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
