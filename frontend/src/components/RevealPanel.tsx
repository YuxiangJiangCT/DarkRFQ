import { useState } from 'react'
import { ethers } from 'ethers'
import { getContract, shortenAddress, type RFQInfo } from '../contracts'

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

  // Already revealed — show winner
  if (rfq.winningPriceRevealed && rfq.winningMakerRevealed) {
    return (
      <div className="action-section revealed-section">
        <h3>Winner Revealed</h3>
        <div className="winner-display">
          <div className="winner-price">
            <span className="winner-label">Winning Price</span>
            <span className="winner-value">
              {rfq.revealedWinningPrice.toString()}
            </span>
          </div>
          <div className="winner-maker">
            <span className="winner-label">Winning Maker</span>
            <span className="winner-value">
              {shortenAddress(rfq.revealedWinningMaker)}
            </span>
          </div>
        </div>
        <div className="privacy-notice revealed-privacy">
          <span className="lock-icon">&#x1f512;</span>
          <span>
            Only the winning quote was revealed. All {Number(rfq.quoteCount) - 1}{' '}
            losing quote{Number(rfq.quoteCount) - 1 !== 1 ? 's' : ''} remain
            <strong> permanently encrypted</strong> on-chain.
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
