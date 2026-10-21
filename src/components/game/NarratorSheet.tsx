import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/cx.ts'
import type { Narration } from '../../lib/narration.ts'
import { cancelSpeech, speak, useCroatianVoice } from '../../lib/speech.ts'
import IconButton from '../IconButton.tsx'
import Sheet from '../Sheet.tsx'

// Tekst se ispisuje znak po znak (spec 7)
const CHAR_MS = 28
// val i kursor se smire pola sekunde nakon zadnjeg slova (prototip)
const SETTLE_MS = 500
// Narator sam ide dalje, da nitko ne mora stiskati gumb:
// kratka pauza nakon govora, ili vrijeme da se pročita tekst kad uređaj ne govori
const AFTER_SPEECH_MS = 800
const AFTER_TEXT_MS = 2000
// ako preglednik nikad ne javi kraj govora
const SPEECH_TIMEOUT_MS = 20000

type NarratorSheetProps = {
  /** null = sheet je zatvoren */
  narration: Narration | null
  /** glas je uključen (postavka sobe ili gumb u sheetu) */
  voiceOn: boolean
  /** ovaj uređaj smije govoriti: online svatko, uživo samo domaćin */
  canSpeak: boolean
  onToggleVoice: () => void
  /** naracija je gotova (tekst ispisan i izgovoren) */
  onNext: () => void
}

// Narator (spec 7): donji sheet koji se ne zatvara dodirom pozadine ni Esc
export default function NarratorSheet({ narration, ...rest }: NarratorSheetProps) {
  // sadržaj ostaje na ekranu dok sheet izlazi, ali govor staje odmah
  useEffect(() => {
    if (!narration) cancelSpeech()
  }, [narration])

  return (
    <Sheet open={narration !== null} onClose={() => {}} dismissable={false} aria-label="Narator">
      {/* key: nova naracija kreće ispočetka, a stara pri izlasku prekida govor */}
      {narration && <NarratorBody key={narration.key} narration={narration} {...rest} />}
    </Sheet>
  )
}

