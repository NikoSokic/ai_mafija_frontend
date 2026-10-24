// Testni igrači iz fill-lobby.mjs sami igraju preko REST-a: spremnost, noćni potezi i glasanje.
//
// Upotreba:  node scripts/bots.mjs KOD [--svi] [--nesloga] [--nespremni] [--igre N]
//   KOD    kod sobe; botovi se čitaju iz scripts/.bots/KOD.json
//   --nesloga  botovi mafije biraju različite mete (i različite od mete igrača iz preglednika),
//          pa se tim ne složi i nitko ne strada
//   --svi  mafija smije ciljati bilo koga (zadano cilja samo botove izvan tima mafije,
//          da igrač u pregledniku ne strada prerano)
//   --nespremni  botovi ne javljaju "Spreman sam", pa prva noć čeka domaćina ("Počni noć bez čekanja") ili 90 s
//   --igre N  stani nakon N završenih igara (zadano: igraj dalje dok domaćin pokreće nove igre, do Ctrl+C)
//
// Svakih 1,5 s provjeri stanje svakog bota.
// - Uvod prve noći: svaki bot nakon 1–3 s javi "Spreman sam" (POST /ready).
// - Noć: kad je bot na redu, nakon 2 s "razmišljanja" pošalje akciju sa slučajnom metom iz
//   targetPlayerIds. Tim mafije se mora složiti oko mete, pa botovi mafije slijede metu igrača
//   iz preglednika, a bez njega metu suigrača s najmanjim id-om.
// - Glasanje: svaki bot koji smije glasati nakon 1–4 s glasa za slučajnog igrača iz
//   eligibleTargetPlayerIds (nikad "Suzdržan"), pa se glasovi u pregledniku vide kako stižu.
// - Kraj igre: botovi čekaju "Igraj ponovno" (soba se vrati u WAITING) i igraju iduću igru.
// - Ako je domaćin bot (fill-lobby.mjs --nova), on pokreće igru kad je soba puna, glasanje nakon 3 s
//   rasprave i "Igraj ponovno" na kraju igre. Inače raspravu botovi samo čekaju.
import { apiUrl, json, loadBots } from './api.mjs'

const POLL_MS = 1500
const THINK_MS = 2000
const READY_MIN_MS = 1000
const READY_MAX_MS = 3000
const VOTE_MIN_MS = 1000
const VOTE_MAX_MS = 4000
const HOST_WAIT_MS = 3000
const MAFIA_TEAM = new Set(['Mafia', 'Dama'])

