# Pravila igre

Dogovorena pravila (listopad 2026.). Backend ih provodi (`ai_mafia_backend`, konstante u `service/GameRules.java`), a frontend ih samo prikazuje.

## Tijek runde

1. **Noć**: uloge se bude jedna po jedna i tajno biraju metu.
2. **Dan (rasprava)**: jutarnji izvještaj, pa 2:30 rasprave. Glasati se još ne može.
3. **Glasanje**: 60 s, svi u isto vrijeme.
4. Po potrebi **ponovno glasanje** između izjednačenih (60 s), zatim nova noć ili kraj igre.

Tim mafije (Mafia, Dama) pobjeđuje kad ih je jednako ili više od ostalih. Građani pobjeđuju kad izbace cijeli tim mafije.

## Noć

- Prva noć počinje pauzom od 30 s (igrači gledaju kartu uloge), ostale pauzom od 10 s (prijelaz i naracija).
- Redoslijed: Mafija → Dama → Doktor → Policajac → Novinar. Uloge kojih u igri nema se preskaču.
- Svaki potez traje najviše 30 s. Tko ne odigra, gubi potez. Kad svi igrači poteza odigraju, odmah ide sljedeći.
- Ako je uloga mrtva, njezin potez se **glumi** (nasumično 8–15 s), da nitko ne zna da je mrtva.
- **Mafija:** svi mafijaši vide odabir suigrača i smiju mijenjati metu. Potez završava kad svi odaberu istu metu. Ako istekne rok, vrijedi većina; kod izjednačenja te noći nitko ne strada. Mafija ne može ciljati svoj tim.
- **Dama:** dok je Mafija živa, utiša jednog igrača (ne smije metu mafije). Utišani idući dan ne govori i ne glasa. Kad Mafija pogine, Dama u potezu mafije ubija i više ne utišava (njezin potez se tada glumi).
- **Doktor:** štiti bilo kojeg živog igrača, i sebe, i istog igrača više noći zaredom. Ako dva Doktora zaštite istog igrača, on umire (predoziranje).
- **Policajac:** saznaje je li igrač mafija. Dama izgleda nevino dok je Mafija živa.
- **Novinar:** saznaje jesu li dva igrača u istom timu.
- Domaćin može ručno završiti noć ("Završi noć"); uloge koje nisu odigrale gube potez.

## Dan i rasprava

- Jutarnji izvještaj je javan: tko je stradao i tko je utišan.
- Rasprava traje 2:30 (timer broji server, svima isti). Za to vrijeme nitko ne može glasati.
- Domaćin može produžiti raspravu svima za 30 s ili odmah pokrenuti glasanje svima.

## Glasanje

- Traje 60 s. Glasaju živi igrači koji nisu utišani.
- Glasa se za drugog živog igrača ili **Suzdržan**. Glas za sebe nije dopušten. Glas je konačan.
- Glasovi su **javni i uživo**: svi vide tko je za koga glasao.
- Tko ne glasa do isteka roka, računa se kao suzdržan. Domaćin može glasanje završiti i ranije.
- **Tko ispada:** igrač s najviše glasova, ali samo ako ima **strogo više** glasova od broja suzdržanih.
  - Lea 3 glasa, 2 suzdržana → Lea ispada.
  - Lea 2 glasa, 2 ili više suzdržanih → nitko ne ispada.
- **Izjednačenje** (dva ili više vodećih, a suzdržanih je manje): ponovno glasanje, odmah i bez rasprave, 60 s.
  - Glasa se samo između izjednačenih; izjednačeni ne glasaju; nema "Suzdržan".
  - Tko ne glasa u roku, nema glas.
  - Ako je opet izjednačeno (ili nitko ne glasa), nitko ne ispada i počinje noć.
  - Ako su svi živi izjednačeni, nema tko glasati, pa nitko ne ispada.
- Uloga izbačenog ostaje tajna do kraja igre.

## Napuštanje sobe

- U lobbyju: igrač se briše iz sobe. Ako ode domaćin, domaćin postaje igrač koji je najranije ušao. Prazna soba se briše.
- Tijekom igre: igrač ispada (`LEFT`), uloga ostaje tajna, provjerava se pobjednik. Više ga se ne čeka ni noću ni na glasanju.
- U oba slučaja igrač gubi token i ne može se vratiti tom prijavom.

## Kraj igre

- Uloge svih igrača postaju javne tek kad igra završi (`roleName` u popisu igrača).
- Za svakog igrača zna se kako je ispao (`NIGHT`, `VOTE`, `LEFT`) i u kojoj rundi.
