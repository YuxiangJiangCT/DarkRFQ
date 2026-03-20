import { Link } from 'react-router-dom'
import { shortenAddress } from '../contracts'

interface Props {
  account: string | null
  onConnect: () => void
}

export default function Header({ account, onConnect }: Props) {
  return (
    <header className="header">
      <Link to="/" className="logo">
        <span className="logo-icon">&#x1f512;</span> DarkRFQ
      </Link>
      <p className="tagline">Private quotes. Fairer execution.</p>
      <nav className="nav">
        <Link to="/">RFQs</Link>
        <Link to="/create">Create</Link>
      </nav>
      <div className="wallet">
        {account ? (
          <span className="account">{shortenAddress(account)}</span>
        ) : (
          <button onClick={onConnect} className="btn btn-primary">
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  )
}
