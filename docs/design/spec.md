# AI Mafija – specifikacija frontenda

Ovaj dokument i `prototip.html` zajedno opisuju web frontend za AI Mafiju. Prototip je izvor istine za **izgled i animacije**, ovaj dokument za **ponašanje, podatke i povezivanje s backendom** (`NikoSokic/ai_mafija_backend`).

- Stavi obje datoteke u frontend repo, npr. u `docs/design/`.
- Prototip otvori u pregledniku. Gumb ☰ gore otvara popis svih ekrana, overlaya i varijanti ("Gledaj kao uloga", Uživo/Online, ishod igre).
- Elementi s isprekidanim rubom i oznakom **prototip** služe samo za demo i ne idu u aplikaciju.
- Na dnu je gotov prompt za Claude Code.

---

## 1. Odluke

| Tema | Odluka |
|---|---|
| Platforma | Web, mobile-first (igra se s mobitela), radi i na desktopu |
| Stack | React + Vite + TypeScript + Tailwind CSS |
| Stil | Moderni minimal, tamno; noć = tamnoplava + crvena, dan = topla tamnosmeđa + jantar |
| Font | Space Grotesk (400/500/600/700) |
| Avatari | Igrač bira emoji uz nadimak, bez računa |
| Ulazak u sobu | Kod sobe (6 znakova) + popis javnih soba |
| Naracija | Tekst + glas (TTS); u načinu *uživo* glas svira samo na domaćinovu uređaju |
| Komunikacija | Uživo (ista prostorija) i online; tekstualni chat kasnije (mjesto je predviđeno) |
| Animacije | Bogate, uz poštivanje `prefers-reduced-motion` |
| Jezik | Hrvatski |
| Uloge | Iz backenda: Mafia, Dama, Doktor, Policajac, Novinar, Građanin |

**Potpisni element:** silueta grada na dnu ekrana. Svaki igrač je jedan prozor: u lobbyju se svjetlo pali kad igrač uđe, a kad igrač ispadne, njegov prozor zatreperi i ugasi se. Sve ostalo je mirno i suzdržano.

---

## 2. Preporučene biblioteke

```bash
npm create vite@latest ai-mafija-web -- --template react-ts
npm i react-router-dom zustand @stomp/stompjs sockjs-client framer-motion @fontsource/space-grotesk
npm i -D tailwindcss @tailwindcss/vite @types/sockjs-client
```

- **SockJS je obavezan**: backend registrira `/ws` s `.withSockJS()`.
- Ikone su ručno nacrtane u prototipu (objekt `ICONS`, viewBox 24, stroke 1.8). Prenesi ih kao React komponente u `src/components/icons.tsx`.

---

## 3. Design tokeni

Teme se mijenjaju atributom `data-theme="night" | "day"` na korijenskom elementu igre. Ekrani prije igre (početna, sobe, nova soba, lobby, uloga) koriste `night`. Kraj igre koristi `night` ako pobijedi mafija, `day` ako pobijede građani.

### Boje

| Token | Noć | Dan | Upotreba |
|---|---|---|---|
| `--bg` | `#0C0E1B` | `#1B1713` | pozadina |
| `--surface` | `#151829` | `#26201A` | kartice, polja |
| `--surface-2` | `#1E2238` | `#30281F` | stepperi, sekundarni gumbi |
| `--line` | `#272C49` | `#40362B` | rubovi, ugašeni prozori |
| `--text` | `#EEF0FA` | `#F8F2E9` | glavni tekst |
| `--muted` | `#8C92B4` | `#B5A792` | sporedni tekst |
| `--accent` | `#FF4D5E` | `#FFB547` | primarni gumb, odabir, akcent faze |
| `--accent-ink` | `#22050A` | `#2B1B00` | tekst na akcentu |
| `--accent-soft` | `rgba(255,77,94,.13)` | `rgba(255,181,71,.13)` | pozadina odabranog |
| `--glow` | `rgba(255,77,94,.45)` | `rgba(255,181,71,.45)` | sjena primarnog gumba |
| `--sky` | `#171B33` | `#29221A` | zgrade i podnožje ispod grada |
| `--sky-top` | `#1A1D38` | `#2E261E` | blagi sjaj neba gore desno |
| `--window` | `#FFD27A` | `#FFE3A6` | upaljeni prozori |

**Boje uloga** (iste u obje teme):

| Uloga | Prikaz | Tim | Boja | Ikona |
|---|---|---|---|---|
| `Mafia` | Mafija | mafija | `#FF4D5E` | šešir (fedora) |
| `Dama` | Dama | mafija | `#FF7AB6` | maska |
| `Doktor` | Doktor | građani | `#4FD1A5` | križ u kvadratu |
| `Policajac` | Policajac | građani | `#6FA8FF` | povećalo |
| `Novinar` | Novinar | građani | `#C49BFF` | novine |
| `Građanin` | Građanin | građani | `#E6D3B3` | kuća |

