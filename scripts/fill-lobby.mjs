// Popuni sobu testnim igračima preko REST-a, da se igra može pokrenuti s dva preglednika.
//
// Upotreba:  node scripts/fill-lobby.mjs KOD [broj]
//   KOD    kod sobe (6 znakova)
//   broj   koliko igrača dodati; zadano onoliko koliko soba još ima praznih mjesta
//
// URL backenda se čita iz VITE_API_URL (iz .env ili iz okoline).
import { existsSync, readFileSync } from 'node:fs'

function apiUrl() {
  let url = process.env.VITE_API_URL
  if (!url && existsSync('.env')) {
    const line = readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .find((l) => l.startsWith('VITE_API_URL='))
    url = line?.slice('VITE_API_URL='.length).trim()
  }
  if (!url) {
    console.error('VITE_API_URL nije postavljen – kopiraj .env.example u .env')
    process.exit(1)
  }
  return url.replace(/\/+$/, '')
}

const [code, countArg] = process.argv.slice(2)
if (!code) {
  console.error('Upotreba: node scripts/fill-lobby.mjs KOD [broj]')
  process.exit(1)
}

const base = apiUrl()
const lobbyUrl = `${base}/api/lobbies/${encodeURIComponent(code.toUpperCase())}`

async function json(res) {
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${text}`)
  return text ? JSON.parse(text) : undefined
}

const lobby = await json(await fetch(lobbyUrl))
const free = lobby.maxPlayers - lobby.players.length
const toAdd = countArg ? Math.min(Number(countArg), free) : free
if (!(toAdd > 0)) {
  console.log(`Soba ${lobby.code} je već puna (${lobby.players.length} od ${lobby.maxPlayers}).`)
  process.exit(0)
}

const taken = new Set(lobby.players.map((p) => p.nickname))
let added = 0
for (let n = 1; added < toAdd; n++) {
  const nickname = `Test${n}`
  if (taken.has(nickname)) continue
  await json(
    await fetch(`${lobbyUrl}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    }),
  )
  console.log(`Dodan igrač ${nickname}`)
  added++
}
console.log(`Gotovo: soba ${lobby.code} ima ${lobby.players.length + added} od ${lobby.maxPlayers} igrača.`)
