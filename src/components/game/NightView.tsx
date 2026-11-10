import { motion } from 'framer-motion'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { describeError, resolveNight, submitAction } from '../../api/rest.ts'
import type { ActionResponse, AvailableActionResponse, GameStateResponse } from '../../api/types.ts'
import { ROLES, type RoleKey } from '../../data/roles.ts'
import { cx } from '../../lib/cx.ts'
import { riseItem, riseList } from '../../lib/motion.ts'
import { avatarById, playerHue } from '../../lib/playerLook.ts'
import { useIsDesktop } from '../../lib/useIsDesktop.ts'
import { addNote, type NightNote, type NoteTarget } from '../../store/notes.ts'
import type { Mode } from '../../store/roomSettings.ts'
import type { Session } from '../../store/session.ts'
import Button from '../Button.tsx'
import HoldButton from '../HoldButton.tsx'
import { Icon } from '../icons.tsx'
import PlayerTile from '../PlayerTile.tsx'
import { Screen, ScreenFooter } from '../Screen.tsx'
import Skyline from '../Skyline.tsx'
import Toast from '../Toast.tsx'
import TurnBadge from '../TurnBadge.tsx'
import { GameBody } from './GameLayout.tsx'
import { GAME_FOOTER } from './gameSidebarContext.ts'
import HostConfirmSheet from './HostConfirmSheet.tsx'
import NightResult from './NightResult.tsx'
import { nightText } from './nightConfig.ts'
import PhaseHeader from './PhaseHeader.tsx'
import { fateText } from './playerStatus.ts'
import TimeBar from './TimeBar.tsx'

type NightViewProps = {
  code: string
  round: number
  role: RoleKey | null
  mode: Mode
  session: Session
  /** zadnji GET /game-state; što igrač smije raditi zna samo backend (currentPlayer) */
  state: GameStateResponse
  isHost: boolean
  /** ponovno dohvati game-state */
  onRefresh: () => void
  /** true dok igrač gleda rezultat istrage / usporedbe – GameScreen tada odgađa prelazak u dan */
  onHoldChange: (hold: boolean) => void
}

// Najdulji odabir i drugi krug mafije (GameRules na backendu); puna širina trake vremena
const CHOOSE_S = 13
const RUNOFF_S = 10

// Lokalni korak nakon potvrde. Nakon osvježavanja stranice ostaje samo hasActed iz backenda.
type Step = { kind: 'pick' } | { kind: 'result'; note: NightNote } | { kind: 'sent' }

// Desktop: odabir mete u kartici, rezultat u užem stupcu, a poruke (spavanje, poslano, promatrač)
// okomito centrirane iznad grada (min-h-full ScreenBodyja je prostor iznad grada)
const DESKTOP_WRAP: Record<string, string> = {
  action: 'mx-auto w-full max-w-[760px] rounded-card border border-line bg-surface/60 p-7',
  runoff: 'mx-auto w-full max-w-[760px] rounded-card border border-line bg-surface/60 p-7',
  result: 'mx-auto w-full max-w-[480px] text-center',
  observer: 'flex min-h-full flex-col justify-center',
  sent: 'flex min-h-full flex-col justify-center',
  sleep: 'flex min-h-full flex-col justify-center',
}

// tekst ostaje i nakon zatvaranja, da toast ne ostane prazan dok izlazi
type ErrorToast = { open: boolean; title: string; text: string }