Ključevi su točno nazivi uloga iz baze (`role.name`), jer backend uspoređuje po imenu.

### Tipografija (Space Grotesk)

| Upotreba | Veličina / težina | Razmak slova |
|---|---|---|
| Wordmark "Mafija" | 64 / 700 | -0.045em |
| Naslov pobjede, prijelaz faze | 54–64 / 700 | -0.045em |
| Ime uloge na karti | 38 / 700 | -0.035em |
| Naslov stanja (Grad spava, izbacivanje) | 30 / 700 | -0.03em |
| Pitanje akcije ("Koga štitiš noćas?") | 26 / 700 | -0.025em |
| Naslov sheeta | 24 / 700 | -0.025em |
| Naslov faze u zaglavlju (Noć 2) | 22 / 700 | -0.02em |
| Tekst naracije | 20 / 500 | -0.01em |
| Gumbi, naslov zaglavlja | 17 / 600 | – |
| Tijelo | 16 / 400–500 | – |
| Sporedni tekst | 14–15 / 400 | – |
| Meta, oznake | 12–13 / 500–600 | – |

Brojači (glasovi, broj igrača, timer) koriste `font-variant-numeric: tabular-nums`. Bez VELIKIH SLOVA u oznakama.

### Oblik i razmaci

| Token | Vrijednost |
|---|---|
| Radijus sheeta | 28 |
| Radijus kartice | 22 |
| Radijus pločice igrača | 18 |
| Radijus kontrola (gumb, polje) | 16 |
| Mali radijus | 12 |
| Visina primarnog gumba / polja | 56 |
| Ikona-gumb | 44 × 44 |
| Bočni razmak ekrana | 20 |
| Zaglavlje | 60 visine |

### Pokret

| Token | Vrijednost |
|---|---|
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` |

### Tailwind (v4, `src/theme.css`)

```css
@import "tailwindcss";
@import "@fontsource/space-grotesk/400.css";
@import "@fontsource/space-grotesk/500.css";
@import "@fontsource/space-grotesk/600.css";
@import "@fontsource/space-grotesk/700.css";

/* "inline" jer vrijednosti pokazuju na varijable koje se mijenjaju s temom */
@theme inline {
  --font-sans: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-line: var(--line);
  --color-text: var(--text);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-accent-ink: var(--accent-ink);
  --color-accent-soft: var(--accent-soft);
  --color-sky: var(--sky);
  --color-window: var(--window);
  --color-role-mafia: #FF4D5E;
  --color-role-dama: #FF7AB6;
  --color-role-doktor: #4FD1A5;
  --color-role-policajac: #6FA8FF;
  --color-role-novinar: #C49BFF;
  --color-role-gradanin: #E6D3B3;
  --radius-sheet: 28px;
  --radius-card: 22px;
  --radius-tile: 18px;
  --radius-ctrl: 16px;
  --ease-out-soft: cubic-bezier(.2,.8,.2,1);
  --ease-spring: cubic-bezier(.34,1.56,.64,1);
}

