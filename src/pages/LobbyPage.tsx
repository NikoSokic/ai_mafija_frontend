import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ApiError, describeError, joinLobby, reconnect, startLobby } from '../api/rest.ts'
import type { LobbyPlayerResponse } from '../api/types.ts'
import Avatar from '../components/Avatar.tsx'
import Button from '../components/Button.tsx'
import Chip from '../components/Chip.tsx'
import CodeTiles from '../components/CodeTiles.tsx'
import ConnectionToast from '../components/ConnectionToast.tsx'
import IconButton from '../components/IconButton.tsx'
import { Icon } from '../components/icons.tsx'
import LeaveRoomSheet from '../components/LeaveRoomSheet.tsx'
import RoleComposition from '../components/RoleComposition.tsx'
import RulesSheet from '../components/RulesSheet.tsx'
import { Screen, ScreenBody, ScreenFooter, ScreenTop } from '../components/Screen.tsx'
import Skyline from '../components/Skyline.tsx'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { DEFAULT_EMOJI } from '../data/emojis.ts'
import { copyText } from '../lib/clipboard.ts'
import { cx } from '../lib/cx.ts'
import { riseItem } from '../lib/motion.ts'
import { playerEmoji, playerHue } from '../lib/playerLook.ts'
import { useLobbySocket } from '../lib/useLobbySocket.ts'
import { useGameStore, type Lobby } from '../store/gameStore.ts'
import { loadProfile, saveProfile } from '../store/profile.ts'
import { DEFAULT_ROOM_SETTINGS, loadRoomSettings } from '../store/roomSettings.ts'
import { clearSession, loadSession, saveSession, type Session } from '../store/session.ts'

const EASE_SPRING: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

// Igrač na ovom uređaju. host = null kad provjera nije uspjela (nema veze) – tada se pogađa iz popisa.
type Me = { session: Session; host: boolean | null }

export default function LobbyPage() {
  const code = (useParams().code ?? '').toUpperCase()
  // Druga soba = novo stanje ekrana (provjera sesije, forma za ulazak)
  return <LobbyScreen key={code} code={code} />
}

function LobbyScreen({ code }: { code: string }) {
  const navigate = useNavigate()
  useLobbySocket(code)
  const lobby = useGameStore((s) => (s.lobby?.code === code ? s.lobby : null))
  const lobbyError = useGameStore((s) => s.lobbyError)
  const [me, setMe] = useMe(code)
  const [rulesOpen, setRulesOpen] = useState(false)

  // GAME_STARTED, GAME_STATE_CHANGED s fazom igre ili uspješan start → ekran igre
  const gameOn = lobby !== null && lobby.status !== 'WAITING'
  useEffect(() => {
    if (gameOn && me) navigate(`/igra/${code}`, { replace: true })
  }, [gameOn, me, code, navigate])

  return (
    <ThemeRoot theme="night">
      {lobbyError ? (
        <StatusScreen>
          <p role="alert" className="max-w-[30ch] text-base leading-normal">
            {lobbyError}
          </p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Na početnu
          </Button>
        </StatusScreen>
      ) : !lobby || me === undefined ? (
        <StatusScreen>
          <p role="status" className="text-sm text-muted">
            Učitavam sobu…
          </p>
        </StatusScreen>
      ) : (
        <LobbyView
          lobby={lobby}
          me={me}
          onJoined={(session) => setMe({ session, host: false })}
          onOpenRules={() => setRulesOpen(true)}
        />
      )}
      <RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <ConnectionToast />
    </ThemeRoot>
  )
}

