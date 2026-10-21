// Zajedničko za testne skripte: URL backenda, JSON odgovor i popis botova po sobi.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

// URL backenda iz VITE_API_URL (iz okoline ili iz .env)
export function apiUrl() {
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

export async function json(res) {
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${text}`)
  return text ? JSON.parse(text) : undefined
}

// Botovi (playerId, playerToken, nickname) se spremaju u scripts/.bots/KOD.json (nije u gitu)
const BOTS_DIR = new URL('./.bots/', import.meta.url)
const botsFile = (code) => new URL(`${code.toUpperCase()}.json`, BOTS_DIR)

export function loadBots(code) {
  const file = botsFile(code)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : []
}

export function saveBots(code, bots) {
  mkdirSync(BOTS_DIR, { recursive: true })
  writeFileSync(botsFile(code), JSON.stringify(bots, null, 2))
}
