import { motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { createLobby, describeError, getRoles } from '../api/rest.ts'
import type { Role } from '../api/types.ts'
import Button from '../components/Button.tsx'
import { useErrorToast } from '../components/ErrorToast.tsx'
import IconButton from '../components/IconButton.tsx'
import { Icon } from '../components/icons.tsx'
import OptionCard from '../components/OptionCard.tsx'
import RoleIcon from '../components/RoleIcon.tsx'
import { Screen, ScreenBody, ScreenFooter, ScreenTop } from '../components/Screen.tsx'
import Segmented from '../components/Segmented.tsx'
import Stepper from '../components/Stepper.tsx'
import Switch from '../components/Switch.tsx'
import TeamTag from '../components/TeamTag.tsx'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { recommendedCounts, sameCounts } from '../data/recommendedRoles.ts'
import { ROLE_KEYS, ROLES, type RoleKey } from '../data/roles.ts'
import { cx } from '../lib/cx.ts'
import { riseItem } from '../lib/motion.ts'
import { useBump } from '../lib/useBump.ts'
import { loadProfile } from '../store/profile.ts'
import {
  DEFAULT_ROOM_SETTINGS,
  loadRoomSettings,
  saveRoomSettings,
  type Mode,
  type Visibility,
} from '../store/roomSettings.ts'
import { saveSession } from '../store/session.ts'

const MIN_PLAYERS = 4
const MAX_PLAYERS = 20

// Početno 8 igrača s preporučenim rasporedom uloga
const DEFAULT_MAX_PLAYERS = 8

// Uloga s backenda spojena s prikazom iz ROLES (po imenu)
type RoomRole = { id: number; key: RoleKey }

type RolesState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; roles: RoomRole[] }

// Uloge koje frontend ne zna prikazati se preskaču; redoslijed je kao u ROLES
function toRoomRoles(list: Role[]): RoomRole[] {
  return ROLE_KEYS.flatMap((key) => {
    const role = list.find((r) => r.name === key)
    return role ? [{ id: role.id, key }] : []
  })
}

export default function CreateRoomPage() {
  const nickname = loadProfile()?.nickname.trim() ?? ''
  // Domaćin mora imati nadimak – upisuje ga na Početnoj
  if (!nickname) return <Navigate to="/" replace />
  return <CreateRoomForm hostNickname={nickname} />
}

// Postavke sobe iz koje domaćin dolazi s kraja igre ("Nova soba s istim postavkama")
function previousSettings(state: unknown) {
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === 'string' ? loadRoomSettings(from) : null
}