// Noć (spec 6.6): promatrač, akcija, rezultat, potez poslan ili spavanje.
// NightView se montira iznova svake noći, pa lokalno stanje vrijedi samo za ovu noć.
export default function NightView({
  code,
  round,
  role,
  mode,
  session,
  state,
  isHost,
  onRefresh,
  onHoldChange,
}: NightViewProps) {
  const [step, setStep] = useState<Step>({ kind: 'pick' })
  // null = igrač još nije dirao odabir; mafijaš tada vidi metu koju je već poslao
  const [selected, setSelected] = useState<number[] | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<ErrorToast>({ open: false, title: '', text: '' })
  const [endOpen, setEndOpen] = useState(false)
  const [ending, setEnding] = useState(false)
  const isDesktop = useIsDesktop()

  // ako se ekran ugasi dok igrač gleda rezultat, prelazak u dan više ne čeka
  useEffect(() => () => onHoldChange(false), [onHoldChange])

  const me = state.currentPlayer
  const players = useMemo(() => [...state.players].sort((a, b) => a.id - b.id), [state.players])
  const alivePlayers = players.filter((p) => p.alive)
  const offered = me.canAct ? (me.availableActions[0] ?? null) : null
  // mafija smije mijenjati metu do kraja poteza, ostali igraju jednom
  const action = offered && (!me.hasActed || offered.type === 'KILL') ? offered : null
  const targetOf = (id: number) => me.teamTargets.find((t) => t.playerId === id)?.targetPlayerId ?? null
  const myPick = targetOf(me.playerId)
  // backend drugi krug šalje cijelom timu, a bira samo onaj tko ima akciju (Dama spava dok je Mafija živa)
  const runoff = action?.type === 'KILL' && me.mafiaRunoff?.active ? me.mafiaRunoff : null
  // tko još bira u potezu mafije: Mafija, a kad nje nema, Dama (GameRulesService.turnActors)
  const partners = action?.type === 'KILL' ? me.teammates.filter((t) => t.alive && t.roleName === me.role) : []
  const waitingForTeammate = myPick !== null && partners.some((t) => targetOf(t.playerId) === null)
  const agreed = action?.type === 'KILL' && myPick !== null && partners.every((t) => targetOf(t.playerId) === myPick)

  // novi krug kreće od poslane mete; neposlani odabir iz prvog kruga više ne vrijedi
  const runoffEnd = runoff?.endsAt ?? null
  const [prevRunoffEnd, setPrevRunoffEnd] = useState(runoffEnd)
  if (runoffEnd !== prevRunoffEnd) {
    setPrevRunoffEnd(runoffEnd)
    setSelected(null)
  }

  const emojiOf = (id: number) => avatarById(players, id)
  const nicknameOf = (id: number) => players.find((p) => p.id === id)?.nickname ?? '?'

  // Zašto se igrač ne može odabrati; null = može. Mete određuje backend (targetPlayerIds),
  // pa sebe igrač bira kad to backend dopušta (Doktor štiti sebe, Dama utišava sebe).
  function tagFor(id: number, a: AvailableActionResponse): string | null {
    const allowed = a.targetPlayerIds.includes(id)
    if (id === me.playerId) return allowed ? null : 'Ti'
    if (a.type === 'KILL' && me.teammates.some((t) => t.playerId === id)) return 'Tvoj tim'
    if (!allowed) return 'Nedostupno'
    return null
  }

  const need = action?.requiresSecondTarget ? 2 : 1
  // odabir koji je u međuvremenu postao nedostupan (novi game-state) se ne računa
  const chosen = selected ?? (action?.type === 'KILL' && myPick !== null ? [myPick] : [])
  const picked = action ? chosen.filter((id) => tagFor(id, action) === null) : []
  const ready = picked.length === need
  // mafijaš je ovu metu već poslao: potvrda nije potrebna dok ne odabere drugu
  const alreadySent = action?.type === 'KILL' && picked[0] === myPick

  function toggle(id: number) {
    if (picked.includes(id)) setSelected(picked.filter((x) => x !== id))
    else if (need === 1) setSelected([id])
    // kod dvije mete novi odabir zamijeni najstariji
    else setSelected([...picked.slice(-(need - 1)), id])
  }

  async function confirm() {
    if (!action || !ready || sending) return
    const [first, second] = picked
    const withResult = action.type === 'INVESTIGATE' || action.type === 'COMPARE'
    setSending(true)
    // noć se može obraditi čim backend primi zadnji potez – dan čeka da igrač vidi rezultat
    if (withResult) onHoldChange(true)
    try {
      const response = await submitAction({
        playerId: session.playerId,
        playerToken: session.playerToken,
        actionType: action.type,
        targetPlayerId: first,
        secondTargetPlayerId: second ?? null,
      })
      const note = noteFrom(response, round, picked.map((id) => ({ id, nickname: nicknameOf(id) })))
      if (note) {
        addNote(code, note)
        setStep({ kind: 'result', note })
      } else if (action.type === 'KILL') {
        // meta se može mijenjati do kraja poteza, pa ekran ostaje na odabiru
        onHoldChange(false)
        setSelected(null)
      } else {
        onHoldChange(false)
        setStep({ kind: 'sent' })
      }
    } catch (e) {
      onHoldChange(false)
      setError({ open: true, title: 'Potez nije poslan', text: describeError(e, code) })
    }
    setSending(false)
    // npr. red je već prošao ili je potez ipak spremljen
    onRefresh()
  }

  async function endNight() {
    setEnding(true)
    try {
      await resolveNight(code, session)
    } catch (e) {
      setError({ open: true, title: 'Noć nije završena', text: describeError(e, code) })
    }
    setEnding(false)
    setEndOpen(false)
    onRefresh()
  }

  // rezultat je prvi: igrač ga mora vidjeti i ako je iste noći stradao
  let view: 'result' | 'observer' | 'sent' | 'action' | 'runoff' | 'sleep'
  if (step.kind === 'result') view = 'result'
  else if (!me.alive) view = 'observer'
  // mafija koja se složila ne bira dalje: potez završava za 1–4 s
  else if (action && !agreed) view = runoff ? 'runoff' : 'action'
  else if (step.kind === 'sent' || me.hasActed) view = 'sent'
  else view = 'sleep'

  let main: ReactNode
  let footer: ReactNode = null
  if (step.kind === 'result') {
    main = <NightResult note={step.note} emojiOf={emojiOf} />
    footer = (
      <Button
        variant="secondary"
        onClick={() => {
          setStep({ kind: 'sent' })
          onHoldChange(false)
        }}
      >
        Gotovo, spavam
      </Button>
    )
  } else if (view === 'observer') {
    main = <Observer fate={fateText(players.find((p) => p.id === me.playerId))} />
  } else if (view === 'sent') {
    main = <Sent />
  } else if ((view === 'action' || view === 'runoff') && action) {
    const text = nightText(action.type, role, partners.length > 0)
    const targets = runoff ? alivePlayers.filter((p) => runoff.candidatePlayerIds.includes(p.id)) : alivePlayers
    main = (
      <>
        <motion.div variants={riseItem} className="mt-1">
          {role && <TurnBadge role={role} />}
          {runoff ? (
            <TimeBar endsAt={runoff.endsAt} seconds={RUNOFF_S} />
          ) : (
            me.actionEndsAt && <TimeBar startsAt={me.actionStartedAt} endsAt={me.actionEndsAt} seconds={CHOOSE_S} />
          )}
        </motion.div>
        <motion.h3
          variants={riseItem}
          className="mt-1.5 mb-2 max-w-[18ch] text-[26px] leading-[1.15] font-bold tracking-[-.025em] lg:mt-3 lg:max-w-none lg:text-[30px]"
        >
          {runoff ? 'Niste se složili' : text.question}
        </motion.h3>
        <motion.p variants={riseItem} className="mb-[18px] max-w-[36ch] text-[15px] leading-[1.45] text-muted lg:mb-6 lg:max-w-prose">
          {runoff ? 'Ako se ne složite, odlučit će slučaj.' : text.hint}
        </motion.p>
        <motion.div variants={riseItem} className="grid grid-cols-3 gap-2 lg:gap-3 xl:grid-cols-4">
          {targets.map((p) => {
            const tag = tagFor(p.id, action)
            const isMe = p.id === me.playerId
            const pickers = me.teamTargets
              .filter((t) => t.targetPlayerId === p.id && t.playerId !== me.playerId)
              .map((t) => ({ emoji: emojiOf(t.playerId), hue: playerHue(t.playerId), name: nicknameOf(t.playerId) }))
            return (
              <PlayerTile
                key={p.id}
                name={isMe && !tag ? 'Ti' : p.nickname}
                emoji={emojiOf(p.id)}
                hue={playerHue(p.id)}
                selected={picked.includes(p.id)}
                tag={tag}
                pickers={pickers}
                onSelect={() => toggle(p.id)}
              />
            )
          })}
        </motion.div>
      </>
    )
    footer = (
      <>
        <div aria-live="polite" className="mb-0.5 flex min-h-6 items-center gap-2.5 text-[15px] text-muted lg:justify-center">
          {alreadySent && waitingForTeammate ? (
            <span>Čekamo suigrača…</span>
          ) : alreadySent ? (
            <span>
              Odabrano: <b className="font-semibold text-text">{nicknameOf(picked[0])}</b>. Možeš promijeniti do kraja
              poteza.
            </span>
          ) : ready ? (
            <span>
              {text.verb} <b className="font-semibold text-text">{picked.map(nicknameOf).join(' i ')}</b>
            </span>
          ) : need === 2 ? (
            `Odaberi još ${need - picked.length}`
          ) : (
            'Odaberi igrača'
          )}
        </div>
        <HoldButton disabled={!ready || alreadySent || sending} onConfirm={confirm}>
          {sending ? 'Šaljem…' : alreadySent ? 'Meta je poslana' : 'Drži za potvrdu'}
        </HoldButton>
      </>
    )
  } else {
    const noAction = role ? ROLES[role].action === null : false
    main = <Sleep noAction={noAction} live={mode === 'live'} desktop={isDesktop} />
  }

  return (
    <Screen>
      <PhaseHeader icon="moon" title={`Noć ${round}`} role={role} code={code} />
      <GameBody withSky>
        {/* svako stanje ulazi iznova (spec 8), npr. kad igrač dođe na red */}
        <motion.div
          key={view}
          variants={riseList}
          initial="hidden"
          animate="show"
          className={isDesktop ? DESKTOP_WRAP[view] : undefined}
        >
          {main}
        </motion.div>
      </GameBody>
      <Skyline players={players} stateOf={(p) => (p.alive ? 'on' : 'off')} />
      <ScreenFooter rise className={cx('bg-sky', GAME_FOOTER)}>
        {footer}
        {isHost && (
          // osigurač ako noć zapne (spec 10.2) – samo domaćin, uz potvrdu
          <Button variant="ghost" size="sm" className="self-center" onClick={() => setEndOpen(true)}>
            Završi noć
          </Button>
        )}
      </ScreenFooter>
      <HostConfirmSheet
        open={endOpen}
        title="Završiti noć?"
        subtitle="Uloge koje još nisu odigrale preskaču potez. Koristi ovo samo ako je noć zapela."
        confirmLabel="Završi noć"
        sendingLabel="Završavam noć…"
        sending={ending}
        onClose={() => setEndOpen(false)}
        onConfirm={endNight}
      />
      <Toast
        open={error.open}
        onClose={() => setError((e) => ({ ...e, open: false }))}
        duration={4000}
        leading={
          <span className="text-accent">
            <Icon name="info" size={22} />
          </span>
        }
        title={error.title}
        text={error.text}
      />
    </Screen>
  )
}

