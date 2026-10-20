import { ROLE_KEYS, ROLES, type RoleKey } from '../data/roles.ts'
import { cx } from '../lib/cx.ts'
import { Icon } from './icons.tsx'
import RoleIcon from './RoleIcon.tsx'

type RoleCompositionProps = {
  counts: Partial<Record<RoleKey, number>>
  /** full = lobby (ikona u pločici + broj), mini = javne sobe (ikona + broj) */
  variant?: 'full' | 'mini'
  className?: string
}

export default function RoleComposition({ counts, variant = 'full', className = '' }: RoleCompositionProps) {
  const keys = ROLE_KEYS.filter((k) => (counts[k] ?? 0) > 0)

  if (variant === 'mini') {
    return (
      <div className={cx('flex flex-wrap justify-end gap-x-2.5 gap-y-1', className)}>
        {keys.map((k) => (
          <span
            key={k}
            title={ROLES[k].name}
            className="inline-flex items-center gap-[3px] text-[13px]"
            style={{ color: ROLES[k].color }}
          >
            <Icon name={ROLES[k].icon} size={15} />
            <span className="sr-only">{ROLES[k].name}:</span>
            <b className="font-semibold text-text tabular-nums">{counts[k]}</b>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={cx('flex flex-wrap gap-2', className)}>
      {keys.map((k) => (
        <span
          key={k}
          title={ROLES[k].name}
          className="inline-flex items-center gap-[5px] text-sm font-semibold text-text tabular-nums"
        >
          <RoleIcon role={k} size={26} />
          <span className="sr-only">{ROLES[k].name}:</span>
          {counts[k]}
        </span>
      ))}
    </div>
  )
}
