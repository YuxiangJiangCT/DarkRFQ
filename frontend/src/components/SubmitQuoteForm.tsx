import { useState } from 'react'
import { ethers } from 'ethers'
import { getContract } from '../contracts'
import { useToast } from '../contexts/ToastContext'
import { useTxProgress } from '../hooks/useTxProgress'
import TxProgressModal from './TxProgressModal'
import Spinner from './Spinner'

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
  const { addToast } = useToast()
  const tx = useTxProgress()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!price || quoting) return

    tx.start(['Initializing FHE...', 'Encrypting price...', 'Submitting to chain...', 'Confirming...'])

    try {
      setQuoting(true)

      const { cofhejs, Encryptable } = await import('cofhejs/web')

      const chainId = import.meta.env.VITE_CHAIN_ID || '31337'
      const isMock = chainId === '31337'
      const environment = isMock ? 'MOCK' : 'TESTNET'

      // Initialize cofhejs — retry up to 3 times as FHE key fetch may need time
      const initParams = {
        ethersProvider: provider,
        ethersSigner: signer,
        environment: environment as 'MOCK' | 'TESTNET',
        // Explicitly pass URLs for non-mock environments (SDK default resolution can fail in bundled builds)
        ...(!isMock && {
          coFheUrl: 'https://testnet-cofhe.fhenix.zone',
          verifierUrl: 'https://testnet-cofhe-vrf.fhenix.zone',
          thresholdNetworkUrl: 'https://testnet-cofhe-tn.fhenix.zone',
        }),
      }

      let initResult
      for (let attempt = 0; attempt < 3; attempt++) {
        initResult = await cofhejs.initializeWithEthers(initParams)
        if (initResult.success) break
        console.warn(`[FHE] Init attempt ${attempt + 1} failed:`, initResult.error)
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000))
      }

      if (!initResult!.success) {
        throw new Error('FHE initialization failed: ' + (initResult!.error?.message || 'unknown'))
      }

      tx.advance()

      const result = await cofhejs.encrypt([Encryptable.uint64(BigInt(price))] as const)

      if (!result.success) {
        throw new Error('Encryption failed: ' + (result.error?.message || 'unknown'))
      }

      const [encrypted] = result.data

      tx.advance()
      const contract = getContract(signer)
      const txn = await contract.submitQuote(rfqId, encrypted)

      tx.advance()
      await txn.wait()

      tx.complete(() => {
        addToast('success', 'Encrypted quote submitted successfully')
      })
      setPrice('')
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit quote'
      tx.fail(msg)
      onError(msg)
    } finally {
      setQuoting(false)
    }
  }

  return (
    <>
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
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent to-accent-hover text-[#08090D] text-sm font-semibold cursor-pointer transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.15)] hover:shadow-[0_0_30px_rgba(0,255,163,0.25)] border-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          disabled={quoting}
        >
          {quoting ? <><Spinner /> Encrypting...</> : 'Submit Encrypted Quote'}
        </button>
        <div className="bg-accent/5 border border-accent/10 rounded-lg p-3">
          <p className="text-[11px] text-text-dim leading-relaxed">
            Your price is encrypted client-side with FHE before submission. Nobody can see it until reveal.
          </p>
        </div>
      </form>
      <TxProgressModal
        visible={tx.visible}
        steps={tx.steps}
        error={tx.error}
        onDismiss={tx.dismiss}
      />
    </>
  )
}
