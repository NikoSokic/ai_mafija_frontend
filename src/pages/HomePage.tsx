import { motion } from 'framer-motion'
import { useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import Avatar from '../components/Avatar.tsx'
import Button from '../components/Button.tsx'
import IconButton from '../components/IconButton.tsx'
import { Icon } from '../components/icons.tsx'
import JoinSheet from '../components/JoinSheet.tsx'
import LeaveRoomSheet from '../components/LeaveRoomSheet.tsx'
import ReclaimSheet from '../components/ReclaimSheet.tsx'
import RoleIcon from '../components/RoleIcon.tsx'
import RulesSheet from '../components/RulesSheet.tsx'
import { Screen, ScreenBody, ScreenFooter, ScreenTop } from '../components/Screen.tsx'
import Skyline from '../components/Skyline.tsx'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { Spinner } from '../components/Toast.tsx'
import { DEFAULT_EMOJI, EMOJIS } from '../data/emojis.ts'
import { ROLE_KEYS, ROLES } from '../data/roles.ts'
import { cx } from '../lib/cx.ts'
import { EASE_OUT, riseItem } from '../lib/motion.ts'
import { useIsDesktop } from '../lib/useIsDesktop.ts'
import { loadIntroSeen, saveIntroSeen } from '../store/intro.ts'
import { loadProfile, saveProfile, type Profile } from '../store/profile.ts'
import { roomPath, useResumeStore } from '../store/resume.ts'
import { retryWake, useServerStore } from '../store/server.ts'
import { loadSession, type Session } from '../store/session.ts'

// Ukrasni grad: 8 prozora, upaljeni kao u prototipu
const CITY = Array.from({ length: 8 }, (_, i) => ({ id: i }))
const CITY_ON = [0, 2, 3, 5, 7]

// Boja kruga avatara na Početnoj (u igri se računa iz id-a igrača)
const AVATAR_HUE = 350

// Desktop: gumbi u kartici idu preko cijele njezine širine (lg gumb je inače uzak i centriran)
const DESKTOP_FULL = 'lg:mx-0! lg:w-full! lg:min-w-0!'

type OpenSheet = 'rules' | 'join' | 'leave' | 'reclaim' | null

export default function HomePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile>(() => {
    const saved = loadProfile()
    return { nickname: saved?.nickname ?? '', emoji: saved?.emoji || DEFAULT_EMOJI }
  })
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [nickError, setNickError] = useState(false)
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const [session, setSession] = useState(loadSession)
  const [introSeen, setIntroSeen] = useState(loadIntroSeen)
  // Kartica čeka provjeru pri pokretanju, da ne bljesne prije automatskog ulaska u sobu
  const resumeDone = useResumeStore((s) => s.status === 'done')
  const resumeStatus = useResumeStore((s) => (s.lobbyCode === session?.lobbyCode ? s.lobbyStatus : null))
  const serverStatus = useServerStore((s) => s.status)
  const serverReady = serverStatus === 'ready'
  const nickRef = useRef<HTMLInputElement>(null)
  const gridId = useId()
  const errorId = useId()
  const isDesktop = useIsDesktop()

  function updateProfile(change: Partial<Profile>) {
    const next = { ...profile, ...change }
    setProfile(next)
    saveProfile(next)
  }

  // Nova soba i ulazak kodom uzimaju nadimak iz profila
  function requireNickname() {
    if (profile.nickname.trim() !== '') return true
    setNickError(true)
    nickRef.current?.focus()
    return false
  }

  const closeSheet = () => setSheet(null)

  // Poziv za prvu igru nestaje čim ga igrač otvori ili odbaci
  function dismissIntro() {
    saveIntroSeen()
    setIntroSeen(true)
  }

  const title = (
    <div className="relative pt-7 pb-[26px] lg:pt-0">
      <motion.h1
        variants={riseItem}
        className="mb-4 text-[64px] leading-[.92] font-bold tracking-[-.045em] lg:mb-5 lg:text-[clamp(80px,12vh,112px)]"
      >
        <small className="mb-2 block text-[22px] font-medium tracking-[-.01em] text-muted lg:text-[clamp(24px,3.4vh,32px)]">AI</small>{' '}
        Mafija
      </motion.h1>
      <motion.p variants={riseItem} className="max-w-[32ch] text-base leading-normal text-muted lg:max-w-[40ch] lg:text-lg">
        Mafija s AI naratorom. Igrajte uživo za istim stolom ili svatko sa svog mobitela.
      </motion.p>
    </div>
  )

  const profileRow = (
    <motion.div variants={riseItem}>
      <div className="flex items-end gap-3.5">
        <button
          type="button"
          aria-label="Promijeni avatar"
          aria-expanded={emojiOpen}
          aria-controls={gridId}
          onClick={() => setEmojiOpen(!emojiOpen)}
          className="relative shrink-0 cursor-pointer rounded-full"
        >
          <Avatar emoji={profile.emoji} hue={AVATAR_HUE} size={64} />
          <span className="absolute -right-0.5 -bottom-0.5 grid size-[27px] place-items-center rounded-full bg-surface-2 text-text">
            <Icon name="edit" size={17} strokeWidth={2} />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <label htmlFor="nick" className="mb-2 block text-sm text-muted">
            Tvoj nadimak
          </label>
          <input
            ref={nickRef}
            id="nick"
            value={profile.nickname}
            maxLength={16}
            autoComplete="nickname"
            aria-invalid={nickError}
            aria-describedby={nickError ? errorId : undefined}
            onChange={(e) => {
              updateProfile({ nickname: e.target.value })
              if (e.target.value.trim() !== '') setNickError(false)
            }}
            className={cx(
              'h-14 w-full rounded-ctrl border bg-surface px-4 text-lg font-medium',
              '[transition:border-color_.2s,box-shadow_.2s] focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]',
              nickError ? 'border-accent' : 'border-line',
            )}
          />
        </div>
      </div>
      {nickError && (
        <p id={errorId} role="alert" className="mt-2 pl-[78px] text-sm text-accent">
          Prvo upiši nadimak.
        </p>
      )}
    </motion.div>
  )

  const emojiGrid = emojiOpen && (
    <motion.div
      id={gridId}
      role="radiogroup"
      aria-label="Odaberi avatar"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } }}
      className="mt-3.5 grid grid-cols-8 gap-1.5 rounded-tile border border-line bg-surface p-3 lg:mt-0 lg:bg-bg"
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          role="radio"
          aria-checked={emoji === profile.emoji}
          onClick={() => {
            updateProfile({ emoji })
            setEmojiOpen(false)
          }}
          className={cx(
            'grid aspect-square cursor-pointer place-items-center rounded-xl font-emoji text-[22px]',
            '[transition:scale_.2s_cubic-bezier(.34,1.56,.64,1),background-color_.2s] hover:bg-surface-2',
            'aria-checked:scale-[1.08] aria-checked:bg-accent-soft aria-checked:shadow-[inset_0_0_0_2px_var(--accent)]',
          )}
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  )

  // Desktop: manja poruka u gornjoj traci, centrirana preko oba stupca (ne gura sadržaj prema gradu)
  const serverNotice = !serverReady && (
    <motion.div
      variants={riseItem}
      role="status"
      className="mt-6 flex items-center gap-3 rounded-card border border-line bg-surface p-4 lg:pointer-events-auto lg:mt-0 lg:rounded-full lg:py-2 lg:pr-2 lg:pl-4 lg:min-h-14"
    >
      {serverStatus === 'waking' ? (
        <>
          <Spinner />
          <p className="animate-breathe text-[15px] font-medium">Budim server…</p>
        </>
      ) : (
        <>
          <p className="flex-1 text-[15px] text-muted">Server se ne javlja.</p>
          <Button size="sm" onClick={retryWake}>
            Pokušaj ponovno
          </Button>
        </>
      )}
    </motion.div>
  )

  const resumeCard = resumeDone && session && <ResumeCard session={session} onLeave={() => setSheet('leave')} />

  const createButton = (
    <Button disabled={!serverReady} onClick={() => requireNickname() && navigate('/nova')} className={DESKTOP_FULL}>
      Kreiraj sobu
    </Button>
  )
  const joinButtons = (
    <div className="grid grid-cols-2 gap-2.5">
      <Button
        variant="secondary"
        disabled={!serverReady}
        onClick={() => requireNickname() && setSheet('join')}
        className={DESKTOP_FULL}
      >
        Uđi s kodom
      </Button>
      <Button variant="ghost" disabled={!serverReady} onClick={() => navigate('/sobe')} className={DESKTOP_FULL}>
        Javne sobe
      </Button>
    </div>
  )
  const reclaimButton = !session && (
    <Button variant="ghost" size="sm" disabled={!serverReady} onClick={() => setSheet('reclaim')}>
      Vrati se u igru na novom mobitelu
    </Button>
  )

  const top = (
    <ScreenTop>
      <span className="flex-1" />
      <IconButton icon="info" aria-label="Pravila igre" onClick={() => setSheet('rules')} />
    </ScreenTop>
  )

  const city = <Skyline players={CITY} stateOf={(_, i) => (CITY_ON.includes(i) ? 'on' : 'off')} />

  const sheets = (
    <>
      <RulesSheet open={sheet === 'rules'} onClose={closeSheet} />
      <JoinSheet open={sheet === 'join'} onClose={closeSheet} nickname={profile.nickname.trim()} emoji={profile.emoji} />
      <ReclaimSheet open={sheet === 'reclaim'} onClose={closeSheet} nickname={profile.nickname.trim()} />
      {session && (
        <LeaveRoomSheet
          open={sheet === 'leave'}
          code={session.lobbyCode}
          inGame={resumeStatus === 'IN_PROGRESS'}
          onClose={closeSheet}
          onLeft={() => {
            setSession(null)
            closeSheet()
          }}
        />
      )}
    </>
  )

  // Desktop: lijevo naslov, kako se igra i uloge; desno kartica s nadimkom i gumbima. Grad je ispod oba stupca,
  // a podnožje (tlo) ima samo povratak u igru. Kartica "Prvi put igraš?" ne treba – lijevi stupac to objašnjava.
  if (isDesktop) {
    return (
      <ThemeRoot theme="night">
        <Screen>
          <Moon />
          {top}
          {serverNotice && (
            <div className="pointer-events-none absolute inset-x-0 top-2.5 z-[4] flex justify-center">{serverNotice}</div>
          )}
          <ScreenBody withSky>
            <div className="grid min-h-full grid-cols-[minmax(0,1fr)_minmax(360px,420px)] content-center items-center gap-x-16 gap-y-8 py-4">
              <div className="min-w-0">
                {title}
                <HowToPlay onRules={() => setSheet('rules')} />
                <RoleList />
              </div>
              <div className="flex flex-col gap-4">
                <motion.section
                  variants={riseItem}
                  className="flex flex-col gap-3.5 rounded-card border border-line bg-surface p-5"
                >
                  {profileRow}
                  {emojiGrid}
                  <div className="mt-1.5 flex flex-col gap-2.5">
                    {createButton}
                    {joinButtons}
                  </div>
                </motion.section>
                {resumeCard}
              </div>
            </div>
          </ScreenBody>
          {city}
          <ScreenFooter rise className="bg-sky lg:items-center">
            {reclaimButton}
          </ScreenFooter>
        </Screen>
        {sheets}
      </ThemeRoot>
    )
  }

  return (
    <ThemeRoot theme="night">
      <Screen>
        <Moon />
        {top}

        <ScreenBody withSky>
          {title}
          {profileRow}
          {emojiGrid}
          {serverNotice}
          {resumeCard}

          {!introSeen && !session && (
            <motion.section variants={riseItem} className="mt-6 rounded-card border border-line bg-surface p-4">
              <h3 className="text-[17px] font-semibold tracking-[-.01em]">Prvi put igraš?</h3>
              <p className="mt-1 text-[13px] leading-[1.45] text-muted">
                Pročitaj u minuti kako teče runda i što radi koja uloga.
              </p>
              <div className="mt-3.5 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    dismissIntro()
                    setSheet('rules')
                  }}
                >
                  Kako se igra
                </Button>
                <Button size="sm" variant="ghost" onClick={dismissIntro}>
                  Ne treba
                </Button>
              </div>
            </motion.section>
          )}
        </ScreenBody>

        {city}
        <ScreenFooter rise className="bg-sky">
          {createButton}
          {joinButtons}
          {reclaimButton}
        </ScreenFooter>
      </Screen>

      {sheets}
    </ThemeRoot>
  )
}

