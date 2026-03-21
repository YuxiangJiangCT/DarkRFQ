import { useState } from 'react'
import { ethers } from 'ethers'
import { getContract } from '../contracts'

interface Props {
  rfqId: number
  signer: ethers.Signer
  onSuccess: () => void
  onError: (msg: string) => void
}

export default function CloseButton({ rfqId, signer, onSuccess, onError }: Props) {
  const [closing, setClosing] = useState(false)

  const handleClose = async () => {
    try {
      setClosing(true)
      const contract = getContract(signer)
      const tx = await contract.closeRFQ(rfqId)
      await tx.wait()
      onSuccess()
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Failed to close RFQ')
    } finally {
      setClosing(false)
    }
  }

  return (
    <div>
      <h3 className="text-xs font-medium text-text-dim uppercase tracking-wide mb-3">Deadline Passed</h3>
      <p className="text-xs text-text-dim mb-3">Close this RFQ to trigger decryption of the winning quote.</p>
      <button
        onClick={handleClose}
        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent to-accent-hover text-base text-sm font-medium cursor-pointer transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.15)] hover:shadow-[0_0_30px_rgba(0,255,163,0.25)] border-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
        disabled={closing}
      >
        {closing ? 'Closing...' : 'Close RFQ & Start Decryption'}
      </button>
    </div>
  )
}
