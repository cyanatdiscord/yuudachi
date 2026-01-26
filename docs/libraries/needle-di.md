# Dependency Injection with @needle-di/core

> Guide for dependency injection using @needle-di/core in this codebase.

This project uses [@needle-di/core](https://github.com/needle-di/needle-di) for dependency injection, providing a lightweight and TypeScript-native DI solution with decorators and symbolic tokens.

## Quick Start

### Making a Class Injectable

Use the `@injectable()` decorator to mark classes for DI:

```typescript
import { injectable } from "@needle-di/core";
import { Command } from "@yuudachi/framework";

@injectable()
export default class PingCommand extends Command {
	// ...
}
```

### Constructor Injection

Inject dependencies using the `inject()` function with default parameter values:

```typescript
import { inject, injectable } from "@needle-di/core";
import type { Redis } from "ioredis";
import type { Sql } from "postgres";
import { kRedis, kSQL } from "@yuudachi/framework";

@injectable()
export default class extends Command {
	public constructor(
		public readonly redis: Redis = inject(kRedis),
		public readonly sql: Sql<any> = inject(kSQL),
	) {
		super();
	}
}
```

## Core Concepts

### 1. Symbolic Tokens

Symbolic tokens are the primary mechanism for identifying dependencies. They decouple the injection point from the concrete implementation.

The framework defines tokens in `packages/framework/src/container/`:

| Token | Type | Description |
|-------|------|-------------|
| `kRedis` | `Redis` | ioredis client instance |
| `kSQL` | `Sql<any>` | postgres SQL client |
| `kCommands` | `Map<string, Command>` | Registered commands map |
| `kComponents` | `Map<string, Component>` | Registered components map |
| `kWebhooks` | `Map<string, Webhook>` | Webhook instances |
| `Client` | `Client<true>` | discord.js Client (uses class as token) |

### 2. Token Creation

Define new tokens using `Symbol` for type-safe dependency resolution:

```typescript
// In container/myService.ts
export const kMyService = Symbol("kMyService");
```

Register the token in the container setup:

```typescript
import { Container } from "@needle-di/core";
import { kMyService } from "./myService.js";

const container = new Container();
container.bind(kMyService).toValue(new MyService());
```

### 3. Class-Based Tokens

For framework classes like the Discord.js `Client`, the class itself serves as the injection token:

```typescript
import { inject, injectable } from "@needle-di/core";
import { Client } from "discord.js";

@injectable()
export default class extends Command {
	public constructor(
		public readonly client: Client<true> = inject(Client),
	) {
		super();
	}
}
```

This pattern is useful when:
- The class is a singleton with a well-known type
- You don't need to swap implementations
- The class type itself is sufficient for identification

### 4. Container Lifecycle

The DI container is configured at application startup in the framework package. The container:
1. Creates singleton instances for services (Redis, SQL, Client)
2. Registers symbolic tokens for each service
3. Provides instances on demand via `inject()`

## Common Patterns

### Injecting Multiple Dependencies

Commands often need multiple services:

```typescript
@injectable()
export default class extends Command {
	public constructor(
		public readonly sql: Sql<any> = inject(kSQL),
		public readonly redis: Redis = inject(kRedis),
		public readonly client: Client<true> = inject(Client),
	) {
		super();
	}

	public override async chatInput(interaction: InteractionParam): Promise<void> {
		// Use this.sql, this.redis, this.client
	}
}
```

### Event Handlers with DI

Events also support dependency injection:

```typescript
@injectable()
export default class implements Event {
	public name = "Member join handler";
	public event = Events.GuildMemberAdd;

	public constructor(
		public readonly sql: Sql<any> = inject(kSQL),
	) {}

	public async execute(): Promise<void> {
		// Use this.sql
	}
}
```

### Testing with Mock Dependencies

For unit tests, you can create a test container with mock implementations:

```typescript
import { Container } from "@needle-di/core";
import { kSQL } from "@yuudachi/framework";

const testContainer = new Container();
testContainer.bind(kSQL).toValue(mockSql);
```

## Best Practices

1. **Always use `@injectable()`** on classes that need DI.
2. **Prefer symbolic tokens** for services (e.g., `kRedis`, `kSQL`).
3. **Use class references** for framework classes like `Client`.
4. **Keep dependencies minimal** - only inject what you need.
5. **Store injected values as readonly properties** for clarity.
6. **Use descriptive token names** - prefix with `k` (e.g., `kMyService`).
7. **Colocate tokens with their setup** - keep token definitions near registration code.

## Documentation Links

- [needle-di GitHub](https://github.com/needle-di/needle-di) - Source code and documentation
- [Dependency Injection Pattern](https://en.wikipedia.org/wiki/Dependency_injection) - Background on DI concepts
- [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html) - Official decorator documentation
