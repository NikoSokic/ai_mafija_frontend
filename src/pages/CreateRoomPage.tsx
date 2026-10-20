import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { createLobby, getRoles, type Role } from '../api/rest.ts'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { saveSession } from '../store/session.ts'

// Testna verzija ekrana Nova soba – samo spaja POST /api/lobbies, bez dizajna iz prototipa
export default function CreateRoomPage() {
  const navigate = useNavigate()
  const [roles, setRoles] = useState<Role[]>([])
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [nickname, setNickname] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    getRoles()
      .then(setRoles)
      .catch((e: Error) => setError(e.message))
  }, [])

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const canSubmit = nickname.trim() !== '' && total === maxPlayers && !sending

  async function submit() {
    setSending(true)
    setError(null)
    try {
      const res = await createLobby({
        hostNickname: nickname.trim(),
        maxPlayers,
        roles: Object.entries(counts)
          .filter(([, count]) => count > 0)
          .map(([roleId, count]) => ({ roleId: Number(roleId), count })),
      })
      console.log('POST /api/lobbies →', res)
      saveSession({
        playerId: res.hostPlayerId,
        playerToken: res.playerToken,
        lobbyCode: res.code,
      })
      navigate(`/soba/${res.code}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <ThemeRoot theme="night">
      <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-4 p-4 text-neutral-100">
        <h1 className="text-2xl font-bold">Nova soba</h1>

        <label className="flex flex-col gap-1">
          Tvoj nadimak
          <input
            className="rounded bg-neutral-800 px-2 py-1"
            maxLength={16}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          Broj igrača
          <input
            type="number"
            className="rounded bg-neutral-800 px-2 py-1"
            min={4}
            max={20}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
          />
        </label>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Uloge</h2>
          {roles.map((role) => (
            <label key={role.id} className="flex items-center justify-between gap-2">
              <span>{role.name}</span>
              <input
                type="number"
                className="w-16 rounded bg-neutral-800 px-2 py-1"
                min={0}
                value={counts[role.id] ?? 0}
                onChange={(e) =>
                  setCounts({ ...counts, [role.id]: Math.max(0, Number(e.target.value)) })
                }
              />
            </label>
          ))}
          <p className="text-sm text-neutral-400">
            Raspoređeno {total} od {maxPlayers}
          </p>
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          className="rounded bg-red-700 px-4 py-2 font-semibold disabled:opacity-40"
          disabled={!canSubmit}
          onClick={submit}
        >
          {sending ? 'Kreiram…' : 'Kreiraj sobu'}
        </button>
      </main>
    </ThemeRoot>
  )
}
