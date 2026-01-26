# CLAUDE.md

## Repository overview

- Monorepo using pnpm workspaces (`pnpm-workspace.yaml`).
- Apps: `yuudachi` (Discord bot), `website` (Next.js dashboard), `report` (MDX reports).
- Packages: `framework` (@yuudachi/framework), `http` (@yuudachi/http).
- Root configs: `eslint.config.js`, `tsconfig.json`, `.oxfmtrc.json`, `vitest.config.ts`.
- Tooling: oxfmt, oxlint, ESLint (eslint-config-neon), TypeScript strict, Vitest.
- Library guides: `docs/libraries/` (needle-di, discord-js, postgres, bullmq).

## Directory structure

- `apps/yuudachi/src/` - Main bot application
  - `commands/` - Slash commands organized by category (`moderation/`, `utility/`).
  - `events/` - Discord event handlers (`anti-scam/`, `anti-spam/`, `guild-log/`, `member-log/`, `role-assignment/`).
  - `functions/` - Feature modules (`cases/`, `appeals/`, `lockdowns/`, `anti-scam/`, `anti-spam/`, `reports/`, `logging/`, `settings/`, `autocomplete/`, `formatters/`, `pruning/`).
  - `interactions/` - Command and component definitions.
  - `util/` - Utilities and API setup.
  - `websocket/` - WebSocket connection handlers.
  - `Constants.ts` - Centralized constants (thresholds, colors, limits).
  - `index.ts` - Entry point.
  - `jobs.ts` - BullMQ job registration.
  - `deploy.ts` - Deployment script for slash commands.
- `apps/website/src/` - Next.js dashboard
  - `app/` - App Router pages.
  - `components/` - React components.
- `apps/report/src/` - MDX report site.
- `packages/framework/src/` - Core Discord framework
  - `Command.ts` - Base Command class.
  - `Component.ts` - Base Component class.
  - `Interaction.ts` - Interaction types.
  - `container/` - DI setup (`postgres.ts`, `redis.ts`, `client.ts`, `api.ts`, `commands.ts`, `components.ts`).
  - `logger.ts` - Pino logger configuration.
- `packages/http/src/` - Fastify HTTP utilities and Discord interaction verification.

## Website routes (`apps/website/src/app/`)

- `/` - Home (logo)
- `/login` - Discord OAuth login
- `/api/discord/callback`, `/api/discord/logout` - OAuth handlers
- `/dashboard` - Redirects to moderation
- `/dashboard/appeal` - Ban appeal form
- `/dashboard/moderation/` - Moderation hub (sidebar layout)
  - `/guilds` - Guild list
  - `/guilds/[guildId]/` - Guild overview (tabs: overview, settings, access)
    - `/cases`, `/cases/[caseId]` - Cases list and details
    - `/appeals`, `/appeals/[appealId]` - Appeals list and details

## Package manager

- Use `pnpm` only (v10.24.0). Node.js >= 24.0.0 required.
- Install: `pnpm install`. Scope: `pnpm --filter yuudachi <cmd>` or `pnpm --filter @yuudachi/website <cmd>`.

## Commands

- Build all: `pnpm build`. Test: `pnpm test`. Lint: `pnpm lint`. Format: `pnpm format`.
- Update deps: `pnpm update` / `pnpm update:latest`.
- Bot: `pnpm --filter yuudachi build`, `build:check` (tsgo), `start`, `dev`, `deploy:commands`, `migrate`.
- Website: `pnpm --filter @yuudachi/website dev`, `build`, `preview`, `test:e2e`, `test:e2e:ui`.

## Test commands

- Unit: `pnpm test` or `pnpm test -- path/to/test.ts`.
- E2e: `pnpm --filter @yuudachi/website test:e2e`.
- Coverage: V8 reporter (`text`, `lcov`, `cobertura`).

## Code style: formatting

- oxfmt (not Prettier): tabs, 120 char width, trailing commas, LF endings.
- Import sorting via `experimentalSortImports`: builtin -> external -> internal -> parent -> sibling -> index.
- Run `pnpm format` after significant edits.

## Code style: imports

- ESM only with `.js` extensions in imports (even for .ts files).
- Group: Node builtins (`node:*`) -> external -> local. Use `import type` for type-only.
- No blank lines between import groups.

## Code style: TypeScript

- `tsconfig.json` is extremely strict; all strict flags enabled.
- Enabled: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`.
- No unused locals/parameters (`noUnusedLocals`, `noUnusedParameters`).
- Module: ESNext/NodeNext, target: ESNext.
- Use `override` keyword for method overrides.
- Avoid `any`; use `unknown` and type guards.
- Use `readonly` for immutable data. Prefer `type` for props; `interface` only when extending.
- Type parameters: PascalCase, at least 3 characters. Use `satisfies` to validate shapes.

## Code style: naming

- Files: `camelCase.ts` (functions), `PascalCase.ts` (classes/constants).
- Directories: `kebab-case`. Functions: `camelCase`. Types: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE`. Private fields: `#_fieldName`.
- Throwaway vars: `_`. Error shadows: `error_` suffix.

