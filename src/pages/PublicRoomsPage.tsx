import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { describeError, getPublicLobbies } from '../api/rest.ts'
import type { LobbyMode, PublicLobbyResponse } from '../api/types.ts'
import Avatar from '../components/Avatar.tsx'
import Button from '../components/Button.tsx'
import { buttonClasses } from '../components/buttonStyles.ts'
import Chip from '../components/Chip.tsx'
import IconButton from '../components/IconButton.tsx'
import { Screen, ScreenBody, ScreenTop } from '../components/Screen.tsx'
import Segmented from '../components/Segmented.tsx'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { DEFAULT_EMOJI } from '../data/emojis.ts'
import { riseItem } from '../lib/motion.ts'
import { playerHue } from '../lib/playerLook.ts'

const REFRESH_MS = 5000

type Filter = 'all' | LobbyMode

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Sve' },
  { value: 'LIVE', label: 'Uživo' },
  { value: 'ONLINE', label: 'Online' },
]

// Javna soba nema id igrača domaćina, pa se boja kruga računa iz koda sobe
const hueOf = (code: string) => playerHue([...code].reduce((sum, ch) => sum + ch.charCodeAt(0), 0))

// Javne sobe (spec 6.2): čekaonice koje domaćini otvorili za sve. Popis se osvježava dok je ekran otvoren.
export default function PublicRoomsPage() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<PublicLobbyResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(
    () =>
      getPublicLobbies()
        .then((list) => {
          setRooms(list)
          setError(null)
        })
        .catch((e: unknown) => setError(describeError(e)))
        .finally(() => setLoading(false)),
    [],
  )

  // ručno osvježavanje: ikona se vrti dok zahtjev traje
  function refresh() {
    setLoading(true)
    void load()
  }

  useEffect(() => {
    void load()
    // u skrivenom tabu nema smisla pitati poslužitelj
    const id = window.setInterval(() => {
      if (!document.hidden) void load()
    }, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [load])

  const list = (rooms ?? []).filter((r) => filter === 'all' || r.mode === filter)

  return (
    <ThemeRoot theme="night">
      <Screen>
        <ScreenTop>
          <IconButton icon="back" aria-label="Natrag" onClick={() => navigate('/')} />
          <h2 className="flex-1 text-[17px] font-semibold tracking-[-.01em]">Javne sobe</h2>
          <IconButton
            icon="refresh"
            aria-label="Osvježi popis"
            onClick={refresh}
            className={loading ? 'motion-safe:[&_svg]:animate-spin' : ''}
          />
        </ScreenTop>
        <ScreenBody>
          <motion.div variants={riseItem} className="mb-4">
            <Segmented
              aria-label="Način igre"
              options={FILTERS}
              value={filter}
              onChange={setFilter}
            />
          </motion.div>

          {rooms === null && error ? (
            <motion.div variants={riseItem} className="px-3 py-12 text-center">
              <p role="alert" className="mb-4 text-[13px] leading-[1.45] text-muted">
                {error}
              </p>
              <Button variant="secondary" onClick={refresh}>
                Pokušaj ponovno
              </Button>
            </motion.div>
          ) : rooms === null ? (
            <p role="status" className="px-3 py-12 text-center text-sm text-muted">
              Učitavam sobe…
            </p>
          ) : list.length === 0 ? (
            <motion.div variants={riseItem} className="px-3 py-12 text-center">
              <h4 className="mb-1.5 text-[17px] font-semibold">
                {filter === 'all'
                  ? 'Trenutno nema soba'
                  : filter === 'LIVE'
                    ? 'Trenutno nema soba uživo'
                    : 'Trenutno nema online soba'}
              </h4>
              <p className="text-[13px] leading-[1.45] text-muted">Kreiraj svoju sobu i pozovi prijatelje kodom.</p>
              {/* /nova bez nadimka vraća na Početnu */}
              <Button variant="secondary" className="mt-4" onClick={() => navigate('/nova')}>
                Kreiraj sobu
              </Button>
            </motion.div>
          ) : (
            list.map((room) => <RoomCard key={room.code} room={room} onJoin={() => navigate(`/soba/${room.code}`)} />)
          )}
        </ScreenBody>
      </Screen>
    </ThemeRoot>
  )
}

function RoomCard({ room, onJoin }: { room: PublicLobbyResponse; onJoin: () => void }) {
  const full = room.playerCount >= room.maxPlayers
  return (
    <motion.article
      variants={riseItem}
      className="mb-2.5 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-tile border border-line bg-surface p-3.5"
    >
      <Avatar emoji={room.hostAvatarEmoji || DEFAULT_EMOJI} hue={hueOf(room.code)} size={44} host />
      <div className="min-w-0">
        <h4 className="truncate text-base font-semibold">{room.hostNickname}</h4>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Chip icon={room.mode === 'LIVE' ? 'users' : 'globe'}>{room.mode === 'LIVE' ? 'Uživo' : 'Online'}</Chip>
          <Chip className="tabular-nums">
            {room.playerCount} od {room.maxPlayers}
          </Chip>
        </div>
      </div>
      {full ? (
        <button type="button" disabled className={buttonClasses('ghost', 'sm')}>
          Puna
        </button>
      ) : (
        <Button size="sm" onClick={onJoin}>
          Uđi
        </Button>
      )}
      <div className="col-span-full flex items-center border-t border-line pt-3">
        <div
          role="img"
          aria-label={`${room.playerCount} od ${room.maxPlayers} mjesta zauzeto`}
          className="flex flex-wrap gap-1"
        >
          {Array.from({ length: room.maxPlayers }, (_, k) => (
            <i
              key={k}
              aria-hidden="true"
              className={`size-2 rounded-full ${k < room.playerCount ? 'bg-window' : 'bg-line'}`}
            />
          ))}
        </div>
      </div>
    </motion.article>
  )
}
