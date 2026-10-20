import type { ReactNode } from 'react'
import { cx } from '../lib/cx.ts'
import { Icon, type IconName } from './icons.tsx'

type ChipProps = {
  icon?: IconName
  children: ReactNode
  className?: string
}

export default function Chip({ icon, children, className = '' }: ChipProps) {
  return (
    <span
      className={cx(
        'inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 text-[13px] font-medium whitespace-nowrap text-muted',
        className,
      )}
    >
      {icon && <Icon name={icon} size={15} />}
      {children}
    </span>
  )
}
