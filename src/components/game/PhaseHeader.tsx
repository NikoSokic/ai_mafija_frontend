import { useState } from 'react'
import { ROLES, type RoleKey } from '../../data/roles.ts'
import { loadNotes, type NightNote } from '../../store/notes.ts'
import IconButton from '../IconButton.tsx'
import { Icon, type IconName } from '../icons.tsx'
import RoleIcon from '../RoleIcon.tsx'
import { ScreenTop } from '../Screen.tsx'
import Toast from '../Toast.tsx'

type PhaseHeaderProps = {
  icon: IconName
  title: string
  /** vlastita uloga za brzi pogled; bez nje se gumb oka ne prikazuje */
  role: RoleKey | null
  /** kod sobe – za bilješke s rezultatima noći */
  code: string
}

// Zaglavlje faze: ikona + naslov, a oko pokaže toast s vlastitom ulogom
// i rezultatima istraga / usporedbi iz prošlih noći (do kraja igre)
export default function PhaseHeader({ icon, title, role, code }: PhaseHeaderProps) {
  const [peek, setPeek] = useState(false)
  const [notes, setNotes] = useState<NightNote[]>([])
  const info = role ? ROLES[role] : null

  return (
    <>
      <ScreenTop>
        <div className="flex flex-1 items-center gap-2.5 pl-2.5 text-[22px] font-bold tracking-[-.02em]">
          <span className="text-accent">
            <Icon name={icon} size={22} />
          </span>
          {title}
        </div>
        {role && (
          <IconButton
            icon="eye"
            aria-label="Pogledaj svoju ulogu"
            onClick={() => {
              setNotes(loadNotes(code))
              setPeek(true)
            }}
          />
        )}
      </ScreenTop>
      {role && info && (
        <Toast
          open={peek}
          onClose={() => setPeek(false)}
          duration={notes.length ? 5000 : 2600}
          leading={<RoleIcon role={role} size={40} />}
          title={
            <>
              Tvoja uloga: <span style={{ color: info.color }}>{info.name}</span>
            </>
          }
          text={
            <>
              {info.team === 'mafia' ? 'Tim mafije' : 'Tim građana'}
              {notes.map((n, i) => (
                <span key={i} className="block text-text">
                  {noteText(n)}
                </span>
              ))}
            </>
          }
        />
      )}
    </>
  )
}

function noteText(n: NightNote) {
  if (n.type === 'INVESTIGATE') {
    return `Noć ${n.round}: ${n.targets[0].nickname} ${n.value === 'MAFIA' ? 'je mafija' : 'nije mafija'}`
  }
  const [a, b] = n.targets
  return `Noć ${n.round}: ${a.nickname} i ${b.nickname} – ${n.value === 'ISTI_TIM' ? 'isti tim' : 'različiti timovi'}`
}
