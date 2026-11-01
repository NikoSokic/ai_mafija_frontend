# Taskovi za objavu

Što treba napraviti prije nego što se igra pokaže ekipi koja je snima za YouTube. Taskovi su poredani redom kojim ih treba raditi. Putanje s `backend/` su u repou `ai_mafia_backend`, a ostale u ovom repou.

Oznake:
- **[FE]** frontend, **[BE]** backend, **[OPS]** hosting i servisi, **[QA]** testiranje
- **[PRAVILA]** mijenja ili dopunjuje pravila igre, pa prvo treba odluka vlasnika i izmjena `docs/pravila-igre.md`

## Faza 0: odluke
- [ ] **1. AI narator:** napraviti pravi AI ili promijeniti opis. Naziv i `src/pages/HomePage.tsx:85` obećavaju AI, a tekstovi su unaprijed napisani u `src/lib/narration.ts`. Prijedlog: AI tekst na backendu, s postojećim tekstovima kao rezervom.
- [ ] **2. Način igre na snimanju:** uživo ili online. Ako je online, task 12 postaje hitan.
- [ ] **3. Jezik:** sve je na hrvatskom. Ako publika nije regionalna, prijevod ide prije objave.

## Faza 1: greške koje se vide na snimci
- [ ] **4. [FE] Glas naratora:** bez hrvatskog glasa na uređaju narator samo piše tekst (`src/lib/speech.ts`), a uživo govori samo domaćinov mobitel. Isprobati na uređajima ekipe; sigurnija opcija je zvuk generiran na serveru.
- [x] **5. [FE] Vrijeme za odabir u prvoj noći:** uvod i buđenje Mafije traju oko 8,5 s i bez glasa (izračun iz koda), a predviđeno je 6 s, pa dio od 20 s za odabir nestaje. Izmjeriti u igri, pa skratiti tekstove ili preskočiti uvod u prvoj noći.
- [x] **6. [FE] Stranica 404:** `src/App.tsx` nema rutu za nepoznat URL, pa je ekran prazan.
- [x] **7. [FE] Error Boundary:** greška u Reactu sada ostavlja bijeli ekran. Dodati zamjenski ekran s gumbom za povratak u igru.
- [x] **8. [BE] Kod sobe bez sličnih znakova:** izbaciti O, 0, I i 1 iz `LOBBY_CODE_CHARACTERS` (`backend/.../service/LobbyService.java:40`).
- [x] **9. [FE] [BE] [PRAVILA] Sastav bez mafije:** tražiti barem jednog člana tima mafije (`src/pages/CreateRoomPage.tsx:101` i backend).
- [x] **10. [FE] [PRAVILA] Dama:** pravila i backend dopuštaju da utiša sebe, ali `src/components/game/NightView.tsx:91` to brani. Ukloniti i staru oznaku "Meta mafije" (redak 93).
- [x] **11. [FE] Pravila u aplikaciji:** bolje objasniti "Suzdržan" i ponovno glasanje (`src/components/RulesSheet.tsx`) i dodati kratak uvod za prvu igru.
- [x] **12. [FE] "Chat stiže uskoro":** ukloniti iz `src/components/game/DayView.tsx:184`. Za prvu verziju uputa za Discord ili poziv, a chat kasnije.

## Faza 2: igrači koji nestanu
- [x] **13. [FE] [BE] Izbacivanje iz čekaonice:** domaćin može izbaciti igrača koji je otišao. Riješiti i slučaj iz `docs/backend-todo.md:15` (igrač ostaje u sobi nakon "Igraj ponovno").
- [x] **14. [BE] Domaćin nestane u čekaonici ili na kraju igre:** ako samo zatvori aplikaciju, nitko ne može pokrenuti igru. Prijenos domaćina nakon isteka vremena.
- [x] **15. [FE] [BE] Domaćin nestane usred igre:** igra ide dalje, ali uživo nestaju glas naratora i gumbi domaćina. Isti prijenos.
- [x] **16. [BE] [PRAVILA] Izlazak usred igre:** igrač koji izađe usred igre ispada (`LEFT`), uloga ostaje tajna, provjerava se pobjednik, a glasanje i uvod prve noći ne čekaju na njega. Backend: `PlayerService.leaveRunningGame`; frontend: potvrda "Napustiti igru?" i prikaz kao "Napustio igru".
- [x] **17. [FE] [BE] Ispražnjen ili promijenjen mobitel:** token je samo na uređaju. Povratak preko koda sobe i nadimka, uz potvrdu domaćina (zahtjev vrijedi 2 min). Ostalo je isprobati u pravoj igri na dva uređaja.
- [ ] **18. [FE] [QA] Stabilnost veze:** kod je gotov (`discardWebsocketOnCommFailure`, heartbeat, ponovno spajanje pri povratku u aplikaciju). Ostalo je proći `docs/test-veze.md` na pravom Androidu i iPhoneu.

