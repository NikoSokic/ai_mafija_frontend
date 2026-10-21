# Što frontend treba od backenda

Popis stvari koje sučelje već prikazuje ili koristi, a backend (`ai_mafia_backend`) ih još nema.
Brojevi u zagradama upućuju na `docs/design/spec.md`, poglavlje 10. Pravila igre su u `docs/pravila-igre.md`.

## Postavke sobe i javne sobe (10.3)
Nova soba nudi tri postavke koje se ne šalju backendu:

- **Način igre**: `mode: "LIVE" | "ONLINE"`
- **Tko može ući**: `isPublic: boolean` ("Samo s kodom" / "Svi (javna)")
- **Glas naratora**: `voiceEnabled: boolean`

Zasad ih domaćinov preglednik sprema lokalno (`aimafija.room`) i lobby iz toga prikazuje chipove Privatna/Javna, Uživo/Online, Narator s glasom/bez glasa. Ostali igrači vide zadane vrijednosti (privatna, uživo, s glasom), koje ne moraju biti točne. Zato i karta uloge gostima uvijek radi u načinu Uživo.

Treba:
- polja u `Lobby` i `CreateLobbyRequest`, te u odgovoru `GET /api/lobbies/{code}`
- endpoint za javne sobe, npr. `GET /api/lobbies?public=true&status=WAITING` (ekran `/sobe` zasad uvijek prikazuje prazno stanje "Trenutno nema soba")

## Avatar (10.4)
Igrač bira emoji na Početnoj; sprema se samo lokalno (`aimafija.profile`). `Player` nema `avatarEmoji` – dodati u `CreateLobbyRequest` (domaćin), `JoinLobbyRequest` i `LobbyPlayerResponse`.

Zasad u lobbyju igrač vidi svoj odabrani emoji, a tuđi avatar dobiva emoji izračunat iz id-a (`src/lib/playerLook.ts`). Zato isti igrač na različitim uređajima može imati različit emoji.

## "Spreman sam" nakon otkrivanja uloge (6.5, 10.13)
Backend sada prvu noć počinje pauzom od 30 s, pa igrači stignu pogledati kartu. Ali ne zna je li tko stvarno vidio ulogu, pa nema brojača "Spremno 5 od 8".

Treba (ako se želi): `POST /api/lobbies/{code}/ready {playerId, playerToken}`, brojač spremnih u javnom stanju i događaj `PLAYER_READY`.

## Noćni red (6.6, 10.1)
Backend šalje `GAME_STATE_CHANGED` pri svakom prijelazu poteza, ali javno stanje (namjerno) ne kaže tko je na redu. Svaki klijent zato nakon svakog događaja ponovno dohvaća `GET /game-state` da sazna `canAct`. Radi, ali s 8 igrača to je 8 zahtjeva po potezu. Bolje bi bilo slati potez privatno samo igračima te uloge (npr. STOMP user destination), što traži autentikaciju na WebSocketu.

## Igraj ponovno (6.9)
Backend nema "nova igra s istim igračima". Na kraju igre domaćin zato dobiva "Nova soba s istim postavkama": otvori se `/nova` s uloge, brojem igrača i načinom iz `aimafija.room`, a ostali igrači moraju ući novim kodom.

Treba: `POST /api/lobbies/{code}/rematch {playerId, playerToken}` (samo domaćin). Isti igrači se vraćaju u lobby sa statusom `WAITING` (uloge, `alive`, `eliminatedHow` i `eliminatedRound` se brišu), a svi klijenti dobiju događaj `REMATCH` i prijeđu na `/soba/{code}`.

## AI narator (10.9)
U backendu još nema AI integracije. Prijedlog: servis koji iz događaja (`NIGHT_RESOLVED`, `VOTE_RESOLVED`…) generira kratki tekst i šalje ga kao `NARRATION`; TTS ostaje na klijentu.

## Autorizacija i sigurnost (10.8, 10.15)
- `GET /api/lobbies/{code}` i javno stanje su dostupni svakome tko zna kod (samo javni podaci).
- Lozinka baze se čita iz `SPRING_DATASOURCE_PASSWORD`; provjeri da stara lozinka više nije u povijesti repoa ili je promijeni u Supabaseu.

---

# Riješeno u backendu (listopad 2026.)

Prije pokretanja nove verzije backenda pokreni `db/migrations/001_rokovi_suzdrzani_ispadanje.sql` u Supabase SQL editoru.

## Frontend već koristi
- Faze `DAY` (samo rasprava), `VOTING` i `TIE_BREAK`. Timer rasprave i glasanja broji do `phaseEndsAt`, ispravljeno za razliku sata (`serverTime`), pa svi vide isto vrijeme.
- Domaćin na danu: "+30 s" (`discussion/extend`), "Pokreni glasanje" i "Preskoči" (`voting/start`), na glasanju "Završi glasanje" (`POST /api/votes/resolve/{code}`).
- Glasanje: `POST /api/votes` (i "Suzdržan" s `targetPlayerId: null`), glasovi uživo iz javnog `voting`, ishod iz događaja `VOTE_RESOLVED` (i iz odgovora REST-a).
- Izvještaj noći i utišani iz `nightKilledPlayerIds` / `silencedPlayerIds`. Lokalni `aimafija.reports` više ne postoji.
- `players[].host` za krunu i domaćinove gumbe, `eliminatedHow` / `eliminatedRound` za promatrača ("Mafija te uklonila u noći 2"). Lokalni `aimafija.fate` više ne postoji.
- `ApiErrorResponse.code`: `describeError` u `src/api/rest.ts` prevodi po kodu.
- `GET /api/roles` za ekran Nova soba.
- `NIGHT_RESOLVED`, `VOTING_STARTED` i `PLAYER_LEFT` frontend preskače, jer odmah za njima stiže `GAME_STATE_CHANGED` s istim stanjem.

## Frontend još treba prilagoditi
### Mafija noću
- `currentPlayer.teammates` i `teamTargets`: pločice suigrača bi trebale imati oznaku "Tvoj tim" (zasad "Nedostupno", jer ih `targetPlayerIds` za `KILL` više ne sadrži) i značku s metom koju je suigrač odabrao.
- Mafijaši smiju ponovno poslati `KILL`, a ekran nakon potvrde prikazuje "Potez je poslan". Tekst u `src/components/game/nightConfig.ts` ("vrijedi odabir onoga tko prvi potvrdi") više nije točan; kad se uvede promjena mete, vratiti tekst iz prototipa: "Tvoj tim vidi tvoj odabir. Odluka postaje konačna kad svi iz mafije potvrde."
- `teammates` u `POST /api/players/role` za kartu uloge.
- Rok poteza `currentPlayer.actionEndsAt` (npr. odbrojavanje uz "Tvoj red").

### Sastav uloga u lobbyju
`GET /api/lobbies/{code}` vraća `roles`, ali gosti u lobbyju i dalje vide samo "Domaćin je odabrao uloge za N igrača."

### Napuštanje sobe
"Napusti sobu" još samo briše lokalnu sesiju. Treba pozvati `POST /api/lobbies/{code}/leave` i obraditi `PLAYER_LEFT` (u lobbyju maknuti igrača iz popisa, `newHostPlayerId` za novu krunu).
