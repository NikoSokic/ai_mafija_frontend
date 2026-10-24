// Popuni sobu testnim igračima preko REST-a, da se igra može pokrenuti s dva preglednika.
//
// Upotreba:  node scripts/fill-lobby.mjs KOD [broj]
//            node scripts/fill-lobby.mjs --nova [broj]
//   KOD     kod sobe (6 znakova)
//   broj    koliko igrača dodati; zadano onoliko koliko soba još ima praznih mjesta
//   --nova  napravi novu sobu (Online, privatna, bez glasa) kojoj je domaćin bot Test0 i napuni je
//           botovima; broj je tada veličina sobe (zadano 5). Uloge: Mafia, Doktor, Policajac, ostalo Građanin.
//           Tako bots.mjs sam igra i domaćina: pokreće igru, glasanje i "Igraj ponovno".
//
// Tokeni dodanih igrača spremaju se u scripts/.bots/KOD.json, da ih scripts/bots.mjs može igrati
// (noćni potezi i glasanje).
// URL backenda se čita iz VITE_API_URL (iz .env ili iz okoline).
import { apiUrl, json, loadBots, saveBots } from './api.mjs'

const args = process.argv.slice(2)
const create = args.includes('--nova')
const [first, second] = args.filter((a) => a !== '--nova')
if (!create && !first) {
  console.error('Upotreba: node scripts/fill-lobby.mjs KOD [broj]  ili  node scripts/fill-lobby.mjs --nova [broj]')
  process.exit(1)
}

const base = apiUrl()
const post = async (path, body) =>
  json(
    await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )

// Nova soba s botom-domaćinom; domaćin se sprema među botove
async function createLobby(size) {
  const roles = await json(await fetch(`${base}/api/roles`))
  const idOf = (name) => roles.find((r) => r.name === name)?.id
  const special = ['Mafia', 'Doktor', 'Policajac']
  const composition = [
    ...special.map((name) => ({ roleId: idOf(name), count: 1 })),
    { roleId: idOf('Građanin'), count: size - special.length },
  ].filter((r) => r.roleId && r.count > 0)
  const res = await post('/api/lobbies', {
    hostNickname: 'Test0',
    maxPlayers: size,
    roles: composition,
    mode: 'ONLINE',
    isPublic: false,
    voiceEnabled: false,
    hostAvatarEmoji: '🤖',
  })
  saveBots(res.code, [{ playerId: res.hostPlayerId, playerToken: res.playerToken, nickname: 'Test0' }])
  console.log(`Nova soba ${res.code}, domaćin Test0`)
  return res.code
}

const code = create ? await createLobby(Number(second ?? first ?? 5)) : first.toUpperCase()
const countArg = create ? undefined : second
const lobbyUrl = `${base}/api/lobbies/${encodeURIComponent(code)}`

const lobby = await json(await fetch(lobbyUrl))
const free = lobby.maxPlayers - lobby.players.length
const toAdd = countArg ? Math.min(Number(countArg), free) : free
if (!(toAdd > 0)) {
  console.log(`Soba ${lobby.code} je već puna (${lobby.players.length} od ${lobby.maxPlayers}).`)
  process.exit(0)
}

const taken = new Set(lobby.players.map((p) => p.nickname))
const bots = loadBots(lobby.code)
let added = 0
for (let n = 1; added < toAdd; n++) {
  const nickname = `Test${n}`
  if (taken.has(nickname)) continue
  const joined = await post(`/api/lobbies/${encodeURIComponent(lobby.code)}/join`, { nickname })
  bots.push({ playerId: joined.playerId, playerToken: joined.playerToken, nickname })
  saveBots(lobby.code, bots)
  console.log(`Dodan igrač ${nickname}`)
  added++
}
console.log(`Gotovo: soba ${lobby.code} ima ${lobby.players.length + added} od ${lobby.maxPlayers} igrača.`)
console.log(`Kad igra počne, botove pokreni s: node scripts/bots.mjs ${lobby.code}`)