function NarratorBody({
  narration,
  voiceOn,
  canSpeak,
  onToggleVoice,
  onNext,
}: Omit<NarratorSheetProps, 'narration'> & { narration: Narration }) {
  const reduceMotion = useReducedMotion()
  const voiceUri = useCroatianVoice()
  const { text } = narration
  // koliko je znakova ispisano; uz reduced motion tekst je odmah cijeli
  const [count, setCount] = useState(() => (reduceMotion ? Infinity : 0))
  const [settling, setSettling] = useState(!reduceMotion)
  const [speaking, setSpeaking] = useState(false)
  // govor je završio (ili pukao, npr. preglednik ne dopušta zvuk)
  const [spoken, setSpoken] = useState(false)
  // Ponovi povećava broj, pa se govor pokrene ispočetka
  const [replay, setReplay] = useState(0)
  const done = count >= text.length
  const audible = voiceOn && canSpeak && voiceUri !== null

  useEffect(() => {
    if (done) return
    const id = window.setInterval(() => setCount((c) => c + 1), CHAR_MS)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (!done) return
    const t = window.setTimeout(() => setSettling(false), SETTLE_MS)
    return () => clearTimeout(t)
  }, [done])

  // Govor prati tekst; zatvaranje sheeta, nova naracija ili isključen glas ga prekidaju.
  // `live` sprječava da kraj prekinutog govora ugasi kuglu novome.
  useEffect(() => {
    if (!audible || !voiceUri) return
    let live = true
    speak(
      text,
      voiceUri,
      () => live && setSpeaking(true),
      () => {
        if (!live) return
        setSpeaking(false)
        setSpoken(true)
      },
    )
    return () => {
      live = false
      cancelSpeech()
      setSpeaking(false)
    }
  }, [text, voiceUri, audible, replay])

  // ref da novi onNext iz roditelja ne pokreće odbrojavanje ispočetka
  const onNextRef = useRef(onNext)
  useEffect(() => {
    onNextRef.current = onNext
  })

  // Kad je tekst ispisan i (ako ovaj uređaj govori) izgovoren, narator ide dalje sam.
  // Uz reduced motion tekst se pojavi odjednom, pa se čeka vrijeme čitanja.
  useEffect(() => {
    if (!done) return
    let wait = reduceMotion ? Math.max(2500, text.length * 60) : AFTER_TEXT_MS
    if (audible) wait = spoken ? AFTER_SPEECH_MS : SPEECH_TIMEOUT_MS
    const t = window.setTimeout(() => onNextRef.current(), wait)
    return () => clearTimeout(t)
  }, [done, audible, spoken, reduceMotion, text.length])

  function again() {
    setCount(reduceMotion ? Infinity : 0)
    setSettling(!reduceMotion)
    setSpoken(false)
    setReplay((r) => r + 1)
  }

  let note = ''
  if (!canSpeak) note = 'Glas se čuje s domaćinova mobitela.'
  else if (!voiceOn) note = 'Glas je isključen. Narator piše tekst.'
  else if (!voiceUri) note = 'Hrvatski glas nije dostupan na ovom uređaju. Narator piše tekst.'

  return (
    <>
      <div className="mb-4 flex items-center gap-3.5">
        <Orb talking={settling || speaking} />
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold">Narator</div>
          <div className="text-[13px] text-muted">{narration.label}</div>
        </div>
        <Wave on={settling} />
      </div>

      {/* dodir teksta ga ispiše do kraja; čitač ekrana odmah dobiva cijeli tekst */}
      <button
        type="button"
        onClick={() => setCount(Infinity)}
        className="mb-[18px] block min-h-[116px] w-full cursor-default text-left text-xl leading-[1.45] font-medium tracking-[-.01em] [-webkit-tap-highlight-color:transparent]"
      >
        <span className="sr-only">{text}</span>
        <span aria-hidden="true">
          {text.slice(0, count)}
          {settling && (
            <span className="ml-0.5 inline-block h-[1.05em] w-0.5 animate-blink bg-accent align-[-3px]" />
          )}
        </span>
      </button>

      <div className="flex items-center gap-2">
        <IconButton icon="replay" iconSize={20} aria-label="Ponovi naraciju" className="bg-surface-2" onClick={again} />
        <IconButton
          icon={voiceOn ? 'volume' : 'mute'}
          iconSize={20}
          aria-label={voiceOn ? 'Isključi glas' : 'Uključi glas'}
          className="bg-surface-2"
          disabled={!canSpeak}
          onClick={onToggleVoice}
        />
        {note && <p className="min-w-0 flex-1 pl-1 text-[13px] leading-[1.45] text-muted">{note}</p>}
      </div>
    </>
  )
}

// Kugla u boji akcenta; dok narator govori iz nje izlaze dva prstena
function Orb({ talking }: { talking: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="relative size-13 shrink-0 rounded-full bg-[radial-gradient(circle_at_36%_32%,color-mix(in_srgb,var(--accent)_55%,#fff),var(--accent)_55%,color-mix(in_srgb,var(--accent)_60%,#000))]"
    >
      {talking && (
        <>
          <span className="absolute inset-0 animate-ring-out rounded-full border-[1.5px] border-accent opacity-0" />
          <span className="absolute inset-0 animate-ring-out rounded-full border-[1.5px] border-accent opacity-0 [animation-delay:.9s]" />
        </>
      )}
    </div>
  )
}

// Valni oblik od 5 traka koji se miče dok traje tekst
function Wave({ on }: { on: boolean }) {
  return (
    <div aria-hidden="true" className="flex h-7 items-center gap-[3px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <i
          key={i}
          className={cx('h-1.5 w-[3px] rounded-[2px] bg-accent [transition:height_.3s]', on && 'animate-wave')}
          style={on ? { animationDelay: `${i * 0.12}s` } : undefined}
        />
      ))}
    </div>
  )
}
