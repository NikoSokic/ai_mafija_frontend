import { lazy, Suspense, useEffect, useRef } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router'
import CreateRoomPage from './pages/CreateRoomPage.tsx'
import GameScreen from './pages/GameScreen.tsx'
import HomePage from './pages/HomePage.tsx'
import LobbyPage from './pages/LobbyPage.tsx'
import PublicRoomsPage from './pages/PublicRoomsPage.tsx'
import { resumeSession, roomPath } from './store/resume.ts'
import { wakeServer, whenServerReady } from './store/server.ts'

// Galerija komponenti samo u dev načinu – ne ulazi u produkcijski build
const DevPage = import.meta.env.DEV ? lazy(() => import('./pages/DevPage.tsx')) : null

export default function App() {
  return (
    <>
      <SessionResume />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sobe" element={<PublicRoomsPage />} />
        <Route path="/nova" element={<CreateRoomPage />} />
        <Route path="/soba/:code" element={<LobbyPage />} />
        <Route path="/igra/:code" element={<GameScreen />} />
        {DevPage && (
          <Route
            path="/dev"
            element={
              <Suspense>
                <DevPage />
              </Suspense>
            }
          />
        )}
      </Routes>
    </>
  )
}

// Pri pokretanju na Početnoj spremljena sesija vodi ravno u sobu ili igru (spec 6.10).
// Na drugim rutama (npr. link za poziv) se ne preusmjerava – lobby i igra sami provjere sesiju.
function SessionResume() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pathRef = useRef(pathname)
  // Odgovor se obradi samo jednom: kasniji povratak na Početnu ne smije opet preusmjeriti
  const handled = useRef(false)
  useEffect(() => {
    pathRef.current = pathname
  })

  useEffect(() => {
    let active = true
    void wakeServer()
    // hladni server ne provjeravamo prije nego odgovori na /api/health
    void whenServerReady().then(() => resumeSession(pathRef.current === '/')).then((target) => {
      if (!active || handled.current) return
      handled.current = true
      // igrač je za vrijeme provjere možda već otišao s Početne
      if (target && pathRef.current === '/') {
        navigate(roomPath(target.lobbyCode, target.lobbyStatus), { replace: true })
      }
    })
    return () => {
      active = false
    }
  }, [navigate])

  return null
}
