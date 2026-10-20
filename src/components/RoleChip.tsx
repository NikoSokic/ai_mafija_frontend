import { ROLES, type RoleKey } from '../data/roles.ts'
import { Icon } from './icons.tsx'

// Ikona + ime uloge u boji uloge
export default function RoleChip({ role }: { role: RoleKey }) {
  const { name, color, icon } = ROLES[role]
  return (
    <span
      className="inline-flex h-7 items-center gap-1.5 rounded-full pr-2.5 pl-1.5 text-[13px] font-semibold whitespace-nowrap"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
    >
      <Icon name={icon} size={16} />
      {name}
    </span>
  )
}
