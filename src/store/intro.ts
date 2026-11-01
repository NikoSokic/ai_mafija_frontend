const KEY = 'aimafija.introSeen'

// Je li igrač već vidio poziv "Prvi put igraš?" na Početnoj.
// localStorage može baciti grešku (privatni prozor, blokirani podaci) – tada se poziv prikaže ponovno.
export function loadIntroSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function saveIntroSeen() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // nema spremanja
  }
}
