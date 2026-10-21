// Kopira tekst u međuspremnik. Clipboard API radi samo na sigurnoj adresi (https ili localhost),
// pa je za otvaranje preko IP-a u lokalnoj mreži rezerva stari execCommand.
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}
