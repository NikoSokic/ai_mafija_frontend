import { useEffect, useRef, useState, type ReactNode } from 'react'
import Avatar from '../components/Avatar.tsx'
import Button from '../components/Button.tsx'
import CardPattern from '../components/CardPattern.tsx'
import Chip from '../components/Chip.tsx'
import HoldButton from '../components/HoldButton.tsx'
import IconButton from '../components/IconButton.tsx'
import { Icon } from '../components/icons.tsx'
import Particles, { type ParticlesHandle } from '../components/Particles.tsx'
import PlayerTile from '../components/PlayerTile.tsx'
import RoleChip from '../components/RoleChip.tsx'
import RoleComposition from '../components/RoleComposition.tsx'
import RoleIcon from '../components/RoleIcon.tsx'
import Segmented from '../components/Segmented.tsx'
import Sheet from '../components/Sheet.tsx'
import Skyline from '../components/Skyline.tsx'
import Stepper from '../components/Stepper.tsx'
import Switch from '../components/Switch.tsx'
import ThemeRoot from '../components/ThemeRoot.tsx'
import Toast, { Spinner } from '../components/Toast.tsx'
import TurnBadge from '../components/TurnBadge.tsx'
import { ROLE_KEYS, ROLES } from '../data/roles.ts'
import { cx } from '../lib/cx.ts'
import type { Theme } from '../lib/theme.ts'
import { useBump } from '../lib/useBump.ts'

// Galerija svih osnovnih komponenti u svim stanjima – samo za razvoj (ruta /dev)

type MockPlayer = { id: number; nick: string; emoji: string; hue: number }

// Testni igrači iz prototipa (PLAYERS + EXTRA)
const PLAYERS: MockPlayer[] = [
  { id: 1, nick: 'Niko', emoji: '😎', hue: 350 },
  { id: 2, nick: 'Ana', emoji: '🦊', hue: 22 },
  { id: 3, nick: 'Marko', emoji: '🐺', hue: 222 },
  { id: 4, nick: 'Lea', emoji: '🐱', hue: 280 },
  { id: 5, nick: 'Ivan', emoji: '🐻', hue: 32 },
  { id: 6, nick: 'Petra', emoji: '🌸', hue: 330 },
  { id: 7, nick: 'Luka', emoji: '🐸', hue: 120 },
  { id: 8, nick: 'Mia', emoji: '🦄', hue: 262 },
  { id: 9, nick: 'Toni', emoji: '🦁', hue: 40 },
  { id: 10, nick: 'Klara', emoji: '🦉', hue: 190 },
  { id: 11, nick: 'Dino', emoji: '🐙', hue: 300 },
  { id: 12, nick: 'Sara', emoji: '🌵', hue: 140 },
  { id: 13, nick: 'Filip', emoji: '🎲', hue: 0 },
  { id: 14, nick: 'Iva', emoji: '👻', hue: 240 },
  { id: 15, nick: 'Ante', emoji: '🍕', hue: 15 },
  { id: 16, nick: 'Maja', emoji: '🐼', hue: 200 },
  { id: 17, nick: 'Bruno', emoji: '🐢', hue: 100 },
  { id: 18, nick: 'Nina', emoji: '🌙', hue: 250 },
  { id: 19, nick: 'Leon', emoji: '🦈', hue: 210 },
  { id: 20, nick: 'Ema', emoji: '🍓', hue: 345 },
]
const LOBBY = PLAYERS.slice(0, 8)
const [NIKO, ANA, MARKO, LEA, IVAN] = PLAYERS

const LOBBY_COUNTS = { Mafia: 2, Dama: 1, Doktor: 1, Policajac: 1, Novinar: 1, Građanin: 2 }
const ROOM_COUNTS = { Mafia: 3, Dama: 1, Doktor: 2, Policajac: 1, Novinar: 1, Građanin: 4 }

