---
name: brag-mafija
description: Promo video za AI Mafiju (za mail YouTuberima / objave). Koristi kad kažem "/brag-mafija", "napravi promo video", "brag za AI Mafiju". Postavlja priču, ton i pravila za ovaj projekt pa radi prema skillu brag-slim.
---

# /brag-mafija

Napravi promo video za AI Mafiju tako da slijediš skill **brag-slim** (`.claude/skills/brag-slim/SKILL.md`) korak po korak, uz ova pravila za ovaj projekt. Gdje se razlikuju, ova pravila imaju prednost.

Opcije: `--tone`, `--format`, `--duration` kao u brag-slim. Dodatno `--za youtube|tiktok`:
- `youtube` (zadano): landscape 1920×1080, ~25 s; mobilno sučelje prikaži unutar okvira mobitela na tamnoj pozadini
- `tiktok`: vertical 1080×1920, ~18 s; sučelje preko cijelog ekrana

## Publika i poruka
- Primarna publika: hrvatski YouTube kanal koji snima mafiju s ekipom; video ide u mail kao prijedlog suradnje.
- Glavna poruka (mora biti jasna nakon jednog gledanja): **"Mobitel je narator. Svi igraju."** Nitko ne mora sjediti sa strane i voditi igru.
- Drugi adut: igra se uživo u istoj sobi ILI online, ulaz kodom sobe, bez registracije (nadimak + emoji).
- Outro: naziv "AI Mafija", jedan red poziva ("Odigrajte s nama na kanalu?") i URL aplikacije iz `.env.example`/README-a ako je javni produkcijski URL; ako nije siguran, ostavi mjesto i pitaj me.

## Priča (polazni oblik, ne šablona)
1. **Hook (2–3 s):** noć pada — ekran se zatamni, tekst tipa "Grad spava…" iz pravih naratorskih tekstova u kodu.
2. **Reveal:** ulazak u sobu kodom → lobby se puni igračima (emoji avatari).
3. **Highlight 1:** otkrivanje uloge (prava animacija iz koda).
4. **Highlight 2:** brojač "Spremno X od Y" puni se do kraja.
5. **Highlight 3:** noćna faza / glasanje, uz naraciju kao tekst (TTS je opcionalan).
6. **Punchline/outro:** "Mobitel je narator. Svi igraju." + naziv + poziv.

## Izvori u ovom repou
- Izgled, boje, fontovi, animacije: `docs/design/prototip.html` je izvor istine; prave komponente su u `src/pages` i `src/components` — renderiraj njih, ne crtaj ispočetka.
- Ponašanje i tijek igre: `docs/design/spec.md`.
- Naratorski tekstovi: pronađi ih u `src/` (lokalni unaprijed napisani tekstovi) i koristi doslovno.
- Elemente s oznakom "prototip" (isprekidani rub) NE prikazuj u videu.
- Backend ne pokreći i ne diraj; ako komponentama trebaju podaci, ubaci lažne (mock) podatke izravno u kompoziciju videa.

## Pravila sadržaja
- Sav tekst u videu i u `share-copy.txt` na hrvatskom.
- Lažni igrači s izmišljenim nadimcima (npr. Šime, Ante, Mare, Jure, Kate, Luka) — nikad prava imena, mailovi, tokeni iz `scripts/.bots/` ni ništa iz `.env`.
- Ton (ako ga ne zadam): `cinematic` s dozom humora — napeto kao trailer, ali da se vidi da je party igra. Zabranjeno: "revolucionarno", "inovativno rješenje", generički SaaS jezik.
- Ne izmišljaj brojke korisnika ni recenzije.

## Način rada (prema CLAUDE.md)
1. Napiši `brag-output/brag-plan.md` (kut, hook, storyboard s trajanjima) i **pričekaj moj OK** prije builda.
2. Nakon renderiranja: `brag.mp4`, `brag.jpg`, `share-copy.txt` u `brag-output/`. Dodatno napiši `mail-odlomak.txt`: 2–3 rečenice na hrvatskom koje mogu staviti u mail uz link na video.
3. Ne radi git commit ni push. Ništa iz `brag-output/` ne ide u repo.
4. Glazba: ako koristiš tuđu glazbu, u `share-copy.txt` dodaj liniju s atribucijom.
