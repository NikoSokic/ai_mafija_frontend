import { cx } from '../lib/cx.ts'
import Avatar from './Avatar.tsx'

// Kutovi nišana (.ptile .lock iz prototipa): 8 crtica u boji akcenta, po dvije u svakom kutu
const CORNER = 'linear-gradient(var(--accent), var(--accent))'
const LOCK_BACKGROUND = [
  'top left / 14px 2px',
  'top left / 2px 14px',
  'top right / 14px 2px',
  'top right / 2px 14px',
  'bottom left / 14px 2px',
  'bottom left / 2px 14px',
  'bottom right / 14px 2px',
  'bottom right / 2px 14px',
]
  .map((corner) => `${CORNER} ${corner} no-repeat`)
  .join(', ')

type PlayerTileProps = {
  name: string
  emoji: string
  hue: number
  selected?: boolean
  /** razlog zašto se igrač ne može odabrati ("Ti", "Meta mafije"); tada je pločica onemogućena */
  tag?: string | null
  onSelect?: () => void
}

// Meta noćne akcije u mreži 3 stupca. Odabir zatvori kutove nišana oko pločice.
export default function PlayerTile({ name, emoji, hue, selected = false, tag = null, onSelect }: PlayerTileProps) {
  const off = Boolean(tag)
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-disabled={off || undefined}
      onClick={off ? undefined : onSelect}
      className={cx(
        'relative flex min-w-0 flex-col items-center gap-2 rounded-tile border px-1.5 pt-3.5 pb-3',
        '[-webkit-tap-highlight-color:transparent] active:scale-[.96]',
        '[transition:border-color_.25s,background-color_.25s,scale_.18s_cubic-bezier(.2,.8,.2,1)]',
        selected ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
        off && 'pointer-events-none pt-[22px] opacity-42',
      )}
    >
      {tag && (
        <span className="absolute inset-x-1.5 top-1.5 truncate text-center text-[10.5px] font-semibold text-muted">
          {tag}
        </span>
      )}
      {/* nišan nastaje pri svakom odabiru, pa se animacija svaki put ponovi */}
      {selected && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-1 animate-lock-on rounded-[14px]"
          style={{ background: LOCK_BACKGROUND }}
        />
      )}
      <Avatar emoji={emoji} hue={hue} size={46} selected={selected} />
      <span className="max-w-full truncate text-sm font-semibold">{name}</span>
    </button>
  )
}
