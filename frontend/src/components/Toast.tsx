interface ToastData {
  id: number
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  exiting: boolean
}

interface Props {
  toast: ToastData
  onDismiss: (id: number) => void
}

const borderColors = {
  success: 'border-l-buy',
  error: 'border-l-sell',
  info: 'border-l-secondary',
  warning: 'border-l-warning',
}

const iconColors = {
  success: 'text-buy',
  error: 'text-sell',
  info: 'text-secondary',
  warning: 'text-warning',
}

function Icon({ type }: { type: ToastData['type'] }) {
  const cls = `w-4 h-4 ${iconColors[type]}`
  if (type === 'success') {
    return (
      <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    )
  }
  if (type === 'error') {
    return (
      <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    )
  }
  return (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  )
}

export type { ToastData }

export default function Toast({ toast, onDismiss }: Props) {
  return (
    <div
      className={`flex items-start gap-3 bg-surface/90 backdrop-blur-xl border border-border border-l-4 ${borderColors[toast.type]} rounded-xl p-4 shadow-lg max-w-sm transition-all duration-300 ${
        toast.exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
      style={{ animation: toast.exiting ? undefined : 'toast-enter 0.3s ease-out' }}
    >
      <Icon type={toast.type} />
      <p className="text-sm text-text-primary flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-text-dim hover:text-text-muted transition-colors cursor-pointer bg-transparent border-none p-0"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}
