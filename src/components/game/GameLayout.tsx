import { useContext, type ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'
import { ScreenBody } from '../Screen.tsx'
import { GameSidebarContext } from './gameSidebarContext.ts'

// Zajednički raspored ekrana igre. GameScreen kroz kontekst daje bočnu ploču samo na desktopu;
// na mobitelu je null, pa GameBody vraća isti ScreenBody kao prije (ni jednog novog elementa).

type GameBodyProps = { children: ReactNode; withSky?: boolean }

export function GameBody({ children, withSky = false }: GameBodyProps) {
  const sidebar = useContext(GameSidebarContext)
  const body = <ScreenBody withSky={withSky}>{children}</ScreenBody>
  if (!sidebar) return body

  // Ploča završava na vrhu grada (donji razmak = visina grada), da ne prekrije prozore igrača;
  // kad je igrača više nego mjesta, skrola se samo popis u njoj
  return (
    <div className="relative z-[2] flex min-h-0 flex-1 pr-10">
      {body}
      <aside
        aria-label="Igrači i stanje igre"
        className={cx('flex w-[320px] shrink-0 flex-col pt-4', withSky ? 'pb-[clamp(196px,calc(26vh+16px),296px)]' : 'pb-10')}
      >
        {sidebar}
      </aside>
    </div>
  )
}