function CreateRoomForm({ hostNickname }: { hostNickname: string }) {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [previous] = useState(() => previousSettings(state))
  const [roles, setRoles] = useState<RolesState>({ status: 'loading' })
  const [rolesRequest, setRolesRequest] = useState(0)
  const [maxPlayers, setMaxPlayers] = useState(() =>
    previous ? ROLE_KEYS.reduce((sum, key) => sum + previous.counts[key], 0) : DEFAULT_MAX_PLAYERS,
  )
  // Dok je true, uloge prate broj igrača po preporuci; ručna izmjena uloge to isključuje
  const [followRecommended, setFollowRecommended] = useState(
    () => !previous || sameCounts(previous.counts, recommendedCounts(maxPlayers)),
  )
  const [manualCounts, setManualCounts] = useState(
    () => previous?.counts ?? recommendedCounts(DEFAULT_MAX_PLAYERS),
  )
  // Način igre, vidljivost i glas backend još ne prima (docs/backend-todo.md) – spremaju se samo lokalno
  const [mode, setMode] = useState<Mode>(previous?.mode ?? DEFAULT_ROOM_SETTINGS.mode)
  const [visibility, setVisibility] = useState<Visibility>(previous?.visibility ?? DEFAULT_ROOM_SETTINGS.visibility)
  const [voice, setVoice] = useState(previous?.voice ?? DEFAULT_ROOM_SETTINGS.voice)
  const { toast, show } = useErrorToast()
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let cancelled = false
    getRoles()
      .then((list) => {
        if (!cancelled) setRoles({ status: 'ready', roles: toRoomRoles(list) })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const message = describeError(e)
        setRoles({ status: 'error', message })
        show('Uloge nisu učitane', message)
      })
    return () => {
      cancelled = true
    }
  }, [rolesRequest, show])

  function retryRoles() {
    setRoles({ status: 'loading' })
    setRolesRequest((n) => n + 1)
  }

  // Zbroj se računa samo po ulogama koje je backend vratio
  const available = roles.status === 'ready' ? roles.roles : []
  const recommended = recommendedCounts(maxPlayers, available.map((r) => r.key))
  const counts = followRecommended ? recommended : manualCounts
  const sum = available.reduce((a, r) => a + counts[r.key], 0)
  const mafia = available.reduce((a, r) => a + (ROLES[r.key].team === 'mafia' ? counts[r.key] : 0), 0)
  const diff = maxPlayers - sum
  const canFillTown = available.some((r) => r.key === 'Građanin')
  const canSubmit = roles.status === 'ready' && diff === 0 && !sending

  // Ručna izmjena uloge. Ako se raspored opet poklopi s preporukom, uloge ponovno prate broj igrača.
  function setCount(key: RoleKey, value: number) {
    const next = { ...counts, [key]: value }
    setManualCounts(next)
    setFollowRecommended(sameCounts(next, recommended))
  }

  async function submit() {
    if (roles.status !== 'ready') return
    setSending(true)
    try {
      const res = await createLobby({
        hostNickname,
        maxPlayers,
        roles: roles.roles
          .filter((r) => counts[r.key] > 0)
          .map((r) => ({ roleId: r.id, count: counts[r.key] })),
      })
      saveSession({
        playerId: res.hostPlayerId,
        playerToken: res.playerToken,
        lobbyCode: res.code,
      })
      saveRoomSettings({ code: res.code, counts, mode, visibility, voice })
      navigate(`/soba/${res.code}`)
    } catch (e) {
      show('Soba nije kreirana', describeError(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <ThemeRoot theme="night">
      <Screen>
        <ScreenTop>
          <IconButton icon="back" aria-label="Natrag" onClick={() => navigate('/')} />
          <h2 className="flex-1 text-[17px] font-semibold tracking-[-.01em]">Nova soba</h2>
        </ScreenTop>

        <ScreenBody>
          <Section title="Broj igrača" aside={`od ${MIN_PLAYERS} do ${MAX_PLAYERS}`}>
            <PlayerCount value={maxPlayers} onChange={setMaxPlayers} />
          </Section>

          <Section
            title="Uloge"
            badge={
              roles.status === 'ready' &&
              (followRecommended ? (
                <RecommendedTag />
              ) : (
                <LinkButton small onClick={() => setFollowRecommended(true)}>
                  Vrati preporuku
                </LinkButton>
              ))
            }
            aside={roles.status === 'ready' ? `${sum} od ${maxPlayers}` : undefined}
          >
            <div className="rounded-card border border-line bg-surface px-4 py-1">
              {roles.status === 'loading' && <p className="py-3 text-sm text-muted">Učitavam uloge…</p>}
              {roles.status === 'error' && (
                <div className="flex items-center gap-3 py-3">
                  <p role="alert" className="flex-1 text-sm leading-[1.45] text-accent">
                    {roles.message}
                  </p>
                  <LinkButton onClick={retryRoles}>Pokušaj ponovno</LinkButton>
                </div>
              )}
              {roles.status === 'ready' &&
                roles.roles.map((r) => (
                  <RoleRow key={r.key} role={r.key} value={counts[r.key]} onChange={(v) => setCount(r.key, v)} />
                ))}
            </div>
            <TeamBalance mafia={mafia} town={sum - mafia} />
            <p className="mt-2 text-[13px] leading-[1.45] text-muted">
              Igra je najzanimljivija kad je u timu mafije otprilike četvrtina do trećina igrača.
            </p>
          </Section>

          <Section title="Način igre">
            <div className="grid grid-cols-2 gap-2.5">
              <OptionCard
                icon="users"
                title="Uživo"
                text="Svi ste u istoj prostoriji. Narator govori s domaćinova mobitela."
                selected={mode === 'live'}
                onSelect={() => setMode('live')}
              />
              <OptionCard
                icon="globe"
                title="Online"
                text="Svatko igra sa svog mjesta i čuje naratora na svom mobitelu."
                selected={mode === 'online'}
                onSelect={() => setMode('online')}
              />
            </div>
          </Section>

          <Section title="Tko može ući">
            <Segmented
              aria-label="Vidljivost sobe"
              options={[
                { value: 'private', label: 'Samo s kodom' },
                { value: 'public', label: 'Svi (javna)' },
              ]}
              value={visibility}
              onChange={setVisibility}
            />
          </Section>

          <Section>
            <div className="flex items-center gap-3.5 rounded-card border border-line bg-surface px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <h4 className="text-[15px] font-semibold">Glas naratora</h4>
                <p className="text-[13px] leading-[1.45] text-muted">
                  {mode === 'live'
                    ? 'Čuje se samo s tvog mobitela da ne bude jeke.'
                    : 'Svaki igrač čuje naratora na svom mobitelu.'}
                </p>
              </div>
              <Switch checked={voice} onChange={setVoice} aria-label="Glas naratora" />
            </div>
          </Section>
        </ScreenBody>

        <ScreenFooter className="border-t border-line bg-bg">
          {roles.status === 'ready' && (
            <SumLine diff={diff} onFillTown={canFillTown ? () => setCount('Građanin', counts.Građanin + diff) : undefined} />
          )}
          {toast}
          <Button disabled={!canSubmit} onClick={submit}>
            {sending ? 'Kreiram sobu…' : 'Kreiraj sobu'}
          </Button>
        </ScreenFooter>
      </Screen>
    </ThemeRoot>
  )
}

type SectionProps = {
  title?: string
  /** oznaka ili link odmah uz naslov */
  badge?: ReactNode
  aside?: string
  children: ReactNode
}

function Section({ title, badge, aside, children }: SectionProps) {
  return (
    <motion.section variants={riseItem} className="mt-[26px] first:mt-2">
      {title && (
        <div className="mb-3 flex min-h-6 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold">{title}</h3>
            {badge}
          </div>
          {aside && <span className="text-sm text-muted tabular-nums">{aside}</span>}
        </div>
      )}
      {children}
    </motion.section>
  )
}

function PlayerCount({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const bump = useBump(value)
  return (
    <div className="flex items-center justify-between rounded-card border border-line bg-surface py-3 pr-3 pl-[18px]">
      <output aria-live="polite">
        {/* novi key pri svakoj promjeni ponovno pokreće "poskok" */}
        <span
          key={bump}
          className={cx(
            'inline-block text-[44px] leading-none font-bold tracking-[-.03em] tabular-nums',
            bump > 0 && 'animate-bump',
          )}
        >
          {value}
        </span>
      </output>
      <Stepper
        size="lg"
        showValue={false}
        value={value}
        onChange={onChange}
        min={MIN_PLAYERS}
        max={MAX_PLAYERS}
        decreaseLabel="Manje igrača"
        increaseLabel="Više igrača"
      />
    </div>
  )
}

type RoleRowProps = { role: RoleKey; value: number; onChange: (value: number) => void }

function RoleRow({ role, value, onChange }: RoleRowProps) {
  const { name, team, short } = ROLES[role]
  return (
    <div className="flex items-center gap-3 border-b border-line py-3 last:border-0">
      <RoleIcon role={role} />
      <div className="min-w-0 flex-1">
        <h4 className="flex items-center gap-2 text-base font-semibold">
          {name}
          {team === 'mafia' && <TeamTag>tim mafije</TeamTag>}
        </h4>
        <p className="mt-0.5 text-[13px] leading-[1.4] text-muted">{short}</p>
      </div>
      <Stepper
        value={value}
        onChange={onChange}
        // bez mafije nema igre
        min={role === 'Mafia' ? 1 : 0}
        max={MAX_PLAYERS}
        decreaseLabel={`Manje: ${name}`}
        increaseLabel={`Više: ${name}`}
      />
    </div>
  )
}

// Traka omjera timova: mafija (crveno) prema građanima
function TeamBalance({ mafia, town }: { mafia: number; town: number }) {
  const segment = 'block h-full [transition:flex-grow_.45s_cubic-bezier(.2,.8,.2,1)]'
  return (
    <div className="mt-3.5">
      <div aria-hidden="true" className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-line">
        <span className={cx(segment, 'bg-role-mafia')} style={{ flexGrow: mafia }} />
        <span className={cx(segment, 'bg-role-gradanin')} style={{ flexGrow: town }} />
      </div>
      <div className="mt-2 flex justify-between text-[13px] text-muted tabular-nums">
        <span>Mafija {mafia}</span>
        <span>Građani {town}</span>
      </div>
    </div>
  )
}

// 1 uloga, 2–4 uloge, 5 i više uloga (razlika je najviše 19)
const rolesWord = (n: number) => (n === 1 ? 'uloga' : n < 5 ? 'uloge' : 'uloga')

type SumLineProps = { diff: number; onFillTown?: () => void }

// Stanje zbroja uloga u podnožju. Tekst je u istom role="status" elementu da ga čitač ekrana najavi.
function SumLine({ diff, onFillTown }: SumLineProps) {
  const ok = diff === 0
  return (
    <div className={cx('flex min-h-6 items-center gap-2.5 text-sm', ok ? 'text-role-doktor' : 'text-accent')}>
      <Icon name={ok ? 'check' : 'info'} size={18} strokeWidth={ok ? 2.2 : 1.8} />
      <span role="status">
        {ok
          ? 'Sve uloge su raspoređene'
          : diff > 0
            ? `Fali još ${diff} ${rolesWord(diff)}`
            : `Previše uloga: makni ${-diff}`}
      </span>
      {diff > 0 && onFillTown && (
        <LinkButton onClick={onFillTown} className="ml-auto">
          Popuni građanima
        </LinkButton>
      )}
    </div>
  )
}

// Oznaka da raspored uloga prati preporuku za broj igrača
function RecommendedTag() {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-role-doktor/14 px-2 text-xs font-medium text-role-doktor">
      <Icon name="check" size={13} strokeWidth={2.2} />
      preporučeno
    </span>
  )
}

type LinkButtonProps = {
  onClick: () => void
  /** manji tekst u naslovu sekcije; negativna margina čuva visinu retka, a mjesto za dodir ostaje 36 px */
  small?: boolean
  className?: string
  children: ReactNode
}

function LinkButton({ onClick, small = false, className = '', children }: LinkButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'h-9 shrink-0 cursor-pointer px-1 font-semibold text-accent',
        small ? '-my-1.5 text-[13px]' : 'text-[15px]',
        className,
      )}
    >
      {children}
    </button>
  )
}
