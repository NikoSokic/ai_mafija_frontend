import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { EASE_OUT } from '../lib/motion.ts'
import { useIsDesktop } from '../lib/useIsDesktop.ts'
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
  /** širi modal na desktopu (560 umjesto 480 px), npr. za dulji tekst naratora */
  wide?: boolean
  children?: ReactNode
}

// Mobitel: donja ladica koja izlazi odozdo. Desktop (≥ 1024 px): centrirani modal koji izraste iz sredine.
// opacity i scale su i u mobilnom cilju (tamo su već 1, pa se ništa ne vidi): ako se prozor suzi
// usred ulaska desktop modala, panel ne smije ostati poluproziran ili umanjen.
const PANEL_MOTION = {
  mobile: {
    initial: { y: '100%' },
    animate: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE_OUT } },
    exit: { y: '100%', transition: { duration: 0.3, ease: EASE_OUT } },
  },
  desktop: {
    initial: { opacity: 0, scale: 0.96, y: 12 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
    exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.18, ease: EASE_OUT } },
  },
}

// Sheet sa zamagljenom pozadinom
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
  wide = false,
  children,
}: SheetProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const motionOf = PANEL_MOTION[useIsDesktop() ? 'desktop' : 'mobile']

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
        className={[
          'fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] w-full max-w-[420px] overflow-y-auto rounded-t-sheet border-t border-line bg-surface px-5 pt-2.5 pb-[calc(22px+env(safe-area-inset-bottom))] outline-none [scrollbar-width:none]',
          // desktop: inset-0 + m-auto + h-fit centrira panel bez transforma (transform pripada animaciji)
          'lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[85dvh] lg:w-[calc(100%-48px)] lg:rounded-sheet lg:border lg:px-7 lg:pt-6 lg:pb-7 lg:shadow-[0_30px_80px_-24px_rgba(0,0,0,.65)]',
          wide ? 'lg:max-w-[560px]' : 'lg:max-w-[480px]',
        ].join(' ')}
        initial={motionOf.initial}
        animate={motionOf.animate}
        exit={motionOf.exit}
      >
        {/* ručka ladice; modal na desktopu je nema */}
        <div aria-hidden="true" className="mx-auto mb-4 h-[5px] w-10 rounded-full bg-line lg:hidden" />
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
