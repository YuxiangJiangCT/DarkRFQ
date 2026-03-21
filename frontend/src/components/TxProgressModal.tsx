import type { TxStep } from '../hooks/useTxProgress'
import Spinner from './Spinner'

interface Props {
  visible: boolean
  steps: TxStep[]
  error: string | null
  onRetry?: () => void
  onDismiss: () => void
}

function StepIcon({ status }: { status: TxStep['status'] }) {
  if (status === 'active') {
    return (
      <div className="w-6 h-6 flex items-center justify-center">
        <Spinner className="h-5 w-5 text-accent" />
      </div>
    )
  }
  if (status === 'done') {
    return (
      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-[#08090D]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="w-6 h-6 rounded-full bg-sell flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }
  // pending
  return <div className="w-6 h-6 rounded-full border-2 border-text-dim" />
}

export default function TxProgressModal({ visible, steps, error, onRetry, onDismiss }: Props) {
  if (!visible) return null

  const allDone = steps.length > 0 && steps.every(s => s.status === 'done')
  const hasError = !!error

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-surface border border-border rounded-2xl p-8 max-w-sm w-full mx-4 animate-page-fade">
        <h3 className="font-display font-semibold text-text-primary text-base mb-6">
          {allDone ? 'Complete' : hasError ? 'Error' : 'Processing...'}
        </h3>

        {/* Steps */}
        <div className="flex flex-col gap-4 mb-6">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <StepIcon status={step.status} />
              <span className={`text-sm ${
                step.status === 'active' ? 'text-text-primary' :
                step.status === 'done' ? 'text-text-muted' :
                step.status === 'error' ? 'text-sell' :
                'text-text-dim'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Error message */}
        {hasError && (
          <div className="p-3 rounded-lg bg-sell/8 border border-sell/20 mb-4">
            <p className="text-xs text-sell break-words">{error}</p>
          </div>
        )}

        {/* Action buttons (only on error) */}
        {hasError && (
          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              className="flex-1 py-2 rounded-lg border border-border text-text-muted text-sm cursor-pointer transition-colors hover:bg-surface-hover bg-transparent"
            >
              Dismiss
            </button>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-accent to-accent-hover text-[#08090D] text-sm font-semibold cursor-pointer transition-all duration-200 border-none"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Success checkmark */}
        {allDone && (
          <p className="text-xs text-accent text-center">Transaction confirmed</p>
        )}
      </div>
    </div>
  )
}
