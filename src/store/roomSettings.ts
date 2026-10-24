// Postavke nove sobe; backend ih čuva i vraća, pa ih lobby i igra čitaju iz backenda
export type Mode = 'live' | 'online'
export type Visibility = 'private' | 'public'

export const DEFAULT_ROOM_SETTINGS: { mode: Mode; visibility: Visibility; voice: boolean } = {
  mode: 'live',
  visibility: 'private',
  voice: true,
}
