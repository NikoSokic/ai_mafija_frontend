import { useState } from 'react'
import { ROLES, type RoleKey } from '../../data/roles.ts'
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
}

// Zaglavlje faze: ikona + naslov, a oko pokaže toast s vlastitom ulogom
export default function PhaseHeader({ icon, title, role }: PhaseHeaderProps) {
  const [peek, setPeek] = useState(false)
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
        {role && <IconButton icon="eye" aria-label="Pogledaj svoju ulogu" onClick={() => setPeek(true)} />}
      </ScreenTop>
      {role && info && (
        <Toast
          open={peek}
          onClose={() => setPeek(false)}
          duration={2600}
          leading={<RoleIcon role={role} size={40} />}
          title={
            <>
              Tvoja uloga: <span style={{ color: info.color }}>{info.name}</span>
            </>
          }
          text={info.team === 'mafia' ? 'Tim mafije' : 'Tim građana'}
        />
      )}
    </>
  )
}
