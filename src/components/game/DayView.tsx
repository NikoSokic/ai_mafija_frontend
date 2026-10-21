import { motion } from 'framer-motion'
import type { RoleKey } from '../../data/roles.ts'
import { riseItem } from '../../lib/motion.ts'
import { Screen, ScreenBody } from '../Screen.tsx'
import PhaseHeader from './PhaseHeader.tsx'

type DayViewProps = { code: string; round: number; tieBreak: boolean; role: RoleKey | null }

// Privremeni prikaz dana – rasprava i glasanje dolaze u idućem koraku
export default function DayView({ code, round, tieBreak, role }: DayViewProps) {
  const title = tieBreak ? 'Ponovno glasanje' : `Dan ${round}`
  return (
    <Screen>
      <PhaseHeader icon={tieBreak ? 'vote' : 'sun'} title={title} role={role} code={code} />
      <ScreenBody>
        <motion.h1 variants={riseItem} className="text-[30px] font-bold tracking-[-.03em]">
          {title}
        </motion.h1>
      </ScreenBody>
    </Screen>
  )
}
