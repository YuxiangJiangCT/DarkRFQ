import { Link } from 'react-router-dom'
import { RFQStatus, RevealPolicy, revealPolicyLabel, type RFQInfo } from '../contracts'
import { useCountdown } from '../hooks/useCountdown'
import StatusBadge from './StatusBadge'

interface Props {
  rfq: RFQInfo
  index?: number
}

export default function RFQCard({ rfq, index = 0 }: Props) {
  const isOpen = rfq.status === RFQStatus.OPEN
  const isRevealed = rfq.status === RFQStatus.REVEALED
  const countdown = useCountdown(rfq.deadline)

  return (
    <Link
      to={`/rfq/${rfq.id}`}
      className="relative overflow-hidden block bg-surface border border-border rounded-xl p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_8px_32px_rgba(0,255,163,0.06)] no-underline animate-card-enter before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-accent/60 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-200"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Top row: label + status */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-semibold text-text-primary text-base">
          {rfq.label}
        </span>
        <StatusBadge status={rfq.status} />
      </div>

      {/* Data row */}
      <div className="flex items-center gap-4 text-sm">
        <span className={`font-mono text-xs font-medium ${rfq.isBuy ? 'text-buy' : 'text-sell'}`}>
          {rfq.isBuy ? 'BUY' : 'SELL'}
        </span>
        <span className="text-text-dim">Amt {rfq.amount.toString()}</span>
        <span className="text-text-dim">{Number(rfq.quoteCount)} quote{Number(rfq.quoteCount) !== 1 ? 's' : ''}</span>
        {rfq.revealPolicy !== RevealPolicy.BOTH && (
          <span className="text-text-dim text-xs">{revealPolicyLabel(rfq.revealPolicy)}</span>
        )}
        <span className={`ml-auto text-xs font-mono ${
          isOpen
            ? countdown.urgent ? 'text-sell' : countdown.expired ? 'text-sell' : 'text-text-dim'
            : 'text-text-dim'
        }`} style={isOpen && countdown.urgent ? { animation: 'urgent-flash 1s ease-in-out infinite' } : undefined}>
          {isOpen ? countdown.display : 'ended'}
        </span>
      </div>

      {/* Bottom: encrypted state or revealed data */}
      {!isRevealed && (
        <div className="mt-3 pt-3 border-t border-border text-xs text-text-dim flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full bg-accent"
            style={{ animation: 'pulse-dot 2s ease-in-out infinite' }}
          />
          All quotes encrypted on-chain
        </div>
      )}

      {isRevealed && (
        <div className="mt-3 pt-3 border-t border-border text-xs font-mono text-accent">
          {rfq.revealPolicy !== RevealPolicy.MAKER_ONLY && (
            <>Winner: {rfq.revealedWinningPrice.toString()}</>
          )}
          {rfq.revealPolicy === RevealPolicy.BOTH && ' · '}
          {rfq.revealPolicy !== RevealPolicy.PRICE_ONLY && (
            <>{rfq.revealedWinningMaker.slice(0, 10)}...</>
          )}
        </div>
      )}
    </Link>
  )
}
