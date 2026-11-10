# Desktop raspored

Aplikacija je napravljena za mobitel (390 px). Od širine **1024 px** naviše (Tailwindov `lg:`) isti ekrani
dobivaju desktop raspored: širi okvir (do 1280 px), sadržaj u karticama i u stupcima, grad preko cijele
širine prozora, a u igri bočnu ploču s igračima. Ispod 1024 px aplikacija je piksel-identična kao prije.

## Pravila (iz CLAUDE.md, poglavlje "Desktop")

- Mobitel (< 1024 px) se ne mijenja: desktop se radi samo klasama `lg:`/`xl:` i hookom `useIsDesktop`
  (`src/lib/useIsDesktop.ts`).
- I JSX mijenja mobitel: novi omotač, premještanje ili drugi redoslijed elemenata vide se i bez novih klasa.
  Zato se ekran slaže kao `isDesktop ? <desktop raspored/> : <isti mobilni redoslijed/>`, s dijelovima
  izvučenima u varijable.
- Komponenta koja postoji samo na desktopu renderira se s `{isDesktop && …}`, a ne skriva s `hidden lg:block`:
  skrivena komponenta i dalje radi (timeri, dohvaćanje, glas, vibracija). Nijedna se ne renderira dvaput.
- Stanje (odabir, poslani glas) živi u samom ekranu, ne u dijelu koji se mijenja s `isDesktop`, pa promjena
  širine prozora usred igre ne gubi odabir i ne šalje ništa dvaput.
- Ništa ne radi samo na hover: iPad na 1024 px je dodirni.
- Tekst najviše oko 65 znakova u retku (`max-w-prose` ili slično).
- Tajni podaci (uloga, suigrači, odabiri) po istom pravilu kao na mobitelu: uživo samo dok igrač drži gumb,
  online normalno.
- Stil: igra, ne admin ploča. Grad je u sredini i preko cijele širine, sadržaj u karticama iznad njega,
  bočna ploča diskretna.

## Gdje je što

| Dio | Datoteka | Što radi na desktopu |
|---|---|---|
| Okvir ekrana | `src/components/Screen.tsx` | širi okvir, veći razmaci, podnožje s `bg-sky` je "tlo" preko cijele širine |
| Sheet | `src/components/Sheet.tsx` | centrirani modal umjesto donje ladice; `wide` za naratora (560 px) |
| Raspored igre | `src/components/game/GameLayout.tsx` | `GameBody`: sadržaj + bočna ploča (samo uz `useIsDesktop`) |
| Bočna ploča | `src/components/game/GameSidebar.tsx` | igrači i stanje; "Prikaži tajno" uživo samo dok se drži |
| Podnožje igre | `GAME_FOOTER` u `gameSidebarContext.ts` | gumb centriran ispod kartice, ne ispod cijelog ekrana |
| Dan | `DayView.tsx` | izvještaj noći gore, velik timer, gumbi domaćina ispod njega |
| Glasanje | `VoteView.tsx`, `VoteCard.tsx` | mreža 3 (xl: 4) stupca, traka vremena, "Suzdržan" ispod mreže |
| Kraj igre | `EndView.tsx` | timovi u dva stupca, gumbi dolje desno, bez bočne ploče |

## Snimke mobilnog izgleda

Skripta `scripts/mobile-snapshots.mjs` snima sve ekrane na 390×844 i 360×640 (i skrolane do dna)
i uspoređuje ih piksel po piksel. Sama pokreće Vite i ne treba backend.

```bash
npm run snap           # baseline – samo PRIJE promjene, nikad da bi se "popravila" razlika
npm run snap:compare   # nakon promjene: mora biti 0 % svugdje; razlike su u scripts/.snapshots/diff/
```

Snimke su u `scripts/.snapshots/` (nisu u gitu).

## /dev/screens

Pravi ekrani s izmišljenim podacima, samo u dev načinu (`npm run dev`, pa
`http://localhost:5173/dev/screens`). Popis je u `src/pages/devScreens/fixtures.ts` (`SCREENS`), a lažni
backend u `mockTransport.ts`. Isti popis koristi i skripta za snimke.

Novi ekran: dodaj ime u `SCREENS` i slučaj u `scenarioOf()`, pa `npm run snap` **prije** promjene izgleda.

Desktop se provjerava ručno: otvori isti ekran u pregledniku širine 1024, 1440 i 1920 px.
