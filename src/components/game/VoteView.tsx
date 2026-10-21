import { motion } from 'framer-motion'
import type { RoleKey } from '../../data/roles.ts'
import { riseItem } from '../../lib/motion.ts'
import { Screen, ScreenBody } from '../Screen.tsx'
import PhaseHeader from './PhaseHeader.tsx'

type VoteViewProps = { code: string; tieBreak: boolean; role: RoleKey | null }

// Privremeni prikaz glasanja – glasanje dolazi u idućem koraku
export default function VoteView({ code, tieBreak, role }: VoteViewProps) {
  const title = tieBreak ? 'Ponovno glasanje' : 'Glasanje'
  return (
    <Screen>
      <PhaseHeader icon="vote" title={title} role={role} code={code} />
      <ScreenBody>
        <motion.h1 variants={riseItem} className="text-[30px] font-bold tracking-[-.03em]">
          {title}
        </motion.h1>
      </ScreenBody>
    </Screen>
  )
}
