# Što frontend treba od backenda

Popis stvari koje sučelje već prikazuje ili koristi, a backend (`ai_mafija_backend`) ih još nema.
Brojevi u zagradama upućuju na `docs/design/spec.md`, poglavlje 10.

## Postavke sobe i javne sobe (10.3)
Nova soba nudi tri postavke koje se ne šalju backendu:

- **Način igre**: `mode: "LIVE" | "ONLINE"`
- **Tko može ući**: `isPublic: boolean` ("Samo s kodom" / "Svi (javna)")
- **Glas naratora**: `voiceEnabled: boolean`

Zasad ih domaćinov preglednik sprema lokalno (`aimafija.room`) i lobby iz toga prikazuje chipove Privatna/Javna, Uživo/Online, Narator s glasom/bez glasa. Ostali igrači vide zadane vrijednosti (privatna, uživo, s glasom), koje ne moraju biti točne.

Treba:
- polja u `Lobby` i `CreateLobbyRequest`, te u odgovoru `GET /api/lobbies/{code}`
- endpoint za javne sobe, npr. `GET /api/lobbies?public=true&status=WAITING` (ekran `/sobe` zasad uvijek prikazuje prazno stanje "Trenutno nema soba")

## Avatar (10.4)
Igrač bira emoji na Početnoj; sprema se samo lokalno (`aimafija.profile`). `Player` nema `avatarEmoji` – dodati u `CreateLobbyRequest` (domaćin), `JoinLobbyRequest` i `LobbyPlayerResponse`.

Zasad u lobbyju igrač vidi svoj odabrani emoji, a tuđi avatar dobiva emoji izračunat iz id-a (`src/lib/playerLook.ts`). Zato isti igrač na različitim uređajima može imati različit emoji.

## Uloge (10.7)
Nova soba uloge čita s `GET /api/test/roles`. Treba javni `GET /api/roles` (isti oblik: `[{id, name, opis}]`).

## Sastav uloga u sobi
`GET /api/lobbies/{code}` (`LobbyDetailsResponse`) ne vraća koje su uloge odabrane. Lobby ih prikazuje samo domaćinu (iz `aimafija.room`), a ostali vide "Domaćin je odabrao uloge za N igrača."

Treba: `roles: [{roleId, roleName, count}]` u `LobbyDetailsResponse`.

## Tko je domaćin
`LobbyPlayerResponse` nema oznaku domaćina, a `LobbyDetailsResponse` nema `hostPlayerId`. Igrač za sebe to saznaje iz `POST /api/players/reconnect` (`host`). Za krunu kod drugih frontend pretpostavlja da je domaćin igrač s najmanjim `id`, jer se domaćin u bazu sprema prvi.

Treba: `host: boolean` u `LobbyPlayerResponse` ili `hostPlayerId` u `LobbyDetailsResponse`.

## Kodovi grešaka
`ApiErrorResponse` ima samo slobodan tekst (`message`). Frontend poruke prevodi za igrače usporedbom točnog teksta (`"Lobby je popunjen."`, `"Igrač s tim nicknameom već postoji u lobbyju."`…, vidi `describeError` u `src/api/rest.ts`). Svaka promjena teksta na backendu pokvari prijevod.

Treba: stabilno polje `code`, npr. `LOBBY_NOT_FOUND`, `LOBBY_FULL`, `NICKNAME_TAKEN`, `GAME_ALREADY_STARTED`, `LOBBY_NOT_FULL`.

## Napuštanje sobe
Nema endpointa za izlazak iz sobe. "Napusti sobu" (strelica u lobbyju i kartica "Nastavi igru" na Početnoj) nakon potvrde briše samo lokalnu sesiju (`aimafija.session`). Na backendu igrač ostaje u sobi: drugi ga i dalje vide u popisu, zauzima mjesto (soba se može "napuniti" igračima kojih nema), a njegov nadimak ostaje zauzet pa se s istim nadimkom ne može vratiti. Isto vrijedi i za domaćina, pa soba ostaje bez nekoga tko je može pokrenuti.

Treba: npr. `POST /api/lobbies/{code}/leave {playerId, playerToken}` i WebSocket događaj `PLAYER_LEFT` (lobby bi tada maknuo igrača iz popisa i ugasio njegov prozor). Za domaćina treba odlučiti: predati ulogu domaćina sljedećem igraču ili zatvoriti sobu.

## Duljina nadimka
`CreateLobbyRequest.hostNickname` ima `@Size(max = 30)`, a `JoinLobbyRequest.nickname` nema ograničenje. Frontend ograničava nadimak na 16 znakova. Treba isto pravilo na oba mjesta.

## Suigrači mafije na karti uloge (6.5, 10.6)
`PlayerRoleResponse` (`POST /api/players/role`) i `currentPlayer` u `game-state` vraćaju samo ime uloge. Karta uloge za tim mafije zato ne prikazuje suigrače, a oni su bitni jer se Mafija i Dama moraju prepoznati.

Treba: `teammates: [{playerId, nickname, roleName}]` u odgovoru za igrače tima mafije (prazno za građane).

## "Spreman sam" nakon otkrivanja uloge (6.5, 10.13)
Backend ne zna je li igrač vidio ulogu: igra odmah ide u fazu `NIGHT`. Gumb "Spreman sam" zato samo lokalno pamti da je igrač vidio ulogu (`aimafija.seenRole.{code}`) i otvara noćni ekran. Nema brojača "Spremno 5 od 8", a noć može početi dok neki igrač još gleda svoju kartu.

