import { ROLES, type RoleKey } from '../data/roles.ts'
import { cx } from '../lib/cx.ts'
import { Icon } from './icons.tsx'

type RoleIconProps = {
  role: RoleKey
  /** veličina pločice u px */
  size?: number
  /** zadano pola pločice; karta uloge koristi 46 na 84 */
  iconSize?: number
  className?: string
}

// Ikona uloge na pločici u boji uloge (15 %)
export default function RoleIcon({ role, size = 40, iconSize, className = '' }: RoleIconProps) {
  const { color, icon } = ROLES[role]
  return (
    <span
      className={cx('grid shrink-0 place-items-center', className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        color,
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
      }}
    >
      <Icon name={icon} size={iconSize ?? Math.round(size * 0.5)} />
    </span>
  )
}