## Code style: Discord bot

- Commands extend `Command` from `@yuudachi/framework` with `@injectable()` decorator.
- Virtual methods: `chatInput()`, `autocomplete()`, `messageContext()`, `userContext()`.
- Events implement `Event` interface with `execute()` method.
- Interaction definitions in `interactions/` as `const satisfies RESTPostAPIApplicationCommandsJSONBody`.
- All user-facing strings use i18next.

## Code style: dependency injection

- Framework: `@needle-di/core`. Decorate with `@injectable()`.
- Inject via constructor: `inject(Token)` or default value pattern.
- Symbolic tokens: `kRedis`, `kSQL`, `kCommands`, `kWebhooks`, `kComponents`.
- Container setup: `packages/framework/src/container/`.

## Code style: database

- PostgreSQL via `postgres` (raw SQL, no ORM). Inject via `kSQL` token.
- Tagged templates: `` sql`SELECT * FROM cases WHERE id = ${id}` ``.
- Migrations via `ley` in `apps/yuudachi/migrations/`.

## Code style: caching and jobs

- Redis via `ioredis` (inject `kRedis`). BullMQ for job queues.
- Jobs in `apps/yuudachi/src/jobs.ts`.
- Cron patterns: `"* * * * *"` (every minute), `"*/5 * * * *"` (every 5 min).

## Code style: logging and errors

- Pino logger from `packages/framework/src/logger.ts`. Configure via `LOGGER_NAME`.
- Structured logging with context objects.
- Context object patterns:
  - Commands: `{ command: { name, type }, userId, guildId?, memberId? }`
  - Events: `{ event: { name, event }, guildId?, memberId?, channelId? }`
  - Guild actions: `{ event, guildId, userId: client.user.id, memberId }`
  - Jobs: `{ job: { name } }`
  - WebSocket: `{ msg, url, identity, code?, reason? }`
- Use `logger.info`/`logger.warn`/`logger.error` with descriptive messages.
- Try-catch with async/await. Error casting: `const error_ = error as Error`.
- i18next for localized error messages.
- Graceful handling in event listeners with empty catch blocks where appropriate.

## Code style: website

- Next.js 16 with App Router, React 19 with React Compiler.
- Default exports for route segments. `'use client';` for stateful components.
- TailwindCSS 4 with `cva` for variants, `tailwind-merge` for merging.
- React Aria Components for accessible primitives, TanStack Table for data tables.
- `lucide-react` for icons, `next-themes` for dark mode.

### UI components (`apps/website/src/components/ui/`)

- **Check existing components first** before creating new UI elements.
- Form: `Button`, `Input`, `TextField`, `SearchField`, `Checkbox`, `RadioGroup`, `Switch`, `Select`, `ComboBox`, `NumberField`
- Date/Time: `DatePicker`, `DateField`, `TimeField`, `Calendar`
- Layout: `Dialog`, `Modal`, `Sheet`, `Popover`, `Sidebar`, `Table`
- Navigation: `Dropdown`, `Menu`, `Tabs`, `Breadcrumbs`
- Display: `Tooltip`, `Separator`, `Link`, `Field`, `GridList`, `Disclosure`

### Design tokens (`apps/website/src/styles/base.css`)

- Colors: `base-neutral-*` (0-900), `base-tangerine-*` (primary), `base-sunset-*` (error/destructive)
- Typography: `text-base-heading-*`, `text-base-label-*`, `text-base-*` (xl/lg/md/sm/xs)
- Use design tokens, not arbitrary Tailwind colors.

## ESLint notes

- Flat config with eslint-config-neon presets: `common`, `node`, `typescript`, `react`, `jsx-a11y`, `next`, `edge`, `prettier`.
- `oxlint` for Rust-based linting with type-aware mode.
- Ignores: `node_modules`, `dist`, `coverage`, `.next`.

## Environment/config

- `env-cmd` for `.env` loading. Docker: `docker-compose.yml` for local PostgreSQL/Redis.
- Env vars: `REDISHOST`, `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDB`, `API_JWT_SECRET`, `API_PORT`, `DISCORD_TOKEN`, `SCAM_DOMAIN_WS`/`SCAM_DOMAIN_IDENTITY`, `LOGGER_NAME`.

## Tests

- Unit tests: `__tests__/` directories colocated with `src/`.
- E2e tests: `apps/website/e2e/` (Playwright).
- Use vitest with `describe`/`it`/`expect`.
- Coverage excludes: `*.{interface,type,d}.ts`, `index.{js,ts}`.

## Agent tips

- Keep diffs minimal and match existing patterns.
- Run `pnpm lint` before committing.
- Use `pnpm --filter` to scope commands to specific packages.
- Commands use i18next for all user-facing strings.
- Follow DI patterns when adding new services.
- Database queries use raw SQL with postgres tagged templates.
- Test changes with `pnpm test`.
- Prefer project scripts over ad-hoc tool commands.
- When introducing new libraries, create or update guides in `docs/libraries/`.
