import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'
import { EASE_OUT, EASE_SPRING } from '../lib/motion.ts'
import ThemedPortal from './ThemedPortal.tsx'


type ToastProps = {
  open: boolean
  title: ReactNode
  text?: ReactNode
  /** lijevo od teksta: Spinner, ikona ili RoleIcon */
  leading?: ReactNode
  /** gumb u obavijesti, npr. "Pokušaj ponovno" */
  action?: { label: string; onClick: () => void }
  /** ms do automatskog zatvaranja (poziva onClose) */
  duration?: number
  onClose?: () => void
}

// Obavijest na vrhu – ponovno spajanje, brzi pogled na ulogu
export default function Toast({ open, title, text, leading, action, duration, onClose }: ToastProps) {
  // ref da novi onClose iz roditelja ne pokreće odbrojavanje ispočetka
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open || !duration) return
    const t = window.setTimeout(() => onCloseRef.current?.(), duration)
    return () => clearTimeout(t)
  }, [open, duration])

  return (
    <ThemedPortal>
      {/* živa regija stalno postoji, pa čitač ekrana najavi novi sadržaj */}
      <div role="status" aria-live="polite">
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-x-0 top-[calc(12px+env(safe-area-inset-top))] z-[60] mx-auto flex w-[calc(100%-32px)] max-w-[388px] items-center gap-3 rounded-[18px] border border-line bg-surface-2 px-4 py-3.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,.6)]"
              initial={{ opacity: 0, y: -30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE_SPRING } }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.4, ease: EASE_OUT } }}
            >
              {leading}
              <div className="min-w-0 flex-1">
                <h4 className="text-[15px] font-semibold">{title}</h4>
                {text && <p className="text-[13px] text-muted">{text}</p>}
              </div>
              {action && (
                <button
                  type="button"
                  onClick={action.onClick}
                  className="shrink-0 cursor-pointer rounded-full bg-accent-soft px-3.5 py-2 text-[13px] font-semibold text-accent"
                >
                  {action.label}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ThemedPortal>
  )
}

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="spinner size-[22px] shrink-0 animate-[spin_.8s_linear_infinite] rounded-full border-[2.5px] border-line border-t-accent"
    />
  )
}
