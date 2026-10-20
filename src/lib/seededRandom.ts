// Deterministički generator iz prototipa: isti seed uvijek daje isti niz brojeva (0–1),
// pa se ukrasni prozori ne mijenjaju pri svakom renderu
export function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}
