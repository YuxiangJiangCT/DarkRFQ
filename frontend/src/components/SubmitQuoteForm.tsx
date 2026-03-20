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

export default function SubmitQuoteForm({
  rfqId,
  provider,
  signer,
  onSuccess,
  onError,
}: Props) {
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

      setStep('Encrypting your price with FHE...')
      const result = await cofhejs.encrypt([
        Encryptable.uint64(BigInt(price)),
      ] as const)

      if (!result.success) {
        throw new Error(
          'Encryption failed: ' + (result.error?.message || 'unknown')
        )
      }

      const [encrypted] = result.data

      setStep('Submitting encrypted quote to contract...')
      const contract = getContract(signer)
      const tx = await contract.submitQuote(rfqId, encrypted)

      setStep('Waiting for confirmation...')
      await tx.wait()

      setPrice('')
      onSuccess()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit quote'
      onError(message)
    } finally {
      setQuoting(false)
      setStep(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="quote-form">
      <div className="form-group">
        <label>Your Price</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 1500"
          min="1"
          required
          disabled={quoting}
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary btn-full"
        disabled={quoting}
      >
        {quoting ? step || 'Processing...' : 'Submit Encrypted Quote'}
      </button>
      <div className="privacy-notice">
        <span className="lock-icon">&#x1f512;</span>
        <span>
          Your price is encrypted client-side using Fully Homomorphic
          Encryption. No one — not even the contract — can see your price until
          the RFQ is closed and the winner is revealed.
        </span>
      </div>
    </form>
  )
}
