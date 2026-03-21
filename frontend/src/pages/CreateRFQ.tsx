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
      <div className="text-center py-20">
        <p className="text-text-muted text-sm">Connect your wallet to create an RFQ.</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!label.trim()) { setError('Label is required'); return }
    if (!amount || Number(amount) <= 0) { setError('Amount must be positive'); return }
    if (!minutes || Number(minutes) <= 0) { setError('Duration must be positive'); return }

    try {
      setSubmitting(true)
      const contract = getContract(signer)
      const deadline = Math.floor(Date.now() / 1000) + Number(minutes) * 60
      const tx = await contract.createRFQ(label, isBuy, BigInt(amount), deadline, revealPolicy)
      const receipt = await tx.wait()

      const iface = contract.interface
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: [...log.topics], data: log.data })
          if (parsed?.name === 'RFQCreated') {
            navigate(`/rfq/${Number(parsed.args[0])}`)
            return
          }
        } catch { /* skip */ }
      }
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transaction failed')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-lg border border-border bg-base/80 text-text-primary text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-text-dim"

  const toggleCls = (active: boolean, variant?: string) =>
    `flex-1 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all duration-150 ${
      active
        ? variant === 'buy' ? 'border-buy/40 bg-buy/8 text-buy shadow-[inset_0_0_12px_rgba(16,185,129,0.06)]'
          : variant === 'sell' ? 'border-sell/40 bg-sell/8 text-sell shadow-[inset_0_0_12px_rgba(239,68,68,0.06)]'
          : 'border-accent/40 bg-accent/8 text-accent shadow-[inset_0_0_12px_rgba(0,255,163,0.06)]'
        : 'border-border bg-surface text-text-muted hover:border-border-hover hover:bg-surface-hover'
    }`

  return (
    <div className="max-w-[480px] mx-auto">
      <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-2xl p-8">
        <h1 className="font-display text-2xl font-bold text-text-primary mb-6 tracking-tight">New RFQ</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-muted">Label</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder='e.g. "100 ETH"' className={inputCls} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-muted">Side</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsBuy(true)} className={toggleCls(isBuy, 'buy')}>BUY</button>
              <button type="button" onClick={() => setIsBuy(false)} className={toggleCls(!isBuy, 'sell')}>SELL</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted">Amount</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" min="1" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted">Duration (min)</label>
              <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="60" min="1" className={inputCls} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-muted">Reveal Policy</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRevealPolicy(0)} className={toggleCls(revealPolicy === 0)}>Both</button>
              <button type="button" onClick={() => setRevealPolicy(1)} className={toggleCls(revealPolicy === 1)}>Price Only</button>
              <button type="button" onClick={() => setRevealPolicy(2)} className={toggleCls(revealPolicy === 2)}>Maker Only</button>
            </div>
            <p className="text-[11px] text-text-dim mt-1">
              {revealPolicy === 0 && 'Both winning price and maker will be revealed.'}
              {revealPolicy === 1 && 'Only winning price revealed. Maker stays anonymous.'}
              {revealPolicy === 2 && 'Only winning maker revealed. Price stays private.'}
            </p>
          </div>

          {error && <div className="p-2.5 rounded-lg bg-sell/8 border border-sell/20 text-xs text-sell">{error}</div>}

          <button type="submit"
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent to-accent-hover text-base text-sm font-medium cursor-pointer transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.15)] hover:shadow-[0_0_30px_rgba(0,255,163,0.25)] border-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
            disabled={submitting}>
            {submitting ? 'Creating...' : 'Create RFQ'}
          </button>
        </form>
      </div>
    </div>
  )
}
