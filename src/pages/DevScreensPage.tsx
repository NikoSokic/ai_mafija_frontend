import { useState } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { useGameStore } from '../store/gameStore.ts'
import { markNarrated } from '../store/narrated.ts'
import { saveProfile } from '../store/profile.ts'
import { useResumeStore } from '../store/resume.ts'
import { useServerStore } from '../store/server.ts'
import { saveSession } from '../store/session.ts'
import CreateRoomPage from './CreateRoomPage.tsx'
import { CODE, SCREENS, isScreen, narrationKeys, scenarioOf, type ScreenName } from './devScreens/fixtures.ts'
import { installMockTransport } from './devScreens/mockTransport.ts'
import GameScreenPage from './GameScreen.tsx'
import HomePage from './HomePage.tsx'
import LobbyPage from './LobbyPage.tsx'
import PublicRoomsPage from './PublicRoomsPage.tsx'

// Pravi ekrani s izmišljenim podacima, bez backenda – samo za razvoj (ruta /dev/screens?screen=…).
// Po njima scripts/mobile-snapshots.mjs provjerava da se mobilni izgled nije promijenio.

const STORAGE_KEYS = ['aimafija.session', 'aimafija.profile', 'aimafija.introSeen']

export default function DevScreensPage() {
  const name = new URLSearchParams(useLocation().search).get('screen')
  if (!isScreen(name)) return <ScreenIndex />
  return <Stage key={name} name={name} />
}

// Stanje se priprema prije prvog rendera stranice, da njezini efekti već vide lažni backend i spremljenu sesiju
function prepare(name: ScreenName) {
  const now = Date.now()
  const scenario = scenarioOf(name, now)

  useGameStore.setState(useGameStore.getInitialState(), true)
  useServerStore.setState({ status: scenario.healthDown ? 'waking' : 'ready' })
  useResumeStore.setState({ status: 'done', lobbyCode: null, lobbyStatus: null })
  installMockTransport(scenario, now)

  try {
    STORAGE_KEYS.forEach((k) => localStorage.removeItem(k))
    sessionStorage.removeItem(`aimafija.narrated.${CODE}`)
  } catch {
    // bez pohrane ekran se i dalje prikaže, samo bez sesije
  }
  if (scenario.me !== undefined) saveSession({ playerId: scenario.me, playerToken: 'dev', lobbyCode: CODE })
  if (scenario.profile) saveProfile(scenario.profile)
  if (scenario.page === 'game') {
    narrationKeys()
      .filter((k) => k !== scenario.narration)
      .forEach((k) => markNarrated(CODE, k))
  }
  return scenario
}

function Stage({ name }: { name: ScreenName }) {
  const [scenario] = useState(() => prepare(name))

  switch (scenario.page) {
    case 'home':
      return <HomePage />
    case 'create':
      return <CreateRoomPage />
    case 'rooms':
      return <PublicRoomsPage />
    case 'lobby':
    case 'game':
      // useParams() u stranici čita kod sobe iz ove lažne adrese; pravi URL ostaje /dev/screens
      return (
        <Routes location={`/dev/screens/${scenario.page === 'lobby' ? 'soba' : 'igra'}/${CODE}`}>
          <Route path="soba/:code" element={<LobbyPage />} />
          <Route path="igra/:code" element={<GameScreenPage />} />
        </Routes>
      )
  }
}

function ScreenIndex() {
  return (
    <ThemeRoot theme="night">
      <main className="mx-auto max-w-[420px] px-5 py-8">
        <h1 className="mb-4 text-2xl font-bold">Ekrani</h1>
        <ul className="flex flex-col gap-2">
          {SCREENS.map((s) => (
            <li key={s}>
              {/* puno učitavanje: svaki ekran kreće od praznog stanja */}
              <a className="text-accent underline" href={`/dev/screens?screen=${s}`}>
                {s}
              </a>
            </li>
          ))}
        </ul>
      </main>
    </ThemeRoot>
  )
}
