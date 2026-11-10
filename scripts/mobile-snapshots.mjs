// Zaštitna mreža za mobilni izgled: snima sve ekrane na mobilnim širinama i uspoređuje ih piksel po piksel.
//
//   node scripts/mobile-snapshots.mjs            snimi baseline (scripts/.snapshots/baseline/)
//   node scripts/mobile-snapshots.mjs --compare  snimi u current/, usporedi s baselineom, razlike u diff/
//
// Sama pokreće Vite dev server (/dev/screens postoji samo u dev načinu). Bez prave mreže: /api/** dobiva
// izmišljene odgovore, sve ostalo izvan dev servera se prekida. Izlazni kod 1 ako se ijedan piksel razlikuje.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pixelmatch from 'pixelmatch'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { createServer } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const outRoot = path.join(here, '.snapshots')
const compare = process.argv.includes('--compare')
const outDir = path.join(outRoot, compare ? 'current' : 'baseline')

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
]
// Fiksni trenutak: Date.now() vraća uvijek isto, pa su odbrojavanja i "prije 4 min" uvijek isti
const FIXED_TIME = new Date('2026-11-10T19:30:00.000Z')
const CONCURRENCY = 4
const SETTLE_MS = 300
const SETTLE_TRIES = 25

// Popis ekrana čita se iz fixtures.ts, da skripta i /dev/screens ne mogu otići svaka na svoju stranu
function devScreens() {
  const src = fs.readFileSync(path.join(root, 'src/pages/devScreens/fixtures.ts'), 'utf8')
  const block = src.match(/export const SCREENS = \[([\s\S]*?)\] as const/)
  if (!block) throw new Error('SCREENS nije pronađen u src/pages/devScreens/fixtures.ts')
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

const TARGETS = [
  { name: 'page-home', url: '/' },
  // /nova bez nadimka vraća na Početnu, pa se za nju sprema samo profil
  { name: 'page-create', url: '/nova', storage: { 'aimafija.profile': JSON.stringify({ nickname: 'Niko', emoji: '😎' }) } },
  { name: 'page-rooms', url: '/sobe' },
  ...devScreens().map((s) => ({ name: s, url: `/dev/screens?screen=${s}` })),
]

// Izmišljeni backend za prave stranice (/, /nova, /sobe); /dev/screens ima svoj u mockTransport.ts
const iso = (ms) => new Date(FIXED_TIME.getTime() - ms).toISOString()
function apiResponse(url) {
  const p = url.pathname
  if (p === '/api/health') return { status: 200, body: { status: 'UP' } }
  if (p === '/api/roles') {
    return {
      status: 200,
      body: ['Mafia', 'Dama', 'Doktor', 'Policajac', 'Novinar', 'Građanin'].map((name, i) => ({ id: i + 1, name, opis: '' })),
    }
  }
  if (p === '/api/lobbies' && url.searchParams.get('public') === 'true') {
    return {
      status: 200,
      body: [
        { code: 'K7M2QZ', hostNickname: 'Ana', hostAvatarEmoji: '🦊', playerCount: 5, maxPlayers: 8, mode: 'LIVE', createdAt: iso(60_000) },
        { code: 'P4X9LT', hostNickname: 'Marko', hostAvatarEmoji: '🐺', playerCount: 3, maxPlayers: 10, mode: 'ONLINE', createdAt: iso(240_000) },
      ],
    }
  }
  return { status: 404, body: { code: 'NOT_FOUND', message: `snimke: nema odgovora za ${p}` } }
}

async function newContext(browser, base, viewport, storage) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
    colorScheme: 'dark',
    locale: 'hr-HR',
    timezoneId: 'Europe/Zagreb',
  })
  const origin = new URL(base).origin
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    // /api/ samo na putanji, ne bilo gdje u adresi: Vite poslužuje i /src/api/rest.ts
    if (url.pathname.startsWith('/api/')) {
      const { status, body } = apiResponse(url)
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    }
    if (url.origin === origin) return route.continue()
    return route.abort()
  })
  if (storage) {
    await context.addInitScript((items) => {
      for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v)
    }, storage)
  }
  return context
}

// Snima dok dva uzastopna snimka nisu identična – tek tada je ekran miran
async function settledShot(page) {
  let previous = null
  for (let i = 0; i < SETTLE_TRIES; i++) {
    const shot = await page.screenshot({ animations: 'disabled', caret: 'hide' })
    if (previous && shot.equals(previous)) return shot
    previous = shot
    await page.waitForTimeout(SETTLE_MS)
  }
  throw new Error('ekran se ne smiruje (svaki snimak je drukčiji)')
}

// Najveći element koji se skrola (ScreenBody, sheet); null kad sve stane na ekran
async function scrollToEnd(page) {
  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll('*')].filter((el) => {
      const oy = getComputedStyle(el).overflowY
      return (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1
    })
    if (!candidates.length) return false
    candidates.sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth)
    candidates[0].scrollTop = candidates[0].scrollHeight
    return true
  })
}

