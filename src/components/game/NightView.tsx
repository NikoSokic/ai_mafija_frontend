import { motion } from 'framer-motion'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { describeError, resolveNight, submitAction } from '../../api/rest.ts'
import type { ActionResponse, AvailableActionResponse, GameStateResponse } from '../../api/types.ts'
import { ROLES, type RoleKey } from '../../data/roles.ts'
import { riseItem, riseList } from '../../lib/motion.ts'
import { avatarById, playerHue } from '../../lib/playerLook.ts'
import { formatSeconds } from '../../lib/time.ts'
import { useCountdown } from '../../lib/useCountdown.ts'
import { addNote, type NightNote, type NoteTarget } from '../../store/notes.ts'
import type { Mode } from '../../store/roomSettings.ts'
import type { Session } from '../../store/session.ts'
import Button from '../Button.tsx'
import HoldButton from '../HoldButton.tsx'
import { Icon } from '../icons.tsx'
import PlayerTile from '../PlayerTile.tsx'
import { Screen, ScreenBody, ScreenFooter } from '../Screen.tsx'
import Skyline from '../Skyline.tsx'
import Toast from '../Toast.tsx'
import TurnBadge from '../TurnBadge.tsx'
import HostConfirmSheet from './HostConfirmSheet.tsx'
import NightResult from './NightResult.tsx'
import { nightText } from './nightConfig.ts'
import PhaseHeader from './PhaseHeader.tsx'
import { fateText } from './playerStatus.ts'

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

// Potez traje 6 s naracije + 20 s za odabir (GameRules na backendu)
const TURN_S = 26

// Lokalni korak nakon potvrde. Nakon osvježavanja stranice ostaje samo hasActed iz backenda.
type Step = { kind: 'pick' } | { kind: 'result'; note: NightNote } | { kind: 'sent' }

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

  // ako se ekran ugasi dok igrač gleda rezultat, prelazak u dan više ne čeka
  useEffect(() => () => onHoldChange(false), [onHoldChange])

  const me = state.currentPlayer
  const players = useMemo(() => [...state.players].sort((a, b) => a.id - b.id), [state.players])
  const alivePlayers = players.filter((p) => p.alive)
  const offered = me.canAct ? (me.availableActions[0] ?? null) : null
  // mafija smije mijenjati metu do kraja poteza, ostali igraju jednom
  const action = offered && (!me.hasActed || offered.type === 'KILL') ? offered : null
  const timer = useCountdown(action ? me.actionEndsAt : null, TURN_S)
  const myPick = me.teamTargets.find((t) => t.playerId === me.playerId)?.targetPlayerId ?? null

  const emojiOf = (id: number) => avatarById(players, id)
  const nicknameOf = (id: number) => players.find((p) => p.id === id)?.nickname ?? '?'

  // Zašto se igrač ne može odabrati; null = može. Mete određuje backend (targetPlayerIds),
  // a sebe igrač bira samo kad to backend dopušta i kad ima smisla (Doktor, kao u prototipu).
  function tagFor(id: number, a: AvailableActionResponse): string | null {
    const allowed = a.targetPlayerIds.includes(id)
    if (id === me.playerId) return a.type === 'SAVE' && allowed ? null : 'Ti'
    if (a.type === 'KILL' && me.teammates.some((t) => t.playerId === id)) return 'Tvoj tim'
    if (!allowed) return a.type === 'SILENCE' ? 'Meta mafije' : 'Nedostupno'
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
  let view: 'result' | 'observer' | 'sent' | 'action' | 'sleep'
  if (step.kind === 'result') view = 'result'
  else if (!me.alive) view = 'observer'
  else if (action) view = 'action'
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
  } else if (view === 'action' && action) {
    const text = nightText(action.type, role)
    main = (
      <>
        <motion.div variants={riseItem} className="mt-1 flex items-center gap-3">
          {role && <TurnBadge role={role} />}
          <span
            role="timer"
            aria-label="Preostalo vrijeme poteza"
            className={`text-[15px] font-semibold tabular-nums ${timer.left <= 5 ? 'text-accent' : 'text-muted'}`}
          >
            {formatSeconds(timer.left)}
          </span>
        </motion.div>
        <motion.h3
          variants={riseItem}
          className="mt-1.5 mb-2 max-w-[18ch] text-[26px] leading-[1.15] font-bold tracking-[-.025em]"
        >
          {text.question}
        </motion.h3>
        <motion.p variants={riseItem} className="mb-[18px] max-w-[36ch] text-[15px] leading-[1.45] text-muted">
          {text.hint}
        </motion.p>
        <motion.div variants={riseItem} className="grid grid-cols-3 gap-2">
          {alivePlayers.map((p) => {
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
        <div aria-live="polite" className="mb-0.5 flex min-h-6 items-center gap-2.5 text-[15px] text-muted">
          {alreadySent ? (
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
    main = <Sleep noAction={noAction} live={mode === 'live'} />
  }

  return (
    <Screen>
      <PhaseHeader icon="moon" title={`Noć ${round}`} role={role} code={code} />
      <ScreenBody withSky>
        {/* svako stanje ulazi iznova (spec 8), npr. kad igrač dođe na red */}
        <motion.div key={view} variants={riseList} initial="hidden" animate="show">
          {main}
        </motion.div>
      </ScreenBody>
      <Skyline players={players} stateOf={(p) => (p.alive ? 'on' : 'off')} />
      <ScreenFooter rise className="bg-sky">
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
    <div className="flex flex-col items-center px-2.5 pt-[34px] text-center">
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
    <div className="flex flex-col items-center px-2 pt-10 text-center">
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

function Sleep({ noAction, live }: { noAction: boolean; live: boolean }) {
  return (
    <div className="flex flex-col items-center px-2.5 pt-[34px] text-center">
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
        {live ? 'Zatvori oči i spusti mobitel ekranom prema dolje.' : 'Pričekaj naratora.'}
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
