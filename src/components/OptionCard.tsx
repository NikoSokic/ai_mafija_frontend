import { cx } from '../lib/cx.ts'
import { Icon, type IconName } from './icons.tsx'

type OptionCardProps = {
  icon: IconName
  title: string
  text: string
  selected: boolean
  onSelect: () => void
  className?: string
}

// Kartica za izbor jedne od opcija (npr. Uživo / Online); odabrana je u akcentu
export default function OptionCard({ icon, title, text, selected, onSelect, className = '' }: OptionCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cx(
        'group cursor-pointer rounded-tile border border-line bg-surface p-3.5 text-left',
        '[transition:border-color_.25s,background-color_.25s]',
        'aria-pressed:border-accent aria-pressed:bg-accent-soft',
        className,
      )}
    >
      <Icon name={icon} size={22} className="mb-2.5 text-muted group-aria-pressed:text-accent" />
      <h4 className="mb-1 text-[15px] font-semibold">{title}</h4>
      <p className="text-[13px] leading-[1.4] text-muted">{text}</p>
    </button>
  )
}