async function shoot(browser, base, target, viewport) {
  const context = await newContext(browser, base, viewport, target.storage)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  try {
    await page.clock.setFixedTime(FIXED_TIME)
    await page.goto(base + target.url, { waitUntil: 'load' })
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
    const file = path.join(outDir, `${target.name}@${viewport.width}`)
    fs.writeFileSync(`${file}.png`, await settledShot(page))
    if (await scrollToEnd(page)) fs.writeFileSync(`${file}-scrolled.png`, await settledShot(page))
    if (errors.length) console.warn(`  ! ${target.name}@${viewport.width}: ${errors.join(' | ')}`)
  } finally {
    await context.close()
  }
}

// Prvo otvaranje u Viteu prevodi module i ponekad ponovno učita stranicu (optimizacija paketa).
// To se dogodi ovdje, a ne usred snimanja.
async function warmUp(browser, base) {
  const context = await newContext(browser, base, VIEWPORTS[0])
  const page = await context.newPage()
  for (const t of TARGETS) {
    await page.goto(base + t.url, { waitUntil: 'load' })
    await page.waitForLoadState('networkidle')
  }
  await context.close()
}

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file))
}

function compareAll() {
  const baseDir = path.join(outRoot, 'baseline')
  const diffDir = path.join(outRoot, 'diff')
  fs.rmSync(diffDir, { recursive: true, force: true })
  fs.mkdirSync(diffDir, { recursive: true })
  if (!fs.existsSync(baseDir)) {
    console.error('Nema baselinea – prvo pokreni bez --compare.')
    return 1
  }
  const names = new Set([...fs.readdirSync(baseDir), ...fs.readdirSync(outDir)].filter((f) => f.endsWith('.png')))
  const results = new Map()
  let failed = 0
  for (const file of [...names].sort()) {
    const a = path.join(baseDir, file)
    const b = path.join(outDir, file)
    let pct
    if (!fs.existsSync(a) || !fs.existsSync(b)) {
      pct = fs.existsSync(a) ? 'nema' : 'novo'
    } else {
      const imgA = readPng(a)
      const imgB = readPng(b)
      if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
        pct = 100
      } else {
        const diff = new PNG({ width: imgA.width, height: imgA.height })
        const count = pixelmatch(imgA.data, imgB.data, diff.data, imgA.width, imgA.height, { threshold: 0 })
        pct = (count / (imgA.width * imgA.height)) * 100
        if (count > 0) fs.writeFileSync(path.join(diffDir, file), PNG.sync.write(diff))
      }
    }
    if (pct !== 0) failed++
    const [, screen, width, scrolled] = file.match(/^(.*)@(\d+)(-scrolled)?\.png$/)
    if (!results.has(screen)) results.set(screen, {})
    results.get(screen)[`${width}${scrolled ? '↓' : ''}`] = pct
  }

  const cols = VIEWPORTS.flatMap((v) => [`${v.width}`, `${v.width}↓`])
  const fmt = (v) => (v === undefined ? '–' : typeof v === 'string' ? v : `${v === 0 ? '0' : v.toFixed(4)} %`)
  const nameW = Math.max(6, ...[...results.keys()].map((n) => n.length))
  const line = (cells) => `| ${cells[0].padEnd(nameW)} | ${cells.slice(1).map((c) => c.padStart(10)).join(' | ')} |`
  console.log()
  console.log(line(['ekran', ...cols]))
  console.log(`|${'-'.repeat(nameW + 2)}|${cols.map(() => '-'.repeat(12)).join('|')}|`)
  for (const [screen, row] of results) console.log(line([screen, ...cols.map((c) => fmt(row[c]))]))
  console.log(`\n(↓ = sadržaj skrolan do dna; – = ekran se ne skrola)`)
  console.log(failed ? `\n✗ Razlika u ${failed} snimaka – vidi scripts/.snapshots/diff/` : '\n✓ Mobilni izgled je piksel-identičan.')
  return failed ? 1 : 0
}

async function main() {
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })

  const server = await createServer({
    root,
    logLevel: 'error',
    clearScreen: false,
    server: { host: '127.0.0.1', port: 5199, strictPort: false, open: false },
  })
  await server.listen()
  const base = server.resolvedUrls.local[0].replace(/\/$/, '')
  // Bez GPU-a i djelomičnog rasteriziranja: inače se zaglađivanje zaobljenih kutova razlikuje
  // od pokretanja do pokretanja za pokoji piksel, iako se na stranici ništa nije promijenilo
  const browser = await chromium.launch({
    args: [
      '--disable-gpu',
      '--disable-gpu-rasterization',
      '--disable-partial-raster',
      '--disable-skia-runtime-opts',
      '--disable-threaded-animation',
      '--disable-lcd-text',
      '--force-color-profile=srgb',
      '--font-render-hinting=none',
    ],
  })
  let code = 0
  try {
    console.log(`Dev server: ${base}`)
    await warmUp(browser, base)
    const jobs = TARGETS.flatMap((t) => VIEWPORTS.map((v) => [t, v]))
    let done = 0
    const worker = async () => {
      while (jobs.length) {
        const [t, v] = jobs.shift()
        await shoot(browser, base, t, v)
        done++
        process.stdout.write(`\r  snimljeno ${done}/${TARGETS.length * VIEWPORTS.length}`)
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    console.log(`\nSnimke: ${path.relative(root, outDir)}`)
    if (compare) code = compareAll()
  } catch (e) {
    console.error('\n', e)
    code = 1
  } finally {
    await browser.close()
    await server.close()
  }
  process.exit(code)
}

await main()