// Je li ovaj uređaj već u sobi: spremljena sesija za ovaj kod se provjeri na backendu.
// undefined = provjerava se, null = nije u sobi (prikazuje se ulazak).
function useMe(code: string) {
  const [me, setMe] = useState<Me | null | undefined>(() =>
    loadSession()?.lobbyCode === code ? undefined : null,
  )

  useEffect(() => {
    const session = loadSession()
    if (session?.lobbyCode !== code) return
    let active = true
    reconnect(session)
      .then((res) => {
        if (!active) return
        if (res.valid && res.lobbyCode === code) {
          setMe({ session, host: res.host })
        } else {
          clearSession()
          setMe(null)
        }
      })
      .catch((e: unknown) => {
        if (!active) return
        // Igrač ne postoji ili token ne vrijedi – sesija je stara, igrač opet ulazi
        if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
          clearSession()
          setMe(null)
        } else {
          setMe({ session, host: null })
        }
      })
    return () => {
      active = false
    }
  }, [code])

  return [me, setMe] as const
}

// Okvir za učitavanje i grešku
function StatusScreen({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <Screen>
      <ScreenTop>
        <IconButton icon="back" aria-label="Na početnu" onClick={() => navigate('/')} />
        <h2 className="flex-1 text-[17px] font-semibold tracking-[-.01em]">Soba</h2>
      </ScreenTop>
      <ScreenBody>
        <motion.div variants={riseItem} className="flex flex-col items-center gap-5 pt-16 text-center">
          {children}
        </motion.div>
      </ScreenBody>
    </Screen>
  )
}

type LobbyViewProps = {
  lobby: Lobby
  me: Me | null
  onJoined: (session: Session) => void
  onOpenRules: () => void
}

function LobbyView({ lobby, me, onJoined, onOpenRules }: LobbyViewProps) {
  const navigate = useNavigate()
  // Postavke postoje samo na uređaju koji je kreirao sobu; ostali vide zadane (docs/backend-todo.md)
  const [settings] = useState(() => loadRoomSettings(lobby.code))
  const [myEmoji] = useState(() => loadProfile()?.emoji || DEFAULT_EMOJI)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const { mode, visibility, voice } = settings ?? DEFAULT_ROOM_SETTINGS

  const { code, players, maxPlayers } = lobby
  const meId = me?.session.playerId
  // Backend ne kaže tko je domaćin; domaćin se sprema prvi, pa ima najmanji id (prvi u popisu)
  const amHost = me ? (me.host ?? meId === players[0]?.id) : false
  const hostId = amHost ? meId : players[0]?.id
  const missing = Math.max(0, maxPlayers - players.length)
  const slots = Array.from({ length: maxPlayers }, (_, i) => ({ id: i }))

  return (
    <Screen>
      <ScreenTop>
        {/* igrač u sobi prvo potvrdi izlazak; tko nije ušao, samo se vraća */}
        <IconButton
          icon="back"
          aria-label={me ? 'Napusti sobu' : 'Na početnu'}
          onClick={() => (me ? setLeaveOpen(true) : navigate('/'))}
        />
        <h2 className="flex-1 text-[17px] font-semibold tracking-[-.01em]">Soba</h2>
        <IconButton icon="info" aria-label="Pravila igre" onClick={onOpenRules} />
      </ScreenTop>

      <ScreenBody withSky>
        <div className="pt-2 pb-1 text-center">
          <motion.h3 variants={riseItem} className="mb-3 text-sm text-muted">
            Kod sobe
          </motion.h3>
          <CodeTiles code={code} />
          <motion.div variants={riseItem} className="mt-3.5 flex justify-center gap-2">
            <CopyCodeButton code={code} />
            <InviteButton code={code} />
          </motion.div>
          <motion.div variants={riseItem} className="mt-3.5 flex flex-wrap justify-center gap-1.5">
            <Chip icon={visibility === 'private' ? 'lock' : 'globe'}>
              {visibility === 'private' ? 'Privatna' : 'Javna'}
            </Chip>
            <Chip icon={mode === 'live' ? 'users' : 'globe'}>{mode === 'live' ? 'Uživo' : 'Online'}</Chip>
            <Chip icon={voice ? 'volume' : 'mute'}>{voice ? 'Narator s glasom' : 'Narator bez glasa'}</Chip>
          </motion.div>
        </div>

        <Section title="Igrači" aside={`${players.length} od ${maxPlayers}`}>
          <PlayerGrid players={players} vacant={missing} hostId={hostId} meId={meId} myEmoji={myEmoji} />
          <p className="mt-2.5 text-[13px] leading-[1.45] text-muted">Svaki igrač pali jedno svjetlo u gradu.</p>
        </Section>

        <Section title="Uloge u igri">
          {settings ? (
            <RoleComposition counts={settings.counts} />
          ) : (
            <p className="text-[13px] leading-[1.45] text-muted">Domaćin je odabrao uloge za {maxPlayers} igrača.</p>
          )}
        </Section>
      </ScreenBody>

      {/* Svako mjesto u sobi je jedan prozor; upali se kad igrač uđe */}
      <Skyline players={slots} stateOf={(_, i) => (i < players.length ? 'on' : 'empty')} />
      <ScreenFooter rise className="bg-sky">
        {!me ? (
          <JoinForm lobby={lobby} onJoined={onJoined} />
        ) : amHost ? (
          <StartButton code={code} session={me.session} missing={missing} />
        ) : (
          <p className="pt-2 pb-1 text-center text-[13px] leading-[1.45] text-muted">
            Igru pokreće domaćin kad se svi pridruže.
          </p>
        )}
      </ScreenFooter>
      <LeaveRoomSheet
        open={leaveOpen}
        code={code}
        onClose={() => setLeaveOpen(false)}
        onLeft={() => navigate('/')}
      />
    </Screen>
  )
}