export default function DevPage() {
  const [theme, setTheme] = useState<Theme>('night')
  const particles = useRef<ParticlesHandle>(null)

  return (
    <ThemeRoot theme={theme}>
      <Particles ref={particles} />
      <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-[420px] items-center gap-3 px-5 py-3">
          <h1 className="flex-1 text-[17px] font-semibold">Komponente</h1>
          <Segmented
            aria-label="Tema"
            className="w-40"
            options={[
              { value: 'night', label: 'Noć' },
              { value: 'day', label: 'Dan' },
            ]}
            value={theme}
            onChange={setTheme}
          />
        </div>
      </header>

      <main className="mx-auto max-w-[420px] px-5 pb-24">
        <ButtonsDemo />
        <HoldButtonDemo />
        <IconButtonDemo />
        <AvatarDemo />
        <RolesDemo />
        <PlayerTileDemo />
        <ChipDemo />
        <ControlsDemo />
        <SheetDemo />
        <ToastDemo />
        <SkylineDemo />
        <Section title="CardPattern">
          <Caption>Poleđina karte uloge (kao u prototipu, 45 % prozirnosti).</Caption>
          <div className="relative mx-auto aspect-[3/4.2] w-[200px] overflow-hidden rounded-[26px] border border-line bg-surface">
            <CardPattern className="absolute inset-0 size-full opacity-45" />
          </div>
        </Section>
        <Section title="Particles">
          <Caption>Čestice lebde u pozadini cijele stranice. Uz reduced motion su isključene.</Caption>
          <Button variant="secondary" onClick={() => particles.current?.burst()}>
            Konfeti
          </Button>
        </Section>
      </main>
    </ThemeRoot>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-[22px] font-bold tracking-[-.02em]">{title}</h2>
      {children}
    </section>
  )
}

function Caption({ children }: { children: ReactNode }) {
  return <p className="mt-4 mb-2 text-[13px] leading-[1.45] text-muted first:mt-0">{children}</p>
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-2">
      {children}
      <figcaption className="text-xs text-muted">{label}</figcaption>
    </figure>
  )
}

function ButtonsDemo() {
  return (
    <Section title="Button">
      <div className="flex flex-col gap-2.5">
        <Button>Kreiraj sobu</Button>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary">Uđi s kodom</Button>
          <Button variant="ghost">Javne sobe</Button>
        </div>
        <Caption>disabled</Caption>
        <Button disabled>Čeka se još 2</Button>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" disabled>
            Secondary
          </Button>
          <Button variant="ghost" disabled>
            Ghost
          </Button>
        </div>
        <Caption>s ikonom i mala veličina (sm)</Caption>
        <Button variant="secondary">
          <Icon name="copy" size={17} />
          Kopiraj kod
        </Button>
        <div className="flex gap-2.5">
          <Button size="sm">Uđi</Button>
          <Button size="sm" variant="ghost" disabled>
            Puna
          </Button>
        </div>
      </div>
    </Section>
  )
}

function HoldButtonDemo() {
  const [confirmed, setConfirmed] = useState(0)
  return (
    <Section title="HoldButton">
      <div className="flex flex-col gap-2.5">
        <HoldButton onConfirm={() => setConfirmed((n) => n + 1)}>Drži za potvrdu</HoldButton>
        <p className="text-center text-[13px] text-muted tabular-nums">
          Broj potvrda: {confirmed}. Drži 850 ms ili Tab pa Enter/Space.
        </p>
        <Caption>disabled</Caption>
        <HoldButton disabled onConfirm={() => setConfirmed((n) => n + 1)}>
          Spreman sam
        </HoldButton>
      </div>
    </Section>
  )
}

function IconButtonDemo() {
  return (
    <Section title="IconButton">
      <div className="flex flex-wrap gap-2">
        <IconButton icon="back" aria-label="Natrag" />
        <IconButton icon="info" aria-label="Pravila igre" />
        <IconButton icon="eye" aria-label="Pogledaj svoju ulogu" />
        <IconButton icon="refresh" iconSize={20} aria-label="Osvježi popis" />
        <IconButton icon="x" aria-label="Zatvori" />
        <IconButton icon="volume" iconSize={20} aria-label="Isključi glas" className="bg-surface-2" />
        <IconButton icon="replay" iconSize={20} aria-label="Ponovi naraciju" className="bg-surface-2" />
      </div>
    </Section>
  )
}

