import { useParams } from 'react-router'
import { loadSession } from '../store/session.ts'

// Privremeni lobby – samo prikazuje kod i spremljenu sesiju
export default function LobbyPage() {
  const { code } = useParams()
  const session = loadSession()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 p-4 text-neutral-100">
      <h1 className="text-2xl font-bold">Soba {code}</h1>
      <pre className="rounded bg-neutral-800 p-3 text-xs">
        {JSON.stringify(session, null, 2)}
      </pre>
    </main>
  )
}
