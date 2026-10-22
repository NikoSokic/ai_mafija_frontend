import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { EASE_OUT } from '../lib/motion.ts'
import IconButton from './IconButton.tsx'
import ThemedPortal from './ThemedPortal.tsx'


const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type SheetProps = {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  /** gumb X pokraj naslova (npr. Pravila) */
  showClose?: boolean
  /** false = ne zatvara se dodirom pozadine ni Esc (naracija) */
  dismissable?: boolean
  /** kad sheet nema naslov */
  'aria-label'?: string
  children?: ReactNode
}

// Donji sheet sa zamagljenom pozadinom
export default function Sheet(props: SheetProps) {
  return (
    <ThemedPortal>
      <AnimatePresence>{props.open && <SheetPanel {...props} />}</AnimatePresence>
    </ThemedPortal>
  )
}

function SheetPanel({
  onClose,
  title,
  subtitle,
  showClose = false,
  dismissable = true,
  'aria-label': ariaLabel,
  children,
}: SheetProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) return onClose()
      if (e.key !== 'Tab') return
      // Tab kruži unutar sheeta (stranica ispod je neaktivna)
      const panel = panelRef.current
      if (!panel) return
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) return e.preventDefault()
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      } else if (!panel.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dismissable, onClose])

  // Fokus ide u sheet, stranica ispod se ne skrola; pri zatvaranju se oboje vraća
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="fixed inset-0 z-50 bg-[rgba(5,6,14,.62)] backdrop-blur-[6px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } }}
        exit={{ opacity: 0, transition: { duration: 0.3, ease: EASE_OUT } }}
        onClick={dismissable ? onClose : undefined}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] w-full max-w-[420px] overflow-y-auto rounded-t-sheet border-t border-line bg-surface px-5 pt-2.5 pb-[calc(22px+env(safe-area-inset-bottom))] outline-none [scrollbar-width:none]"
        initial={{ y: '100%' }}
        animate={{ y: 0, transition: { duration: 0.5, ease: EASE_OUT } }}
        exit={{ y: '100%', transition: { duration: 0.3, ease: EASE_OUT } }}
      >
        <div aria-hidden="true" className="mx-auto mb-4 h-[5px] w-10 rounded-full bg-line" />
        {(title || showClose) && (
          <div className="flex items-center gap-2">
            {title && (
              <h2 id={titleId} className="mb-1.5 flex-1 text-2xl font-bold tracking-[-.025em]">
                {title}
              </h2>
            )}
            {showClose && <IconButton icon="x" aria-label="Zatvori" onClick={onClose} className="ml-auto" />}
          </div>
        )}
        {subtitle && <p className="mb-5 text-[15px] leading-[1.45] text-muted">{subtitle}</p>}
        {children}
      </motion.div>
    </>
  )
}
