import type { ComponentProps } from 'react'
import { cx } from '../lib/cx.ts'
import { Icon, type IconName } from './icons.tsx'

type IconButtonProps = Omit<ComponentProps<'button'>, 'children' | 'aria-label'> & {
  icon: IconName
  /** obavezan: gumb nema vidljiv tekst */
  'aria-label': string
  iconSize?: number
}

export default function IconButton({
  icon,
  iconSize = 22,
  type = 'button',
  className = '',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'grid size-11 shrink-0 cursor-pointer place-items-center rounded-[14px] text-text',
        '[transition:background-color_.2s,scale_.14s] hover:bg-surface active:scale-[.92]',
        'disabled:pointer-events-none disabled:opacity-38',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  )
}
