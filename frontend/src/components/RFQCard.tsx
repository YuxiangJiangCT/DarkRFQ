import { Link } from 'react-router-dom'
import { RFQStatus, timeRemaining, type RFQInfo } from '../contracts'
import StatusBadge from './StatusBadge'

interface Props {
  rfq: RFQInfo
}

export default function RFQCard({ rfq }: Props) {
  return (
    <Link to={`/rfq/${rfq.id}`} className="rfq-card">
      <div className="card-top">
        <span className={`badge badge-${rfq.isBuy ? 'buy' : 'sell'}`}>
          {rfq.isBuy ? 'BUY' : 'SELL'}
        </span>
        <StatusBadge status={rfq.status} />
      </div>
      <h3 className="card-label">{rfq.label}</h3>
      <div className="card-details">
        <div className="detail">
          <span className="detail-label">Amount</span>
          <span className="detail-value">{rfq.amount.toString()}</span>
        </div>
        <div className="detail">
          <span className="detail-label">Quotes</span>
          <span className="detail-value">{rfq.quoteCount.toString()}</span>
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

      {/* Privacy indicator for OPEN/CLOSED */}
      {rfq.status !== RFQStatus.REVEALED && (
        <div className="card-privacy">
          <span className="lock-icon">&#x1f512;</span> All quotes encrypted
        </div>
      )}

      {/* Winner for REVEALED */}
      {rfq.status === RFQStatus.REVEALED && (
        <div className="card-winner">
          Winner: {rfq.revealedWinningPrice.toString()} by{' '}
          {rfq.revealedWinningMaker.slice(0, 8)}...
        </div>
      )}
    </Link>
  )
}
