const KEY = 'aimafija.profile'

export interface Profile {
  nickname: string
  emoji: string
}

// localStorage može baciti grešku (privatni prozor, blokirani podaci) – tada profil jednostavno nije spremljen
export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    // nema spremanja
  }
}

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<Profile>
    return {
      nickname: typeof data.nickname === 'string' ? data.nickname : '',
      emoji: typeof data.emoji === 'string' ? data.emoji : '',
    }
  } catch {
    return null
  }
}
