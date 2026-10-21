import { motion } from 'framer-motion'
import { useNavigate } from 'react-router'
import Button from '../components/Button.tsx'
import IconButton from '../components/IconButton.tsx'
import { Screen, ScreenBody, ScreenTop } from '../components/Screen.tsx'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { riseItem } from '../lib/motion.ts'

// Javne sobe (spec 6.2). Backend još nema popis javnih soba (docs/backend-todo.md), pa je ovdje samo prazno stanje.
export default function PublicRoomsPage() {
  const navigate = useNavigate()
  return (
    <ThemeRoot theme="night">
      <Screen>
        <ScreenTop>
          <IconButton icon="back" aria-label="Natrag" onClick={() => navigate('/')} />
          <h2 className="flex-1 text-[17px] font-semibold tracking-[-.01em]">Javne sobe</h2>
        </ScreenTop>
        <ScreenBody>
          <motion.div variants={riseItem} className="px-3 py-12 text-center">
            <h4 className="mb-1.5 text-[17px] font-semibold">Trenutno nema soba</h4>
            <p className="text-[13px] leading-[1.45] text-muted">Kreiraj svoju sobu i pozovi prijatelje kodom.</p>
            {/* /nova bez nadimka vraća na Početnu */}
            <Button variant="secondary" className="mt-4" onClick={() => navigate('/nova')}>
              Kreiraj sobu
            </Button>
          </motion.div>
        </ScreenBody>
      </Screen>
    </ThemeRoot>
  )
}
