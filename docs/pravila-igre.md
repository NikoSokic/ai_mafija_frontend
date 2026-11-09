# Pravila igre

Dogovorena pravila (listopad 2026.). Backend ih provodi (`ai_mafia_backend`, konstante u `service/GameRules.java`), a frontend ih samo prikazuje.

## Sastav uloga

- Sastav mora imati barem jednu Mafiju (sama Dama ne dolazi u obzir).
- Tim mafije (Mafia, Dama) mora biti strogo manji od ostalih igrača. Sastav u kojem ih je jednako ili više odbija se pri stvaranju sobe, jer bi igra bila završena prije početka.
- Provjerava se samo pri stvaranju sobe.

## Tijek runde

1. **Noć**: uloge se bude jedna po jedna i tajno biraju metu.
2. **Dan (rasprava)**: jutarnji izvještaj, pa 2:30 rasprave. Glasati se još ne može.
3. **Glasanje**: 60 s, svi u isto vrijeme.
4. Po potrebi **ponovno glasanje** između izjednačenih (60 s), zatim nova noć ili kraj igre.

Tim mafije (Mafia, Dama) pobjeđuje kad ih je jednako ili više od ostalih. Građani pobjeđuju kad izbace cijeli tim mafije.

## Noć

- Prva noć počinje uvodom u kojem igrači gledaju kartu uloge i drže "Spreman sam". Prvi potez počinje čim su spremni svi živi igrači. Domaćin može krenuti i ranije ("Počni noć bez čekanja"), a najkasnije uvod završava nakon 90 s, da igra ne zapne ako netko zatvori aplikaciju.
- Ostale noći počinju pauzom od 10 s (prijelaz i naracija).
- Redoslijed: Mafija → Dama → Doktor → Policajac → Novinar. Uloge kojih u igri nema se preskaču.
- Narator na početku noći kaže svima da zatvore oči, a zatim budi uloge iz sastava redom (Mafija, Dama, Doktor, Policajac, Novinar). Na prijelazu uspava prethodnu ulogu i budi sljedeću ("Mafijo, zatvorite oči. Dama, otvori oči…"); zadnju uspava na početku jutra.
- Potez počinje s 4 s naracije, a zatim uloga ima najviše 13 s za odabir. Kad uloga odigra (kad ih je više, npr. dva Doktora, kad odigraju svi), potez završava nakon kratke nasumične pauze od 1–4 s. Tko ne odigra, gubi potez; i igrač koji "Nije tu" ima cijelih 13 s.
- Ako je uloga mrtva, narator je i dalje pozove, a njezin potez se **glumi**: traje kao nasumično odabran nedavni stvarni potez iste uloge (iz svih soba; dok ih nema barem 10, nasumično 4–10 s), uvijek između 3 s i najduljeg mogućeg poteza. Javni rok je za svaku vrstu poteza uvijek isti (najdulji mogući), pa se ni iz roka ni iz trajanja ne može zaključiti tko je živ.
- **Mafija:** svi mafijaši vide odabir suigrača i smiju mijenjati metu. Mafija ne može ciljati svoj tim.
  - Kad svi živi mafijaši odaberu istu metu, potez završava nakon kratke pauze.
  - Kad su svi odabrali, a mete su različite, odmah počinje **drugi krug** (10 s) u kojem se bira samo između tih meta. Ako se ne slože, server nasumično odabere jednu od njih.
  - Ako istekne rok, a nisu svi odabrali: jedna odabrana meta vrijedi; više različitih meta otvara drugi krug; ako nitko nije odabrao, strada nasumični živi igrač, i iz tima mafije. Doktor ga može spasiti kao i inače, a jutarnji izvještaj ne otkriva je li meta odabrana ili nasumična.
  - Isto vrijedi kad potez mafije igra Dama.
- **Dama:** dok je Mafija živa, utiša jednog živog igrača (bilo kojeg: i sebe, i suigrača iz mafije, i metu mafije; ako meta tu noć pogine, ne ostaje utišana). Utišani idući dan ne govori i ne glasa. Kad Mafija pogine, Dama u potezu mafije ubija i više ne utišava (njezin potez se tada glumi).
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
- Nakon kraja igre: igrač napušta sobu ("Na početnu"); ako ode domaćin, domaćin postaje igrač koji je najranije ušao.
- U svim slučajevima igrač gubi token i ne može se vratiti tom prijavom.

## Igrači i domaćin koji nestanu

- Aplikacija se javlja poslužitelju svakih 15 s. Tko se ne javlja 45 s, u čekaonici ima oznaku "Nije tu".
- **Izbacivanje:** dok soba čeka igrače, domaćin može izbaciti bilo kojeg igrača (uz potvrdu). Mjesto i nadimak se oslobađaju, a izbačeni se može vratiti s kodom sobe. Nakon "Igraj ponovno" igrač koji nije izašao ostaje u sobi, pa ga domaćin može izbaciti ako se ne javlja.
- **Domaćin koji se ne javlja** predaje ulogu: nakon 120 s u čekaonici i na kraju igre, a nakon 45 s usred igre. Domaćin postaje igrač koji se javlja, prvo živi, pa onaj koji je najranije ušao. Ako se nitko ne javlja, ništa se ne mijenja.
- Bivši domaćin ostaje običan igrač i ulogu ne dobiva natrag kad se vrati.
- Nakon ponovnog pokretanja poslužitelja rokovi se računaju od pokretanja, pa nitko ne gubi ulogu zbog restarta.
- Uživo glas naratora govori samo domaćinov mobitel, pa prijenosom glas prelazi na novog domaćina.
- **Napuštena soba:** ako se nijedan igrač iz sobe ne javi 1 sat, soba se trajno briše zajedno s igrom, bez obzira na to čeka li igrače, traje li igra ili je završena. Jedan igrač koji se javlja dovoljan je da soba ostane. Povijest igara se ne čuva. Nakon ponovnog pokretanja poslužitelja sat se računa od pokretanja.

## Kraj igre

- Uloge svih igrača postaju javne tek kad igra završi (`roleName` u popisu igrača).
- Za svakog igrača zna se kako je ispao (`NIGHT`, `VOTE`, `LEFT`) i u kojoj rundi.

## Igraj ponovno

- Na kraju igre domaćin može vratiti istu sobu u čekaonicu ("Igraj ponovno"). Ostali igrači dotad vide "Čekamo domaćina…" ili odlaze na Početnu.
- Kod sobe, sastav uloga i postavke (način, javnost, glas naratora) ostaju.
- Igrači koji su ostali vraćaju se u čekaonicu živi i bez uloge. Tko je izašao tijekom ili nakon igre, briše se iz sobe; prazna mjesta mogu popuniti novi igrači.
- Nova igra počinje kao i prva: domaćin je pokreće kad je soba puna, a uloge se dijele iznova.
