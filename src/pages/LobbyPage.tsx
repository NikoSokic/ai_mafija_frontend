import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ApiError, describeError, joinLobby, reconnect, startLobby } from '../api/rest.ts'
import type { LobbyPlayerResponse } from '../api/types.ts'
import Avatar from '../components/Avatar.tsx'
import Button from '../components/Button.tsx'
import Chip from '../components/Chip.tsx'
import CodeTiles from '../components/CodeTiles.tsx'
import ConnectionToast from '../components/ConnectionToast.tsx'
import { useErrorToast } from '../components/ErrorToast.tsx'
import IconButton from '../components/IconButton.tsx'
import { Icon } from '../components/icons.tsx'
import KickPlayerSheet from '../components/KickPlayerSheet.tsx'
import LeaveRoomSheet from '../components/LeaveRoomSheet.tsx'
import ReclaimHostSheet from '../components/ReclaimHostSheet.tsx'
import MeTag from '../components/MeTag.tsx'
import RoleComposition from '../components/RoleComposition.tsx'
import RulesSheet from '../components/RulesSheet.tsx'
import { Screen, ScreenBody, ScreenFooter, ScreenTop } from '../components/Screen.tsx'
import Section from '../components/Section.tsx'
import Skyline from '../components/Skyline.tsx'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { DEFAULT_EMOJI } from '../data/emojis.ts'
import { isRoleKey, type RoleKey } from '../data/roles.ts'
import { copyText } from '../lib/clipboard.ts'
import { cx } from '../lib/cx.ts'
import { EASE_SPRING, riseItem } from '../lib/motion.ts'
import { avatarOf, playerHue } from '../lib/playerLook.ts'
import { useHeartbeat } from '../lib/useHeartbeat.ts'
import { useHostNotice } from '../lib/useHostNotice.ts'
import { useIsDesktop } from '../lib/useIsDesktop.ts'
import { useLobbySocket } from '../lib/useLobbySocket.ts'
import { useGameStore, type Lobby } from '../store/gameStore.ts'
import { loadProfile, saveProfile } from '../store/profile.ts'
import { clearSession, loadSession, saveSession, type Session } from '../store/session.ts'


// Igrač na ovom uređaju; je li domaćin piše u popisu igrača (host)
type Me = { session: Session }

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
          onJoined={(session) => setMe({ session })}
          onLost={() => setMe(null)}
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
          setMe({ session })
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
          setMe({ session })
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
  /** backend ne poznaje ovog igrača (izbacio ga je domaćin); sesija je već obrisana */
  onLost: () => void
  onOpenRules: () => void
}

