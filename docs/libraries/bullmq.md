# Job Scheduling with BullMQ

> Guide for job scheduling and background tasks using BullMQ.

This project uses [BullMQ](https://docs.bullmq.io/) for job queuing and scheduling, built on top of Redis for reliable, distributed task processing.

## Quick Start

Jobs are registered in `apps/yuudachi/src/jobs.ts`:

```typescript
import { Queue, Worker } from "bullmq";
import type { Redis } from "ioredis";

export function registerJobs(redis: Redis): void {
	const queue = new Queue("scheduled-tasks", { connection: redis });

	// Add recurring jobs
	queue.upsertJobScheduler("modActionTimers", {
		pattern: "* * * * *", // Every minute
	});

	// Create worker to process jobs
	const worker = new Worker(
		"scheduled-tasks",
		async (job) => {
			switch (job.name) {
				case "modActionTimers":
					await handleModActionTimers();
					break;
			}
		},
		{ connection: redis },
	);
}
```

## Core Concepts

### 1. Queues and Workers

BullMQ separates the concepts of adding jobs (Queue) and processing them (Worker):

**Queue**: Responsible for adding and scheduling jobs
```typescript
const queue = new Queue("queue-name", { connection: redis });
```

**Worker**: Processes jobs from the queue
```typescript
const worker = new Worker(
	"queue-name",
	async (job) => {
		// Process the job
	},
	{ connection: redis },
);
```

This separation allows:
- Multiple workers processing the same queue (horizontal scaling)
- Adding jobs from different parts of the application
- Independent deployment of producers and consumers

### 2. Job Schedulers

Use `upsertJobScheduler` for recurring jobs. The "upsert" behavior ensures idempotent registration:

```typescript
queue.upsertJobScheduler("modActionTimers", {
	pattern: "* * * * *", // Every minute
});

queue.upsertJobScheduler("scamDomainUpdateTimers", {
	pattern: "*/5 * * * *", // Every 5 minutes
});
```

**Why upsert?** If the scheduler already exists, it updates the pattern instead of creating a duplicate. This is safe to call on every application restart.

### 3. Cron Patterns

Common cron patterns used in this project:

| Pattern | Description |
|---------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour (at minute 0) |
| `0 0 * * *` | Daily at midnight |
| `0 0 * * 0` | Weekly on Sunday at midnight |

Format: `minute hour day-of-month month day-of-week`

### 4. Job Processing

Jobs are processed in the worker callback. Use `job.name` to identify the job type:

```typescript
const worker = new Worker(
	"scheduled-tasks",
	async (job) => {
		switch (job.name) {
			case "modActionTimers":
				await handleModActionTimers();
				break;
			case "scamDomainUpdateTimers":
				await handleScamDomainUpdate();
				break;
			case "lockdownTimers":
				await handleLockdownTimers();
				break;
		}
	},
	{ connection: redis },
);
```

## Common Patterns

### Mod Action Timers

Handles expiring moderation actions (timeouts, bans):

```typescript
async function handleModActionTimers(): Promise<void> {
	const expiredActions = await sql<ExpiredAction[]>`
		SELECT * FROM mod_actions
		WHERE expires_at <= NOW()
		AND processed = false
	`;

	for (const action of expiredActions) {
		// Process expired action (e.g., remove timeout)
	}
}
```

### Lockdown Timers

Handles automatic lockdown expiration:

```typescript
async function handleLockdownTimers(): Promise<void> {
	const expiredLockdowns = await sql<Lockdown[]>`
		SELECT * FROM lockdowns
		WHERE expires_at <= NOW()
	`;

	for (const lockdown of expiredLockdowns) {
		// Unlock channels
	}
}
```

### Scam Domain Updates

Refreshes scam domain list:

```typescript
async function handleScamDomainUpdate(): Promise<void> {
	// Fetch updated domain list
	// Update Redis cache
}
```

### Error Handling

Handle job failures gracefully with try-catch and worker events:

```typescript
const worker = new Worker(
	"scheduled-tasks",
	async (job) => {
		try {
			// Job logic
		} catch (error) {
			logger.error({ error, jobName: job.name }, "Job failed");
			throw error; // Re-throw to trigger retry
		}
	},
	{
		connection: redis,
		autorun: true,
	},
);

worker.on("failed", (job, error) => {
	logger.error({ jobId: job?.id, error }, "Job permanently failed");
});
```

### One-Time Delayed Jobs

For actions that need to happen after a delay (not recurring):

```typescript
// Schedule a job to run in 1 hour
await queue.add("unban-user", { userId, guildId }, {
	delay: 60 * 60 * 1000, // 1 hour in milliseconds
});
```

## Best Practices

1. **Use upsertJobScheduler** for recurring jobs to avoid duplicates on restart.
2. **Handle errors** and log failures for debugging.
3. **Keep jobs idempotent** - they may run multiple times due to retries.
4. **Use appropriate intervals** - don't schedule more frequently than needed.
5. **Clean up completed jobs** to prevent memory issues.
6. **Log job execution** for monitoring and debugging.
7. **Use descriptive job names** that indicate what the job does.
8. **Consider job priority** if some jobs are more time-sensitive.

## Documentation Links

- [BullMQ Documentation](https://docs.bullmq.io/) - Official documentation and guides
- [BullMQ GitHub](https://github.com/taskforcesh/bullmq) - Source code and examples
- [Cron Expression Reference](https://crontab.guru/) - Interactive cron pattern generator
- [Redis Documentation](https://redis.io/docs/) - Underlying data store documentation
