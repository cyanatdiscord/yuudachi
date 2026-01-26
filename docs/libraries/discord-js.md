# Discord.js Patterns

> Guide for Discord bot development patterns using discord.js.

This project uses [discord.js](https://discord.js.org/) v14 with a custom framework layer (`@yuudachi/framework`) that provides structure for commands, events, and interactions.

## Quick Start

Commands extend the `Command` base class from `@yuudachi/framework`:

```typescript
import { injectable } from "@needle-di/core";
import { Command } from "@yuudachi/framework";
import type { ArgsParam, InteractionParam, LocaleParam } from "@yuudachi/framework/types";
import { MessageFlags } from "discord.js";
import i18next from "i18next";
import type { PingCommand } from "../../interactions/index.js";

@injectable()
export default class extends Command {
	public override chatInput(
		interaction: InteractionParam,
		args: ArgsParam<typeof PingCommand>,
		locale: LocaleParam,
	): Promise<void> {
		return interaction.reply({
			content: i18next.t("commands.ping.success", { lng: locale }),
			flags: MessageFlags.Ephemeral,
		});
	}
}
```

## Core Concepts

### 1. Command Architecture

Commands are organized with a clear separation between **definition** and **implementation**:

**Definition** (`src/interactions/`): Declares the command structure
```typescript
import type { RESTPostAPIApplicationCommandsJSONBody } from "discord.js";

export const PingCommand = {
	name: "ping",
	description: "Ping the bot",
	name_localizations: {
		de: "ping",
		ja: "ピング",
	},
	description_localizations: {
		de: "Pingt den Bot",
		ja: "ボットにピングを送信",
	},
} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
```

**Implementation** (`src/commands/`): Handles the command logic
```typescript
@injectable()
export default class extends Command {
	public override chatInput(interaction, args, locale): Promise<void> {
		// Command logic here
	}
}
```

This separation enables:
- Type-safe argument extraction via `ArgsParam<typeof CommandDefinition>`
- Centralized command registration
- Clear organization of localized strings

### 2. Command Methods

The `Command` base class provides virtual methods for different interaction types:

| Method | Purpose | When to Use |
|--------|---------|-------------|
| `chatInput()` | Handle slash command interactions | Main command entry point |
| `autocomplete()` | Handle autocomplete interactions | Dynamic option suggestions |
| `messageContext()` | Handle message context menu | Right-click on messages |
| `userContext()` | Handle user context menu | Right-click on users |

All methods use the `override` keyword:
```typescript
public override chatInput(interaction, args, locale): Promise<void> {
	// ...
}
```

### 3. Event Handling

Events implement the `Event` interface with an `execute()` method:

```typescript
import { injectable } from "@needle-di/core";
import type { Event } from "@yuudachi/framework";
import { Events } from "discord.js";

@injectable()
export default class implements Event {
	public name = "Guild member add handler";
	public event = Events.GuildMemberAdd;

	public async execute(): Promise<void> {
		// Event handling logic
	}
}
```

**Key properties:**
- `name`: Human-readable identifier for logging
- `event`: Discord.js event constant from `Events` enum
- `execute()`: Async method containing the handler logic

### 4. Localization with i18next

All user-facing strings use i18next for internationalization:

```typescript
import i18next from "i18next";

// In command handler
const message = i18next.t("commands.ban.success", {
	lng: locale,
	user: target.user.tag,
});
```

Locale files are organized in `apps/yuudachi/locales/{locale}/*.json`:
```
locales/
├── en/
│   └── commands.json
├── de/
│   └── commands.json
└── ja/
    └── commands.json
```

## Common Patterns

### Async Event Iteration

Use `for await...of` with `EventEmitter.on()` for continuous event handling:

```typescript
import { on } from "node:events";
import type { GuildMember } from "discord.js";

for await (const [member] of on(client, Events.GuildMemberAdd) as AsyncIterableIterator<[GuildMember]>) {
	// Handle each member join
}
```

This pattern is useful for:
- Long-running event listeners
- Processing events sequentially
- Clean async/await syntax

### Webhook Handling

Webhooks are stored in an injected map for reuse:

```typescript
import { inject } from "@needle-di/core";
import { kWebhooks } from "@yuudachi/framework";

@injectable()
export default class extends Command {
	public constructor(
		public readonly webhooks: Map<string, Webhook> = inject(kWebhooks),
	) {
		super();
	}
}
```

### Ephemeral Responses

For sensitive or user-specific responses, use ephemeral messages:

```typescript
return interaction.reply({
	content: "This message is only visible to you",
	flags: MessageFlags.Ephemeral,
});
```

### Deferred Replies

For long-running operations, defer the reply first:

```typescript
public override async chatInput(interaction, args, locale): Promise<void> {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	// Long-running operation
	const result = await expensiveOperation();

	await interaction.editReply({ content: result });
}
```

### Error Handling in Events

Wrap event handlers in try-catch to prevent crashes:

```typescript
public async execute(): Promise<void> {
	try {
		// Event logic
	} catch (error) {
		const error_ = error as Error;
		logger.error({ error: error_.message }, "Event handler failed");
	}
}
```

### Autocomplete Implementation

Provide dynamic suggestions for command options:

```typescript
public override async autocomplete(
	interaction: AutocompleteInteraction,
): Promise<void> {
	const focused = interaction.options.getFocused();
	const choices = await getMatchingChoices(focused);

	await interaction.respond(
		choices.slice(0, 25).map((choice) => ({
			name: choice.label,
			value: choice.id,
		})),
	);
}
```

## Best Practices

1. **Use `override` keyword** for virtual method implementations.
2. **Always use i18next** for user-facing strings.
3. **Keep commands focused** - delegate complex logic to functions.
4. **Handle errors gracefully** with try-catch in event handlers.
5. **Use `MessageFlags.Ephemeral`** for sensitive responses.
6. **Defer replies** for operations that may take longer than 3 seconds.
7. **Limit autocomplete results** to 25 items (Discord's maximum).
8. **Use `satisfies`** for type checking command definitions.

## Documentation Links

- [discord.js Documentation](https://discord.js.org/docs) - Official discord.js documentation
- [discord.js Guide](https://discordjs.guide/) - Comprehensive tutorials and examples
- [Discord API Documentation](https://discord.com/developers/docs) - Official Discord API reference
- [i18next Documentation](https://www.i18next.com/) - Internationalization framework docs
