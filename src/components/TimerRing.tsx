import { cx } from '../lib/cx.ts'
import { formatSeconds } from '../lib/time.ts'

// opseg kruga r = 28 u viewBoxu 64
const CIRCUMFERENCE = 2 * Math.PI * 28

type TimerRingProps = {
  /** preostalo sekundi */
  left: number
  /** ukupno sekundi – puni krug */
  total: number
  /** veliki prsten u sredini ekrana (desktop) */
  large?: boolean
}

// Prsten od 64 px s odbrojavanjem rasprave (prototip .ring); veliki (do 152 px, manji na niskom prozoru) ima tanji obruč
export default function TimerRing({ left, total, large = false }: TimerRingProps) {
  const stroke = large ? 3 : 5
  const fraction = total > 0 ? left / total : 0
  return (
    <div role="timer" className={cx('relative shrink-0', large ? 'size-[clamp(112px,17vh,152px)]' : 'size-16')}>
      <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" strokeWidth={stroke} className="stroke-line" />
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          className="stroke-accent [transition:stroke-dashoffset_1s_linear]"
        />
      </svg>
      <b
        className={cx(
          'absolute inset-0 grid place-items-center font-bold tabular-nums',
          large ? 'text-[clamp(30px,4.2vh,38px)] tracking-[-.03em]' : 'text-[15px]',
        )}
      >
        {formatSeconds(left)}
      </b>
    </div>
  )
}
