import { Link, useLocation } from 'react-router-dom'
import { shortenAddress } from '../contracts'

interface Props {
  account: string | null
  onConnect: () => void
}

export default function Header({ account, onConnect }: Props) {
  const location = useLocation()

  const navLink = (to: string, label: string) => {
    const active = location.pathname === to || (to === '/' && location.pathname.startsWith('/rfq/'))
    return (
      <Link
        to={to}
        className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
          active
            ? 'bg-accent/10 text-accent'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <header className="sticky top-0 z-50 bg-base/80 backdrop-blur-xl backdrop-saturate-150 flex items-center py-3.5 gap-6 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-gradient-to-r after:from-transparent after:via-accent/40 after:to-transparent">
      <Link to="/" className="flex items-center gap-2.5 no-underline mr-auto">
        <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-accent to-accent/50" />
        <span className="font-display font-bold text-lg bg-gradient-to-r from-text-primary to-text-muted bg-clip-text text-transparent tracking-tight">
          DarkRFQ
        </span>
        <span className="text-[10px] text-accent font-mono bg-accent/10 px-1.5 py-0.5 rounded">
          FHE
        </span>
      </Link>
      <nav className="flex gap-1">
        {navLink('/', 'RFQs')}
        {navLink('/create', 'New')}
      </nav>
      <div>
        {account ? (
          <span className="inline-flex items-center gap-2 text-xs font-mono text-text-muted bg-surface px-3 py-1.5 rounded-full border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {shortenAddress(account)}
          </span>
        ) : (
          <button
            onClick={onConnect}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-accent-hover text-base text-sm font-medium cursor-pointer transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.15)] hover:shadow-[0_0_30px_rgba(0,255,163,0.25)] border-none"
          >
            Connect
          </button>
        )}
      </div>
    </header>
  )
}