[data-theme="night"] { --bg:#0C0E1B; --surface:#151829; /* … ostatak iz tablice */ }
[data-theme="day"]   { --bg:#1B1713; --surface:#26201A; /* … */ }
```

---

## 4. Komponente

| Komponenta | Ponašanje i stanja |
|---|---|
| `Button` | `primary` / `secondary` / `ghost`. Pritisak: `scale(.97)`. Ripple iz točke dodira. `disabled` = 38 % prozirnosti, bez sjene. |
| `HoldButton` | Potvrda držanjem 850 ms (sloj se puni slijeva). Pušta li se ranije, vraća se na 0. Na kraju: vibracija 30 ms + kratki "pop". Tipkovnica: Enter/Space potvrđuje odmah. Koristi se za sve konačne odluke: Spreman sam, noćna akcija, glas. |
| `IconButton` | 44 × 44, radijus 14, `aria-label` obavezan. |
| `Avatar` | Emoji u krugu, pozadina `hsl(hue 38% 21%)` (hue iz id-a igrača). Veličine 16–132. Stanja: `dead` (sivo, 50 %), `selected` (dvostruki prsten u akcentu), značka `host` (kruna, gore desno), značka `muted` (prekrižen zvučnik, dolje desno). |
| `RoleIcon` / `RoleChip` | Ikona uloge na 15 % boje uloge; chip = ikona + ime. |
| `RoleComposition` | Puni prikaz (ikona u pločici + broj) u lobbyju; mini (ikona + broj) u javnim sobama. |
| `Skyline` | Vidi poglavlje 5. |
| `PlayerTile` | Meta noćne akcije, mreža 3 stupca. Odabrano: rub i pozadina u akcentu + kutovi "nišana" koji se zatvore (spring 0,5 s). Onemogućeno: 42 % + oznaka gore ("Tvoj tim", "Meta mafije"). Opcionalna značka dolje: koga je suigrač odabrao. |
| `VoteCard` | Mreža 2 stupca: broj glasova (gore desno, akcent kad je vodeći), avatar, ime, niz avatara onih koji su glasali (svaki novi "padne" spring animacijom), traka udjela. |
| `CodeTiles` | 6 pločica 46 × 62 s kodom sobe; ulaze jedna po jedna (65 ms razmak). |
| `CodeInput` | 6 polja; samo A–Z i 0–9, automatski velika slova, prelazak na sljedeće polje, Backspace na prethodno, lijepljenje cijelog koda, Enter = potvrda. Greška: crveni rubovi + trešnja (0,45 s) + poruka ispod. |
| `Stepper`, `Segmented`, `Switch`, `OptionCard` | Kao u prototipu; broj u stepperu kratko "poskoči" kad se promijeni. |
| `Sheet` | Donji sheet, radijus 28, ručka, zamagljena pozadina; zatvara se dodirom pozadine ili Esc (osim naracije). |
| `Toast` | Gore, ulazi spring animacijom. Koristi se za ponovno spajanje i brzi pogled na ulogu. |
| `PhaseHeader` | Ikona faze (mjesec/sunce) + "Noć 2" / "Dan 2" + gumb oka za brzi pogled na vlastitu ulogu. |
| `TurnBadge` | "Tvoj red: Doktor" u boji uloge. |
| `TimerRing` | Prsten 64 px, odbrojavanje rasprave; domaćin ima +30 s i Preskoči. |
| `NarratorSheet` | Vidi poglavlje 7. |
| `PhaseTransition` | Vidi poglavlje 8. |
| `EliminationOverlay` | Avatar se zatrese, pukne (3 linije se iscrtaju), posivi i spusti; zatim naslov, podnaslov i "Dalje". |
| `Particles` | Canvas iza sadržaja: ~38 sitnih čestica koje lebde prema gore i trepere (noć: crvenkasto, dan: toplo). Na kraju igre prasak konfeta u bojama pobjedničke teme. Isključeno uz reduced motion. |

---

## 5. Silueta grada (`Skyline`)

- SVG `viewBox="0 0 390 140"`, `preserveAspectRatio="xMidYMax slice"`, visina 128 px.
- Nalazi se **između sadržaja i podnožja**: podnožje s gumbima ima pozadinu `--sky`, iste boje kao zgrade, pa grad "stoji" na podnožju. Sadržaj iznad se skrola iza grada (sadržaj ima `padding-bottom: 140px`).
- 11 zgrada (`[x, širina, visina]`):
  `[0,40,62] [38,30,96] [66,46,78] [110,26,118] [134,50,88] [182,34,108] [214,44,72] [256,30,124] [284,48,86] [330,30,104] [358,32,70]`
- Prozor igrača `i` (redoslijed ulaska): zgrada `(i*4 + 1) % 11`, red `floor(i / 11)`, prozor 9 × 12 na sredini zgrade, `y = 140 - visina + 14 + red*22`. Tako stane do 20 igrača.
- Ukrasni prozori: mali (3 × 5), ~13 % upaljeno, determinističkim seedom da se ne mijenjaju pri renderu.
- Stanja prozora igrača: `on` (boja `--window` + blagi glow), `off` (boja `--line`), `empty` (isprekidani obrub, lobby prije ulaska).
- Animacije: paljenje = treperenje 1,1 s (`steps`), gašenje = treperenje pa gašenje 1,4 s.
- Gdje se prikazuje: Početna (ukrasno), Lobby (pridruženi = upaljeno), Noć, Dan, Glasanje, Kraj (živi = upaljeno).

---

## 6. Ekrani

Rute:

| Ruta | Ekran |
|---|---|
| `/` | Početna |
| `/sobe` | Javne sobe |
| `/nova` | Nova soba |
| `/soba/:code` | Lobby |
| `/igra/:code` | Igra – jedan kontejner koji prema fazi prikazuje Otkrivanje uloge, Noć, Dan, Glasanje ili Kraj |

Sesija se sprema u `localStorage` kao `aimafija.session = { playerId, playerToken, lobbyCode }`, profil kao `aimafija.profile = { nickname, emoji }`.

### 6.1 Početna
- Wordmark "AI / Mafija", kratki opis, crveni mjesec u pozadini, grad na dnu.
- Avatar (64 px) s olovkom → otvara mrežu 16 emojija (8 × 2). Polje "Tvoj nadimak" (max 16 znakova).
- Gumbi: **Kreiraj sobu** (primarni), **Uđi s kodom** (otvara sheet), **Javne sobe**. Ikona ⓘ otvara Pravila.

### 6.2 Javne sobe
- Segmented filter: Sve / Uživo / Online. Ikona osvježavanja se zavrti.
- Kartica sobe: avatar i nadimak domaćina, chipovi (način, "5 od 8"), gumb **Uđi** (puna soba: **Puna**, onemogućeno). Ispod: točke zauzetih mjesta + mini sastav uloga.
- Prazno stanje: "Trenutno nema online soba" + gumb Kreiraj sobu.
- Backend: `GET /api/lobbies?public=true` → `[{code, hostNickname, hostAvatarEmoji, playerCount, maxPlayers, mode, createdAt}]` (samo čekaonice, najnovije prve). Popis se osvježava svakih 5 s dok je ekran otvoren. Lista ne vraća uloge, pa mini sastav uloga nije prikazan.

### 6.3 Nova soba
- Broj igrača: veliki broj + stepper (4–20).
- Uloge: red po ulozi (ikona, ime, oznaka "tim mafije", kratki opis, stepper). Mafija min 1, ostale min 0.
- Traka omjera timova (mafija vs građani) + savjet "četvrtina do trećina igrača u timu mafije".
- Način igre: dvije kartice **Uživo** / **Online**. Tko može ući: **Samo s kodom** / **Svi (javna)**. Prekidač **Glas naratora** (opis ovisi o načinu).
- Podnožje (fiksno): stanje zbroja — "Sve uloge su raspoređene" / "Fali još 2 uloge" + **Popuni građanima** / "Previše uloga: makni 1". **Kreiraj sobu** aktivno samo kad je zbroj = broj igrača.
- Backend:
  - `GET /api/roles` → `[{id, name, opis}]` (mapiraj po `name`)
  - `POST /api/lobbies` `{hostNickname, maxPlayers, roles:[{roleId, count}]}` – šalji samo uloge s `count > 0`
  - odgovor `{lobbyId, code, status, maxPlayers, hostPlayerId, hostNickname, playerToken}` → spremi sesiju, idi na `/soba/:code`

### 6.4 Lobby
- Kod sobe kao 6 pločica, **Kopiraj kod** (ikona se pretvori u kvačicu, "Kopirano") i **Pozovi** (Web Share API s linkom `/soba/:code`).
- Chipovi: Privatna/Javna, Uživo/Online, Narator s glasom / bez glasa.
- Igrači: mreža 2 stupca, "6 od 8". Domaćin ima krunu, ti oznaku "ti". Prazna mjesta: isprekidani rub, točka koja diše, "Čeka se igrač". Novi igrač ulazi spring animacijom i istovremeno pali svoj prozor u gradu. Ispod: "Svaki igrač pali jedno svjetlo u gradu."
- Uloge u igri: puni sastav, vide ga svi igrači (iz `roles` u odgovoru sobe).
- Podnožje: domaćin – **Pokreni igru** (prije punog: onemogućeno, "Čeka se još 2"); ostali – "Igru pokreće domaćin kad se svi pridruže."
- Backend:
  - `GET /api/lobbies/{code}` → `{id, code, status, maxPlayers, phase, roundNumber, players:[{id, nickname, alive, host, avatarEmoji, …}], roles:[{roleId, roleName, count}], hostPlayerId, mode, isPublic, voiceEnabled}`
  - STOMP `SUBSCRIBE /topic/lobby/{code}` → `{type, message, lobbyCode, data}`; `PLAYER_JOINED` (data = igrač) → dodaj; `PLAYER_LEFT {playerId, nickname, newHostPlayerId}` → makni igrača; `HOST_CHANGED {hostPlayerId}` → pomakni krunu (novi domaćin vidi Toast "Sad si ti domaćin."); `GAME_STARTED` → `/igra/:code`
  - `POST /api/lobbies/{code}/start` (backend traži punu sobu)
  - napuštanje: `POST /api/lobbies/{code}/leave {playerId, playerToken}`; usred igre 409 `GAME_IN_PROGRESS` pa klijent izlazi samo lokalno
  - ulazak kodom: `POST /api/lobbies/{code}/join {nickname, avatarEmoji}` → `{playerId, nickname, alive, lobbyId, lobbyCode, playerToken}`
  - poruke grešaka backenda prevedi u UI: "Lobby ne postoji." → "Soba K7M2QZ ne postoji. Provjeri kod s domaćinom."; nadimak zauzet → "Netko u sobi već koristi taj nadimak."; puna → "Soba je puna."; započela → "Igra u toj sobi je već počela."

### 6.5 Otkrivanje uloge
- Karta 3:4.2 s 3D okretanjem (0,75 s spring). Poleđina: uzorak grada, pečat s okom, natpis "Drži za prikaz".
- **Uživo:** uloga se vidi samo dok je prst na karti (da susjedi ne vide). **Online:** dodir okreće/skriva.
- Lice karte: ikona uloge (84), ime u boji uloge, "Tim mafije"/"Tim građana", dulji opis. Za tim mafije: chipovi suigrača s njihovom ulogom.
- Pri okretanju preko lica prijeđe odsjaj.
- **Spreman sam** (HoldButton) → "Spremno 5 od 8" + točke. Kad su svi spremni: naracija "Početak igre" → prijelaz u Noć 1.
- Backend: `POST /api/players/role {playerId, playerToken}` → `{playerId, nickname, roleName}`. Suigrači i "spremni" ne postoje (10.4, 10.8).

### 6.6 Noć
Zaglavlje: mjesec + "Noć N" + oko (toast s vlastitom ulogom). Stanje ekrana ovisi o tome jesi li živ, je li tvoj red i jesi li već odigrao:

| Stanje | Kada | Prikaz |
|---|---|---|
| Akcija | `phase=NIGHT`, `currentTurnRole` odgovara tvojoj ulozi, živ si, nisi odigrao | TurnBadge, pitanje, objašnjenje, mreža meta, redak "Meta: Marko", HoldButton "Drži za potvrdu" |
| Rezultat | nakon INVESTIGATE / COMPARE | kartica rezultata (ulazi s nagibom), gumb "Gotovo, spavam" |
| Poslano | nakon ostalih akcija | kvačica koja se iscrta, "Potez je poslan", "Zatvori oči…" |
| Spavanje | nije tvoj red, ili nemaš akciju (Građanin) | polumjesec koji lebdi, "Grad spava", uživo: "Zatvori oči i spusti mobitel ekranom prema dolje." |
| Promatrač | mrtav si | duh, "Promatraš igru", kako si ispao |

Akcije po ulozi (`POST /api/actions {playerId, playerToken, actionType, targetPlayerId, secondTargetPlayerId?}`):

| Uloga | `actionType` | Pitanje | Pravila u UI-ju |
|---|---|---|---|
| Mafia | `KILL` | Koga mafija uklanja večeras? | suigrači onemogućeni ("Tvoj tim"); prikaži odabir živog suigrača kao značku na meti |
| Dama (mafija živa) | `SILENCE` | Koga utišavaš za sutra? | objašnjenje "Utišani igrač tijekom dana ne smije govoriti ni glasati."; mafija onemogućena; meta mafije onemogućena ("Meta mafije") – backend to odbija |
| Dama (mafija mrtva) | `KILL` | Mafije više nema. Koga uklanjaš? | – |
| Doktor | `SAVE` | Koga štitiš noćas? | može i sebe ("Ti") |
| Policajac | `INVESTIGATE` | Koga istražuješ? | rezultat: `investigationResult` = `MAFIA` / `NOT_MAFIA` → "Niko je mafija" (crveno) / "Lea nije mafija" (plavo) |
| Novinar | `COMPARE` | Koja dva igrača uspoređuješ? | točno 2 različita; rezultat `journalistResult` = `ISTI_TIM` / `RAZLICIT_TIM` → "Isti tim" (=) / "Različiti timovi" (≠) |

Redoslijed buđenja (backend): MAFIA → DAMA → Doktor → Policajac → Novinar. Kad zadnja uloga odigra, backend sam obradi noć i u `ActionResponse` vrati `nightResolved: true` + `resolveResult {message, phase, roundNumber, killedPlayerIds, silencedPlayerIds}`. Mrtvi i već odigrani igrači ne mogu ciljati / ponovno igrati – UI ih ne nudi.

### 6.7 Dan
- Prijelaz noć → dan, zatim naracija "Jutarnje vijesti".
- Banner ako si utišan: "Utišan si. Danas ne smiješ govoriti ni glasati." (ikona pulsira). Banner za promatrača.
- Kartica "Što se dogodilo noćas": ubijeni (sivi avatar, lubanja), utišani (značka), ili "Nitko nije stradao" (štit u boji doktora).
- Rasprava: TimerRing (zadano 2:30); domaćin ima +30 s i Preskoči.
- "U igri 5 od 8": popis živih (kruna, oznaka utišan), ispod "Ispali: …".
- Online način: mjesto za chat ("Chat stiže uskoro") – ne implementirati sada.
- Podnožje: domaćin **Pokreni glasanje**; ostali "Glasanje počinje kad domaćin odluči ili istekne vrijeme."

### 6.8 Glasanje
- Naslov "Glasanje" (ili "Ponovno glasanje") + chip "Dan N". "Glasalo 3 od 5" + točke.
- Mreža `VoteCard`: tvoja kartica je "Ti" i ne može se odabrati. Odabir → "Tvoj glas: Lea" → HoldButton "Drži za glasanje". Nakon glasa: "Tvoj glas je zabilježen. Čekamo ostale."
- Utišani igrač ne glasa (backend: `GameStateService.isSilencedDuringCurrentVoting`). Dama u Pravilima i na karti uloge: "Utišava igrača: idući dan ne govori i ne glasa."
- Izjednačenje (`TIE_BREAK`): banner "Izjednačeno – glasaj ponovno samo između njih"; prikazuju se samo izjednačeni; izjednačeni ne glasaju ("Ti si u izjednačenju pa ovaj put ne glasaš.").
- Rezultat:
  - `ELIMINATED` → EliminationOverlay ("Lea je izbačena", "Uloga ostaje tajna do kraja igre.") + gašenje prozora → naracija → Noć N+1
  - `TIE` → naracija "Izjednačeno" → ponovno glasanje
  - `NO_ELIMINATION` → naracija "Opet izjednačeno. Danas nitko ne odlazi." → Noć N+1
  - `MAFIA_WIN` / `CITIZENS_WIN` → Kraj
- Backend: `POST /api/votes {voterPlayerId, targetPlayerId, playerToken}` → `{voteId, …, votingResolved, resolveResult {result, message, roundNumber, eliminatedPlayerId, tiedPlayerIds}}`. Kad svi potrebni glasaju, backend sam obradi glasanje.
- Prototip prikazuje glasove uživo (tko je za koga). Za to treba WS događaj (10.1). Dok ga nema, prikaži samo "Glasalo X od Y" i otkrij brojke tek s rezultatom.

### 6.9 Kraj igre
- Tema pobjednika (mafija = noć/crveno, građani = dan/jantar), prasak konfeta, naslov se slaže slovo po slovo.
- "Kraj igre nakon N dana", naslov "Mafija pobjeđuje" / "Građani pobjeđuju", jedna rečenica.
- Popis po timovima: avatar (mrtvi sivi), ime, sudbina ("Preživio", "Ubijen u noći 2", "Izbačen u danu 1"), chip uloge. Pobjednički tim ima chip "pobjeda".
- **Igraj ponovno** (isti igrači, natrag u lobby) i **Na početnu**.
- Backend: pobjednik dolazi u `resolveResult`; uloge svih igrača **nema** (10.5).

### 6.10 Overlayi
- **Uđi s kodom** – Sheet s `CodeInput`, gumb **Uđi u sobu**.
- **Pravila** – cilj, tijek runde (numerirani koraci), uloge po redu buđenja.
- **Ponovno spajanje** – toast "Veza je prekinuta. Spajam te ponovno u igru…" → "Ponovno si u igri." Koristi `POST /api/players/reconnect {playerId, playerToken}` → `{valid, playerId, nickname, alive, host, lobbyCode, lobbyStatus, roleName, phase, roundNumber, currentTurnRole}` i prema tome otvori pravi ekran. Isto se radi pri svakom učitavanju aplikacije ako postoji spremljena sesija.

---

## 7. Narator (`NarratorSheet`)

- Donji sheet preko ekrana (ne zatvara se dodirom pozadine).
- Zaglavlje: kugla u boji akcenta (dok govori, iz nje izlaze dva prstena), "Narator", podnaslov konteksta (npr. "Jutarnje vijesti"), valni oblik od 5 traka koji se miče dok traje tekst.
- Tekst se ispisuje 28 ms po znaku s trepćućim kursorom.
- Gumbi: Ponovi, Glas uključi/isključi, **Nastavi** (tekst ovisi o kontekstu: "Počni noć").
- Glas: Web Speech API, `lang = "hr-HR"`, hrvatski glas ako postoji. **Uživo:** govori samo domaćinov uređaj, ostali vide tekst i napomenu "Glas se čuje s domaćinova mobitela." **Online:** govori svaki uređaj.
- Kad se pojavljuje: početak igre, početak svake noći, jutro (izvještaj), izjednačenje, nakon izbacivanja, kraj.
- Primjeri tekstova su u prototipu (`resolveNight`, `resolveVote`, `nightIntro`). Kasnije ih generira AI na backendu (10.9).

---

## 8. Animacije

| Animacija | Okidač | Trajanje / krivulja | Napomena za framer-motion |
|---|---|---|---|
| Ulaz ekrana | prvi prikaz ekrana | 0,6 s ease-out, elementi s razmakom 70 ms | `staggerChildren: .07`, y 14 → 0. **Samo pri ulasku**, ne pri svakom re-renderu |
| Prijelaz faze | noć ↔ dan | ukupno ~2,6 s: nebo se širi iz dna (0,95 s), sunce/mjesec izlazi (1,3 s), slova "Dan 2" (55 ms razmak), ekran se mijenja ispod u 1,1 s, nestaje u 2,1 s | full-screen overlay iznad svega |
| Okretanje karte uloge | držanje / dodir | 0,75 s spring + odsjaj 1,1 s | `rotateY 0 → 180`, `backface-visibility: hidden` |
| Nišan na meti | odabir mete | 0,5 s spring, kutovi se skupljaju sa 135 % | – |
| HoldButton | držanje | 850 ms linearno + pop 0,4 s | `useAnimationFrame` |
| Ulazak igrača | `PLAYER_JOINED` | 0,6 s spring + paljenje prozora 1,1 s | `layout` na mreži |
| Glas stiže | novi glas | 0,55 s spring "pad" avatara, traka 0,5 s | – |
| Izbacivanje | `ELIMINATED` | trešnja 0–0,3 s, pukotine 0,55–1,2 s, sivo + spuštanje do 2 s, tekst 1,25–1,55 s | – |
| Gašenje prozora | smrt igrača | 1,4 s treperenje | – |
| Kod sobe | ulaz u lobby | pločice 0,55 s spring, razmak 65 ms | `rotateX 70 → 0` |
| Rezultat istrage | rezultat | 0,7 s spring s nagibom | – |
| Naracija | otvaranje | sheet 0,5 s, tekst 28 ms/znak, valni oblik 0,9 s petlja | – |
| Pobjeda | ekran kraja | slova 45 ms razmak, 110 konfeta s gravitacijom | canvas |
| Čestice | uvijek | ~38 čestica, sporo prema gore, treperenje | canvas, pauziraj kad tab nije vidljiv |
| Mikro | gumbi, stepperi | pritisak 0,14 s, ripple 0,55 s, broj poskoči 0,3 s | – |

Uz `prefers-reduced-motion: reduce`: bez čestica, konfeta, prijelaza faze i typewritera (tekst odmah), sve ostalo bez trajanja.

---

## 9. Tekst i ton

- Hrvatski, rečenična velika slova, bez uskličnika. Gumbi kažu što se dogodi ("Kreiraj sobu", "Pokreni glasanje", "Drži za potvrdu").
- Ista radnja ima isto ime kroz cijeli tok (Kreiraj sobu → "Soba je kreirana").
- Greške kažu što nije u redu i kako popraviti ("Soba K7M2QZ ne postoji. Provjeri kod s domaćinom.").
- **Rod:** backend ne zna rod igrača, a hrvatski ga traži ("Ubijen/Ubijena", "se nije probudio/la"). Prototip koristi rod iz testnih podataka. Za aplikaciju odaberi jedno: dodaj opcionalni izbor roda uz nadimak, ili koristi neutralne formulacije u UI-ju ("Žrtva noći 2", "Ispao glasanjem" → "Izbacivanje u danu 2"), a AI naracija neka sama pazi na rod.

---

## 10. Što backend još treba za ovaj dizajn

Pronađeno čitanjem `ai_mafija_backend` (stanje commita od 29. 6. 2026.). Poredano po važnosti.

1. **WebSocket događaji.** Trenutno se šalju samo `PLAYER_JOINED` i `GAME_STARTED`. Za igru u stvarnom vremenu trebaju (u istom formatu `{type, message, lobbyCode, data}`):
   - `NIGHT_TURN_CHANGED {roundNumber, currentTurnRole}`
   - `NIGHT_RESOLVED {roundNumber, killedPlayerIds, silencedPlayerIds, phase}`
   - `VOTE_CAST {votedCount, requiredCount}` (ili s `voterId/targetId` za otvoreno glasanje)
   - `VOTE_RESOLVED {result, eliminatedPlayerId, tiedPlayerIds}`
   - `GAME_FINISHED {winner, players:[{id, nickname, roleName, alive}]}`
   - `NARRATION {kind, text}`
   - privatni kanal za tim mafije (npr. `/topic/lobby/{code}/mafia` ili user destination) za odabir suigrača.
2. **Bug – noć zapne kad je sva Mafija mrtva, a Dama živa.** Nakon glasanja `currentTurnRole` se postavlja na `"MAFIA"`. `isPlayersRoleCurrentTurn` za `MAFIA` prihvaća samo ulogu `Mafia`, pa Dama ne može odigrati, a nitko drugi nije na redu. Prijelaz na sljedeću ulogu događa se samo unutar `submitAction`, pa se noć ne pomakne. Prijedlog: pri postavljanju noći preskoči uloge bez živih igrača (`getNextAvailableNightRole` od početka) i za `MAFIA` potez prihvati Damu kad nema žive Mafije.
3. ~~**Postavke sobe i javne sobe.**~~ Riješeno: `mode`, `isPublic`, `voiceEnabled` u sobi i `GET /api/lobbies?public=true`.
4. ~~**Avatar.**~~ Riješeno: `avatarEmoji` (`hostAvatarEmoji` pri kreiranju) u zahtjevima i `LobbyPlayerResponse`.
5. **Kraj igre.** Nema endpointa koji vraća uloge svih igrača nakon kraja (`GET /api/lobbies/{code}/summary`).
6. **Suigrači mafije.** `PlayerRoleResponse` bi za tim mafije trebao vratiti i suigrače s ulogama.
7. ~~**Uloge.**~~ Riješeno: javni `GET /api/roles`.
8. **Autorizacija.** `start`, `resolve-night` i `votes/resolve` ne traže token: bilo tko tko zna kod može pokrenuti ili obraditi igru. Dodati `playerToken` i provjeru domaćina.
9. **AI narator.** U backendu još nema AI integracije. Prijedlog: servis koji iz događaja (`NIGHT_RESOLVED`, `VOTE_RESOLVED`…) generira kratki tekst i šalje ga kao `NARRATION`; TTS ostaje na klijentu.
10. **Više mafijaša.** Kad mafija ima više članova, backend uzme prvi `KILL`. Prijedlog: zadnji odabir ili dogovor (svi moraju odabrati istu metu).
11. **Dama i meta mafije.** Backend odbija da Dama utiša metu mafije, ali Dama ne zna tko je meta. Pošalji metu mafije Dami (privatno) da UI može onemogućiti pločicu.
12. **Curenje informacija.** `currentTurnRole` je vidljiv svima pa se zna koje uloge postoje i žive. Klijent svima osim aktivne uloge treba prikazivati samo "Grad spava"; idealno backend šalje potez samo igračima te uloge.
13. **Opcionalno:** potvrda "spreman" nakon otkrivanja uloge, timer rasprave na serveru, događaj `VOTING_STARTED` (domaćin pokreće glasanje svima).
14. **Model:** `LobbyRole` koristi `@OneToOne` prema `Lobby` i `Role`; trebalo bi `@ManyToOne` (soba ima više uloga, uloga je u više soba).
15. **Sigurnost:** lozinka baze je u `application.properties` u javnom repou. Promijeniti lozinku u Supabaseu i čitati je iz varijable okoline (`${DB_PASSWORD}`).

---

## 11. Predložena struktura frontenda

```
src/
  api/          rest.ts (fetch + prijevod grešaka), stomp.ts (SockJS + STOMP klijent)
  store/        session.ts (playerId, token, code), game.ts (faza, igrači, glasovi, naracija)
  data/         roles.ts (ROLES iz prototipa), emojis.ts
  theme/        theme.css (tokeni, teme)
  components/   Button, HoldButton, Avatar, RoleIcon, Skyline, PlayerTile, VoteCard,
                CodeTiles, CodeInput, Sheet, Toast, TimerRing, Particles, icons.tsx
  overlays/     NarratorSheet, PhaseTransition, EliminationOverlay, JoinSheet, RulesSheet
  screens/      Home, PublicRooms, CreateRoom, Lobby,
                game/GameScreen (bira po fazi), RoleReveal, Night, Day, Vote, End
```

`GameScreen` je jedini koji zna za fazu: iz `store/game.ts` (puni ga REST pri ulasku i WS poslije) odlučuje koji podekran prikazati i kada pokrenuti `PhaseTransition` i naraciju.

---

## 12. Prompt za Claude Code

Kopiraj u Claude Code u korijenu frontend repoa (s ovim datotekama u `docs/design/`):

```text
Gradimo web frontend za AI Mafiju (multiplayer Mafija s AI naratorom).
Izvor istine za izgled i animacije je docs/design/prototip.html (otvori ga i prouči kod:
svaka funkcija Screen*/OVERLAYS.* odgovara jednoj komponenti). Ponašanje, podaci i API su
u docs/design/spec.md. Backend je Spring Boot (repo NikoSokic/ai_mafija_backend),
REST na /api, STOMP preko SockJS na /ws, događaji na /topic/lobby/{code}.

Stack: React + Vite + TypeScript + Tailwind v4, react-router, zustand, framer-motion,
@stomp/stompjs + sockjs-client, @fontsource/space-grotesk.

Radi u fazama i nakon svake mi pokaži rezultat:
1. Postavi projekt, tokene i teme (spec 3), ikone iz prototipa, osnovne komponente (spec 4)
   i Skyline (spec 5).
2. Napravi svih 9 ekrana i overlaye s mock podacima tako da izgledaju i animiraju se kao
   u prototipu (mobile-first, 390 px širine, reduced motion poštovan).
3. Spoji REST endpointe koji postoje (spec 6) i spremanje sesije + reconnect.
4. Spoji STOMP za lobby (PLAYER_JOINED, GAME_STARTED). Za događaje koji ne postoje
   (spec 10.1) napravi klijent tako da ih podržava, a dok ih nema osvježavaj stanje
   preko GET /api/lobbies/{code} i POST /api/players/reconnect.

Ne mijenjaj backend bez pitanja; ako nešto fali, zapiši to u docs/backend-todo.md.
Elementi označeni kao "prototip" (isprekidani rub) ne idu u aplikaciju.
Svi tekstovi su na hrvatskom, kao u prototipu.
```
