# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── hydroheat-ai/       # HydroHeat AI React+Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## HydroHeat AI Features

### Frontend (`artifacts/hydroheat-ai`)
- **React + Vite + TypeScript** app served at `/`
- **Dark futuristic** cyberpunk design theme with cyan/magenta neon accents
- **Interactive Leaflet Map**: CartoDB Dark Matter tiles showing India, 15 major cities with color-coded pulsing markers
- **Location Details Panel** (left): Animated metrics (temperature, groundwater, risk score), city stats, future prediction chart
- **AI Insights Panel** (right): Live generated insights based on selected city and interventions
- **Sandbox Toolbox** (bottom): 8 intervention tools (Trees, Fountain, Solar, Green Roof, Permeable Pavement, Factory, Stubble Burning, Fireworks)
- **Live simulation**: Effects calculated instantly when interventions are placed (frontend-side engine)
- **Draggable markers**: Intervention markers can be repositioned on the map
- **Framer Motion** animations for panel transitions and number counters
- **Recharts** for future temperature projection charts

### Backend (`artifacts/api-server`)
- **GET /api/cities** — Returns 15 Indian cities with full climate data
- **GET /api/cities/:cityId** — Get specific city data
- **POST /api/simulation/calculate** — Server-side simulation calculation with AI insights
- **GET /api/weather/:lat/:lng** — Simulated weather data for coordinates

### State Management
- `SandboxContext` (React context): cities, selectedCity, activeTool, interventions, simulationResult
- Simulation engine runs client-side for instant feedback, falls back gracefully from API

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`
