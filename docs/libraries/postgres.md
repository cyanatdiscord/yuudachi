# PostgreSQL with postgres Package

> Guide for PostgreSQL database access using the postgres package.

This project uses the [postgres](https://github.com/porsager/postgres) package for database access, providing a safe and ergonomic way to write SQL queries with tagged template literals.

## Quick Start

The SQL client is injected via the `kSQL` token:

```typescript
import { inject, injectable } from "@needle-di/core";
import { kSQL } from "@yuudachi/framework";
import type { Sql } from "postgres";

@injectable()
export default class extends Command {
	public constructor(
		public readonly sql: Sql<any> = inject(kSQL),
	) {
		super();
	}
}
```

## Core Concepts

### 1. Tagged Template Queries

The postgres package uses tagged template literals to create parameterized queries. This prevents SQL injection by automatically escaping values:

```typescript
// Simple select
const [user] = await sql<[User]>`
	SELECT * FROM users
	WHERE id = ${userId}
`;

// Select with multiple conditions
const cases = await sql<RawCase[]>`
	SELECT * FROM cases
	WHERE guild_id = ${guildId}
	AND action_type = ${actionType}
	ORDER BY created_at DESC
	LIMIT ${limit}
`;
```

**How it works:**
- Template placeholders (`${...}`) are converted to parameterized query values
- The database driver handles escaping, preventing injection attacks
- Types are preserved (numbers stay numbers, strings stay strings)

### 2. Type Safety

Define result types for queries using TypeScript generics:

```typescript
interface RawCase {
	id: number;
	guild_id: string;
	case_id: number;
	action_type: string;
	target_id: string;
	moderator_id: string;
	reason: string | null;
	created_at: Date;
}

const [case_] = await sql<[RawCase]>`
	SELECT * FROM cases WHERE id = ${id}
`;
```

**Key points:**
- Use array syntax `<[Type]>` for single-row results
- Use `<Type[]>` for multi-row results
- The `_` suffix on `case_` avoids the reserved word conflict

### 3. Transactions

Wrap multiple operations in a transaction for atomicity:

```typescript
await sql.begin(async (sql) => {
	await sql`UPDATE accounts SET balance = balance - ${amount} WHERE id = ${fromId}`;
	await sql`UPDATE accounts SET balance = balance + ${amount} WHERE id = ${toId}`;
});
```

If any query fails, all changes are rolled back automatically.

### 4. Migrations with ley

Migrations are managed with `ley` in `apps/yuudachi/migrations/`:

```bash
# Run migrations
pnpm --filter yuudachi migrate
```

Migration file format:

```javascript
// migrations/001_create_cases.js
export async function up(sql) {
	await sql`
		CREATE TABLE cases (
			id SERIAL PRIMARY KEY,
			guild_id TEXT NOT NULL,
			case_id INTEGER NOT NULL,
			action_type TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)
	`;
}

export async function down(sql) {
	await sql`DROP TABLE cases`;
}
```

## Common Patterns

### Insert Operations

```typescript
// Insert single row
await sql`
	INSERT INTO cases (
		guild_id,
		case_id,
		action_type,
		target_id,
		moderator_id,
		reason
	) VALUES (
		${guildId},
		${caseId},
		${actionType},
		${targetId},
		${moderatorId},
		${reason}
	)
`;

// Insert with RETURNING
const [newCase] = await sql<[RawCase]>`
	INSERT INTO cases (guild_id, case_id, action_type)
	VALUES (${guildId}, ${caseId}, ${actionType})
	RETURNING *
`;
```

### Update Operations

```typescript
// Update with conditions
await sql`
	UPDATE cases
	SET
		reason = ${reason},
		updated_at = NOW()
	WHERE guild_id = ${guildId}
	AND case_id = ${caseId}
`;
```

### Delete Operations

```typescript
await sql`
	DELETE FROM cases
	WHERE guild_id = ${guildId}
	AND case_id = ${caseId}
`;
```

### Checking for Existence

```typescript
const [row] = await sql<[{ exists: boolean }]>`
	SELECT EXISTS (
		SELECT 1 FROM cases WHERE guild_id = ${guildId} AND case_id = ${caseId}
	)
`;

if (row.exists) {
	// Case exists
}
```

### Counting Rows

```typescript
const [{ count }] = await sql<[{ count: string }]>`
	SELECT COUNT(*) FROM cases WHERE guild_id = ${guildId}
`;

const total = Number.parseInt(count, 10);
```

## Best Practices

1. **Always use tagged templates** - never string concatenation for SQL.
2. **Type your results** with generic parameters for type safety.
3. **Use transactions** for multi-statement operations that must be atomic.
4. **Handle empty results** - queries return empty arrays, not null.
5. **Use `case_` suffix** when `case` is a reserved word.
6. **Keep queries close to usage** - don't abstract simple queries unnecessarily.
7. **Use RETURNING** for inserts when you need the created row.
8. **Prefer specific columns** over `SELECT *` for production code.

## Documentation Links

- [postgres GitHub](https://github.com/porsager/postgres) - Source code and full documentation
- [ley Migrations](https://github.com/lukeed/ley) - Migration tool documentation
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) - Official PostgreSQL docs
