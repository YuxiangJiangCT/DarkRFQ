import { useState, useEffect } from 'react'

export function useCountdown(deadline: bigint) {
  const calcRemaining = () => Number(deadline) - Math.floor(Date.now() / 1000)
  const [remaining, setRemaining] = useState(calcRemaining)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(calcRemaining())
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  if (remaining <= 0) {
    return { display: 'Expired', expired: true, urgent: false }
  }

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60

  let display: string
  if (h > 0) display = `${h}h ${m}m ${s}s`
  else if (m > 0) display = `${m}m ${s}s`
  else display = `${s}s`

  return { display, expired: false, urgent: remaining < 300 }
}