## Faza 3: produkcija
- [x] **19. [OPS] Hosting:** za razvoj bot pinga `/api/health`, pa Render Free ne spava, ali ping troši gotovo svih 750 besplatnih sati mjesečno i server se i dalje može restartati. Prije probnog snimanja prijeći na plaćeni Render u Frankfurtu (gdje je i baza) i ugasiti bota. Supabase Pro zasad ne treba.
- [x] **20. [BE] [OPS] Baza:** kod je gotov: Flyway, početna shema i migracije u `src/main/resources/db/migration`; isprobano na lokalnom PostgreSQL-u. Ostalo je deploy i provjera na produkciji.
- [x] **21. [OPS] Provjera Supabasea:** provjereno. RLS je uključen, a javni ključ ne vidi podatke. `V8` dodaje jedinstvenost, indekse i uklanja prava javnih uloga. Ostalo je deploy, zatim u Supabaseu isključiti Data API i uključiti obavezni SSL. Mrežno ograničenje ostaje otvoreno jer Render Free i GitHub Actions nemaju stalne IP adrese.
- [x] **22. [OPS] Sigurnosne kopije:** svjesno preskočeno. Baza drži samo sobe i igre u tijeku (task 23 ih briše nakon sat vremena bez aktivnosti), a shema i uloge se vraćaju iz Flyway migracija u repou. Vratiti se na ovo ako se doda računi, statistika ili povijest igara.
- [x] **23. [BE] [PRAVILA] Čišćenje:** kod je gotov: `LobbyCleanupService` briše sobu u kojoj se nitko nije javio 1 sat; pravilo je u `docs/pravila-igre.md`. Ostalo je deploy.
- [ ] **24. [BE] Zaštita od navale:** ograničiti broj zahtjeva za stvaranje soba, ulazak i pogađanje kodova, filtrirati nadimke, podesiti Hikari pool prema limitu baze.
- [x] **25. [BE] Čišćenje API-ja:** kod je gotov: `TestController` je obrisan, a Swagger je zadano ugašen (lokalno `SWAGGER_ENABLED=true`, na Renderu se ne postavlja). Ostalo je deploy i provjera da `/swagger-ui/index.html` na produkciji vraća 404.
- [x] **26. [OPS] Praćenje:** kod je gotov: Sentry na oba dijela, bez tokena igrača u događajima (`SentryConfig`, `src/lib/sentry.ts`). Praćenje dostupnosti svjesno preskočeno. Ostalo je otvoriti Sentry račun s dva projekta, postaviti `SENTRY_DSN` i `SENTRY_ENVIRONMENT=production` na Renderu te `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` na Vercelu, izazvati probnu grešku na oba dijela i uključiti upozorenja na mail.
- [ ] **27. [QA] Test opterećenja:** botovima (`scripts/bots.mjs`) npr. 50 soba po 8 igrača na produkcijskoj konfiguraciji. WebSocket broker je u memoriji, pa backend radi samo kao jedna instanca.

## Faza 4: testiranje
- [ ] **28. [QA] E2E testovi:** Playwright, cijela igra u više preglednika, uvršteno u CI. Frontend sada nema nijedan test.
- [ ] **29. [QA] Testovi na PostgreSQL-u:** Testcontainers, jer zaključavanje nije provjereno na pravoj bazi.
- [ ] **30. [QA] Stvarne igre:** barem 5 cijelih igara s pravim ljudima. Slučajevi: 4, 8 i 20 igrača; oba načina igre i miješani uređaji; osvježavanje u svakoj fazi; zrakoplovni način na 30 s; izjednačenje; dva Doktora na istoj meti; izlazak domaćina; "Igraj ponovno".

## Faza 5: objava
- [ ] **31. [FE] Pravna strana:** politika privatnosti i kontakt (nadimci, IP adrese kod pružatelja usluga). Sentry je novi pružatelj usluge koji obrađuje tehničke podatke o greškama. Uz analitiku provjeriti treba li privola.
- [ ] **32. [OPS] Vlastita domena:** dodati je i u CORS postavke.
- [ ] **33. [FE] Dijeljenje linka:** Open Graph oznake i slika, manifest, ikone za početni zaslon (`index.html`).
- [ ] **34. Dokumentacija:** ispraviti README na oba repoa, posebno opis AI naratora i ostatak Vite predloška.
- [ ] **35. [FE] Povratne informacije:** jednostavan način prijave greške u aplikaciji.

## Faza 6: dodaci za dobar video (nije obavezno)
- [ ] **36. [FE] [BE] Pregled igre na kraju:** tko je koga napao, štitio i istraživao po noćima. Podaci postoje do "Igraj ponovno".
- [ ] **37. [FE] Prikaz za TV ili laptop:** stranica samo s javnim stanjem i glasom naratora.
- [ ] **38. [FE] Zvuk:** glazba noći, otkucaji timera i zvuk izbacivanja.

## Dodano naknadno
- [ ] **39. [FE] [QA] Gumb za cijeli ekran:** kod je gotov i provjeren u emulaciji preglednika (`src/lib/useFullscreen.ts`, `src/components/FullscreenButton.tsx`). Ostalo je isprobati na pravom Androidu i iPhoneu, uključujući dodavanje na početni zaslon. Manifest i ikone iz taska 33 su time već dodani; Open Graph oznake još nisu.

## Uvjeti za javljanje ekipi
- [ ] Faze 1–5 su gotove, osim onoga što je svjesno odgođeno.
- [ ] Backend je na plaćenom Renderu u Frankfurtu (task 19).
- [ ] 5 cijelih igara zaredom s pravim ljudima, bez zapinjanja i bez osvježavanja stranice.
- [ ] Glas naratora radi na uređajima koje će ekipa koristiti.
- [ ] Probno snimanje na njihovim uređajima prošlo je bez problema.
