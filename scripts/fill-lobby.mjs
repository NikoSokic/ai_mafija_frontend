// Popuni sobu testnim igračima preko REST-a, da se igra može pokrenuti s dva preglednika.
//
// Upotreba:  node scripts/fill-lobby.mjs KOD [broj]
//   KOD    kod sobe (6 znakova)
//   broj   koliko igrača dodati; zadano onoliko koliko soba još ima praznih mjesta
//
// Tokeni dodanih igrača spremaju se u scripts/.bots/KOD.json, da ih scripts/bots.mjs može igrati
// (noćni potezi i glasanje).
// URL backenda se čita iz VITE_API_URL (iz .env ili iz okoline).
import { apiUrl, json, loadBots, saveBots } from './api.mjs'

const [code, countArg] = process.argv.slice(2)
if (!code) {
  console.error('Upotreba: node scripts/fill-lobby.mjs KOD [broj]')
  process.exit(1)
}

const base = apiUrl()
const lobbyUrl = `${base}/api/lobbies/${encodeURIComponent(code.toUpperCase())}`

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
  const joined = await json(
    await fetch(`${lobbyUrl}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    }),
  )
  bots.push({ playerId: joined.playerId, playerToken: joined.playerToken, nickname })
  saveBots(lobby.code, bots)
  console.log(`Dodan igrač ${nickname}`)
  added++
}
console.log(`Gotovo: soba ${lobby.code} ima ${lobby.players.length + added} od ${lobby.maxPlayers} igrača.`)
console.log(`Kad igra počne, botove pokreni s: node scripts/bots.mjs ${lobby.code}`)
