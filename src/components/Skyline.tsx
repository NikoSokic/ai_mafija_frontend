import { useId, useState } from 'react'
import { cx } from '../lib/cx.ts'
import { seededRandom } from '../lib/seededRandom.ts'

export type WindowState = 'on' | 'off' | 'empty'

// 11 zgrada iz spec 5: [x, širina, visina] u viewBoxu 390 × 140
const BUILDINGS: [number, number, number][] = [
  [0, 40, 62], [38, 30, 96], [66, 46, 78], [110, 26, 118], [134, 50, 88], [182, 34, 108],
  [214, 44, 72], [256, 30, 124], [284, 48, 86], [330, 30, 104], [358, 32, 70],
]

// Ukrasni prozori 3 × 5, ~13 % upaljeno. Fiksni seed i izračun jednom – ne mijenjaju se pri renderu.
const DECO = (() => {
  const rnd = seededRandom(11)
  const out: { x: number; y: number; opacity: number }[] = []
  for (const [x, w, h] of BUILDINGS) {
    for (let y = 140 - h + 10; y < 134; y += 10) {
      for (let xx = x + 5; xx < x + w - 6; xx += 8) {
        const r = rnd()
        if (r < 0.13) out.push({ x: xx, y, opacity: Number((0.12 + r * 2.2).toFixed(2)) })
      }
    }
  }
  return out
})()

// Prozor igrača i (redoslijed ulaska): zgrada (i*4+1) % 11, red floor(i/11) – stane do 20 igrača
function windowPosition(i: number) {
  const [x, w, h] = BUILDINGS[(i * 4 + 1) % 11]
  const row = Math.floor(i / 11)
  return { x: x + w / 2 - 4.5, y: 140 - h + 14 + row * 22 }
}

type SkylineProps<T extends { id: number | string }> = {
  players: T[]
  stateOf: (player: T, index: number) => WindowState
  className?: string
}

// Silueta grada – svaki igrač je jedan prozor. Stavlja se između sadržaja i podnožja
// (podnožje ima bg-sky); omot je visok 0, a grad "stoji" na njegovu dnu.
export default function Skyline<T extends { id: number | string }>({
  players,
  stateOf,
  className = '',
}: SkylineProps<T>) {
  // jedinstven id filtera, jer na stranici može biti više gradova
  const glowId = `winglow${useId().replace(/[^\w-]/g, '')}`

  return (
    <div className={cx('pointer-events-none relative z-[4] h-0 shrink-0', className)}>
      <svg
        className="absolute inset-x-0 -bottom-px h-32 w-full"
        viewBox="0 0 390 140"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <defs>
          <filter id={glowId} x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g className="fill-sky">
          {BUILDINGS.map(([x, w, h]) => (
            <rect key={x} x={x} y={140 - h} width={w} height={h} />
          ))}
        </g>
        <g className="fill-window">
          {DECO.map((d) => (
            <rect key={`${d.x}-${d.y}`} x={d.x} y={d.y} width={3} height={5} opacity={d.opacity} />
          ))}
        </g>
        {players.map((p, i) => (
          <PlayerWindow key={p.id} index={i} state={stateOf(p, i)} glow={`url(#${glowId})`} />
        ))}
      </svg>
    </div>
  )
}

type PlayerWindowProps = { index: number; state: WindowState; glow: string }

// Pamti prethodno stanje da zna koju animaciju pokrenuti; pri prvom prikazu nema animacije
function PlayerWindow({ index, state, glow }: PlayerWindowProps) {
  const [prev, setPrev] = useState(state)
  const [anim, setAnim] = useState<'on' | 'off' | null>(null)
  if (state !== prev) {
    setPrev(state)
    setAnim(state === 'on' ? 'on' : prev === 'on' && state === 'off' ? 'off' : null)
  }

  const { x, y } = windowPosition(index)
  return (
    <rect
      x={x}
      y={y}
      width={9}
      height={12}
      rx={1.5}
      // sjaj ostaje dok prozor treperi pri gašenju
      filter={state === 'on' || anim === 'off' ? glow : undefined}
      strokeWidth={state === 'empty' ? 1 : undefined}
      className={cx(
        '[transition:fill_.6s,opacity_.6s]',
        state === 'on' && 'fill-window',
        state === 'off' && 'fill-line',
        state === 'empty' && 'fill-none stroke-line [stroke-dasharray:2_2]',
        anim === 'on' && 'animate-win-on',
        anim === 'off' && 'animate-win-off',
      )}
      onAnimationEnd={() => setAnim(null)}
    />
  )
}
