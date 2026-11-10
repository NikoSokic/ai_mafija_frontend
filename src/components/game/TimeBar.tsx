import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/cx.ts'
import { useGameStore } from '../../store/gameStore.ts'

// Zadnje sekunde: traka je crvena i pulsira, a mobitel jednom zavibrira
const URGENT_MS = 3000
const VIBRATE_MS = 60

type TimeBarProps = {
  /** kraj naracije, od kada igrač bira; bez njega traka kreće od endsAt − seconds */
  startsAt?: string | null
  endsAt: string
  /** puno trajanje u sekundama */
  seconds: number
  /** opis za čitač ekrana */
  label?: string
}

// Sat uređaja ispravljen za razliku prema poslužitelju; razlika se čita svaki put jer je novo stanje može promijeniti
const serverNow = () => Date.now() + useGameStore.getState().clockOffset

// Traka vremena igrača na potezu. Računa se od roka, pa ostaje točna i kad preglednik uspori.
// Rok je najkasniji mogući: potez može završiti i ranije, kad stigne novi currentTurnRole.
export default function TimeBar({ startsAt, endsAt, seconds, label = 'Preostalo vrijeme poteza' }: TimeBarProps) {
  const reduceMotion = useReducedMotion()
  const fillRef = useRef<HTMLSpanElement>(null)
  const end = Date.parse(endsAt)
  const parsedStart = startsAt ? Date.parse(startsAt) : NaN
  const start = Number.isFinite(parsedStart) ? parsedStart : end - seconds * 1000
  const [left, setLeft] = useState(seconds)
  const [urgent, setUrgent] = useState(false)

  // Širina se piše izravno u DOM, bez re-rendera u svakom frameu; broj i boja mijenjaju se rijetko
  useEffect(() => {
    const total = end - start
    let frame = 0
    let vibrated = false
    const tick = () => {
      const remaining = Math.min(total, Math.max(0, end - serverNow()))
      const whole = Math.ceil(remaining / 1000)
      const isUrgent = remaining <= URGENT_MS
      if (fillRef.current) {
        // uz reduced motion traka skače po sekundu umjesto da klizi
        const shown = reduceMotion ? Math.min(total, whole * 1000) : remaining
        fillRef.current.style.transform = `scaleX(${total > 0 ? shown / total : 0})`
      }
      setLeft(whole)
      setUrgent(isUrgent)
      if (isUrgent && remaining > 0 && !vibrated) {
        vibrated = true
        if ('vibrate' in navigator) navigator.vibrate(VIBRATE_MS)
      }
      if (remaining > 0) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [start, end, reduceMotion])

  return (
    <div className="mt-3 mb-1 flex items-center gap-3">
      <span
        aria-hidden="true"
        className={cx(
          'relative h-2 min-w-0 flex-1 overflow-hidden rounded-full [transition:background-color_.2s]',
          urgent ? 'bg-danger/25' : 'bg-surface-2',
        )}
      >
        <span
          ref={fillRef}
          className={cx(
            'absolute inset-0 origin-left rounded-full [transition:background-color_.2s]',
            urgent ? 'bg-danger' : 'bg-accent',
            urgent && !reduceMotion && 'animate-time-pulse',
          )}
        />
      </span>
      <span
        role="timer"
        aria-label={label}
        className={cx('min-w-[3ch] text-right text-[15px] font-semibold tabular-nums', urgent ? 'text-danger' : 'text-muted')}
      >
        {left} s
      </span>
    </div>
  )
}
