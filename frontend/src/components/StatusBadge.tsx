import { RFQStatus, statusLabel } from '../contracts'

interface Props {
  status: RFQStatus
}

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`badge badge-status-${status}`}>
      {status === RFQStatus.OPEN && '\u25CF '}
      {status === RFQStatus.CLOSED && '\u29D7 '}
      {status === RFQStatus.REVEALED && '\u2713 '}
      {statusLabel(status)}
    </span>
  )
}
