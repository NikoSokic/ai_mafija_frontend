import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import CreateRoomPage from './pages/CreateRoomPage.tsx'
import HomePage from './pages/HomePage.tsx'
import LobbyPage from './pages/LobbyPage.tsx'

// Galerija komponenti samo u dev načinu – ne ulazi u produkcijski build
const DevPage = import.meta.env.DEV ? lazy(() => import('./pages/DevPage.tsx')) : null

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/nova" element={<CreateRoomPage />} />
      <Route path="/soba/:code" element={<LobbyPage />} />
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
  )
}