const args = process.argv.slice(2)
const code = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--igre')?.toUpperCase()
const anyTarget = args.includes('--svi')
const disagree = args.includes('--nesloga')
const neverReady = args.includes('--nespremni')
const gamesArg = args.includes('--igre') ? Number(args[args.indexOf('--igre') + 1]) : Infinity
if (!code || !(gamesArg > 0)) {
  console.error('Upotreba: node scripts/bots.mjs KOD [--svi] [--nesloga] [--nespremni] [--igre N]')
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
const between = (min, max) => min + Math.random() * (max - min)

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

const auth = (bot) => ({ playerId: bot.playerId, playerToken: bot.playerToken })

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

// Za --nesloga: meta koju nitko iz tima još nije odabrao (ako je ima)
function differentTarget(bot, action, roles, teamTargets) {
  const taken = new Set(teamTargets.map((t) => t.targetPlayerId))
  const free = action.targetPlayerIds.filter((id) => !taken.has(id) && id !== bot.playerId)
  return pick(free.length ? free : chooseTargets(bot, action, roles))
}

// Poziv bez odgovora koji treba ispisati; greška se samo zapiše
async function send(label, path, body) {
  try {
    await post(path, body)
    console.log(`  ${label}`)
  } catch (e) {
    console.error(`  ${label} – greška: ${e.message}`)
  }
}

async function act(bot, role, action, targets, names) {
  const [targetPlayerId, secondTargetPlayerId] = targets
  const label = `${bot.nickname} (${role}): ${action.type} → ${targets.map((id) => names.get(id)).join(' i ')}`
  try {
    const res = await post('/api/actions', {
      ...auth(bot),
      actionType: action.type,
      targetPlayerId,
      secondTargetPlayerId: secondTargetPlayerId ?? null,
    })
    const result = res.investigationResult ?? res.journalistResult
    console.log(`  ${label}${result ? ` = ${result}` : ''}`)
  } catch (e) {
    console.error(`  ${label} – greška: ${e.message}`)
  }
}

async function markReady(bot) {
  try {
    const res = await post(`/api/lobbies/${code}/ready`, auth(bot))
    console.log(`  ${bot.nickname}: spreman (${res.readyCount} od ${res.readyTotal})`)
  } catch (e) {
    console.error(`  ${bot.nickname}: spreman – greška: ${e.message}`)
  }
}

async function vote(bot, targetPlayerId, names) {
  const label = `${bot.nickname}: glas → ${names.get(targetPlayerId)}`
  try {
    const res = await post('/api/votes', { voterPlayerId: bot.playerId, targetPlayerId, playerToken: bot.playerToken })
    const resolved = res.resolveResult ? `  (glasanje je obrađeno: ${res.resolveResult.result})` : ''
    console.log(`  ${label}${resolved}`)
  } catch (e) {
    console.error(`  ${label} – greška: ${e.message}`)
  }
}

// Što domaćin-bot radi: pokreće igru, glasanje i novu igru. Ključ u `started` da se ne pošalje dvaput.
function hostDuties(host, state, lobby, gamesLeft) {
  const once = (key, ms, fn) => {
    if (started.has(key)) return
    started.add(key)
    setTimeout(fn, ms)
  }
  if (state.lobbyStatus === 'WAITING' && lobby && lobby.players.length === lobby.maxPlayers) {
    once(`host:start:${game}`, HOST_WAIT_MS, () => send(`${host.nickname} (domaćin): pokreće igru`, `/api/lobbies/${code}/start`, auth(host)))
  } else if (state.phase === 'DAY') {
    once(`host:vote:${game}:${state.roundNumber}`, HOST_WAIT_MS, () =>
      send(`${host.nickname} (domaćin): pokreće glasanje`, `/api/lobbies/${code}/voting/start`, auth(host)),
    )
  } else if (state.gameFinished && gamesLeft) {
    once(`host:rematch:${game}`, HOST_WAIT_MS, () =>
      send(`${host.nickname} (domaćin): Igraj ponovno`, `/api/lobbies/${code}/rematch`, auth(host)),
    )
  }
}

console.log(`Botovi u sobi ${code}: ${bots.map((b) => b.nickname).join(', ')}. Ctrl+C za kraj.`)

// potez, glas ili poziv domaćina koji je bot već krenuo poslati – da ga sljedeća provjera ne pošalje opet.
// Ključevi nose broj igre, jer nova igra u istoj sobi opet ima rundu 1.
const started = new Set()
let lastPhase = ''
let game = 1
let finished = 0

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
  if (!known.length) {
    await sleep(POLL_MS)
    continue
  }
  const { state } = known[0]
  const phase = state.gameFinished ? 'FINISHED' : state.lobbyStatus === 'WAITING' ? 'WAITING' : `${state.phase} ${state.roundNumber}`

  if (phase !== lastPhase) {
    if (lastPhase === 'FINISHED' && phase === 'WAITING') {
      game++
      console.log(`— Igraj ponovno: soba je opet u čekaonici (igra ${game})`)
    } else if (phase === 'FINISHED') {
      finished++
      console.log(`Igra ${game} je završena: ${state.winner}`)
    } else if (phase === 'WAITING') {
      console.log('— Čekaonica: čeka se da domaćin pokrene igru')
    } else if (state.phase) {
      const note = state.phase === 'DAY' ? ' – rasprava, botovi čekaju glasanje' : ''
      const intro = state.readyPlayerIds ? ' – uvod, igrači gledaju uloge' : ''
      console.log(`— ${phase}${note}${intro}`)
    }
    lastPhase = phase
  }
  if (phase === 'FINISHED' && finished >= gamesArg) break

  const host = known.find(({ bot, state: s }) => s.players.find((p) => p.id === bot.playerId)?.host)?.bot
  if (host) {
    // broj igrača u čekaonici zna samo GET /api/lobbies/{code}
    const lobby =
      state.lobbyStatus === 'WAITING' ? await fetch(`${base}/api/lobbies/${code}`).then(json).catch(() => null) : null
    hostDuties(host, state, lobby, finished < gamesArg)
  }

  const roles = new Map(known.map(({ bot, state: s }) => [bot.playerId, s.currentPlayer.role]))
  for (const { bot, state: s } of known) {
    const me = s.currentPlayer
    const names = new Map(s.players.map((p) => [p.id, p.nickname]))

    if (s.readyPlayerIds && !neverReady && me.alive && !s.readyPlayerIds.includes(bot.playerId)) {
      const key = `${game}:${bot.playerId}:ready`
      if (started.has(key)) continue
      started.add(key)
      setTimeout(() => markReady(bot), between(READY_MIN_MS, READY_MAX_MS))
      continue
    }

    if (s.voting.canVote) {
      const key = `${game}:${bot.playerId}:${s.roundNumber}:${s.phase}`
      const targets = s.voting.eligibleTargetPlayerIds
      if (started.has(key) || !targets.length) continue
      started.add(key)
      setTimeout(() => vote(bot, pick(targets), names), between(VOTE_MIN_MS, VOTE_MAX_MS))
      continue
    }

    const action = me.canAct ? me.availableActions[0] : null
    if (!action) continue
    const key = `${game}:${bot.playerId}:${s.roundNumber}`
    if (action.type === 'KILL') {
      const agreed = teamTarget(me.teamTargets)
      const own = me.teamTargets.find((t) => t.playerId === bot.playerId)?.targetPlayerId ?? null
      if (!me.hasActed && !started.has(key)) {
        // prvi odabir: meta tima ako je netko već odabrao, inače slučajna
        started.add(key)
        const target = disagree ? differentTarget(bot, action, roles, me.teamTargets) : (agreed ?? chooseTargets(bot, action, roles)[0])
        setTimeout(() => act(bot, me.role, action, [target], names), THINK_MS)
      } else if (!disagree && me.hasActed && agreed !== null && agreed !== own && !started.has(`${key}:${agreed}`)) {
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
