import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import ToastComponent from '../components/Toast'
import type { ToastData } from '../components/Toast'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const nextId = useRef(0)
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: number) => {
    // Start exit animation
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    // Remove after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 300)
    // Clear any pending auto-dismiss timer
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = nextId.current++
    const toast: ToastData = { id, type, message, exiting: false }

    setToasts(prev => {
      const next = [...prev, toast]
      // Keep max 3 toasts — remove oldest if exceeded
      if (next.length > 3) {
        const oldest = next[0]
        removeToast(oldest.id)
        return next.slice(1)
      }
      return next
    })

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      removeToast(id)
      timersRef.current.delete(id)
    }, 4000)
    timersRef.current.set(id, timer)
  }, [removeToast])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <ToastComponent key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
