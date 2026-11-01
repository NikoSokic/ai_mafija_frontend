# Test stabilnosti veze (task 18)

Isprobati na barem jednom pravom Androidu (Chrome) i jednom iPhoneu (Safari), i u pregledniku i dodano na početni zaslon. Igra mora biti u tijeku s barem dva uređaja, a drugi uređaj služi za provjeru da se stanje poklapa.

Što je u kodu: `src/lib/stomp.ts` (heartbeat 10 s, `discardWebsocketOnCommFailure`, odmah ponovno spajanje pri povratku u aplikaciju ili mreže) i `src/lib/useStayAwake.ts` (wake lock, dohvat stanja pri povratku, `pageshow`, `online`).

| # | Korak | Očekivano |
|---|-------|-----------|
| 1 | Zaključaj ekran 30 s, otključaj | Najkasnije u 2 s nestane oznaka "Veza prekinuta", stanje igre je isto kao na drugom uređaju. |
| 2 | Zrakoplovni način 30 s, ugasi ga | Dok je ugašena veza pojavi se obavijest o vezi. Ugasi zrakoplovni: veza se vrati u nekoliko sekundi, bez ručnog osvježavanja. |
| 3 | Prebaci WiFi → mobilni podaci usred faze | Veza se vrati sama u 10 s, nema duplih događaja (npr. dvaput ista naracija). |
| 4 | Minimiziraj aplikaciju 1 min, vrati se | Stanje je ažurno, ekran je upaljen (wake lock se ponovno dobio). |
| 5 | Ostavi igru 5 min bez dodira | Ekran se ne gasi tijekom igre (wake lock). Na iPhoneu zabilježi ako se ipak gasi (traži iOS 16.4+). |
| 6 | Dok je veza ugašena, na drugom uređaju promijeni fazu, pa vrati vezu | Uređaj odmah prikaže novu fazu. |
| 7 | Dodaj na početni zaslon, otvori iz ikone, ponovi korake 1, 2 i 4 | Isto kao u pregledniku. |

Uz svaki korak zapiši uređaj, verziju sustava i što se dogodilo. Ako veza ne dođe sama, zapiši koliko je trebalo do gumba "Pokušaj ponovno" i pokupi konzolu (`chrome://inspect` ili Safari Web Inspector).
