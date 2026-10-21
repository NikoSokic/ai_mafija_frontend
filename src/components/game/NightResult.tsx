import { motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import { playerHue } from '../../lib/playerLook.ts'
import { riseItem } from '../../lib/motion.ts'
import type { NightNote, NoteTarget } from '../../store/notes.ts'
import Avatar from '../Avatar.tsx'

type NightResultProps = {
  note: NightNote
  emojiOf: (playerId: number) => string
}

// Rezultat istrage (Policajac) ili usporedbe (Novinar); kartica ulazi s nagibom
export default function NightResult({ note, emojiOf }: NightResultProps) {
  const avatar = (t: NoteTarget, size: number) => <Avatar emoji={emojiOf(t.id)} hue={playerHue(t.id)} size={size} />

  if (note.type === 'INVESTIGATE') {
    const [t] = note.targets
    const mafia = note.value === 'MAFIA'
    return (
      <>
        <Title>Rezultat istrage</Title>
        <Card color={mafia ? 'var(--role-mafia)' : 'var(--role-policajac)'}>
          <div className="mb-3.5 flex justify-center">{avatar(t, 72)}</div>
          <h4 className="text-2xl font-bold tracking-[-.02em] text-(--rc)">
            {t.nickname} {mafia ? 'je mafija' : 'nije mafija'}
          </h4>
          <p className="mt-1.5 text-sm text-muted">
            {mafia ? 'Pazi kome ovo otkrivaš.' : 'Barem prema onome što si vidio noćas.'}
          </p>
        </Card>
      </>
    )
  }

  const [a, b] = note.targets
  const same = note.value === 'ISTI_TIM'
  return (
    <>
      <Title>Rezultat usporedbe</Title>
      <Card color={same ? 'var(--role-novinar)' : 'var(--accent)'}>
        <div className="mb-3.5 flex items-center justify-center gap-4">
          {avatar(a, 64)}
          <span className="text-[34px] font-bold text-(--rc)" aria-hidden="true">
            {same ? '=' : '≠'}
          </span>
          {avatar(b, 64)}
        </div>
        <h4 className="text-2xl font-bold tracking-[-.02em] text-(--rc)">{same ? 'Isti tim' : 'Različiti timovi'}</h4>
        <p className="mt-1.5 text-sm text-muted">
          {a.nickname} i {b.nickname}{' '}
          {same ? 'igraju za istu stranu.' : 'nisu na istoj strani. Jedno od njih je u timu mafije.'}
        </p>
      </Card>
    </>
  )
}

function Title({ children }: { children: string }) {
  return (
    <motion.h3 variants={riseItem} className="mt-1.5 mb-2 text-[26px] leading-[1.15] font-bold tracking-[-.025em]">
      {children}
    </motion.h3>
  )
}

// --rc je boja rezultata za naslov i znak = / ≠
function Card({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div
      className="mt-2 animate-result-in rounded-card border p-5 text-center"
      style={
        {
          '--rc': color,
          borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${color} 10%, var(--surface))`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  )
}
