import { useState, useCallback, useRef } from 'react'

export interface TxStep {
  label: string
  status: 'pending' | 'active' | 'done' | 'error'
}

export interface TxProgressState {
  visible: boolean
  steps: TxStep[]
  currentStep: number
  error: string | null
}

export function useTxProgress() {
  const [state, setState] = useState<TxProgressState>({
    visible: false,
    steps: [],
    currentStep: -1,
    error: null,
  })
  const completeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback((labels: string[]) => {
    if (completeTimer.current) clearTimeout(completeTimer.current)
    const steps: TxStep[] = labels.map((label, i) => ({
      label,
      status: i === 0 ? 'active' : 'pending',
    }))
    setState({ visible: true, steps, currentStep: 0, error: null })
  }, [])

  const advance = useCallback(() => {
    setState(prev => {
      const steps = prev.steps.map((s, i) => {
        if (i === prev.currentStep) return { ...s, status: 'done' as const }
        if (i === prev.currentStep + 1) return { ...s, status: 'active' as const }
        return s
      })
      return { ...prev, steps, currentStep: prev.currentStep + 1 }
    })
  }, [])

  const fail = useCallback((error: string) => {
    setState(prev => {
      const steps = prev.steps.map((s, i) =>
        i === prev.currentStep ? { ...s, status: 'error' as const } : s
      )
      return { ...prev, steps, error }
    })
  }, [])

  const complete = useCallback((onDone?: () => void) => {
    setState(prev => ({
      ...prev,
      steps: prev.steps.map(s => ({ ...s, status: 'done' as const })),
      error: null,
    }))
    completeTimer.current = setTimeout(() => {
      setState({ visible: false, steps: [], currentStep: -1, error: null })
      onDone?.()
    }, 1500)
  }, [])

  const dismiss = useCallback(() => {
    if (completeTimer.current) clearTimeout(completeTimer.current)
    setState({ visible: false, steps: [], currentStep: -1, error: null })
  }, [])

  return { ...state, start, advance, fail, complete, dismiss }
}
