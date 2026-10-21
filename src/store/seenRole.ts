const key = (code: string) => `aimafija.seenRole.${code}`

// Je li igrač u ovom pregledniku već vidio svoju ulogu i potvrdio "Spreman sam".
// Backend nema "spreman" (docs/backend-todo.md), pa se pamti samo lokalno.
export function hasSeenRole(code: string): boolean {
  try {
    return localStorage.getItem(key(code)) === '1'
  } catch {
    return false
  }
}

export function markRoleSeen(code: string) {
  try {
    localStorage.setItem(key(code), '1')
  } catch {
    // nema spremanja
  }
}