function LobbyView({ lobby, me, onJoined, onLost, onOpenRules }: LobbyViewProps) {
  const navigate = useNavigate()
  const [leaveOpen, setLeaveOpen] = useState(false)
  // igrač kojeg domaćin izbacuje; ostaje postavljen dok se sheet zatvara
  const [kick, setKick] = useState<{ player: LobbyPlayerResponse | null; open: boolean }>({ player: null, open: false })
  const becameHost = useGameStore((s) => s.becameHost)
  const kickedMe = useGameStore((s) => s.kickedMe)
  const awayIds = useGameStore((s) => s.awayIds)
  const { toast, show } = useErrorToast()
  const isDesktop = useIsDesktop()
  useHostNotice(becameHost, show, 'Možeš pokrenuti igru.')

  // Izbacio ga je domaćin (događaj PLAYER_KICKED ili heartbeat odbijen): prijava više ne vrijedi,
  // pa se opet prikazuje ulazak u sobu. Dvije dojave za isti slučaj: druga vidi da sesije više nema.
  const handleLost = useCallback(() => {
    if (!loadSession()) return
    clearSession()
    show('Više nisi u ovoj sobi', 'Domaćin te izbacio ili soba više ne postoji. Možeš ući ponovno s kodom sobe.')
    onLost()
  }, [show, onLost])
  const seenKick = useRef(kickedMe)
  useEffect(() => {
    if (kickedMe === seenKick.current) return
    seenKick.current = kickedMe
    handleLost()
  }, [kickedMe, handleLost])
  useHeartbeat(me?.session ?? null, handleLost)

  // Postavke sobe i sastav uloga dolaze iz backenda, pa ih vide svi igrači
  const { code, players, maxPlayers, mode, isPublic, voiceEnabled, hostPlayerId: hostId } = lobby
  const counts = roleCounts(lobby.roles)
  const meId = me?.session.playerId
  const amHost = meId !== undefined && meId === hostId
  const missing = Math.max(0, maxPlayers - players.length)
  const slots = Array.from({ length: maxPlayers }, (_, i) => ({ id: i }))

  const backButton = (
    // igrač u sobi prvo potvrdi izlazak; tko nije ušao, samo se vraća
    <IconButton
      icon="back"
      aria-label={me ? 'Napusti sobu' : 'Na početnu'}
      onClick={() => (me ? setLeaveOpen(true) : navigate('/'))}
    />
  )
  const title = <h2 className="flex-1 text-[17px] font-semibold tracking-[-.01em]">Soba</h2>
  const chips = (
    <motion.div
      variants={riseItem}
      className={cx('flex flex-wrap gap-1.5', isDesktop ? 'mt-5' : 'mt-3.5 justify-center')}
    >
      <Chip icon={isPublic ? 'globe' : 'lock'}>{isPublic ? 'Javna' : 'Privatna'}</Chip>
      <Chip icon={mode === 'LIVE' ? 'users' : 'globe'}>{mode === 'LIVE' ? 'Uživo' : 'Online'}</Chip>
      <Chip icon={voiceEnabled ? 'volume' : 'mute'}>
        {voiceEnabled ? 'Narator s glasom' : 'Narator bez glasa'}
      </Chip>
    </motion.div>
  )
  const onlineNote = mode === 'ONLINE' && (
    <motion.p
      variants={riseItem}
      className={cx('mt-3.5 text-[13px] leading-[1.45] text-muted', isDesktop ? 'max-w-prose' : 'mx-auto max-w-[34ch]')}
    >
      Prije početka otvorite poziv na Discordu ili WhatsAppu da se čujete tijekom rasprave.
    </motion.p>
  )
  const playerGrid = (
    <>
      <PlayerGrid
        players={players}
        vacant={missing}
        hostId={hostId ?? undefined}
        meId={meId}
        awayIds={awayIds}
        onKick={amHost ? (player) => setKick({ player, open: true }) : undefined}
      />
      <p className="mt-2.5 text-[13px] leading-[1.45] text-muted">Svaki igrač pali jedno svjetlo u gradu.</p>
    </>
  )
  // Svako mjesto u sobi je jedan prozor; upali se kad igrač uđe
  const city = <Skyline players={slots} stateOf={(_, i) => (i < players.length ? 'on' : 'empty')} />
  const sheets = (
    <>
      <LeaveRoomSheet
        open={leaveOpen}
        code={code}
        onClose={() => setLeaveOpen(false)}
        onLeft={() => navigate('/')}
      />
      {me && amHost && (
        <KickPlayerSheet
          open={kick.open}
          player={kick.player}
          code={code}
          session={me.session}
          onClose={() => setKick((k) => ({ ...k, open: false }))}
        />
      )}
      {me && amHost && <ReclaimHostSheet code={code} />}
      {toast}
    </>
  )

  // Desktop: lijevo kod sobe, postavke, uloge i pravila; desno igrači. Grad je ispod oba stupca,
  // a na tlu (podnožju) dolje desno je gumb za početak, poruka gostu ili ulazak u sobu.
  if (isDesktop) {
    return (
      <Screen>
        <ScreenTop>
          {backButton}
          {title}
        </ScreenTop>

        <ScreenBody withSky>
          <div className="grid grid-cols-[440px_minmax(0,1fr)] items-start gap-8 py-2">
            <motion.section variants={riseItem} className="rounded-card border border-line bg-surface p-6">
              <h3 className="mb-3 text-sm text-muted">Kod sobe</h3>
              <CodeTiles code={code} large className="justify-start" />
              <div className="mt-4 flex gap-2">
                <CopyLinkButton code={code} />
                <CopyCodeButton code={code} />
              </div>
              {chips}
              {onlineNote}
              <h3 className="mt-7 mb-3 text-[15px] font-semibold">Uloge u igri</h3>
              <RoleComposition counts={counts} />
              <Button variant="ghost" size="sm" className="mt-6" onClick={onOpenRules}>
                <Icon name="info" size={17} />
                <span>Pravila</span>
              </Button>
            </motion.section>

            <motion.section variants={riseItem} className="rounded-card border border-line bg-surface p-6">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="text-[17px] font-semibold">Igrači</h3>
                <span className="text-sm text-muted tabular-nums">
                  {players.length} od {maxPlayers} igrača
                </span>
              </div>
              {playerGrid}
            </motion.section>
          </div>
        </ScreenBody>

        {city}
        <ScreenFooter rise className="bg-sky lg:items-end">
          {!me ? (
            <JoinForm lobby={lobby} onJoined={onJoined} inline />
          ) : amHost ? (
            <StartButton code={code} session={me.session} missing={missing} />
          ) : (
            <p className="pt-2 pb-1 text-[15px] text-muted">Čekamo domaćina…</p>
          )}
        </ScreenFooter>
        {sheets}
      </Screen>
    )
  }

  return (
    <Screen>
      <ScreenTop>
        {backButton}
        {title}
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
          {chips}
          {onlineNote}
        </div>

        <Section title="Igrači" aside={`${players.length} od ${maxPlayers}`}>
          {playerGrid}
        </Section>

        <Section title="Uloge u igri">
          <RoleComposition counts={counts} />
        </Section>
      </ScreenBody>

      {city}
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
      {sheets}
    </Screen>
  )
}

