import { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'
import { getContract, shortenAddress, RevealPolicy, type RFQInfo } from '../contracts'

interface Props {
  rfq: RFQInfo
  signer: ethers.Signer
  onSuccess: () => void
  onError: (msg: string) => void
}

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    startTime.current = null
    const animate = (ts: number) => {
      if (!startTime.current) startTime.current = ts
      const progress = Math.min((ts - startTime.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

export default function RevealPanel({ rfq, signer, onSuccess, onError }: Props) {
  const [revealing, setRevealing] = useState(false)

  const handleReveal = async () => {
    try {
      setRevealing(true)
      const contract = getContract(signer)
      const tx = await contract.revealResults(rfq.id)
      await tx.wait()
      onSuccess()
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Decryption not ready yet. Try again in a few seconds.')
    } finally {
      setRevealing(false)
    }
  }

  const isFullyRevealed =
    (rfq.revealPolicy === RevealPolicy.PRICE_ONLY && rfq.winningPriceRevealed) ||
    (rfq.revealPolicy === RevealPolicy.MAKER_ONLY && rfq.winningMakerRevealed) ||
    (rfq.revealPolicy === RevealPolicy.BOTH && rfq.winningPriceRevealed && rfq.winningMakerRevealed)

  const displayPrice = useCountUp(isFullyRevealed ? Number(rfq.revealedWinningPrice) : 0)

  if (isFullyRevealed) {
    return (
      <div className="border border-accent/20 rounded-xl p-5 shadow-[0_0_24px_rgba(0,255,163,0.06)]">
        <h3 className="text-xs font-medium text-text-dim uppercase tracking-wide mb-4">Result</h3>
        <div className="space-y-3 mb-4">
          {rfq.revealPolicy !== RevealPolicy.MAKER_ONLY && (
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-text-dim">Winning price</span>
              <span className="font-display text-3xl font-bold text-text-primary">{displayPrice.toLocaleString()}</span>
            </div>
          )}
          {rfq.revealPolicy !== RevealPolicy.PRICE_ONLY && (
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-text-dim">Winning maker</span>
              <span className="font-mono text-sm text-accent">{shortenAddress(rfq.revealedWinningMaker)}</span>
            </div>
          )}
        </div>
        <p className="text-[11px] text-text-dim leading-relaxed border-t border-border pt-3">
          {rfq.revealPolicy === RevealPolicy.PRICE_ONLY && 'Maker identity remains permanently encrypted.'}
          {rfq.revealPolicy === RevealPolicy.MAKER_ONLY && 'Winning price remains permanently encrypted.'}
          {rfq.revealPolicy === RevealPolicy.BOTH && (
            <>All {Number(rfq.quoteCount) - 1} losing quote{Number(rfq.quoteCount) - 1 !== 1 ? 's' : ''} remain permanently encrypted on-chain.</>
          )}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-xs font-medium text-text-dim uppercase tracking-wide mb-4">Reveal</h3>
      <div className="flex items-center gap-2 mb-3 text-xs text-warning">
        <span className="w-1.5 h-1.5 rounded-full bg-warning" style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
        Decrypting via CoFHE coprocessor...
      </div>
      <p className="text-xs text-text-dim mb-3">Click below to check if results are ready.</p>
      <button
        onClick={handleReveal}
        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent to-accent-hover text-base text-sm font-medium cursor-pointer transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.15)] hover:shadow-[0_0_30px_rgba(0,255,163,0.25)] border-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
        disabled={revealing}
      >
        {revealing ? 'Checking...' : 'Reveal Winner'}
      </button>
    </div>
  )
}
