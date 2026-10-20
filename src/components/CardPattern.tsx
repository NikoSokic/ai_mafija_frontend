import { seededRandom } from '../lib/seededRandom.ts'

// [x, širina, visina] u viewBoxu 270 × 378
const BUILDINGS: [number, number, number][] = [
  [0, 60, 150], [56, 44, 210], [96, 70, 170], [162, 40, 240], [198, 72, 190],
]

// ~18 % prozora upaljeno; fiksni seed i izračun jednom
const WINDOWS = (() => {
  const rnd = seededRandom(3)
  const out: { x: number; y: number; lit: boolean }[] = []
  for (const [x, w, h] of BUILDINGS) {
    for (let y = 378 - h + 12; y < 370; y += 14) {
      for (let xx = x + 8; xx < x + w - 8; xx += 12) {
        out.push({ x: xx, y, lit: rnd() < 0.18 })
      }
    }
  }
  return out
})()

// Uzorak grada za poleđinu karte uloge
export default function CardPattern({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 270 378" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {BUILDINGS.map(([x, w, h]) => (
        <rect key={x} x={x} y={378 - h} width={w} height={h} className="fill-surface-2" />
      ))}
      {WINDOWS.map((win) => (
        <rect
          key={`${win.x}-${win.y}`}
          x={win.x}
          y={win.y}
          width={5}
          height={7}
          className={win.lit ? 'fill-window' : 'fill-line'}
          opacity={win.lit ? 0.75 : 0.6}
        />
      ))}
    </svg>
  )
}