function AvatarDemo() {
  return (
    <Section title="Avatar">
      <Caption>veličine</Caption>
      <div className="flex flex-wrap items-end gap-4">
        {[16, 24, 32, 48, 64, 132].map((size) => (
          <Labeled key={size} label={`${size}`}>
            <Avatar emoji={NIKO.emoji} hue={NIKO.hue} size={size} />
          </Labeled>
        ))}
      </div>
      <Caption>stanja</Caption>
      <div className="flex flex-wrap items-end gap-5">
        <Labeled label="obično">
          <Avatar emoji={ANA.emoji} hue={ANA.hue} />
        </Labeled>
        <Labeled label="ispao">
          <Avatar emoji={MARKO.emoji} hue={MARKO.hue} dead />
        </Labeled>
        <Labeled label="odabran">
          <Avatar emoji={LEA.emoji} hue={LEA.hue} selected />
        </Labeled>
        <Labeled label="domaćin">
          <Avatar emoji={NIKO.emoji} hue={NIKO.hue} host />
        </Labeled>
        <Labeled label="utišan">
          <Avatar emoji={IVAN.emoji} hue={IVAN.hue} muted />
        </Labeled>
        <Labeled label="oboje">
          <Avatar emoji={NIKO.emoji} hue={NIKO.hue} host muted />
        </Labeled>
        <Labeled label="ispao domaćin">
          <Avatar emoji={NIKO.emoji} hue={NIKO.hue} host dead />
        </Labeled>
      </div>
    </Section>
  )
}

