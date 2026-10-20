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