// Sastav uloga iz backenda: ime uloge → broj igrača
function roleCounts(roles: Lobby['roles']) {
  const counts: Partial<Record<RoleKey, number>> = {}
  for (const r of roles) if (isRoleKey(r.roleName)) counts[r.roleName] = r.count
  return counts
}

type PlayerGridProps = {
  players: LobbyPlayerResponse[]
  vacant: number
  hostId?: number
  meId?: number
  /** igrači koji se ne javljaju ("Nije tu") */
  awayIds: number[]
  /** postavljen samo domaćinu: gumb za izbacivanje na kartici tuđeg igrača */
  onKick?: (player: LobbyPlayerResponse) => void
}

// Mreža 2 stupca (desktop 3, na xl 4). Igrači koji su već u sobi pri otvaranju se ne animiraju (initial={false}),
// a svaki novi uskoči spring animacijom na mjesto prvog praznog.
function PlayerGrid({ players, vacant, hostId, meId, awayIds, onKick }: PlayerGridProps) {
  const isDesktop = useIsDesktop()
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3 xl:grid-cols-4">
      <AnimatePresence initial={false}>
        {players.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE_SPRING }}
            className={cx(
              'flex min-h-[60px] items-center gap-2.5 rounded-tile border border-line bg-surface py-2 pr-2.5 pl-2',
              // desktop: okomita pločica (avatar gore), da ime stane i u 4 stupca
              'lg:relative lg:min-h-[132px] lg:flex-col lg:justify-center lg:gap-2 lg:px-3 lg:pt-4 lg:pb-3.5',
            )}
          >
            <Avatar
              emoji={avatarOf(p)}
              hue={playerHue(p.id)}
              size={isDesktop ? 52 : 42}
              host={p.id === hostId}
            />
            <div className="min-w-0 flex-1 lg:w-full lg:flex-none lg:text-center">
              <div className="flex items-center lg:justify-center">
                <span className="truncate text-[15px] font-semibold">{p.nickname}</span>
                {p.id === meId && <MeTag />}
              </div>
              <div className={cx('text-xs', awayIds.includes(p.id) ? 'text-accent' : 'text-muted')}>
                {awayIds.includes(p.id) ? 'Nije tu' : p.id === hostId ? 'Domaćin' : 'Spreman'}
              </div>
            </div>
            {onKick && p.id !== meId && (
              <IconButton
                icon="x"
                iconSize={16}
                aria-label={`Izbaci igrača ${p.nickname}`}
                className="size-8 rounded-[10px] lg:absolute lg:top-1.5 lg:right-1.5"
                onClick={() => onKick(p)}
              />
            )}
          </motion.div>
        ))}
        {Array.from({ length: vacant }, (_, i) => (
          <div
            // ključ je redni broj mjesta, pa novi igrač zamijeni baš prvo prazno mjesto
            key={`vacant-${players.length + i}`}
            className="flex min-h-[60px] items-center justify-center gap-2 rounded-tile border border-dashed border-line text-sm text-muted lg:min-h-[132px]"
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

// Desktop: link sobe se odmah kopira, bez Web Share (na računalu bi otvorio sistemski izbornik za dijeljenje)
function CopyLinkButton({ code }: { code: string }) {
  const [copied, flash] = useFlash()
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        if (await copyText(`${window.location.origin}/soba/${code}`)) flash()
      }}
    >
      <Icon name={copied ? 'check' : 'share'} size={17} strokeWidth={copied ? 2.2 : 1.8} />
      <span>{copied ? 'Link kopiran' : 'Kopiraj link'}</span>
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
  const { toast, show } = useErrorToast()

  async function start() {
    setSending(true)
    try {
      await startLobby(code, session)
      // ne čeka se GAME_STARTED: ako veza ne radi, domaćin svejedno ide u igru
      useGameStore.getState().gameStarted()
    } catch (e) {
      show('Igra nije pokrenuta', describeError(e, code))
      setSending(false)
    }
  }

  return (
    <>
      {toast}
      {/* desktop: dolje desno (gumb je na lg inače centriran s mx-auto) */}
      <Button disabled={missing > 0 || sending} className="lg:mr-0!" onClick={start}>
        {missing > 0 ? `Čeka se još ${missing}` : sending ? 'Pokrećem igru…' : 'Pokreni igru'}
      </Button>
    </>
  )
}

type JoinFormProps = {
  lobby: Lobby
  onJoined: (session: Session) => void
  /** desktop: polje i gumb u jednom retku, dolje desno */
  inline?: boolean
}

// Ulazak preko linka za poziv: igrač na ovom uređaju još nije u sobi
function JoinForm({ lobby, onJoined, inline = false }: JoinFormProps) {
  const [nickname, setNickname] = useState(() => loadProfile()?.nickname ?? '')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const inputId = useId()
  const errorId = useId()
  const { toast, show } = useErrorToast()

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
      const emoji = loadProfile()?.emoji || DEFAULT_EMOJI
      const res = await joinLobby(lobby.code, nick, emoji)
      const session = { playerId: res.playerId, playerToken: res.playerToken, lobbyCode: res.lobbyCode }
      saveSession(session)
      saveProfile({ nickname: nick, emoji })
      // odmah u popis; PLAYER_JOINED za istog igrača samo ga zamijeni
      useGameStore.getState().playerJoined({
        id: res.playerId,
        nickname: res.nickname,
        alive: res.alive,
        host: false,
        eliminatedHow: null,
        eliminatedRound: null,
        roleName: null,
        avatarEmoji: emoji,
      })
      onJoined(session)
    } catch (e) {
      const message = describeError(e, lobby.code)
      setError(message)
      show('Ulazak nije uspio', message)
      setSending(false)
    }
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className={
        inline ? 'grid w-[600px] grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 gap-y-2' : 'flex flex-col gap-2.5'
      }
    >
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
            '[transition:border-color_.2s,box-shadow_.2s] focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]',
            error ? 'border-accent' : 'border-line',
          )}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className={cx('text-sm leading-[1.45] text-accent', inline && 'col-span-2 row-start-2')}>
          {error}
        </p>
      )}
      <Button type="submit" disabled={sending} className={inline ? 'col-start-2 row-start-1 lg:mx-0!' : undefined}>
        {sending ? 'Ulazim u sobu…' : 'Uđi u sobu'}
      </Button>
      {toast}
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
