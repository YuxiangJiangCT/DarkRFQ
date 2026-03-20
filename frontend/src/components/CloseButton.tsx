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
      const message = err instanceof Error ? err.message : 'Failed to close RFQ'
      onError(message)
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="action-section">
      <h3>Deadline Passed</h3>
      <p>
        The quoting period has ended. Close this RFQ to trigger decryption of
        the winning quote.
      </p>
      <button
        onClick={handleClose}
        className="btn btn-primary btn-full"
        disabled={closing}
      >
        {closing ? 'Closing & Triggering Decryption...' : 'Close RFQ & Start Decryption'}
      </button>
    </div>
  )
}
