# Repository Guidelines

## Project Structure & Module Organization
- `front/`: Next.js 16 + React 19 UI. App routes live in `front/src/app`, shared components in `front/src/components`, helpers in `front/src/lib`.
- `back/`: Fastify API in TypeScript. Routes live in `back/src/routes`, plugins in `back/src/plugins`, utilities in `back/src/utils`.
- `back/prisma/`: Prisma schema and migrations; seed scripts live in `back/prisma/*.ts`.
- `DOCS/` and `docs_geral/`: product and technical documentation.
- `app/agentes/agents/`: internal playbooks and reference notes.

## Build, Test, and Development Commands
- Install dependencies:
  - `cd back && npm install`
  - `cd front && npm install`
- Run locally:
  - `./start-all.ps1` (PowerShell; starts both services)
  - or individually: `cd back && npm run dev`, `cd front && npm run dev`
- Windows (PowerShell) examples:
  - `Set-Location back; npm run dev`
  - `Set-Location front; npm run dev`
- Build:
  - `cd back && npm run build`
  - `cd front && npm run build`
- Lint (frontend):
  - `cd front && npm run lint`
- Prisma/seed:
  - `cd back && npm run prisma:seed`

## Coding Style & Naming Conventions
- Language: TypeScript across `back/` and `front/`.
- Follow existing formatting in each folder; avoid mass reformatting.
- Naming:
  - React components: `PascalCase` exports.
  - Variables/functions: `camelCase`.
  - Route files: kebab-case (e.g., `crm-leads.ts`).

## Testing Guidelines
- No automated test suite is configured yet.
- Minimum validation before PR:
  - `cd back && npm run build`
  - `cd front && npm run lint`
  - Manual smoke test via `./start-all.ps1` and key screens.
- If you add tests, keep them close to the feature and use `*.test.ts` or `*.spec.ts`.

## Commit & Pull Request Guidelines
- Git history is minimal (single initial commit), so no strict convention exists yet.
- Recommended commit pattern: short, imperative, and specific, e.g. `ajusta filtros de contratos`.
- PRs should include:
  - Scope (front/back/prisma), and any migration or env changes.
  - Validation evidence (build/lint/manual).
  - Screenshots or short clips for UI changes.
  - UI checklist: responsive states, empty/loading states, and role-based access.

## Architecture Overview
- Frontend routes use Next.js App Router (`front/src/app`) with shared layout in `front/src/components`.
- Backend exposes REST endpoints via Fastify route files in `back/src/routes`.
- Prisma models in `back/prisma/schema.prisma` are the source of truth for data shape.

## Security & Configuration Tips
- Keep secrets in `.env`/`.env.local`; never commit credentials.
- Guard privileged endpoints with role checks (e.g., `authorizeRoles`).
- Validate external input (query params, uploads, IDs) before persistence.