function RolesDemo() {
  return (
    <Section title="Uloge">
      <Caption>RoleIcon 40 i 26</Caption>
      <div className="flex flex-wrap gap-3">
        {ROLE_KEYS.map((k) => (
          <RoleIcon key={k} role={k} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {ROLE_KEYS.map((k) => (
          <RoleIcon key={k} role={k} size={26} />
        ))}
      </div>
      <Caption>RoleIcon 84 (karta uloge)</Caption>
      <div className="flex gap-3">
        <RoleIcon role="Doktor" size={84} iconSize={46} />
        <RoleIcon role="Mafia" size={84} iconSize={46} />
      </div>
      <Caption>RoleChip</Caption>
      <div className="flex flex-wrap gap-2">
        {ROLE_KEYS.map((k) => (
          <RoleChip key={k} role={k} />
        ))}
      </div>
      <Caption>RoleComposition – puni (lobby)</Caption>
      <RoleComposition counts={LOBBY_COUNTS} />
      <Caption>RoleComposition – mini (javne sobe)</Caption>
      <div className="rounded-card border border-line bg-surface p-4">
        <RoleComposition counts={ROOM_COUNTS} variant="mini" />
      </div>
      <Caption>TurnBadge</Caption>
      <div className="flex flex-wrap gap-2">
        {ROLE_KEYS.filter((k) => ROLES[k].action).map((k) => (
          <TurnBadge key={k} role={k} />
        ))}
      </div>
    </Section>
  )
}

// Noćne mete: klik odabire do dvije (kao Novinar); Ana je onemogućena, Niko je "Ti"
function PlayerTileDemo() {
  const [selected, setSelected] = useState<number[]>([LEA.id])
  const tags: Record<number, string> = { [NIKO.id]: 'Ti', [ANA.id]: 'Meta mafije' }
  return (
    <Section title="PlayerTile">
      <div className="grid grid-cols-3 gap-2">
        {LOBBY.slice(0, 6).map((p) => (
          <PlayerTile
            key={p.id}
            name={p.nick}
            emoji={p.emoji}
            hue={p.hue}
            tag={tags[p.id] ?? null}
            selected={selected.includes(p.id)}
            onSelect={() =>
              setSelected((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s.slice(-1), p.id]))
            }
          />
        ))}
      </div>
    </Section>
  )
}

function ChipDemo() {
  return (
    <Section title="Chip">
      <div className="flex flex-wrap gap-1.5">
        <Chip icon="lock">Privatna</Chip>
        <Chip icon="globe">Javna</Chip>
        <Chip icon="users">Uživo</Chip>
        <Chip icon="globe">Online</Chip>
        <Chip icon="volume">Narator s glasom</Chip>
        <Chip icon="mute">Narator bez glasa</Chip>
        <Chip className="tabular-nums">5 od 8</Chip>
      </div>
    </Section>
  )
}

function ControlsDemo() {
  const [filter, setFilter] = useState<'all' | 'live' | 'online'>('all')
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [mafia, setMafia] = useState(2)
  const [town, setTown] = useState(0)
  const [doctor, setDoctor] = useState(3)
  const [maxPlayers, setMaxPlayers] = useState(8)
  const maxBump = useBump(maxPlayers)
  const [voice, setVoice] = useState(true)
  const [publicRoom, setPublicRoom] = useState(false)

  return (
    <>
      <Section title="Segmented">
        <Segmented
          aria-label="Način igre"
          options={[
            { value: 'all', label: 'Sve' },
            { value: 'live', label: 'Uživo' },
            { value: 'online', label: 'Online' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <Segmented
          aria-label="Vidljivost sobe"
          className="mt-3"
          options={[
            { value: 'private', label: 'Samo s kodom' },
            { value: 'public', label: 'Svi (javna)' },
          ]}
          value={visibility}
          onChange={setVisibility}
        />
      </Section>

      <Section title="Stepper">
        <Caption>broj poskoči pri promjeni; minus/plus se onemoguće na granici</Caption>
        <div className="rounded-card border border-line bg-surface px-4 py-1">
          <StepperRow role="Mafia" value={mafia} onChange={setMafia} min={1} note="min 1" />
          <StepperRow role="Građanin" value={town} onChange={setTown} note="na minimumu" />
          <StepperRow role="Doktor" value={doctor} onChange={setDoctor} max={3} note="max 3" />
        </div>
        <Caption>lg – broj igrača (broj je izvan steppera)</Caption>
        <div className="flex items-center justify-between rounded-card border border-line bg-surface py-3 pr-3 pl-[18px]">
          <span
            key={maxBump}
            className={cx(
              'inline-block text-[44px] leading-none font-bold tracking-[-.03em] tabular-nums',
              maxBump > 0 && 'animate-bump',
            )}
          >
            {maxPlayers}
          </span>
          <Stepper
            size="lg"
            showValue={false}
            value={maxPlayers}
            onChange={setMaxPlayers}
            min={4}
            max={20}
            decreaseLabel="Manje igrača"
            increaseLabel="Više igrača"
          />
        </div>
      </Section>

      <Section title="Switch">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
            <div className="flex-1">
              <h4 className="text-base font-semibold">Glas naratora</h4>
              <p className="text-[13px] leading-[1.45] text-muted">
                {voice ? 'Uključeno.' : 'Isključeno.'}
              </p>
            </div>
            <Switch checked={voice} onChange={setVoice} aria-label="Glas naratora" />
          </div>
          <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
            <h4 className="flex-1 text-base font-semibold">Javna soba</h4>
            <Switch checked={publicRoom} onChange={setPublicRoom} aria-label="Javna soba" />
          </div>
        </div>
      </Section>
    </>
  )
}

type StepperRowProps = {
  role: 'Mafia' | 'Građanin' | 'Doktor'
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  note: string
}

function StepperRow({ role, value, onChange, min, max, note }: StepperRowProps) {
  const { name } = ROLES[role]
  return (
    <div className="flex items-center gap-3 border-b border-line py-3 last:border-0">
      <RoleIcon role={role} />
      <div className="min-w-0 flex-1">
        <h4 className="text-base font-semibold">{name}</h4>
        <p className="mt-0.5 text-[13px] text-muted">{note}</p>
      </div>
      <Stepper
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        decreaseLabel={`Manje: ${name}`}
        increaseLabel={`Više: ${name}`}
      />
    </div>
  )
}

function SheetDemo() {
  const [open, setOpen] = useState<'rules' | 'locked' | null>(null)
  const close = () => setOpen(null)

  return (
    <Section title="Sheet">
      <div className="flex flex-col gap-2.5">
        <Button variant="secondary" onClick={() => setOpen('rules')}>
          Otvori sheet
        </Button>
        <Button variant="secondary" onClick={() => setOpen('locked')}>
          Otvori sheet bez zatvaranja
        </Button>
      </div>

      <Sheet
        open={open === 'rules'}
        onClose={close}
        showClose
        title="Pravila"
        subtitle="Tim mafije pobjeđuje kad ih je jednako ili više od ostalih. Građani pobjeđuju kad izbace cijeli tim mafije, uključujući Damu."
      >
        <h3 className="mt-1 mb-2.5 text-base font-semibold">Uloge po redu buđenja</h3>
        {ROLE_KEYS.map((k) => (
          <div key={k} className="flex gap-3 border-b border-line py-3 last:border-0">
            <RoleIcon role={k} />
            <div>
              <h4 className="text-[15px] font-semibold">{ROLES[k].name}</h4>
              <p className="mt-[3px] text-sm leading-[1.45] text-muted">{ROLES[k].long}</p>
            </div>
          </div>
        ))}
      </Sheet>

      <Sheet
        open={open === 'locked'}
        onClose={close}
        dismissable={false}
        title="Narator"
        subtitle="Ovaj sheet se ne zatvara dodirom pozadine ni tipkom Esc, kao naracija."
      >
        <Button onClick={close}>Nastavi</Button>
      </Sheet>
    </Section>
  )
}

function ToastDemo() {
  const [peek, setPeek] = useState(false)
  const [reconnect, setReconnect] = useState<'off' | 'connecting' | 'done'>('off')

  // kao u prototipu: nakon 2,2 s veza je vraćena, toast nestaje 1,4 s poslije
  useEffect(() => {
    if (reconnect !== 'connecting') return
    const t = window.setTimeout(() => setReconnect('done'), 2200)
    return () => clearTimeout(t)
  }, [reconnect])

  const done = reconnect === 'done'

  return (
    <Section title="Toast">
      <div className="flex flex-col gap-2.5">
        <Button variant="secondary" onClick={() => setPeek(true)}>
          Pogled na ulogu
        </Button>
        <Button variant="secondary" onClick={() => setReconnect('connecting')}>
          Ponovno spajanje
        </Button>
      </div>

      <Toast
        open={peek}
        onClose={() => setPeek(false)}
        duration={1800}
        leading={<RoleIcon role="Doktor" size={36} />}
        title={ROLES.Doktor.name}
        text="Tim građana"
      />
      <Toast
        open={reconnect !== 'off'}
        onClose={() => setReconnect('off')}
        duration={done ? 1400 : undefined}
        leading={
          done ? (
            <span className="text-role-doktor">
              <Icon name="check" size={22} strokeWidth={2.2} />
            </span>
          ) : (
            <Spinner />
          )
        }
        title={done ? 'Ponovno si u igri' : 'Veza je prekinuta'}
        text={done ? 'Ništa nisi propustio.' : 'Spajam te ponovno u igru…'}
      />
    </Section>
  )
}

function SkylineDemo() {
  const [joined, setJoined] = useState(3)
  const [out, setOut] = useState<number[]>([])
  const alive = LOBBY.slice(0, joined).filter((p) => !out.includes(p.id))

  function eliminate() {
    const victim = alive[Math.floor(Math.random() * alive.length)]
    setOut([...out, victim.id])
  }

  return (
    <Section title="Skyline">
      <Caption>
        8 mjesta: ulazak pali prozor (empty → on), ispadanje ga gasi (on → off). Pridruženo {joined} od 8,
        ugašeno {out.length}.
      </Caption>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={joined >= LOBBY.length} onClick={() => setJoined(joined + 1)}>
          Igrač ulazi
        </Button>
        <Button size="sm" variant="secondary" disabled={alive.length === 0} onClick={eliminate}>
          Igrač ispada
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setJoined(3)
            setOut([])
          }}
        >
          Vrati
        </Button>
      </div>
      <SkyFrame>
        <Skyline
          players={LOBBY}
          stateOf={(p, i) => (i >= joined ? 'empty' : out.includes(p.id) ? 'off' : 'on')}
        />
      </SkyFrame>

      <Caption>20 igrača – sva tri stanja, drugi red prozora</Caption>
      <SkyFrame>
        <Skyline players={PLAYERS} stateOf={(_, i) => (i >= 16 ? 'empty' : i % 5 === 3 ? 'off' : 'on')} />
      </SkyFrame>
    </Section>
  )
}

// Prazno nebo iznad i podnožje (bg-sky) ispod, kao na ekranu
function SkyFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 overflow-hidden rounded-card border border-line">
      <div className="h-36" />
      {children}
      <div className="flex h-14 items-center justify-center bg-sky text-[13px] text-muted">podnožje</div>
    </div>
  )
}
