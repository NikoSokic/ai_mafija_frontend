import { Route, Routes } from 'react-router'
import CreateRoomPage from './pages/CreateRoomPage.tsx'
import HomePage from './pages/HomePage.tsx'
import LobbyPage from './pages/LobbyPage.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/nova" element={<CreateRoomPage />} />
      <Route path="/soba/:code" element={<LobbyPage />} />
    </Routes>
  )
}
