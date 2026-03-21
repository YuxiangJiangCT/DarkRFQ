import { useState } from 'react'
import { ethers } from 'ethers'
import { getContract } from '../contracts'
import { useToast } from '../contexts/ToastContext'
import { useTxProgress } from '../hooks/useTxProgress'
import TxProgressModal from './TxProgressModal'
import ConfirmDialog from './ConfirmDialog'
import Spinner from './Spinner'

interface Props {
  rfqId: number
  signer: ethers.Signer
  onSuccess: () => void
  onError: (msg: string) => void
}

export default function CloseButton({ rfqId, signer, onSuccess, onError }: Props) {
  const [closing, setClosing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { addToast } = useToast()
  const tx = useTxProgress()

  const handleClose = async () => {
    setShowConfirm(false)
    tx.start(['Closing RFQ...', 'Triggering decryption...', 'Confirming...'])

    try {
      setClosing(true)
      const contract = getContract(signer)
      tx.advance()
      const txn = await contract.closeRFQ(rfqId)
      tx.advance()
      await txn.wait()
      tx.complete(() => {
        addToast('success', 'RFQ closed. Decryption triggered.')
      })
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to close RFQ'
      tx.fail(msg)
      onError(msg)
    } finally {
      setClosing(false)
    }
  }

  return (
    <>
      <div>
        <h3 className="text-xs font-medium text-text-dim uppercase tracking-wide mb-3">Deadline Passed</h3>
        <p className="text-xs text-text-dim mb-3">Close this RFQ to trigger decryption of the winning quote.</p>
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent to-accent-hover text-[#08090D] text-sm font-semibold cursor-pointer transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.15)] hover:shadow-[0_0_30px_rgba(0,255,163,0.25)] border-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          disabled={closing}
        >
          {closing ? <><Spinner /> Closing...</> : 'Close RFQ & Start Decryption'}
        </button>
      </div>
      <ConfirmDialog
        open={showConfirm}
        title="Close RFQ?"
        message="This action is irreversible. Closing will trigger FHE decryption of the winning quote. All losing quotes remain permanently encrypted."
        confirmLabel="Close RFQ"
        onConfirm={handleClose}
        onCancel={() => setShowConfirm(false)}
      />
      <TxProgressModal
        visible={tx.visible}
        steps={tx.steps}
        error={tx.error}
        onDismiss={tx.dismiss}
      />
    </>
  )
}
