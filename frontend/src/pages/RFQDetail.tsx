import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ethers } from 'ethers'
import {
  getContract,
  parseRFQInfo,
  formatDeadline,
  shortenAddress,
  revealPolicyLabel,
  RFQStatus,
  RevealPolicy,
  type RFQInfo,
} from '../contracts'
import { useToast } from '../contexts/ToastContext'
import { useCountdown } from '../hooks/useCountdown'
import StatusBadge from '../components/StatusBadge'
import SubmitQuoteForm from '../components/SubmitQuoteForm'
import CloseButton from '../components/CloseButton'
import RevealPanel from '../components/RevealPanel'
import CopyButton from '../components/CopyButton'
import { SkeletonDetail } from '../components/Skeleton'

interface Props {
  provider: ethers.BrowserProvider | null
  signer: ethers.Signer | null
  account: string | null
  isCorrectNetwork: boolean
}

function CountdownDisplay({ deadline }: { deadline: bigint }) {
  const { display, urgent } = useCountdown(deadline)
  return (
    <span
      className={urgent ? 'text-sell font-mono' : ''}
      style={urgent ? { animation: 'urgent-flash 1s ease-in-out infinite' } : undefined}
    >
      {display}
    </span>
  )
}

export default function RFQDetail({ provider, signer, account, isCorrectNetwork }: Props) {
  const { id } = useParams<{ id: string }>()
  const rfqId = Number(id)
  const { addToast } = useToast()

  const [rfq, setRfq] = useState<RFQInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [alreadyQuoted, setAlreadyQuoted] = useState(false)

  const loadRFQ = useCallback(async () => {
    if (!provider) return
    try {
      const contract = getContract(provider)
      const result = await contract.getRFQInfo(rfqId)
      const info = parseRFQInfo(rfqId, result)
      setRfq(info)
      if (account) {
        const quoted = await contract.hasQuoted(rfqId, account)
        setAlreadyQuoted(quoted)
      }
    } catch (err) {
      console.error('Failed to load RFQ:', err)
    } finally {
      setLoading(false)
    }
  }, [provider, rfqId, account])

  useEffect(() => { loadRFQ() }, [loadRFQ])

  useEffect(() => {
    if (!rfq || rfq.status !== RFQStatus.OPEN) return
    const interval = setInterval(loadRFQ, 10000)
    return () => clearInterval(interval)
  }, [rfq, loadRFQ])

  if (!provider) {
    return <div className="text-center py-20 text-text-muted text-sm">Connect your wallet to view this RFQ.</div>
  }
  if (loading) {
    return <SkeletonDetail />
  }
  if (!rfq) {
    return <div className="text-center py-20 text-text-muted text-sm">RFQ not found.</div>
  }

  const isRequester = account?.toLowerCase() === rfq.requester.toLowerCase()
  const deadlinePassed = Number(rfq.deadline) <= Math.floor(Date.now() / 1000)

  return (
    <div>
      <Link to="/" className="text-xs text-text-dim hover:text-text-muted transition-all duration-150 hover:-translate-x-0.5 mb-4 inline-block no-underline">
        &larr; Back
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-display text-xl font-bold text-text-primary tracking-tight">{rfq.label}</h1>
        <span className={`font-mono text-xs font-medium ${rfq.isBuy ? 'text-buy' : 'text-sell'}`}>
          {rfq.isBuy ? 'BUY' : 'SELL'}
        </span>
        <StatusBadge status={rfq.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Info */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="text-xs font-medium text-text-dim uppercase tracking-wide mb-4">Details</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
            <dt className="text-text-dim">Requester</dt>
            <dd className="text-text-primary text-right font-mono text-xs inline-flex items-center justify-end gap-1.5">
              {shortenAddress(rfq.requester)} {isRequester && '(you)'}
              <CopyButton text={rfq.requester} />
            </dd>
            <dt className="text-text-dim">Amount</dt>
            <dd className="text-text-primary text-right">{rfq.amount.toString()}</dd>
            <dt className="text-text-dim">Side</dt>
            <dd className="text-text-primary text-right">{rfq.isBuy ? 'Buy (lowest wins)' : 'Sell (highest wins)'}</dd>
            <dt className="text-text-dim">Deadline</dt>
            <dd className="text-text-primary text-right text-xs">{formatDeadline(rfq.deadline)}</dd>
            <dt className="text-text-dim">Remaining</dt>
            <dd className="text-text-primary text-right"><CountdownDisplay deadline={rfq.deadline} /></dd>
            <dt className="text-text-dim">Quotes</dt>
            <dd className="text-text-primary text-right">{rfq.quoteCount.toString()}</dd>
            <dt className="text-text-dim">Reveal</dt>
            <dd className="text-text-primary text-right">{revealPolicyLabel(rfq.revealPolicy)}</dd>
          </dl>

          {/* Encryption state */}
          {rfq.status !== RFQStatus.REVEALED && (
            <div className="mt-5 pt-4 border-t border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-dim">Best price</span>
                {rfq.revealPolicy === RevealPolicy.MAKER_ONLY ? (
                  <span className="text-[10px] font-mono text-text-dim bg-surface-hover px-2.5 py-0.5 rounded-full">not revealed</span>
                ) : (
                  <span className="inline-block bg-gradient-to-r from-accent/20 via-accent/40 to-accent/20 bg-[length:200%_100%] animate-shimmer text-[10px] font-mono text-accent px-2.5 py-0.5 rounded-full">[encrypted]</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-dim">Best maker</span>
                {rfq.revealPolicy === RevealPolicy.PRICE_ONLY ? (
                  <span className="text-[10px] font-mono text-text-dim bg-surface-hover px-2.5 py-0.5 rounded-full">not revealed</span>
                ) : (
                  <span className="inline-block bg-gradient-to-r from-accent/20 via-accent/40 to-accent/20 bg-[length:200%_100%] animate-shimmer text-[10px] font-mono text-accent px-2.5 py-0.5 rounded-full">[encrypted]</span>
                )}
              </div>
              <p className="text-[11px] text-text-dim leading-relaxed pt-1">
                {rfq.revealPolicy === RevealPolicy.BOTH && 'All prices are encrypted on-chain. No one sees any price until the winner is revealed.'}
                {rfq.revealPolicy === RevealPolicy.PRICE_ONLY && 'Only the winning price will be revealed. Maker identity stays permanently encrypted.'}
                {rfq.revealPolicy === RevealPolicy.MAKER_ONLY && 'Only the winning maker will be revealed. Price stays permanently encrypted.'}
              </p>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          {rfq.status === RFQStatus.OPEN && !deadlinePassed && (
            <div>
              <h3 className="text-xs font-medium text-text-dim uppercase tracking-wide mb-4">Submit Quote</h3>
              {alreadyQuoted ? (
                <p className="text-sm text-accent">You have already submitted an encrypted quote.</p>
              ) : !account || !signer ? (
                <p className="text-sm text-text-muted">Connect wallet to submit a quote.</p>
              ) : !isCorrectNetwork ? (
                <p className="text-sm text-sell">Switch to Sepolia to submit a quote.</p>
              ) : (
                <SubmitQuoteForm
                  rfqId={rfqId}
                  provider={provider}
                  signer={signer}
                  onSuccess={() => { addToast('success', 'Encrypted quote submitted'); setAlreadyQuoted(true); loadRFQ() }}
                  onError={(msg) => addToast('error', msg)}
                />
              )}
            </div>
          )}

          {rfq.status === RFQStatus.OPEN && deadlinePassed && signer && (
            isRequester ? (
              <CloseButton
                rfqId={rfqId}
                signer={signer}
                onSuccess={() => { loadRFQ() }}
                onError={(msg) => addToast('error', msg)}
              />
            ) : (
              <div>
                <h3 className="text-xs font-medium text-text-dim uppercase tracking-wide mb-4">Deadline Passed</h3>
                <p className="text-sm text-text-muted">Waiting for the requester to close this RFQ.</p>
              </div>
            )
          )}

          {(rfq.status === RFQStatus.CLOSED || rfq.status === RFQStatus.REVEALED) && signer && (
            <RevealPanel
              rfq={rfq}
              signer={signer}
              onSuccess={() => { loadRFQ() }}
              onError={(msg) => addToast('error', msg)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
