import { ethers } from 'ethers'

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x0CFddD9fb73648D095A3791115A89DcE4b96faB6'

export const DARK_RFQ_ABI = [
  'function createRFQ(string label, bool isBuy, uint256 amount, uint256 deadline, uint8 revealPolicy) external returns (uint256 rfqId)',
  'function submitQuote(uint256 rfqId, tuple(uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature) encryptedPrice) external',
  'function closeRFQ(uint256 rfqId) external',
  'function revealResults(uint256 rfqId) external',
  'function getRFQInfo(uint256 rfqId) external view returns (address requester, string label, bool isBuy, uint256 amount, uint256 deadline, uint8 status, uint256 quoteCount, uint8 revealPolicy, bool winningPriceRevealed, bool winningMakerRevealed, uint64 revealedWinningPrice, address revealedWinningMaker)',
  'function getBestPriceHandle(uint256 rfqId) external view returns (uint256)',
  'function getBestMakerHandle(uint256 rfqId) external view returns (uint256)',
  'function nextRfqId() external view returns (uint256)',
  'function hasQuoted(uint256 rfqId, address maker) external view returns (bool)',
  'event RFQCreated(uint256 indexed rfqId, address indexed requester, string label, bool isBuy, uint256 amount, uint256 deadline, uint8 revealPolicy)',
  'event QuoteSubmitted(uint256 indexed rfqId, address indexed maker)',
  'event RFQClosed(uint256 indexed rfqId)',
  'event WinnerRevealed(uint256 indexed rfqId, address winner, uint64 price, uint8 revealPolicy)',
] as const

export enum RFQStatus {
  OPEN = 0,
  CLOSED = 1,
  REVEALED = 2,
}

export enum RevealPolicy {
  BOTH = 0,
  PRICE_ONLY = 1,
  MAKER_ONLY = 2,
}

export interface RFQInfo {
  id: number
  requester: string
  label: string
  isBuy: boolean
  amount: bigint
  deadline: bigint
  status: RFQStatus
  quoteCount: bigint
  revealPolicy: RevealPolicy
  winningPriceRevealed: boolean
  winningMakerRevealed: boolean
  revealedWinningPrice: bigint
  revealedWinningMaker: string
}

export function getContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(CONTRACT_ADDRESS, DARK_RFQ_ABI, signerOrProvider)
}

export function parseRFQInfo(id: number, result: ethers.Result): RFQInfo {
  return {
    id,
    requester: result[0],
    label: result[1],
    isBuy: result[2],
    amount: result[3],
    deadline: result[4],
    status: Number(result[5]) as RFQStatus,
    quoteCount: result[6],
    revealPolicy: Number(result[7]) as RevealPolicy,
    winningPriceRevealed: result[8],
    winningMakerRevealed: result[9],
    revealedWinningPrice: result[10],
    revealedWinningMaker: result[11],
  }
}

export function statusLabel(s: RFQStatus): string {
  switch (s) {
    case RFQStatus.OPEN: return 'Open'
    case RFQStatus.CLOSED: return 'Closed'
    case RFQStatus.REVEALED: return 'Revealed'
    default: return 'Unknown'
  }
}

export function revealPolicyLabel(p: RevealPolicy): string {
  switch (p) {
    case RevealPolicy.BOTH: return 'Reveal Both'
    case RevealPolicy.PRICE_ONLY: return 'Price Only'
    case RevealPolicy.MAKER_ONLY: return 'Maker Only'
    default: return 'Unknown'
  }
}

export function shortenAddress(addr: string): string {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export function formatDeadline(deadline: bigint): string {
  const d = new Date(Number(deadline) * 1000)
  return d.toLocaleString()
}

export function timeRemaining(deadline: bigint): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = Number(deadline) - now
  if (diff <= 0) return 'Expired'
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
