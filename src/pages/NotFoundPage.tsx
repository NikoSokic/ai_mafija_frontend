import { motion } from 'framer-motion'
import { useNavigate } from 'react-router'
import Button from '../components/Button.tsx'
import { Screen, ScreenBody, ScreenFooter, ScreenTop } from '../components/Screen.tsx'
import Skyline from '../components/Skyline.tsx'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { riseItem } from '../lib/motion.ts'
import { roomPath, useResumeStore } from '../store/resume.ts'
import { loadSession } from '../store/session.ts'

// Ukrasni grad kao na Početnoj, svi prozori ugašeni
const CITY = Array.from({ length: 8 }, (_, i) => ({ id: i }))

// Nepoznat URL (npr. krivo upisan link za poziv)
export default function NotFoundPage() {
  const navigate = useNavigate()
  const session = loadSession()
  // stanje sobe je poznato samo ako ga je provjera pri pokretanju dobila baš za ovu sobu
  const status = useResumeStore((s) => (s.lobbyCode === session?.lobbyCode ? s.lobbyStatus : null))

  return (
    <ThemeRoot theme="night">
      <Screen>
        <ScreenTop>
          <span className="flex-1" />
        </ScreenTop>
        <ScreenBody withSky>
          <div className="pt-7">
            <motion.p variants={riseItem} className="mb-2 text-[22px] font-medium tracking-[-.01em] text-muted">
              404
            </motion.p>
            <motion.h1 variants={riseItem} className="mb-4 text-[40px] leading-[1] font-bold tracking-[-.04em]">
              Ovdje nema ničega
            </motion.h1>
            <motion.p variants={riseItem} className="max-w-[32ch] text-base leading-normal text-muted">
              Ova stranica ne postoji. Provjeri link ili se vrati na početnu.
            </motion.p>
          </div>
        </ScreenBody>
        <Skyline players={CITY} stateOf={() => 'off'} />
        <ScreenFooter rise className="bg-sky">
          {session && (
            <Button onClick={() => navigate(roomPath(session.lobbyCode, status))}>
              Nastavi igru u sobi {session.lobbyCode}
            </Button>
          )}
          <Button variant={session ? 'secondary' : 'primary'} onClick={() => navigate('/')}>
            Na početnu
          </Button>
        </ScreenFooter>
      </Screen>
    </ThemeRoot>
  )
}
