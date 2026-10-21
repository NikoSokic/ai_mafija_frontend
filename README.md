# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Testiranje igre s više igrača
Backend pokreće igru tek kad je soba puna (min. 4 igrača). Umjesto otvaranja više preglednika, sobu možeš popuniti testnim igračima:

```bash
node scripts/fill-lobby.mjs K7M2QZ      # doda onoliko igrača koliko fali
node scripts/fill-lobby.mjs K7M2QZ 2    # doda točno 2 igrača (ili manje ako ne stane)
```

Skripta čita `VITE_API_URL` iz `.env`. Igrači se zovu Test1, Test2…; ne igraju umjesto tebe, samo zauzmu mjesta.
