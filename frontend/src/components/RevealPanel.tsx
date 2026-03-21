import { useState } from 'react'
import { ethers } from 'ethers'
import { getContract, shortenAddress, RevealPolicy, type RFQInfo } from '../contracts'

interface Props {
  rfq: RFQInfo
  signer: ethers.Signer
  onSuccess: () => void
  onError: (msg: string) => void
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
      const message = err instanceof Error ? err.message : 'Decryption not ready yet. Try again in a few seconds.'
      onError(message)
    } finally {
      setRevealing(false)
    }
  }

  // Check if fully revealed based on policy
  const isFullyRevealed =
    (rfq.revealPolicy === RevealPolicy.PRICE_ONLY && rfq.winningPriceRevealed) ||
    (rfq.revealPolicy === RevealPolicy.MAKER_ONLY && rfq.winningMakerRevealed) ||
    (rfq.revealPolicy === RevealPolicy.BOTH && rfq.winningPriceRevealed && rfq.winningMakerRevealed)

  if (isFullyRevealed) {
    return (
      <div className="action-section revealed-section">
        <h3>Winner Revealed</h3>
        <div className="winner-display">
          {rfq.revealPolicy !== RevealPolicy.MAKER_ONLY && (
            <div className="winner-price">
              <span className="winner-label">Winning Price</span>
              <span className="winner-value">
                {rfq.revealedWinningPrice.toString()}
              </span>
            </div>
          )}
          {rfq.revealPolicy !== RevealPolicy.PRICE_ONLY && (
            <div className="winner-maker">
              <span className="winner-label">Winning Maker</span>
              <span className="winner-value">
                {shortenAddress(rfq.revealedWinningMaker)}
              </span>
            </div>
          )}
        </div>
        <div className="privacy-notice revealed-privacy">
          <span className="lock-icon">&#x1f512;</span>
          <span>
            {rfq.revealPolicy === RevealPolicy.PRICE_ONLY &&
              'Only the winning price was revealed. The maker identity remains permanently encrypted.'}
            {rfq.revealPolicy === RevealPolicy.MAKER_ONLY &&
              'Only the winning maker was revealed. The winning price remains permanently encrypted.'}
            {rfq.revealPolicy === RevealPolicy.BOTH && (
              <>
                Only the winning quote was revealed. All {Number(rfq.quoteCount) - 1}{' '}
                losing quote{Number(rfq.quoteCount) - 1 !== 1 ? 's' : ''} remain
                <strong> permanently encrypted</strong> on-chain.
              </>
            )}
          </span>
        </div>
      </div>
    )
  }

  // Closed, waiting for reveal
  return (
    <div className="action-section">
      <h3>Reveal Results</h3>
      <div className="decrypt-status">
        <div className="decrypt-indicator">
          <span className="pulse"></span>
          <span>Decryption in progress via CoFHE coprocessor...</span>
        </div>
      </div>
      <p>
        The winning quote is being decrypted by the Fhenix coprocessor. Click
        below to check if results are ready.
      </p>
      <button
        onClick={handleReveal}
        className="btn btn-primary btn-full"
        disabled={revealing}
      >
        {revealing ? 'Checking decryption status...' : 'Reveal Winner'}
      </button>
    </div>
  )
}