type SectionProps = { title: string; aside?: string; children: ReactNode }

function Section({ title, aside, children }: SectionProps) {
  return (
    <motion.section variants={riseItem} className="mt-[26px]">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {aside && <span className="text-sm text-muted tabular-nums">{aside}</span>}
      </div>
      {children}
    </motion.section>
  )
}

type PlayerGridProps = {
  players: LobbyPlayerResponse[]
  vacant: number
  hostId?: number
  meId?: number
  myEmoji: string
}

// Mreža 2 stupca. Igrači koji su već u sobi pri otvaranju se ne animiraju (initial={false}),
// a svaki novi uskoči spring animacijom na mjesto prvog praznog.
function PlayerGrid({ players, vacant, hostId, meId, myEmoji }: PlayerGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <AnimatePresence initial={false}>
        {players.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE_SPRING }}
            className="flex min-h-[60px] items-center gap-2.5 rounded-tile border border-line bg-surface py-2 pr-2.5 pl-2"
          >
            <Avatar
              emoji={p.id === meId ? myEmoji : playerEmoji(p.id)}
              hue={playerHue(p.id)}
              size={42}
              host={p.id === hostId}
            />
            <div className="min-w-0">
              <div className="flex items-center">
                <span className="truncate text-[15px] font-semibold">{p.nickname}</span>
                {p.id === meId && (
                  <span className="ml-1 shrink-0 rounded-full bg-accent-soft px-1.5 py-px text-[11px] font-semibold text-accent">
                    ti
                  </span>
                )}
              </div>
              <div className="text-xs text-muted">{p.id === hostId ? 'Domaćin' : 'Spreman'}</div>
            </div>
          </motion.div>
        ))}
        {Array.from({ length: vacant }, (_, i) => (
          <div
            // ključ je redni broj mjesta, pa novi igrač zamijeni baš prvo prazno mjesto
            key={`vacant-${players.length + i}`}
            className="flex min-h-[60px] items-center justify-center gap-2 rounded-tile border border-dashed border-line text-sm text-muted"
          >
            <span aria-hidden="true" className="size-1.5 animate-breathe rounded-full bg-muted" />
            Čeka se igrač
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// true na kratko nakon trigger() – za potvrdu "Kopirano" na gumbu
function useFlash(ms = 1600) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!on) return
    const t = window.setTimeout(() => setOn(false), ms)
    return () => clearTimeout(t)
  }, [on, ms])
  return [on, () => setOn(true)] as const
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, flash] = useFlash()
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        if (await copyText(code)) flash()
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={17} strokeWidth={copied ? 2.2 : 1.8} />
      <span>{copied ? 'Kopirano' : 'Kopiraj kod'}</span>
    </Button>
  )
}

