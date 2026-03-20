import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ethers } from 'ethers'
import {
  getContract,
  parseRFQInfo,
  formatDeadline,
  timeRemaining,
  shortenAddress,
  RFQStatus,
  type RFQInfo,
} from '../contracts'
import StatusBadge from '../components/StatusBadge'
import SubmitQuoteForm from '../components/SubmitQuoteForm'
import CloseButton from '../components/CloseButton'
import RevealPanel from '../components/RevealPanel'

interface Props {
  provider: ethers.BrowserProvider | null
  signer: ethers.Signer | null
  account: string | null
}

export default function RFQDetail({ provider, signer, account }: Props) {
  const { id } = useParams<{ id: string }>()
  const rfqId = Number(id)

  const [rfq, setRfq] = useState<RFQInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [alreadyQuoted, setAlreadyQuoted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadRFQ = useCallback(async () => {
    if (!provider) return
    try {
      const contract = getContract(provider)
      const result = await contract.getRFQInfo(rfqId)
      const info = parseRFQInfo(rfqId, result)
      setRfq(info)

      if (account) {
        const quoted = await contract.hasQuoted(rfqId, account)
        setAlreadyQuoted(quoted)
      }
    } catch (err) {
      console.error('Failed to load RFQ:', err)
    } finally {
      setLoading(false)
    }
  }, [provider, rfqId, account])

  useEffect(() => {
    loadRFQ()
  }, [loadRFQ])

  // Auto-refresh for OPEN RFQs
  useEffect(() => {
    if (!rfq || rfq.status !== RFQStatus.OPEN) return
    const interval = setInterval(loadRFQ, 10000)
    return () => clearInterval(interval)
  }, [rfq, loadRFQ])

  if (!provider) {
    return (
      <div className="center-message">
        <h2>Connect your wallet to view this RFQ</h2>
      </div>
    )
  }

  if (loading) {
    return <div className="center-message">Loading RFQ #{rfqId}...</div>
  }

  if (!rfq) {
    return <div className="center-message">RFQ not found</div>
  }

  const isRequester = account?.toLowerCase() === rfq.requester.toLowerCase()
  const deadlinePassed = Number(rfq.deadline) <= Math.floor(Date.now() / 1000)

  return (
    <div className="detail-page">
      <Link to="/" className="back-link">
        &larr; Back to RFQs
      </Link>

      <div className="detail-header">
        <h1>{rfq.label}</h1>
        <div className="detail-badges">
          <span className={`badge badge-${rfq.isBuy ? 'buy' : 'sell'}`}>
            {rfq.isBuy ? 'BUY' : 'SELL'}
          </span>
          <StatusBadge status={rfq.status} />
        </div>
      </div>

      <div className="detail-grid">
        {/* Left: Info */}
        <div className="info-card">
          <h3>Details</h3>
          <dl>
            <dt>Requester</dt>
            <dd>
              {shortenAddress(rfq.requester)} {isRequester && '(you)'}
            </dd>
            <dt>Amount</dt>
            <dd>{rfq.amount.toString()}</dd>
            <dt>Side</dt>
            <dd>{rfq.isBuy ? 'Buy (lowest wins)' : 'Sell (highest wins)'}</dd>
            <dt>Deadline</dt>
            <dd>{formatDeadline(rfq.deadline)}</dd>
            <dt>Time Remaining</dt>
            <dd>{timeRemaining(rfq.deadline)}</dd>
            <dt>Quotes</dt>
            <dd>{rfq.quoteCount.toString()}</dd>
          </dl>

          {/* Privacy indicator */}
          {rfq.status !== RFQStatus.REVEALED && (
            <div className="encrypted-state">
              <div className="encrypted-row">
                <span className="encrypted-label">Best Quote</span>
                <span className="encrypted-badge">
                  &#x1f512; ENCRYPTED
                </span>
              </div>
              <div className="encrypted-row">
                <span className="encrypted-label">Best Maker</span>
                <span className="encrypted-badge">
                  &#x1f512; ENCRYPTED
                </span>
              </div>
              <p className="encrypted-note">
                Best quote remains encrypted until reveal. No one can see any
                price during the quoting period.
              </p>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="action-card">
          {/* OPEN + before deadline: Quote form */}
          {rfq.status === RFQStatus.OPEN && !deadlinePassed && (
            <div className="action-section">
              <h3>Submit Quote</h3>
              {alreadyQuoted ? (
                <div className="info-msg">
                  <span className="lock-icon">&#x2713;</span> You have already
                  submitted an encrypted quote for this RFQ.
                </div>
              ) : !account || !signer ? (
                <div className="info-msg">
                  Connect wallet to submit a quote.
                </div>
              ) : (
                <SubmitQuoteForm
                  rfqId={rfqId}
                  provider={provider}
                  signer={signer}
                  onSuccess={() => {
                    setSuccess('Quote submitted successfully! Your price is encrypted on-chain.')
                    setAlreadyQuoted(true)
                    loadRFQ()
                  }}
                  onError={(msg) => setError(msg)}
                />
              )}
            </div>
          )}

          {/* OPEN + deadline passed: Close button for requester */}
          {rfq.status === RFQStatus.OPEN && deadlinePassed && signer && (
            <>
              {isRequester ? (
                <CloseButton
                  rfqId={rfqId}
                  signer={signer}
                  onSuccess={() => {
                    setSuccess('RFQ closed! Decryption triggered via CoFHE coprocessor.')
                    loadRFQ()
                  }}
                  onError={(msg) => setError(msg)}
                />
              ) : (
                <div className="action-section">
                  <h3>Deadline Passed</h3>
                  <div className="info-msg">
                    Waiting for the requester to close this RFQ.
                  </div>
                </div>
              )}
            </>
          )}

          {/* CLOSED or REVEALED: Reveal panel */}
          {(rfq.status === RFQStatus.CLOSED ||
            rfq.status === RFQStatus.REVEALED) &&
            signer && (
              <RevealPanel
                rfq={rfq}
                signer={signer}
                onSuccess={() => {
                  setSuccess('Winner revealed!')
                  loadRFQ()
                }}
                onError={(msg) => setError(msg)}
              />
            )}

          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}
        </div>
      </div>
    </div>
  )
}
