import { useReducedMotion } from 'framer-motion'
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { cx } from '../lib/cx.ts'
import { buttonClasses, type ButtonVariant } from './buttonStyles.ts'

const HOLD_MS = 850
const HOLD_MS_REDUCED = 150

type HoldButtonProps = {
  onConfirm: () => void
  children: ReactNode
  variant?: ButtonVariant
  disabled?: boolean
  className?: string
}

// Potvrda držanjem – za konačne odluke (Spreman sam, noćna akcija, glas).
// Sloj se puni slijeva; pušta li se ranije, vraća se na 0. Isto vrijedi za držanje Enter/Space.
export default function HoldButton({
  onConfirm,
  children,
  variant = 'primary',
  disabled = false,
  className = '',
}: HoldButtonProps) {
  const reduceMotion = useReducedMotion()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const fillRef = useRef<HTMLSpanElement>(null)
  const rafRef = useRef(0)
  const lockedRef = useRef(false) // između potvrde i povratka sloja na 0
  const timersRef = useRef<number[]>([])
  const [popped, setPopped] = useState(false)

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current)
      timersRef.current.forEach(clearTimeout)
    },
    [],
  )

  // Punjenje se piše izravno u DOM, bez re-rendera u svakom frameu
  function setFill(progress: number, animate: boolean) {
    const el = fillRef.current
    if (!el) return
    el.style.transition = animate ? 'transform .2s' : 'none'
    el.style.transform = `scaleX(${progress})`
  }

  function later(fn: () => void, ms: number) {
    timersRef.current.push(window.setTimeout(fn, ms))
  }

  function start(e: PointerEvent<HTMLButtonElement>) {
    if (e.button === 0) begin()
  }

  function begin() {
    if (disabled || rafRef.current || lockedRef.current) return
    const duration = reduceMotion ? HOLD_MS_REDUCED : HOLD_MS
    const t0 = performance.now()
    const tick = (now: number) => {
      if (buttonRef.current?.disabled) return cancel()
      const progress = Math.min(1, (now - t0) / duration)
      setFill(progress, false)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      rafRef.current = 0
      finish()
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function finish() {
    lockedRef.current = true
    if ('vibrate' in navigator) navigator.vibrate(30)
    setPopped(true)
    later(onConfirm, 120)
    later(() => {
      setPopped(false)
      setFill(0, true)
      lockedRef.current = false
    }, 400)
  }

  function cancel() {
    if (!rafRef.current) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    setFill(0, true)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    if (!e.repeat) begin()
  }

  function handleKeyUp(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'Enter' || e.key === ' ') cancel()
  }

  // Namjerno bez onClick: sintetički klik (npr. Space na keyup) ne smije potvrditi
  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      className={cx(
        buttonClasses(variant),
        'touch-manipulation [-webkit-touch-callout:none]',
        popped && 'animate-pop',
        className,
      )}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span
        ref={fillRef}
        aria-hidden="true"
        className="absolute inset-0 -z-10 origin-left bg-white/28 [transform:scaleX(0)]"
      />
      {children}
    </button>
  )
}