Treba (ako se želi): `POST /api/lobbies/{code}/ready {playerId, playerToken}`, brojač spremnih u `game-state` / javnom stanju i događaj `PLAYER_READY`. Faza `NIGHT` (ili naracija "Početak igre") bi tada počela tek kad su svi spremni.

## Način igre za ostale igrače
Karta uloge ovisi o načinu: Uživo (uloga se vidi dok držiš prst) ili Online (dodir okreće). Gost način ne zna (vidi "Postavke sobe i javne sobe"), pa dobiva zadano Uživo. Isto je kad domaćin otvori sobu u drugom pregledniku.

## Noćni red (6.6, 10.1)
`GAME_STATE_CHANGED` stiže nakon svake noćne akcije, ali javno stanje nema `currentTurnRole`. Zato svaki klijent nakon svake akcije ponovno dohvaća `GET /game-state` da sazna je li sad na redu (`canAct`). Radi, ali s 8 igrača to je 8 zahtjeva po potezu.

Treba: događaj `NIGHT_TURN_CHANGED {roundNumber, currentTurnRole}` ili `currentTurnRole` u `PublicGameStateResponse`. Pazi na curenje informacija (10.12): klijent tada drugima i dalje prikazuje samo "Grad spava".

## Rezultati noći (6.7, 10.1)
`killedPlayerIds` i `silencedPlayerIds` stižu samo u `ActionResponse.resolveResult`, dakle samo igraču čija je akcija zatvorila noć (ili domaćinu preko "Završi noć"). Ostali iz javnog stanja vide samo tko je mrtav, a ne tko je utišan.

Kako frontend to sada zaobilazi:
- **Izvještaj "Što se dogodilo noćas"** računa sam: usporedi žive igrače iz zadnjeg stanja noći i prvog stanja dana iste runde. Sprema ga lokalno (`aimafija.reports.{code}`). Na uređaju koji nije pratio kraj noći (npr. prijava na drugom mobitelu tijekom dana) piše "Nema izvještaja".
- **Utišanost** zna samo utišani igrač: u fazi `DAY` je živ, `voting.votingOpen` je true, a `voting.canVote` i `voting.hasVoted` su false (`GameStateService.isSilencedDuringCurrentVoting`). On vidi banner "Utišan si", a ostali u izvještaju i popisu igrača ne vide oznaku utišanog.

Treba: događaj `NIGHT_RESOLVED {roundNumber, killedPlayerIds, silencedPlayerIds, phase}` ili ta polja u javnom stanju (`PublicGameStateResponse` / `game-state`) za tekući dan.

## Pokretanje glasanja (6.7, 10.13)
Backend otvara glasanje odmah na početku dana (`votingOpen` je true čim je faza `DAY`). Zato:
- "Pokreni glasanje" (i "Preskoči" uz timer) kod domaćina samo na njegovu ekranu prebacuje raspravu na glasanje.
- Ostali vide "Glasanje počinje kad domaćin odluči ili istekne vrijeme." i gumb "Glasaj" kad im istekne timer.
- Timer rasprave (2:30) je lokalan: svaki uređaj broji od trenutka kad je vidio dan, "+30 s" produži samo domaćinov timer, a osvježavanje stranice ga vraća na početak.

Treba: `POST /api/lobbies/{code}/start-voting {playerId, playerToken}` (samo domaćin) i događaj `VOTING_STARTED {roundNumber}` da glasanje počne svima istovremeno. `votingOpen` bi do tada trebao biti false. Opcionalno: timer rasprave na serveru (npr. `discussionEndsAt` u javnom stanju), pa bi "+30 s" vrijedio za sve.

## Mafija noću (6.6, 10.1, 10.10)
- **Suigrači:** `availableActions` ne kaže tko je u timu mafije, pa pločice suigrača nemaju oznaku "Tvoj tim" i mafija može odabrati svog. Treba `teammates` (vidi "Suigrači mafije na karti uloge") ili izbaciti suigrače iz `targetPlayerIds` za `KILL`.
- **Odabir suigrača:** prototip na meti pokazuje koga je odabrao suigrač. Treba privatni kanal za tim mafije.
- **Više mafijaša:** svaki mafijaš šalje svoj `KILL`, a backend uzme prvi. Zato objašnjenje u aplikaciji kaže "Ako vas je više, vrijedi odabir onoga tko prvi potvrdi." Kad backend uvede dogovor (svi isti odabir ili zadnji vrijedi), vratiti tekst iz prototipa: "Tvoj tim vidi tvoj odabir. Odluka postaje konačna kad svi iz mafije potvrde."

## Kako je igrač ispao
`game-state` ne kaže kako i kada je igrač ispao. Promatrač bi trebao vidjeti "Mafija te uklonila u noći 2" / "Grad te izbacio u danu 1". Frontend to zasad pamti sam (`aimafija.fate.{code}`) kad primijeti da je igrač umro, pa nakon prijave na drugom uređaju piše samo "Više nisi u igri".

Treba: npr. `eliminatedHow: "NIGHT" | "VOTE"` i `eliminatedRound` u `CurrentPlayerGameStateResponse` (i u `LobbyPlayerResponse` za kraj igre).
