import { cx } from '../lib/cx.ts'
import { Icon, type IconName } from './icons.tsx'

type AvatarProps = {
  emoji: string
  /** 0–360, iz id-a igrača */
  hue: number
  /** promjer u px (16–132) */
  size?: number
  dead?: boolean
  selected?: boolean
  host?: boolean
  muted?: boolean
  className?: string
}

// Emoji u krugu. Skriven od čitača ekrana jer se uz avatar uvijek piše ime igrača.
export default function Avatar({
  emoji,
  hue,
  size = 48,
  dead = false,
  selected = false,
  host = false,
  muted = false,
  className = '',
}: AvatarProps) {
  const badge = Math.max(18, size * 0.42)

  return (
    <span
      aria-hidden="true"
      className={cx(
        'relative grid shrink-0 place-items-center rounded-full font-emoji leading-none',
        '[transition:filter_.5s,opacity_.5s,box-shadow_.25s,scale_.25s_cubic-bezier(.34,1.56,.64,1)]',
        dead && 'opacity-50 brightness-70 grayscale',
        selected && 'scale-[1.04] shadow-[0_0_0_3px_var(--bg),0_0_0_5.5px_var(--accent)]',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        backgroundColor: `hsl(${hue} 38% 21%)`,
      }}
    >
      {emoji}
      {host && <Badge icon="crown" title="Domaćin" size={badge} className="-top-[3px] -right-[3px] text-window" />}
      {muted && <Badge icon="mute" title="Utišan" size={badge} className="-right-[3px] -bottom-[3px] text-accent" />}
    </span>
  )
}

type BadgeProps = { icon: IconName; title: string; size: number; className: string }

function Badge({ icon, title, size, className }: BadgeProps) {
  return (
    <span
      title={title}
      className={cx('absolute grid place-items-center rounded-full bg-bg font-sans', className)}
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={Math.round(size * 0.62)} strokeWidth={2} />
    </span>
  )
}