const HOW_TO = [
  { title: 'Napravi sobu', text: 'Odaberi način igre, broj igrača i uloge.' },
  { title: 'Podijeli link ili kod', text: 'Prijatelji ulaze sa svojih mobitela.' },
  { title: 'Igrajte', text: 'AI narator vodi noći, dane i glasanje.' },
]

// "Kako se igra" u tri koraka (samo desktop; na mobitelu tu ulogu ima kartica "Prvi put igraš?")
function HowToPlay({ onRules }: { onRules: () => void }) {
  return (
    <motion.section variants={riseItem} className="mt-2 max-w-prose">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-[13px] font-semibold tracking-[.08em] text-muted uppercase">Kako se igra</h3>
        <button type="button" onClick={onRules} className="h-9 cursor-pointer px-1 text-[15px] font-semibold text-accent">
          Sva pravila
        </button>
      </div>
      <ol className="grid grid-cols-3 gap-5">
        {HOW_TO.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-1.5">
            <span className="mb-1 grid size-9 place-items-center rounded-full bg-accent-soft text-[15px] font-bold text-accent tabular-nums">
              {i + 1}
            </span>
            <h4 className="text-base leading-tight font-semibold">{step.title}</h4>
            <p className="text-[13px] leading-[1.45] text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </motion.section>
  )
}

// Uloge u igri, ikona i ime (samo desktop)
function RoleList() {
  return (
    <motion.ul variants={riseItem} aria-label="Uloge u igri" className="mt-7 flex max-w-prose flex-wrap gap-x-5 gap-y-3">
      {ROLE_KEYS.map((k) => (
        <li key={k} className="flex items-center gap-2 text-sm font-medium">
          <RoleIcon role={k} size={32} />
          {ROLES[k].name}
        </li>
      ))}
    </motion.ul>
  )
}

type ResumeCardProps = { session: Session; onLeave: () => void }

// Spremljena sesija (spec 6.10): igrač se može vratiti u sobu ili je napustiti
function ResumeCard({ session, onLeave }: ResumeCardProps) {
  const navigate = useNavigate()
  const code = session.lobbyCode
  // stanje je poznato samo ako ga je provjera pri pokretanju dobila baš za ovu sobu
  const status = useResumeStore((s) => (s.lobbyCode === code ? s.lobbyStatus : null))

  return (
    <motion.section variants={riseItem} className="mt-6 rounded-card border border-line bg-surface p-4">
      <h3 className="text-[17px] font-semibold tracking-[-.01em]">Nastavi igru u sobi {code}</h3>
      {status && (
        <p className="mt-1 text-[13px] leading-[1.45] text-muted">
          {status === 'IN_PROGRESS' ? 'Igra je u tijeku.' : 'Soba čeka igrače.'}
        </p>
      )}
      <div className="mt-3.5 flex gap-2">
        <Button size="sm" onClick={() => navigate(roomPath(code, status))}>
          Nastavi
        </Button>
        <Button size="sm" variant="ghost" onClick={onLeave}>
          Napusti
        </Button>
      </div>
    </motion.section>
  )
}

// Crveni mjesec iza sadržaja, gore desno
function Moon() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-[84px] right-7 z-0 size-28 rounded-full opacity-42"
      style={{
        background:
          'radial-gradient(circle at 38% 36%, color-mix(in srgb, var(--accent) 70%, #fff) 0, var(--accent) 45%, color-mix(in srgb, var(--accent) 30%, transparent) 64%, transparent 70%)',
      }}
    >
      <div className="absolute -inset-[60px] rounded-full bg-[radial-gradient(circle,var(--glow),transparent_60%)] opacity-50" />
    </div>
  )
}
