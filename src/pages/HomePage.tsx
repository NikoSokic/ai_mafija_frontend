import { motion } from 'framer-motion'
import { useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import Avatar from '../components/Avatar.tsx'
import Button from '../components/Button.tsx'
import IconButton from '../components/IconButton.tsx'
import { Icon } from '../components/icons.tsx'
import JoinSheet from '../components/JoinSheet.tsx'
import LeaveRoomSheet from '../components/LeaveRoomSheet.tsx'
import RulesSheet from '../components/RulesSheet.tsx'
import { Screen, ScreenBody, ScreenFooter, ScreenTop } from '../components/Screen.tsx'
import Skyline from '../components/Skyline.tsx'
import ThemeRoot from '../components/ThemeRoot.tsx'
import { DEFAULT_EMOJI, EMOJIS } from '../data/emojis.ts'
import { cx } from '../lib/cx.ts'
import { EASE_OUT, riseItem } from '../lib/motion.ts'
import { loadProfile, saveProfile, type Profile } from '../store/profile.ts'
import { roomPath, useResumeStore } from '../store/resume.ts'
import { loadSession, type Session } from '../store/session.ts'

// Ukrasni grad: 8 prozora, upaljeni kao u prototipu
const CITY = Array.from({ length: 8 }, (_, i) => ({ id: i }))
const CITY_ON = [0, 2, 3, 5, 7]

// Boja kruga avatara na Početnoj (u igri se računa iz id-a igrača)
const AVATAR_HUE = 350

type OpenSheet = 'rules' | 'join' | 'leave' | null

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
  // Kartica čeka provjeru pri pokretanju, da ne bljesne prije automatskog ulaska u sobu
  const resumeDone = useResumeStore((s) => s.status === 'done')
  const nickRef = useRef<HTMLInputElement>(null)
  const gridId = useId()
  const errorId = useId()

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

  return (
    <ThemeRoot theme="night">
      <Screen>
        <Moon />
        <ScreenTop>
          <span className="flex-1" />
          <IconButton icon="info" aria-label="Pravila igre" onClick={() => setSheet('rules')} />
        </ScreenTop>

        <ScreenBody withSky>
          <div className="relative pt-7 pb-[26px]">
            <motion.h1
              variants={riseItem}
              className="mb-4 text-[64px] leading-[.92] font-bold tracking-[-.045em]"
            >
              <small className="mb-2 block text-[22px] font-medium tracking-[-.01em] text-muted">AI</small>{' '}
              Mafija
            </motion.h1>
            <motion.p variants={riseItem} className="max-w-[32ch] text-base leading-normal text-muted">
              Mafija s AI naratorom. Igrajte uživo za istim stolom ili svatko sa svog mobitela.
            </motion.p>
          </div>

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

          {emojiOpen && (
            <motion.div
              id={gridId}
              role="radiogroup"
              aria-label="Odaberi avatar"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } }}
              className="mt-3.5 grid grid-cols-8 gap-1.5 rounded-tile border border-line bg-surface p-3"
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
          )}

          {resumeDone && session && <ResumeCard session={session} onLeave={() => setSheet('leave')} />}
        </ScreenBody>

        <Skyline players={CITY} stateOf={(_, i) => (CITY_ON.includes(i) ? 'on' : 'off')} />
        <ScreenFooter rise className="bg-sky">
          <Button onClick={() => requireNickname() && navigate('/nova')}>Kreiraj sobu</Button>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" onClick={() => requireNickname() && setSheet('join')}>
              Uđi s kodom
            </Button>
            <Button variant="ghost" onClick={() => navigate('/sobe')}>
              Javne sobe
            </Button>
          </div>
        </ScreenFooter>
      </Screen>

      <RulesSheet open={sheet === 'rules'} onClose={closeSheet} />
      <JoinSheet open={sheet === 'join'} onClose={closeSheet} nickname={profile.nickname.trim()} />
      {session && (
        <LeaveRoomSheet
          open={sheet === 'leave'}
          code={session.lobbyCode}
          onClose={closeSheet}
          onLeft={() => {
            setSession(null)
            closeSheet()
          }}
        />
      )}
    </ThemeRoot>
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
