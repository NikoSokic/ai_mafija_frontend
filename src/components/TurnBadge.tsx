import { ROLES, type RoleKey } from '../data/roles.ts'
import { cx } from '../lib/cx.ts'
import { Icon } from './icons.tsx'

type TurnBadgeProps = { role: RoleKey; className?: string }

// "Tvoj red: Doktor" u boji uloge – noću, kad je igrač na redu
export default function TurnBadge({ role, className = '' }: TurnBadgeProps) {
  const { name, color, icon } = ROLES[role]
  return (
    <span
      className={cx(
        'inline-flex h-[30px] items-center gap-2 rounded-full pr-3 pl-1.5 text-[13px] font-semibold',
        className,
      )}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      <span
        className="grid size-5 place-items-center rounded-full"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 22%, transparent)` }}
      >
        <Icon name={icon} size={13} strokeWidth={2} />
      </span>
      Tvoj red: {name}
    </span>
  )
}
