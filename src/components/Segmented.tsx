import { cx } from '../lib/cx.ts'

type SegmentedOption<T extends string> = { value: T; label: string }

type SegmentedProps<T extends string> = {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  className?: string
}

export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  className = '',
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx(
        'grid auto-cols-fr grid-flow-col gap-1 rounded-ctrl border border-line bg-surface p-1',
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className="h-[42px] cursor-pointer rounded-xl text-[15px] font-medium text-muted transition-colors duration-250 aria-pressed:bg-surface-2 aria-pressed:text-text"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
