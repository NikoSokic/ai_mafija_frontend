# Što frontend treba od backenda

Popis stvari koje sučelje već prikazuje ili koristi, a backend (`ai_mafija_backend`) ih još nema.
Brojevi u zagradama upućuju na `docs/design/spec.md`, poglavlje 10.

## Postavke sobe i javne sobe (10.3)
Nova soba nudi tri postavke koje se zasad samo prikazuju i ne šalju (žive u stanju ekrana `CreateRoomPage`):

- **Način igre**: `mode: "LIVE" | "ONLINE"`
- **Tko može ući**: `isPublic: boolean` ("Samo s kodom" / "Svi (javna)")
- **Glas naratora**: `voiceEnabled: boolean`

Treba:
- polja u `Lobby` i `CreateLobbyRequest`, te u odgovoru `GET /api/lobbies/{code}` (lobby prikazuje chipove Privatna/Javna, Uživo/Online, Narator s glasom/bez glasa)
- endpoint za javne sobe, npr. `GET /api/lobbies?public=true&status=WAITING` (gumb **Javne sobe** na Početnoj zasad otvara samo "Uskoro")

## Avatar (10.4)
Igrač bira emoji na Početnoj; sprema se samo lokalno (`aimafija.profile`). `Player` nema `avatarEmoji` – dodati u `CreateLobbyRequest` (domaćin), `JoinLobbyRequest` i `LobbyPlayerResponse`.

## Uloge (10.7)
Nova soba uloge čita s `GET /api/test/roles`. Treba javni `GET /api/roles` (isti oblik: `[{id, name, opis}]`).
