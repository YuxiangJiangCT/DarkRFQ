import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ethers } from 'ethers'
import {
  getContract,
  parseRFQInfo,
  statusLabel,
  formatDeadline,
  timeRemaining,
  shortenAddress,
  RFQStatus,
  type RFQInfo,
} from '../contracts'

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

  // Quote form state
  const [price, setPrice] = useState('')
  const [quoting, setQuoting] = useState(false)

  // Action states
  const [closing, setClosing] = useState(false)
  const [revealing, setRevealing] = useState(false)
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

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signer || !price) return
    setError(null)
    setSuccess(null)

    try {
      setQuoting(true)

      // Import cofhejs dynamically to avoid SSR issues
      const { cofhejs, Encryptable } = await import('cofhejs/web')

      // Initialize cofhejs with current signer
      await cofhejs.initialize({
        provider: provider!,
        signer,
      })

      // Encrypt the price
      const result = await cofhejs.encrypt([
        Encryptable.uint64(BigInt(price)),
      ] as const)

      if (!result.success) {
        throw new Error('Encryption failed: ' + (result.error?.message || 'unknown'))
      }

      const [encrypted] = result.data

      // Submit encrypted quote to contract
      const contract = getContract(signer)
      const tx = await contract.submitQuote(rfqId, encrypted)
      await tx.wait()

      setSuccess('Quote submitted successfully!')
      setPrice('')
      await loadRFQ()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit quote'
      setError(message)
    } finally {
      setQuoting(false)
    }
  }

  const handleClose = async () => {
    if (!signer) return
    setError(null)
    setSuccess(null)

    try {
      setClosing(true)
      const contract = getContract(signer)
      const tx = await contract.closeRFQ(rfqId)
      await tx.wait()
      setSuccess('RFQ closed! Decryption in progress...')
      await loadRFQ()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to close RFQ'
      setError(message)
    } finally {
      setClosing(false)
    }
  }

  const handleReveal = async () => {
    if (!signer) return
    setError(null)
    setSuccess(null)

    try {
      setRevealing(true)
      const contract = getContract(signer)
      const tx = await contract.revealResults(rfqId)
      await tx.wait()
      setSuccess('Results revealed!')
      await loadRFQ()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reveal results'
      setError(message)
    } finally {
      setRevealing(false)
    }
  }

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
      <Link to="/" className="back-link">Back to RFQs</Link>

      <div className="detail-header">
        <h1>{rfq.label}</h1>
        <div className="detail-badges">
          <span className={`badge badge-${rfq.isBuy ? 'buy' : 'sell'}`}>
            {rfq.isBuy ? 'BUY' : 'SELL'}
          </span>
          <span className={`badge badge-status-${rfq.status}`}>
            {statusLabel(rfq.status)}
          </span>
        </div>
      </div>

      <div className="detail-grid">
        <div className="info-card">
          <h3>Details</h3>
          <dl>
            <dt>Requester</dt>
            <dd>{shortenAddress(rfq.requester)} {isRequester && '(you)'}</dd>
            <dt>Amount</dt>
            <dd>{rfq.amount.toString()}</dd>
            <dt>Deadline</dt>
            <dd>{formatDeadline(rfq.deadline)}</dd>
            <dt>Time Remaining</dt>
            <dd>{timeRemaining(rfq.deadline)}</dd>
            <dt>Quotes</dt>
            <dd>{rfq.quoteCount.toString()}</dd>
            <dt>Best Quote</dt>
            <dd className="encrypted-badge">ENCRYPTED</dd>
          </dl>
        </div>

        <div className="action-card">
          {/* OPEN: Quote form */}
          {rfq.status === RFQStatus.OPEN && !deadlinePassed && (
            <div className="action-section">
              <h3>Submit Quote</h3>
              {alreadyQuoted ? (
                <p className="info-msg">You have already submitted a quote for this RFQ.</p>
              ) : !account ? (
                <p className="info-msg">Connect wallet to submit a quote.</p>
              ) : (
                <form onSubmit={handleSubmitQuote}>
                  <div className="form-group">
                    <label>Your Price (encrypted via FHE)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 1500"
                      min="1"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={quoting}
                  >
                    {quoting ? 'Encrypting & Submitting...' : 'Submit Encrypted Quote'}
                  </button>
                  <p className="hint">
                    Your price is encrypted client-side using FHE. No one — not even the
                    contract — can see your price until the RFQ is closed and revealed.
                  </p>
                </form>
              )}
            </div>
          )}

          {/* OPEN + Deadline passed: Close button for requester */}
          {rfq.status === RFQStatus.OPEN && deadlinePassed && (
            <div className="action-section">
              <h3>Deadline Passed</h3>
              {isRequester ? (
                <>
                  <p>The deadline has passed. Close this RFQ to begin decryption.</p>
                  <button
                    onClick={handleClose}
                    className="btn btn-primary btn-full"
                    disabled={closing}
                  >
                    {closing ? 'Closing...' : 'Close RFQ'}
                  </button>
                </>
              ) : (
                <p className="info-msg">Waiting for requester to close this RFQ.</p>
              )}
            </div>
          )}

          {/* CLOSED: Reveal button */}
          {rfq.status === RFQStatus.CLOSED && (
            <div className="action-section">
              <h3>Reveal Results</h3>
              <p>
                Decryption has been requested. Click below to reveal the winning
                quote. If decryption is not yet ready, try again in a few seconds.
              </p>
              <button
                onClick={handleReveal}
                className="btn btn-primary btn-full"
                disabled={revealing}
              >
                {revealing ? 'Revealing...' : 'Reveal Winner'}
              </button>
            </div>
          )}

          {/* REVEALED: Show winner */}
          {rfq.status === RFQStatus.REVEALED && (
            <div className="action-section revealed-section">
              <h3>Winner</h3>
              <div className="winner-display">
                <div className="winner-price">
                  <span className="winner-label">Winning Price</span>
                  <span className="winner-value">
                    {rfq.revealedWinningPrice.toString()}
                  </span>
                </div>
                <div className="winner-maker">
                  <span className="winner-label">Winning Maker</span>
                  <span className="winner-value">
                    {shortenAddress(rfq.revealedWinningMaker)}
                  </span>
                </div>
              </div>
              <p className="hint">
                Only the winning price and maker are revealed. All losing quotes
                remain permanently encrypted.
              </p>
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}
        </div>
      </div>
    </div>
  )
}