// Rezultat istrage / usporedbe iz odgovora akcije; ostale akcije nemaju rezultat
function noteFrom(response: ActionResponse, round: number, targets: NoteTarget[]): NightNote | null {
  if (response.actionType === 'INVESTIGATE' && response.investigationResult && targets.length >= 1) {
    return { round, type: 'INVESTIGATE', targets: [targets[0]], value: response.investigationResult }
  }
  if (response.actionType === 'COMPARE' && response.journalistResult && targets.length === 2) {
    return { round, type: 'COMPARE', targets: [targets[0], targets[1]], value: response.journalistResult }
  }
  return null
}

function Observer({ fate }: { fate: string }) {
  return (
    <div className="flex flex-col items-center px-2.5 pt-[34px] text-center lg:pt-0">
      <motion.div
        variants={riseItem}
        className="mb-[22px] grid size-[84px] animate-[floaty_5s_ease-in-out_infinite] place-items-center rounded-full bg-surface text-muted"
      >
        <Icon name="ghost" size={40} strokeWidth={1.6} />
      </motion.div>
      <motion.h3 variants={riseItem} className="mb-2.5 text-[30px] font-bold tracking-[-.03em]">
        Promatraš igru
      </motion.h3>
      <motion.p variants={riseItem} className="max-w-[30ch] text-base leading-[1.5] text-muted">
        {fate}. Ne govori i ne otkrivaj uloge dok igra ne završi.
      </motion.p>
    </div>
  )
}

