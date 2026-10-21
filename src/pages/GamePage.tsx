import { useState } from 'react'
import { Navigate, useParams } from 'react-router'
import ConnectionToast from '../components/ConnectionToast.tsx'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { useLobbySocket } from '../lib/useLobbySocket.ts'
import { useGameStore } from '../store/gameStore.ts'
import { loadSession } from '../store/session.ts'

export default function GamePage() {
  const code = (useParams().code ?? '').toUpperCase()
  const [inRoom] = useState(() => loadSession()?.lobbyCode === code)
  // Bez sesije za ovu sobu lobby prikaže ulazak ili "Igra u toj sobi je već počela."
  if (!inRoom) return <Navigate to={`/soba/${code}`} replace />
  return <GameScreen key={code} code={code} />
}

// Privremeni ekran igre – faze (uloga, noć, dan, glasanje, kraj) dolaze u idućem koraku
function GameScreen({ code }: { code: string }) {
  useLobbySocket(code)
  const status = useGameStore((s) => (s.lobby?.code === code ? s.lobby.status : null))
  const lobbyError = useGameStore((s) => s.lobbyError)

  // Igra još nije počela ili soba ne postoji – to pokazuje lobby
  if (status === 'WAITING' || lobbyError) return <Navigate to={`/soba/${code}`} replace />

  return (
    <ThemeRoot theme="night">
      <main className="mx-auto flex min-h-dvh max-w-[420px] items-center justify-center p-5">
        <h1 className="text-[28px] font-bold tracking-[-.02em]">Igra počinje</h1>
      </main>
      <ConnectionToast />
    </ThemeRoot>
  )
}
