// opseg kruga r = 28 u viewBoxu 64
const CIRCUMFERENCE = 2 * Math.PI * 28

type TimerRingProps = {
  /** preostalo sekundi */
  left: number
  /** ukupno sekundi – puni krug */
  total: number
}

const format = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Prsten od 64 px s odbrojavanjem rasprave (prototip .ring)
export default function TimerRing({ left, total }: TimerRingProps) {
  const fraction = total > 0 ? left / total : 0
  return (
    <div role="timer" className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" strokeWidth="5" className="stroke-line" />
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          className="stroke-accent [transition:stroke-dashoffset_1s_linear]"
        />
      </svg>
      <b className="absolute inset-0 grid place-items-center text-[15px] font-bold tabular-nums">{format(left)}</b>
    </div>
  )
}
