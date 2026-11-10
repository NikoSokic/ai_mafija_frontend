# AI Mafija – frontend

## Izvori
- Izgled i animacije: docs/design/prototip.html (izvor istine za izgled)
- Ponašanje, podaci, API: docs/design/spec.md
- Backend: zaseban repo ai_mafija_backend (Spring Boot), lokalno na http://localhost:8080

## Pravila
- Svi tekstovi u sučelju na hrvatskom, kao u prototipu
- Ne mijenjaj backend; ako nešto fali, zapiši u docs/backend-todo.md
- URL backenda samo iz .env (VITE_API_URL), nikad u kodu
- Elementi s oznakom "prototip" (isprekidani rub) NE idu u aplikaciju
- Postojeća struktura: src/pages, src/components, src/api, src/store, src/lib
- Mobile-first (390 px), poštuj prefers-reduced-motion

## Način rada
1. Prije pisanja koda napiši kratki plan (koje datoteke, što radiš) i pričekaj moj OK
2. Ne radi git commit ni push – to radim ja
3. Na kraju: `npm run build` i `npm run lint` moraju proći
4. Na kraju napiši:
   - "Kako provjeriti": točni koraci u pregledniku
   - "Što sam napravio i zašto": 5–8 rečenica, jednostavno, da to mogu objasniti na razgovoru za posao
## Desktop
- Mobitel (< 1024 px) se ne mijenja: desktop se radi samo klasama `lg:`/`xl:` i hookom `useIsDesktop` (src/lib/useIsDesktop.ts)
- Pazi i na JSX: novi omotač, premještanje ili promjena redoslijeda mijenja i mobitel, iako nema novih klasa
- Komponente koje postoje samo na desktopu renderiraju se s `{isDesktop && …}`, NE skrivaju s `hidden lg:block`
  (skrivena komponenta i dalje radi: timeri, dohvaćanje, glas, vibracija). Nijedna komponenta se ne renderira dvaput.
- Ništa ne smije raditi samo na hover – iPad na 1024 px je dodirni
- Tekst najviše ~65 znakova u retku (`max-w-prose` ili slično)
- Tajni podaci (uloga, suigrači, odabiri) na desktopu po ISTOM pravilu kao na mobitelu:
  uživo samo dok igrač drži gumb, online normalno
- Stil: igra, ne admin ploča – grad je u sredini i preko cijele širine, sadržaj u karticama iznad njega,
  bočna ploča diskretna
- Nakon svake promjene: `node scripts/mobile-snapshots.mjs --compare` (ili `npm run snap:compare`) mora dati
  0 % na mobilnim širinama (390 i 360). Baseline (`npm run snap`) se snima samo prije promjene,
  nikad da bi se "popravila" razlika. Ekrani s izmišljenim podacima: /dev/screens (samo u dev načinu).

## Promo video (/brag)
- Za promo video koristi skill `brag-mafija` (".claude/skills/brag-mafija"); on poziva `brag-slim`
- Izlaz ide u `brag-output/` (u .gitignore); pravilo "plan pa čekaj OK" vrijedi i ovdje: prvo `brag-plan.md`, render tek nakon mog OK
