import type { ReactNode } from 'react'
import { cx } from '../lib/cx.ts'
import { playerHue } from '../lib/playerLook.ts'
import Avatar from './Avatar.tsx'

type VoteCardProps = {
  name: string
  /** avatar igrača ili znak za "Suzdržan" */
  face: ReactNode
  count: number
  /** vodi po broju glasova – broj je u boji akcenta */
  leading: boolean
  /** udio glasova, 0–1 */
  share: number
  /** tko je glasao za ovu karticu, redom kako su glasali */
  voters: { id: number; emoji: string }[]
  selected: boolean
  disabled: boolean
  onSelect: () => void
}

// 1 glas, 2–4 glasa, 5+ glasova (11–14 glasova)
function votesLabel(n: number) {
  const last = n % 10
  const lastTwo = n % 100
  if (last === 1 && lastTwo !== 11) return `${n} glas`
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${n} glasa`
  return `${n} glasova`
}

// Kartica za glasanje (prototip .vcard) u mreži 2 stupca: broj glasova, avatar, ime,
// avatari onih koji su glasali (svaki novi "padne" na mjesto) i traka udjela
export default function VoteCard({
  name,
  face,
  count,
  leading,
  share,
  voters,
  selected,
  disabled,
  onSelect,
}: VoteCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      aria-label={`${name}: ${votesLabel(count)}`}
      onClick={disabled ? undefined : onSelect}
      className={cx(
        'relative flex flex-col items-center gap-2 rounded-tile border px-2.5 pt-4 pb-3',
        '[transition:border-color_.25s,background-color_.25s,scale_.2s_cubic-bezier(.34,1.56,.64,1)]',
        '[-webkit-tap-highlight-color:transparent]',
        selected ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
        disabled ? 'cursor-default' : 'cursor-pointer active:scale-[.97]',
      )}
    >
      <span
        className={cx(
          'absolute top-2.5 right-3 text-xl font-bold tabular-nums [transition:color_.3s]',
          leading ? 'text-accent' : 'text-muted',
        )}
      >
        {count}
      </span>
      {face}
      <span className="max-w-full truncate text-[15px] font-semibold">{name}</span>
      <span className="flex min-h-[22px]">
        {voters.map((v) => (
          <span key={v.id} className="animate-drop-in not-first:-ml-1.5">
            <Avatar emoji={v.emoji} hue={playerHue(v.id)} size={22} className="shadow-[0_0_0_2px_var(--surface)]" />
          </span>
        ))}
      </span>
      <span className="h-1 w-full overflow-hidden rounded-full bg-line">
        <span
          className="block h-full bg-accent [transition:width_.5s_cubic-bezier(.2,.8,.2,1)]"
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </span>
    </button>
  )
}
