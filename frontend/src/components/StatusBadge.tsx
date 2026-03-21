import { RFQStatus, statusLabel } from '../contracts'

interface Props {
  status: RFQStatus
}

const statusConfig: Record<RFQStatus, { classes: string; dot: boolean }> = {
  [RFQStatus.OPEN]: {
    classes: 'bg-buy/10 text-buy border-buy/20',
    dot: true,
  },
  [RFQStatus.CLOSED]: {
    classes: 'bg-warning/10 text-warning border-warning/20',
    dot: true,
  },
  [RFQStatus.REVEALED]: {
    classes: 'bg-accent/10 text-accent border-accent/20',
    dot: false,
  },
}

const dotColor: Record<RFQStatus, string> = {
  [RFQStatus.OPEN]: 'bg-buy',
  [RFQStatus.CLOSED]: 'bg-warning',
  [RFQStatus.REVEALED]: 'bg-accent',
}

export default function StatusBadge({ status }: Props) {
  const config = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-medium uppercase ${config.classes}`}>
      {config.dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColor[status]}`}
          style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }}
        />
      )}
      {statusLabel(status)}
    </span>
  )
}
