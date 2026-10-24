# Što frontend treba od backenda

Popis stvari koje sučelje već prikazuje ili koristi, a backend (`ai_mafia_backend`) ih još nema.
Brojevi u zagradama upućuju na `docs/design/spec.md`, poglavlje 10. Pravila igre su u `docs/pravila-igre.md`.

## "Spreman sam" nakon otkrivanja uloge (6.5, 10.13)
Backend sada prvu noć počinje pauzom od 30 s, pa igrači stignu pogledati kartu. Ali ne zna je li tko stvarno vidio ulogu, pa nema brojača "Spremno 5 od 8".

Treba (ako se želi): `POST /api/lobbies/{code}/ready {playerId, playerToken}`, brojač spremnih u javnom stanju i događaj `PLAYER_READY`.

## Noćni red (6.6, 10.1)
Backend šalje `GAME_STATE_CHANGED` pri svakom prijelazu poteza, a javno stanje sada ima i `currentTurnRole` (za naratora). Svaki klijent ipak nakon svakog događaja ponovno dohvaća `GET /game-state` da sazna `canAct`; s `currentTurnRole` bi to mogli raditi samo igrači te uloge, ali to je zasebna izmjena. Radi, ali s 8 igrača to je 8 zahtjeva po potezu. Bolje bi bilo slati potez privatno samo igračima te uloge (npr. STOMP user destination), što traži autentikaciju na WebSocketu.

## Sastav uloga u popisu javnih soba (6.2)
`GET /api/lobbies?public=true` (`PublicLobbyResponse`) ne vraća uloge, pa kartica javne sobe nema mini sastav uloga iz prototipa.

Treba (ako se želi): `roles` (`roleName`, `count`, kao `LobbyRoleResponse`) u `PublicLobbyResponse`.

## Igraj ponovno (6.9)
Backend nema "nova igra s istim igračima". Na kraju igre domaćin zato dobiva "Nova soba s istim postavkama": otvori se `/nova` s uloge, brojem igrača i načinom iz `aimafija.room`, a ostali igrači moraju ući novim kodom.

Treba: `POST /api/lobbies/{code}/rematch {playerId, playerToken}` (samo domaćin). Isti igrači se vraćaju u lobby sa statusom `WAITING` (uloge, `alive`, `eliminatedHow` i `eliminatedRound` se brišu), a svi klijenti dobiju događaj `REMATCH` i prijeđu na `/soba/{code}`.

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
- `currentTurnRole` u javnom stanju (null u uvodu noći i danju): narator budi ulogu na redu, a iz sastava (`GET /api/lobbies/{code}` → `roles`) zna koju je prije uspavao.
- Potez traje uvijek `TURN_NARRATION` (6 s) + `NIGHT_TURN` (20 s) i ne završava ranije kad svi odigraju; glumljeni potez mrtve uloge traje jednako. `ActionResponse.nightResolved` zato iz `POST /api/actions` više nikad nije `true`.
- `NIGHT_RESOLVED` i `VOTING_STARTED` frontend preskače, jer odmah za njima stiže `GAME_STATE_CHANGED` s istim stanjem.
- Tim mafije: suigrači na karti uloge (`currentPlayer.teammates`), pločice "Tvoj tim", značka s avatarom suigrača na meti (`teamTargets`, uživo), promjena mete do kraja poteza i odbrojavanje do `actionEndsAt` uz "Tvoj red".
- Postavke sobe (`mode`, `isPublic`, `voiceEnabled`), `avatarEmoji`, `hostPlayerId` i sastav uloga iz `GET /api/lobbies/{code}`; javne sobe iz `GET /api/lobbies?public=true` (osvježavanje svakih 5 s); `POST /api/lobbies/{code}/leave` s događajima `PLAYER_LEFT` i `HOST_CHANGED`. Lokalni `aimafija.room` služi samo kao predložak za "Nova soba s istim postavkama".

## Novo u backendu (listopad 2026., druga runda)
Prije pokretanja nove verzije backenda pokreni i `db/migrations/003_rezultat_noci.sql` u Supabase SQL editoru.

- **Rezultat noći:** `lastNight {roundNumber, killedPlayerIds, silencedPlayerIds}` u `GET /game-state` i u javnom stanju (`GAME_STATE_CHANGED`) tijekom `DAY`, `VOTING` i `TIE_BREAK` te runde; noću i na kraju igre je `null`. Isti podaci stižu u događaju `NIGHT_RESOLVED`. Stara polja `nightKilledPlayerIds` / `silencedPlayerIds` ostaju.
- **Dama utišava bilo kojeg živog igrača:** i sebe, i Mafiju, i metu mafije (`availableActions[].targetPlayerIds` za `SILENCE` sadrži sve žive). Pločica "Meta mafije" za Damu više ne postoji. `KILL` i dalje ne nudi tim mafije (`INVALID_TARGET`).
- **Kako je igrač ispao:** `currentPlayer.eliminatedHow` (`NIGHT` / `VOTE` / `LEFT`) i `currentPlayer.eliminatedRound`, uz iste podatke u `players[]`.
- **Uloge:** `players[].roleName` je `null` do faze `FINISHED`, u svakom odgovoru i događaju (pokriveno testom). `teammates` (`playerId`, `nickname`, `roleName`, `alive`) imaju samo Mafia i Dama, ostali dobiju `[]`, i u `POST /api/players/role` i u `currentPlayer`.
- **Događaj `VOTE_CAST {votedCount, eligibleCount}`** nakon svakog glasa, bez podatka tko je za koga glasao (to je u `voting.votes` javnog stanja). Ishod glasanja je i dalje `VOTE_RESOLVED {result, eliminatedPlayerId, tiedPlayerIds, roundNumber, …}`; poseban `VOTING_RESOLVED` ne postoji.