function Sent() {
  return (
    <div className="flex flex-col items-center px-2 pt-10 text-center lg:pt-0">
      <motion.div
        variants={riseItem}
        className="mb-5 grid size-[84px] place-items-center rounded-full bg-accent-soft text-accent"
      >
        <svg
          viewBox="0 0 24 24"
          width={40}
          height={40}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6.5 9.5 17 4 11.5" className="animate-draw [stroke-dasharray:30] [stroke-dashoffset:30]" />
        </svg>
      </motion.div>
      <motion.h3 variants={riseItem} className="mb-2 text-[26px] font-bold tracking-[-.025em]">
        Potez je poslan
      </motion.h3>
      <motion.p variants={riseItem} className="max-w-[30ch] text-base leading-[1.5] text-muted">
        Zatvori oči. Narator će probuditi sljedeću ulogu.
      </motion.p>
    </div>
  )
}

const MOON_FACE = 'radial-gradient(circle at 36% 40%, #fff4e0, #ffd9a0 40%, #d9a86a 85%)'
// izreže polumjesec iz punog kruga
const MOON_MASK = 'radial-gradient(circle at 76% 30%, transparent 43%, #000 44%)'

// uživo na desktopu nema mobitela koji bi se spustio ekranom prema dolje
function Sleep({ noAction, live, desktop }: { noAction: boolean; live: boolean; desktop: boolean }) {
  return (
    <div className="flex flex-col items-center px-2.5 pt-[34px] text-center lg:pt-0">
      <motion.div variants={riseItem} aria-hidden="true" className="relative mb-7 size-[120px] animate-floaty">
        <span className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(255,210,122,.16),transparent_65%)]" />
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: MOON_FACE, mask: MOON_MASK, WebkitMask: MOON_MASK }}
        />
      </motion.div>
      <motion.h3 variants={riseItem} className="mb-2.5 text-[30px] font-bold tracking-[-.03em]">
        Grad spava
      </motion.h3>
      <motion.p variants={riseItem} className="max-w-[30ch] text-base leading-[1.5] text-muted">
        {noAction ? 'Nemaš noćnu akciju.' : 'Probudit ćeš se kad narator prozove tvoju ulogu.'}{' '}
        {live
          ? desktop
            ? 'Zatvori oči i ne gledaj u ekran.'
            : 'Zatvori oči i spusti mobitel ekranom prema dolje.'
          : 'Pričekaj naratora.'}
      </motion.p>
      <motion.div variants={riseItem} aria-hidden="true" className="mt-[22px] flex gap-1.5">
        {[0, 0.3, 0.6].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-breathe rounded-full bg-muted"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </motion.div>
    </div>
  )
}
