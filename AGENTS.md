# AGENTS.md

## Commands

- Install deps from the lockfile with `npm install`; there is no separate workspace or package manager config.
- Start local dev with `npm run dev -- --host 0.0.0.0`. Vite uses port `8686`.
- Verify changes with `npm run build`. This runs `tsc -b` before `vite build`; there are no lint or test scripts.
- Preview the production build with `npm run preview` after `npm run build`.

## App Shape

- Desktop entry: `index.html` -> `src/main.tsx` -> `src/App.tsx`.
- Mobile entry: `mobile.html` -> `src/mobile/main.tsx` -> `src/mobile/App.tsx`.
- Vite builds both entries via `build.rollupOptions.input` in `vite.config.ts`.
- Default route/page is `智询` in both desktop and mobile apps.
- Most data is static mock data under `src/data/`; there is no backend/API layer.

## Vite / Deployment Gotchas

- `base` is `/caitong-finance/`; GitHub Pages URLs must include this path.
- `server.allowedHosts` allows `.ngrok-free.dev` for ngrok demos.
- `dist/` is ignored. To update GitHub Pages, run `npm run build`, then publish `dist/` contents to the `gh-pages` branch root.
- Source and project skills live on `master`; GitHub Pages serves only the built static files from `gh-pages`.

## TypeScript / React Notes

- `tsconfig.json` is strict and has `noUnusedLocals` / `noUnusedParameters`; remove unused imports and variables before building.
- React 18 + Vite + Tailwind are used; styling relies on Tailwind tokens in `tailwind.config.js` (`primary.*`, `up`, `down`, `neutral`, `secondary`, `price`).

## Project Skill

- The repo includes an OpenCode skill at `.opencode/skills/review-summary-pdf`.
- Use it for A 股复盘总结、操作复盘、交易技能复盘、能力沉淀、技能迭代、生成复盘 PDF.
- The standard trading-skill template is in `.opencode/skills/review-summary-pdf/references/trading_skill_review_template.md`.
