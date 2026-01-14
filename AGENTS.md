# Repository Guidelines

## Project Structure & Module Organization
- `artamera_front/` holds the Vue 3 + Vite frontend.
  - `src/` contains app code (`App.vue`, `main.js`, `router/`, `pages/`, `components/`).
  - `public/` stores static assets such as `public/styles/` and `public/config/styles.json`.
  - `src/assets/` contains bundled images used by the UI.
- `artcamera_backend/` is the Node.js Express backend.
  - `index.js` defines the API (`/generate`, `/tasks/:id`) and provider integrations.
  - `node_modules/` is present; do not edit vendored dependencies directly.

## Build, Test, and Development Commands
Frontend (run from `artamera_front/`):
- `npm install`: install dependencies.
- `npm run dev`: start the Vite dev server.
- `npm run build`: build production assets into `dist/`.
- `npm run preview`: preview the production build locally.
- `npm run deploy`: deploy `dist/` to GitHub Pages.

Backend (run from `artcamera_backend/`):
- `npm install`: install dependencies.
- `npm start`: start the Express server (defaults to port `9000`).

## Coding Style & Naming Conventions
- JavaScript uses 2-space indentation and semicolons (match existing files like `src/router/index.js`).
- Prefer double quotes in JS for consistency with backend and router files.
- Vue pages live in `artamera_front/src/pages/` and use PascalCase names (e.g., `StyleSelect.vue`).
- Shared UI components go in `artamera_front/src/components/` with PascalCase filenames.
- No formatter or linter is configured; keep changes stylistically consistent with nearby code.

## Testing Guidelines
- No automated test framework is set up in this repository.
- If you add tests, document the framework and add a runnable script in the relevant `package.json`.

## Commit & Pull Request Guidelines
- Git history is not available in this workspace, so there is no established commit convention.
- Use short, imperative commit subjects and include scope when useful, e.g., `frontend: add camera overlay`.
- Pull requests should explain the change, list any manual test steps, and include screenshots for UI changes.

## Configuration & Environment Tips
- Backend providers rely on environment variables such as `DOUBAO_ARK_KEY`, `ALI_DASHSCOPE_KEY`, and `BANANA_API_KEY`.
- `index.js` uses `fetch`, `Blob`, and `FormData`; use Node.js 18+ when running the backend.
