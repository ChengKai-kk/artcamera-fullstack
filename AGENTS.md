# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the Vue 3 app (SFCs with `<script setup>`).
- `src/pages/` contains route-level screens (Home, StyleSelect, Camera, Generate, Save).
- `src/components/` is for reusable UI pieces.
- `src/router/` defines routes and the GitHub Pages base path.
- `src/assets/` stores static images (effects, steps) bundled by Vite.
- `public/` is for static files copied as-is.
- `dist/` is the production build output.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the Vite dev server (local development).
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: serve the production build locally.
- `npm run deploy`: publish `dist/` to GitHub Pages via `gh-pages`.

## Coding Style & Naming Conventions
- Vue SFCs use `<script setup>` and 2-space indentation.
- Use double quotes for JS strings and end statements with semicolons.
- Route-level views are PascalCase and live in `src/pages/` (e.g., `Home.vue`).
- Shared UI is in `src/components/` with PascalCase filenames.
- Keep global styles in `src/style.css`; page-specific styles belong in SFC `<style scoped>`.

## Testing Guidelines
- No automated test framework is configured yet.
- For manual checks, run `npm run dev` and verify the main flows:
  - `/` carousel renders
  - `/styles`, `/camera`, `/generate`, `/save` routes load
- If you add tests, document the framework and add a script in `package.json`.

## Commit & Pull Request Guidelines
- Recent commits use a loose Conventional Commits style (`fix:`, `chore:`), with an occasional non-standard message.
- Prefer `feat:`, `fix:`, `chore:`, `refactor:`, `docs:` going forward.
- PRs should include:
  - Clear summary of UI or behavior changes
  - Screenshots or short clips for visual updates
  - Notes on any config changes (e.g., router base path or AI endpoint)

## Configuration Notes
- AI endpoint and token live in `src/config/ai.js`; keep secrets out of PRs when possible.
- The router uses a GitHub Pages base (`/artcamera-web/`). Update it if the deployment path changes.
