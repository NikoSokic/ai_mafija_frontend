import { cx } from '../lib/cx.ts'
import { useBump } from '../lib/useBump.ts'
import { Icon } from './icons.tsx'

type StepperProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** npr. "Manje: Mafija" */
  decreaseLabel: string
  /** npr. "Više: Mafija" */
  increaseLabel: string
  /** md = red uloge (36 px), lg = broj igrača (48 px) */
  size?: 'md' | 'lg'
  /** lg u Novoj sobi prikazuje broj izvan steppera */
  showValue?: boolean
  className?: string
}

export default function Stepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  decreaseLabel,
  increaseLabel,
  size = 'md',
  showValue = true,
  className = '',
}: StepperProps) {
  const bump = useBump(value)
  const button = cx(
    'grid cursor-pointer place-items-center rounded-[11px] text-text',
    '[transition:background-color_.2s,scale_.12s] hover:bg-line active:scale-[.88]',
    'disabled:pointer-events-none disabled:opacity-30',
    size === 'lg' ? 'size-12' : 'size-9',
  )
  const iconSize = size === 'lg' ? 20 : 18

  return (
    <div className={cx('flex items-center rounded-[14px] bg-surface-2 p-[3px]', className)}>
      <button
        type="button"
        className={button}
        aria-label={decreaseLabel}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Icon name="minus" size={iconSize} strokeWidth={2} />
      </button>
      {showValue && (
        <output aria-live="polite" className="min-w-[30px] text-center text-base font-semibold tabular-nums">
          {/* novi key pri svakoj promjeni ponovno pokreće "poskok" */}
          <span key={bump} className={cx('inline-block', bump > 0 && 'animate-bump')}>
            {value}
          </span>
        </output>
      )}
      <button
        type="button"
        className={button}
        aria-label={increaseLabel}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Icon name="plus" size={iconSize} strokeWidth={2} />
      </button>
    </div>
  )
}
