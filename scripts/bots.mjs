// Testni igrači iz fill-lobby.mjs sami igraju noćne poteze preko REST-a.
//
// Upotreba:  node scripts/bots.mjs KOD [--svi]
//   KOD    kod sobe; botovi se čitaju iz scripts/.bots/KOD.json
//   --svi  mafija smije ciljati bilo koga (zadano cilja samo botove izvan tima mafije,
//          da igrač u pregledniku ne strada prerano)
//
// Svakih 1,5 s provjeri stanje svakog bota. Kad je bot na redu, nakon 2 s "razmišljanja"
// pošalje akciju sa slučajnom metom iz targetPlayerIds. Glasanje (dan) botovi još ne znaju.
// Staje kad igra završi ili na Ctrl+C.
import { apiUrl, json, loadBots } from './api.mjs'

const POLL_MS = 1500
const THINK_MS = 2000
const MAFIA_TEAM = new Set(['Mafia', 'Dama'])

const args = process.argv.slice(2)
const code = args.find((a) => !a.startsWith('--'))?.toUpperCase()
const anyTarget = args.includes('--svi')
if (!code) {
  console.error('Upotreba: node scripts/bots.mjs KOD [--svi]')
  process.exit(1)
}

const base = apiUrl()
const bots = loadBots(code)
if (!bots.length) {
  console.error(`Nema botova za sobu ${code} – prvo pokreni: node scripts/fill-lobby.mjs ${code}`)
  process.exit(1)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const pick = (list) => list[Math.floor(Math.random() * list.length)]

const gameState = async (bot) =>
  json(
    await fetch(`${base}/api/lobbies/${code}/game-state`, {
      headers: { 'X-Player-Id': String(bot.playerId), 'X-Player-Token': bot.playerToken },
    }),
  )

// Slučajna meta (ili dvije za COMPARE). Sebe bot bira samo kao Doktor.
// `roles` su uloge botova (id → uloga), da mafija ne cilja svoje.
function chooseTargets(bot, action, roles) {
  let candidates = action.targetPlayerIds.filter((id) => action.type === 'SAVE' || id !== bot.playerId)
  if (action.type === 'KILL' && !anyTarget) {
    const others = candidates.filter((id) => roles.has(id) && !MAFIA_TEAM.has(roles.get(id)))
    if (others.length) candidates = others
  }
  const first = pick(candidates)
  if (!action.requiresSecondTarget) return [first]
  return [first, pick(candidates.filter((id) => id !== first))]
}

async function act(bot, role, action, targets, names) {
  const [targetPlayerId, secondTargetPlayerId] = targets
  const label = `${bot.nickname} (${role}): ${action.type} → ${targets.map((id) => names.get(id)).join(' i ')}`
  try {
    const res = await json(
      await fetch(`${base}/api/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: bot.playerId,
          playerToken: bot.playerToken,
          actionType: action.type,
          targetPlayerId,
          secondTargetPlayerId: secondTargetPlayerId ?? null,
        }),
      }),
    )
    const result = res.investigationResult ?? res.journalistResult
    console.log(`  ${label}${result ? ` = ${result}` : ''}${res.nightResolved ? '  (noć je obrađena)' : ''}`)
  } catch (e) {
    console.error(`  ${label} – greška: ${e.message}`)
  }
}

console.log(`Botovi u sobi ${code}: ${bots.map((b) => b.nickname).join(', ')}. Ctrl+C za kraj.`)

// potez koji je bot već krenuo igrati, "id:runda" – da ga sljedeća provjera ne pošalje opet
const started = new Set()
let lastPhase = ''

for (;;) {
  const states = await Promise.all(
    bots.map((bot) =>
      gameState(bot)
        .then((state) => ({ bot, state }))
        .catch((e) => {
          console.error(`${bot.nickname}: ${e.message}`)
          return { bot, state: null }
        }),
    ),
  )
  const known = states.filter((s) => s.state)
  if (known.length) {
    const { state } = known[0]
    const phase = `${state.phase} ${state.roundNumber}`
    if (state.gameFinished) {
      console.log(`Igra je završena: ${state.winner}`)
      break
    }
    if (state.phase && phase !== lastPhase) {
      lastPhase = phase
      const day = state.phase === 'NIGHT' ? '' : ' – botovi ne glasaju, glasaj u pregledniku'
      console.log(`— ${state.phase} ${state.roundNumber}${day}`)
    }
  }

  const roles = new Map(known.map(({ bot, state }) => [bot.playerId, state.currentPlayer.role]))
  for (const { bot, state } of known) {
    const me = state.currentPlayer
    const action = me.canAct && !me.hasActed ? me.availableActions[0] : null
    const key = `${bot.playerId}:${state.roundNumber}`
    if (!action || started.has(key)) continue
    started.add(key)
    const names = new Map(state.players.map((p) => [p.id, p.nickname]))
    const targets = chooseTargets(bot, action, roles)
    setTimeout(() => act(bot, me.role, action, targets, names), THINK_MS)
  }

  await sleep(POLL_MS)
}
