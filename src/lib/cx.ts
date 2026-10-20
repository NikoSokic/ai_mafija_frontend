// Spaja CSS klase i preskače prazne uvjete: cx('a', uvjet && 'b')
export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
