import { cx } from '../lib/cx.ts'

type SwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  'aria-label'?: string
  'aria-labelledby'?: string
  disabled?: boolean
  className?: string
}

export default function Switch({ checked, onChange, className = '', ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-8 w-[52px] shrink-0 cursor-pointer rounded-full bg-line transition-colors duration-250 aria-checked:bg-accent',
        'disabled:pointer-events-none disabled:opacity-38',
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={cx(
          'absolute top-[3px] left-[3px] size-[26px] rounded-full transition-transform duration-300 ease-spring',
          checked ? 'translate-x-5 bg-accent-ink' : 'bg-text',
        )}
      />
    </button>
  )
}