// Web Share API s linkom sobe; gdje ga nema (većina desktop preglednika), link se kopira
function InviteButton({ code }: { code: string }) {
  const [copied, flash] = useFlash()

  async function invite() {
    const url = `${window.location.origin}/soba/${code}`
    if ('share' in navigator) {
      try {
        await navigator.share({ title: 'AI Mafija', text: `Uđi u moju sobu u AI Mafiji. Kod sobe: ${code}`, url })
        return
      } catch (e) {
        // igrač je zatvorio izbornik za dijeljenje
        if (e instanceof DOMException && e.name === 'AbortError') return
      }
    }
    if (await copyText(url)) flash()
  }

  return (
    <Button variant="secondary" size="sm" onClick={invite}>
      <Icon name={copied ? 'check' : 'share'} size={17} strokeWidth={copied ? 2.2 : 1.8} />
      <span>{copied ? 'Link kopiran' : 'Pozovi'}</span>
    </Button>
  )
}

type StartButtonProps = { code: string; session: Session; missing: number }

function StartButton({ code, session, missing }: StartButtonProps) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setSending(true)
    setError(null)
    try {
      await startLobby(code, session)
      // ne čeka se GAME_STARTED: ako veza ne radi, domaćin svejedno ide u igru
      useGameStore.getState().gameStarted()
    } catch (e) {
      setError(describeError(e, code))
      setSending(false)
    }
  }

  return (
    <>
      {error && (
        <p role="alert" className="text-sm leading-[1.45] text-accent">
          {error}
        </p>
      )}
      <Button disabled={missing > 0 || sending} onClick={start}>
        {missing > 0 ? `Čeka se još ${missing}` : sending ? 'Pokrećem igru…' : 'Pokreni igru'}
      </Button>
    </>
  )
}

type JoinFormProps = { lobby: Lobby; onJoined: (session: Session) => void }

// Ulazak preko linka za poziv: igrač na ovom uređaju još nije u sobi
function JoinForm({ lobby, onJoined }: JoinFormProps) {
  const [nickname, setNickname] = useState(() => loadProfile()?.nickname ?? '')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const inputId = useId()
  const errorId = useId()

  if (lobby.status !== 'WAITING') return <FooterNote>Igra u toj sobi je već počela.</FooterNote>
  if (lobby.players.length >= lobby.maxPlayers) return <FooterNote>Soba je puna.</FooterNote>

  async function submit(e: FormEvent) {
    e.preventDefault()
    const nick = nickname.trim()
    if (!nick) {
      setError('Prvo upiši nadimak.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const res = await joinLobby(lobby.code, nick)
      const session = { playerId: res.playerId, playerToken: res.playerToken, lobbyCode: res.lobbyCode }
      saveSession(session)
      saveProfile({ nickname: nick, emoji: loadProfile()?.emoji || DEFAULT_EMOJI })
      // odmah u popis; PLAYER_JOINED za istog igrača samo ga zamijeni
      useGameStore.getState().playerJoined({ id: res.playerId, nickname: res.nickname, alive: res.alive })
      onJoined(session)
    } catch (e) {
      setError(describeError(e, lobby.code))
      setSending(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-2.5">
      <div>
        <label htmlFor={inputId} className="mb-2 block text-sm text-muted">
          Tvoj nadimak
        </label>
        <input
          id={inputId}
          value={nickname}
          maxLength={16}
          autoComplete="nickname"
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => setNickname(e.target.value)}
          className={cx(
            'h-14 w-full rounded-ctrl border bg-surface px-4 text-lg font-medium',
            '[transition:border-color_.2s,box-shadow_.2s] focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)] focus:outline-none',
            error ? 'border-accent' : 'border-line',
          )}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm leading-[1.45] text-accent">
          {error}
        </p>
      )}
      <Button type="submit" disabled={sending}>
        {sending ? 'Ulazim u sobu…' : 'Uđi u sobu'}
      </Button>
    </form>
  )
}

function FooterNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="pt-2 pb-1 text-center text-sm leading-[1.45] text-muted">
      {children}
    </p>
  )
}
