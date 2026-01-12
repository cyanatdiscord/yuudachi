# Yuudachi Agent Guide

This file provides build/test commands and coding conventions for agentic tools.

## Repository Layout

- `apps/` contains application targets (Next.js sites + Discord bot).
- `packages/` holds shared libraries (`@yuudachi/framework`, `@yuudachi/http`).
- Workspace is managed by `pnpm` (see `pnpm-workspace.yaml`).

## Prerequisites

- Node.js >=24 (see `package.json` engines).
- `pnpm` 10.24.0 (use corepack or `pnpm` directly).

## Common Workspace Commands

- `pnpm install` to install dependencies.
- `pnpm build` runs build in all workspaces.
- `pnpm lint` runs `oxfmt`/`oxlint` plus type checks.
- `pnpm format` or `pnpm fmt` to auto-format.
- `pnpm test` runs Vitest across all projects (multi-project config).

### Run A Single Test

- `pnpm test -- path/to/test.spec.ts` runs one file via Vitest.
- `pnpm test -- -t "name"` runs tests matching a name pattern.
- `pnpm --filter @yuudachi/website test -- path/to/test.tsx` runs within one app.
- `pnpm --filter yuudachi test -- path/to/test.ts` runs bot tests.

### Package/App Scoped Commands

- `pnpm --filter @yuudachi/framework build` builds the framework package.
- `pnpm --filter @yuudachi/http lint` lints the HTTP package.
- `pnpm --filter yuudachi build` builds the bot app.
- `pnpm --filter @yuudachi/website dev` runs the website in dev mode.
- `pnpm --filter @yuudachi/report dev` runs the report app in dev mode.

### App-Specific Commands

- Bot (`apps/yuudachi`): `pnpm --filter yuudachi start` (runs `dist/index.js`).
- Bot build checks: `pnpm --filter yuudachi build:check`.
- Bot migrations: `pnpm --filter yuudachi migrate`.
- Bot deploy commands: `pnpm --filter yuudachi deploy:commands`.
- Next apps preview: `pnpm --filter @yuudachi/website preview`.
- Next build: `pnpm --filter @yuudachi/website build`.
- Next build for report: `pnpm --filter @yuudachi/report build`.

### E2E Tests (Next Apps)

- `pnpm --filter @yuudachi/website test:e2e` runs Playwright.
- `pnpm --filter @yuudachi/website test:e2e:ui` for interactive mode.
- `pnpm --filter @yuudachi/report test:e2e` runs Playwright.

### Linting/Formatting Details

- `lint` runs `tsgo` + `oxfmt --check` + `oxlint`.
- `format` runs `oxfmt` and `oxlint --fix --fix-suggestions`.
- Use `pnpm --filter <workspace> format` for a single package/app.
- If lint fails on types, run `pnpm --filter <pkg> build:check` first.

## Code Style Guidelines

### Language & Modules

- TypeScript everywhere; repository is ESM (`"type": "module"`).
- Use `import type` for type-only imports.
- Relative imports in Node packages/apps should include `.js` extensions.
- Next apps use `@/` alias for `src` and avoid deep relative paths.

### Formatting

- Use tabs for indentation (existing files use tabs).
- Prefer double quotes for strings.
- Include trailing commas in multiline objects/arrays/functions.
- Let `oxfmt`/`prettier` handle spacing and line wrapping.

### Imports

- Group imports: type-only first, then value imports, then local modules.
- Prefer named exports; use default exports for `Command` classes as shown.
- Keep import specifiers ordered and avoid unused imports (strict TS).

### Types & Generics

- Prefer `type` aliases for simple shapes; use `interface` only when extending.
- Avoid `any`; use `unknown` + type guards when necessary.
- Be explicit with `undefined` because `noUncheckedIndexedAccess` is enabled.
- Use `const enum` or `as const` for shared constants when appropriate.

### Naming

- `PascalCase` for classes, React components, and type aliases.
- `camelCase` for functions, variables, and methods.
- `SCREAMING_SNAKE_CASE` for global constants in `Constants.ts`.
- File names use `camelCase` for utilities and `PascalCase` for components.
- Route/feature folders may use `kebab-case` (e.g., `context-menu`).

### Error Handling

- Prefer early returns and explicit guards.
- Throw `Error` with localized messages via `i18next.t` for user-facing errors.
- Use `try/catch` around network or Discord API calls; rethrow with context.
- Avoid silent failures; either log or propagate errors.

### Async & Promise Usage

- Use `async`/`await` instead of `.then` chains.
- Always `await` Discord/DB API calls that return promises.
- Avoid unhandled promises in event handlers.

### React/Next.js

- Place `"use client"` at top of client components.
- Prefer function components; export named components.
- Keep styling in `src/styles` or `src/components/ui` helpers.
- Use `composeRenderProps` and `cva` patterns as in existing UI components.

### Backend/Framework

- Use DI via `@needle-di/core` where existing patterns rely on `@injectable()`.
- Extend `Command`/`Component` classes with generics from `@yuudachi/framework`.
- Use explicit `CacheType` generics when working with Discord.js interactions.

## Testing Conventions

- Vitest config lives in `vitest.config.ts` per app/package.
- Tests typically live under `__tests__` in each project.
- `passWithNoTests` is true, so missing tests won't fail CI.
- Coverage output is written to `coverage/` when running `pnpm test`.

## Lint/Typecheck Conventions

- ESLint uses `eslint-config-neon` plus `oxlint` rules.
- `tsgo` provides type checking and declaration emit in builds.
- TypeScript `strict` mode is on in base `tsconfig.json`.

## Cursor/Copilot Rules

- No `.cursor/rules`, `.cursorrules`, or `.github/copilot-instructions.md` found.

## Docs/Config References

- Root scripts: `package.json`.
- App scripts: `apps/*/package.json`.
- Package scripts: `packages/*/package.json`.
- Lint config: `eslint.config.js`.
- Workspace: `pnpm-workspace.yaml`.

## Notes For Agents

- Keep changes minimal and aligned with existing conventions.
- Update or add tests when touching business logic.
- Avoid editing generated files (`dist`, `.next`, `coverage`).
- Ensure new files follow workspace TypeScript settings.
- Use `pnpm --filter <workspace>` when running commands in one package.
- For repository-wide changes, run `pnpm lint` and `pnpm test`.

## Quick Command Cheatsheet

- Install: `pnpm install`.
- Build all: `pnpm build`.
- Lint all: `pnpm lint`.
- Format all: `pnpm fmt`.
- Test all: `pnpm test`.
- Website dev: `pnpm --filter @yuudachi/website dev`.
- Report dev: `pnpm --filter @yuudachi/report dev`.
- Bot dev: `pnpm --filter yuudachi start:dev`.
- Bot migrate: `pnpm --filter yuudachi migrate`.
- Single test: `pnpm test -- path/to/test`.
- Single package test: `pnpm --filter @yuudachi/website test -- path`.
