import { useState } from 'react'
import { ethers } from 'ethers'
import { getContract } from '../contracts'

interface Props {
  rfqId: number
  provider: ethers.BrowserProvider
  signer: ethers.Signer
  onSuccess: () => void
  onError: (msg: string) => void
}

export default function SubmitQuoteForm({ rfqId, provider, signer, onSuccess, onError }: Props) {
  const [price, setPrice] = useState('')
  const [quoting, setQuoting] = useState(false)
  const [step, setStep] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!price) return

    try {
      setQuoting(true)
      setStep('Initializing encryption...')

      const { cofhejs, Encryptable } = await import('cofhejs/web')

      const chainId = import.meta.env.VITE_CHAIN_ID || '31337'
      const environment = chainId === '31337' ? 'MOCK' : 'TESTNET'
      await cofhejs.initializeWithEthers({
        ethersProvider: provider,
        ethersSigner: signer,
        environment: environment as 'MOCK' | 'TESTNET',
      })

      setStep('Encrypting price with FHE...')
      const result = await cofhejs.encrypt([Encryptable.uint64(BigInt(price))] as const)

      if (!result.success) {
        throw new Error('Encryption failed: ' + (result.error?.message || 'unknown'))
      }

      const [encrypted] = result.data

      setStep('Submitting to contract...')
      const contract = getContract(signer)
      const tx = await contract.submitQuote(rfqId, encrypted)

      setStep('Confirming...')
      await tx.wait()

      setPrice('')
      onSuccess()
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Failed to submit quote')
    } finally {
      setQuoting(false)
      setStep(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-dim">Your Price</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 1500"
          min="1"
          required
          disabled={quoting}
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-base/80 text-text-primary text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-text-dim disabled:opacity-50"
        />
      </div>
      <button
        type="submit"
        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent to-accent-hover text-base text-sm font-medium cursor-pointer transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.15)] hover:shadow-[0_0_30px_rgba(0,255,163,0.25)] border-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
        disabled={quoting}
      >
        {quoting ? step || 'Processing...' : 'Submit Encrypted Quote'}
      </button>
      <div className="bg-accent/5 border border-accent/10 rounded-lg p-3">
        <p className="text-[11px] text-text-dim leading-relaxed">
          Your price is encrypted client-side with FHE before submission. Nobody can see it until reveal.
        </p>
      </div>
    </form>
  )
}
