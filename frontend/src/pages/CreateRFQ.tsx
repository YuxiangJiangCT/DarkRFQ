import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { getContract } from '../contracts'

interface Props {
  signer: ethers.Signer | null
  account: string | null
}

export default function CreateRFQ({ signer, account }: Props) {
  const navigate = useNavigate()
  const [label, setLabel] = useState('')
  const [isBuy, setIsBuy] = useState(true)
  const [amount, setAmount] = useState('')
  const [minutes, setMinutes] = useState('60')
  const [revealPolicy, setRevealPolicy] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!account || !signer) {
    return (
      <div className="center-message">
        <h2>Connect your wallet to create an RFQ</h2>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!label.trim()) {
      setError('Label is required')
      return
    }
    if (!amount || Number(amount) <= 0) {
      setError('Amount must be positive')
      return
    }
    if (!minutes || Number(minutes) <= 0) {
      setError('Duration must be positive')
      return
    }

    try {
      setSubmitting(true)
      const contract = getContract(signer)
      const deadline = Math.floor(Date.now() / 1000) + Number(minutes) * 60

      const tx = await contract.createRFQ(label, isBuy, BigInt(amount), deadline, revealPolicy)
      const receipt = await tx.wait()

      // Parse RFQ ID from event
      const iface = contract.interface
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: [...log.topics], data: log.data })
          if (parsed?.name === 'RFQCreated') {
            const rfqId = Number(parsed.args[0])
            navigate(`/rfq/${rfqId}`)
            return
          }
        } catch {
          // skip unparseable logs
        }
      }
      navigate('/')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transaction failed'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="create-page">
      <h1>Create RFQ</h1>
      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group">
          <label>Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. 100 ETH"
          />
        </div>

        <div className="form-group">
          <label>Side</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle ${isBuy ? 'active buy' : ''}`}
              onClick={() => setIsBuy(true)}
            >
              BUY (lowest wins)
            </button>
            <button
              type="button"
              className={`toggle ${!isBuy ? 'active sell' : ''}`}
              onClick={() => setIsBuy(false)}
            >
              SELL (highest wins)
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100"
            min="1"
          />
        </div>

        <div className="form-group">
          <label>Duration (minutes)</label>
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="e.g. 60"
            min="1"
          />
        </div>

        <div className="form-group">
          <label>Reveal Policy</label>
          <div className="toggle-group triple">
            <button
              type="button"
              className={`toggle ${revealPolicy === 0 ? 'active reveal-policy' : ''}`}
              onClick={() => setRevealPolicy(0)}
            >
              Both
            </button>
            <button
              type="button"
              className={`toggle ${revealPolicy === 1 ? 'active reveal-policy' : ''}`}
              onClick={() => setRevealPolicy(1)}
            >
              Price Only
            </button>
            <button
              type="button"
              className={`toggle ${revealPolicy === 2 ? 'active reveal-policy' : ''}`}
              onClick={() => setRevealPolicy(2)}
            >
              Maker Only
            </button>
          </div>
          <span className="form-hint">
            {revealPolicy === 0 && 'Both the winning price and maker will be revealed.'}
            {revealPolicy === 1 && 'Only the winning price will be revealed. The maker stays anonymous.'}
            {revealPolicy === 2 && 'Only the winning maker will be revealed. The price stays private.'}
          </span>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={submitting}
        >
          {submitting ? 'Creating...' : 'Create RFQ'}
        </button>
      </form>
    </div>
  )
}
