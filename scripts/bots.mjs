// Testni igrači iz fill-lobby.mjs sami igraju noćne poteze i glasaju preko REST-a.
//
// Upotreba:  node scripts/bots.mjs KOD [--svi]
//   KOD    kod sobe; botovi se čitaju iz scripts/.bots/KOD.json
//   --svi  mafija smije ciljati bilo koga (zadano cilja samo botove izvan tima mafije,
//          da igrač u pregledniku ne strada prerano)
//
// Svakih 1,5 s provjeri stanje svakog bota.
// - Noć: kad je bot na redu, nakon 2 s "razmišljanja" pošalje akciju sa slučajnom metom iz
//   targetPlayerIds. Tim mafije se mora složiti oko mete, pa botovi mafije slijede metu igrača
//   iz preglednika, a bez njega metu suigrača s najmanjim id-om.
// - Glasanje: svaki bot koji smije glasati nakon 1–4 s glasa za slučajnog igrača iz
//   eligibleTargetPlayerIds (nikad "Suzdržan"), pa se glasovi u pregledniku vide kako stižu.
//   Raspravu botovi samo čekaju: glasanje počinje kad je domaćin pokrene ili istekne vrijeme.
// Staje kad igra završi ili na Ctrl+C.
import { apiUrl, json, loadBots } from './api.mjs'

const POLL_MS = 1500
const THINK_MS = 2000
const VOTE_MIN_MS = 1000
const VOTE_MAX_MS = 4000
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
const botIds = new Set(bots.map((b) => b.playerId))

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const pick = (list) => list[Math.floor(Math.random() * list.length)]

const gameState = async (bot) =>
  json(
    await fetch(`${base}/api/lobbies/${code}/game-state`, {
      headers: { 'X-Player-Id': String(bot.playerId), 'X-Player-Token': bot.playerToken },
    }),
  )

const post = async (path, body) =>
  json(
    await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

// Meta oko koje se tim mafije slaže: odabir igrača iz preglednika, inače člana s najmanjim id-om.
// null dok nitko iz tima nije odabrao.
function teamTarget(teamTargets) {
  const human = teamTargets.find((t) => !botIds.has(t.playerId))
  const leader = human ?? [...teamTargets].sort((a, b) => a.playerId - b.playerId)[0]
  return leader?.targetPlayerId ?? null
}

async function act(bot, role, action, targets, names) {
  const [targetPlayerId, secondTargetPlayerId] = targets
  const label = `${bot.nickname} (${role}): ${action.type} → ${targets.map((id) => names.get(id)).join(' i ')}`
  try {
    const res = await post('/api/actions', {
      playerId: bot.playerId,
      playerToken: bot.playerToken,
      actionType: action.type,
      targetPlayerId,
      secondTargetPlayerId: secondTargetPlayerId ?? null,
    })
    const result = res.investigationResult ?? res.journalistResult
    console.log(`  ${label}${result ? ` = ${result}` : ''}${res.nightResolved ? '  (noć je obrađena)' : ''}`)
  } catch (e) {
    console.error(`  ${label} – greška: ${e.message}`)
  }
}

async function vote(bot, targetPlayerId, names) {
  const label = `${bot.nickname}: glas → ${names.get(targetPlayerId)}`
  try {
    const res = await post('/api/votes', {
      voterPlayerId: bot.playerId,
      targetPlayerId,
      playerToken: bot.playerToken,
    })
    const resolved = res.resolveResult ? `  (glasanje je obrađeno: ${res.resolveResult.result})` : ''
    console.log(`  ${label}${resolved}`)
  } catch (e) {
    console.error(`  ${label} – greška: ${e.message}`)
  }
}

console.log(`Botovi u sobi ${code}: ${bots.map((b) => b.nickname).join(', ')}. Ctrl+C za kraj.`)

// potez ili glas koji je bot već krenuo poslati – da ga sljedeća provjera ne pošalje opet
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
      const note = state.phase === 'DAY' ? ' – rasprava, botovi čekaju glasanje' : ''
      console.log(`— ${state.phase} ${state.roundNumber}${note}`)
    }
  }

  const roles = new Map(known.map(({ bot, state }) => [bot.playerId, state.currentPlayer.role]))
  for (const { bot, state } of known) {
    const me = state.currentPlayer
    const names = new Map(state.players.map((p) => [p.id, p.nickname]))

    if (state.voting.canVote) {
      const key = `${bot.playerId}:${state.roundNumber}:${state.phase}`
      const targets = state.voting.eligibleTargetPlayerIds
      if (started.has(key) || !targets.length) continue
      started.add(key)
      const delay = VOTE_MIN_MS + Math.random() * (VOTE_MAX_MS - VOTE_MIN_MS)
      setTimeout(() => vote(bot, pick(targets), names), delay)
      continue
    }

    const action = me.canAct ? me.availableActions[0] : null
    if (!action) continue
    const key = `${bot.playerId}:${state.roundNumber}`
    if (action.type === 'KILL') {
      const agreed = teamTarget(me.teamTargets)
      const own = me.teamTargets.find((t) => t.playerId === bot.playerId)?.targetPlayerId ?? null
      if (!me.hasActed && !started.has(key)) {
        // prvi odabir: meta tima ako je netko već odabrao, inače slučajna
        started.add(key)
        const target = agreed ?? chooseTargets(bot, action, roles)[0]
        setTimeout(() => act(bot, me.role, action, [target], names), THINK_MS)
      } else if (me.hasActed && agreed !== null && agreed !== own && !started.has(`${key}:${agreed}`)) {
        // mafija smije promijeniti metu dok se tim ne složi
        started.add(`${key}:${agreed}`)
        setTimeout(() => act(bot, me.role, action, [agreed], names), THINK_MS)
      }
      continue
    }
    if (me.hasActed || started.has(key)) continue
    started.add(key)
    const targets = chooseTargets(bot, action, roles)
    setTimeout(() => act(bot, me.role, action, targets, names), THINK_MS)
  }

  await sleep(POLL_MS)
}
