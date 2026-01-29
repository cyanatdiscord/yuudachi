# Documentation

> Library guides, API documentation, and patterns for the yuudachi Discord bot.

This directory contains documentation for the key libraries, APIs, and patterns used throughout the codebase. Each guide provides practical examples drawn from actual project code.

## Structure

```
docs/
├── README.md           # This file - documentation index
├── api/
│   └── fingerprints.md # Fingerprints API reference
└── libraries/
    ├── needle-di.md    # Dependency injection
    ├── postgres.md     # Database queries
    ├── bullmq.md       # Job scheduling
    └── discord-js.md   # Bot command patterns
```

## API Reference

| API          | Guide                                    | Description                                        |
| ------------ | ---------------------------------------- | -------------------------------------------------- |
| Fingerprints | [fingerprints.md](./api/fingerprints.md) | Attachment fingerprint tracking and moderation API |

## Libraries

| Library         | Guide                                      | Description                                                        |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| @needle-di/core | [needle-di.md](./libraries/needle-di.md)   | Dependency injection framework with decorators and symbolic tokens |
| postgres        | [postgres.md](./libraries/postgres.md)     | PostgreSQL tagged template queries with type safety                |
| BullMQ          | [bullmq.md](./libraries/bullmq.md)         | Job queues and scheduled tasks using Redis                         |
| discord.js      | [discord-js.md](./libraries/discord-js.md) | Discord bot commands, events, and interaction patterns             |

## Quick Reference

### Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Discord   │────>│   Command    │────>│   Service   │
│ Interaction │     │   Handler    │     │   Logic     │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                    │
                           │ inject()           │ inject()
                           ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐
                    │    Redis     │     │  PostgreSQL │
                    │   (kRedis)   │     │   (kSQL)    │
                    └──────────────┘     └─────────────┘
```

### Key Patterns

**Dependency Injection**

```typescript
@injectable()
export default class extends Command {
	public constructor(public readonly sql: Sql<any> = inject(kSQL)) {
		super();
	}
}
```

**Database Queries**

```typescript
const [user] = await sql<[User]>`
    SELECT * FROM users WHERE id = ${userId}
`;
```

**Job Scheduling**

```typescript
queue.upsertJobScheduler("taskName", {
	pattern: "*/5 * * * *", // Every 5 minutes
});
```

**Command Handler**

```typescript
public override chatInput(
    interaction: InteractionParam,
    args: ArgsParam<typeof PingCommand>,
    locale: LocaleParam,
): Promise<void> {
    return interaction.reply({
        content: i18next.t("commands.ping.success", { lng: locale }),
    });
}
```

## Adding Documentation

When adding a new library guide:

1. **Create the file** in `docs/libraries/` following the naming convention (`library-name.md`)

2. **Follow the template structure**:

   ```markdown
   # Library Name

   > One-line description of what this guide covers.

   ## Quick Start

   [Basic setup and usage]

   ## Core Concepts

   ### 1. First Concept

   ### 2. Second Concept

   ## Common Patterns

   [Real-world examples from the codebase]

   ## Best Practices

   [Numbered list of recommendations]

   ## Documentation Links

   [External resources]
   ```

3. **Include real examples** from the codebase, not hypothetical code

4. **Update this README** to add the new guide to the Libraries table

5. **Cross-reference** other guides where relevant using relative links

### Style Guidelines

- Use code blocks with syntax highlighting (`typescript`, `bash`, etc.)
- Include tables for reference data (tokens, patterns, methods)
- Keep explanations concise but thorough
- Link to official documentation in the "Documentation Links" section
