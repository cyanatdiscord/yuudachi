import postgres from "postgres";

const sql = postgres({
	types: {
		date: {
			to: 1_184,
			from: [1_082, 1_083, 1_114, 1_184],
			serialize: (date: Date) => date.toISOString(),
			parse: (isoString: string) => isoString,
		},
	},
});

// Test Guild IDs (Discord snowflake format)
const GUILD_IDS = [
	"111111111111111111", // Alpha
	"222222222222222222", // Beta
	"333333333333333333", // Gamma
	"444444444444444444", // Delta
	"555555555555555555", // Epsilon
];

// Test User IDs
const USER_IDS = Array.from({ length: 20 }, (_, index) => `10000000000000000${String(index + 1).padStart(2, "0")}`);

// Test Channel IDs
const CHANNEL_IDS = [
	"900000000000000001",
	"900000000000000002",
	"900000000000000003",
	"900000000000000004",
	"900000000000000005",
];

// Generate a deterministic SHA256-like hash for testing
function generateHash(seed: string): string {
	const base = seed.padEnd(64, "0").slice(0, 64);
	return base.replaceAll(/[^a-f0-9]/gi, "a").toLowerCase();
}

// Status constants
const STATUS_NORMAL = 0;
const STATUS_FLAGGED = 1;
const STATUS_TRUSTED = 2;

// Fingerprint seed data
const fingerprintData = [
	{
		hash: generateHash("0001"),
		status: STATUS_NORMAL,
		guildCount: 1,
		userCount: 1,
		occurrenceCount: 2,
		sampleFileSize: 10_240,
		sampleContentType: "image/png",
		sampleFilename: "screenshot.png",
		daysAgo: 2,
		description: "Low activity, new fingerprint",
	},
	{
		hash: generateHash("0002"),
		status: STATUS_NORMAL,
		guildCount: 2,
		userCount: 3,
		occurrenceCount: 5,
		sampleFileSize: 25_600,
		sampleContentType: "image/jpeg",
		sampleFilename: "photo.jpg",
		daysAgo: 5,
		description: "Moderate activity",
	},
	{
		hash: generateHash("0003"),
		status: STATUS_NORMAL,
		guildCount: 6,
		userCount: 10,
		occurrenceCount: 20,
		sampleFileSize: 51_200,
		sampleContentType: "image/png",
		sampleFilename: "meme.png",
		daysAgo: 4,
		description: "Suspicious (auto-threshold)",
	},
	{
		hash: generateHash("0004"),
		status: STATUS_NORMAL,
		guildCount: 8,
		userCount: 15,
		occurrenceCount: 35,
		sampleFileSize: 102_400,
		sampleContentType: "image/gif",
		sampleFilename: "animation.gif",
		daysAgo: 3,
		description: "Very suspicious",
	},
	{
		hash: generateHash("0005"),
		status: STATUS_FLAGGED,
		guildCount: 12,
		userCount: 30,
		occurrenceCount: 150,
		sampleFileSize: 1_048_576,
		sampleContentType: "application/octet-stream",
		sampleFilename: "free_nitro.exe",
		daysAgo: 7,
		description: "Known spam, flagged by admin",
		flaggedBy: "100000000000000001",
	},
	{
		hash: generateHash("0006"),
		status: STATUS_FLAGGED,
		guildCount: 5,
		userCount: 12,
		occurrenceCount: 45,
		sampleFileSize: 512_000,
		sampleContentType: "application/pdf",
		sampleFilename: "invoice.pdf",
		daysAgo: 10,
		description: "Malware, flagged",
		flaggedBy: "100000000000000002",
	},
	{
		hash: generateHash("0007"),
		status: STATUS_TRUSTED,
		guildCount: 50,
		userCount: 200,
		occurrenceCount: 800,
		sampleFileSize: 204_800,
		sampleContentType: "image/jpeg",
		sampleFilename: "cat_meme.jpg",
		daysAgo: 14,
		description: "Popular meme, verified safe",
	},
	{
		hash: generateHash("0008"),
		status: STATUS_TRUSTED,
		guildCount: 25,
		userCount: 80,
		occurrenceCount: 300,
		sampleFileSize: 153_600,
		sampleContentType: "image/png",
		sampleFilename: "discord_emoji.png",
		daysAgo: 21,
		description: "Common image, trusted",
	},
	{
		hash: generateHash("0009"),
		status: STATUS_NORMAL,
		guildCount: 1,
		userCount: 1,
		occurrenceCount: 1,
		sampleFileSize: 5_120,
		sampleContentType: "image/webp",
		sampleFilename: "sticker.webp",
		daysAgo: 0,
		description: "Brand new, single occurrence",
	},
	{
		hash: generateHash("0010"),
		status: STATUS_NORMAL,
		guildCount: 3,
		userCount: 4,
		occurrenceCount: 8,
		sampleFileSize: 76_800,
		sampleContentType: "image/png",
		sampleFilename: "old_image.png",
		daysAgo: 30,
		description: "Old fingerprint (30 days ago)",
	},
];

// Helper to calculate date offset
function daysAgoDate(days: number): Date {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return date;
}

// Helper to get random items from an array (deterministic based on index)
function getItemsFromIndex<T>(array: T[], count: number, startIndex: number = 0): T[] {
	const result: T[] = [];
	for (let index = 0; index < count; index++) {
		result.push(array[(startIndex + index) % array.length]!);
	}

	return result;
}

async function seed() {
	console.log("Seeding fingerprint data...\n");

	// 1. Insert fingerprints
	console.log("Inserting attachment_fingerprints...");
	for (const fp of fingerprintData) {
		const firstSeenAt = daysAgoDate(fp.daysAgo);
		const lastSeenAt = daysAgoDate(Math.max(0, fp.daysAgo - 1));

		await sql`
			INSERT INTO attachment_fingerprints (
				hash,
				first_seen_at,
				last_seen_at,
				occurrence_count,
				guild_count,
				user_count,
				action_count,
				status,
				flagged_at,
				flagged_by,
				sample_file_size,
				sample_content_type,
				sample_filename,
				notes
			) VALUES (
				${fp.hash},
				${firstSeenAt},
				${lastSeenAt},
				${fp.occurrenceCount},
				${fp.guildCount},
				${fp.userCount},
				${fp.status === STATUS_FLAGGED ? Math.floor(fp.occurrenceCount * 0.3) : 0},
				${fp.status},
				${fp.flaggedBy ? daysAgoDate(fp.daysAgo - 1) : null},
				${fp.flaggedBy ?? null},
				${fp.sampleFileSize},
				${fp.sampleContentType},
				${fp.sampleFilename},
				${fp.description}
			)
		`;
	}

	// 2. Insert guild associations
	console.log("Inserting attachment_fingerprint_guilds...");
	for (const [fpIndex, fp] of fingerprintData.entries()) {
		const guilds = getItemsFromIndex(GUILD_IDS, Math.min(fp.guildCount, GUILD_IDS.length), fpIndex);
		for (const guildId of guilds) {
			const guildOccurrences = Math.ceil(fp.occurrenceCount / guilds.length);
			const guildUsers = Math.ceil(fp.userCount / guilds.length);
			const firstSeenAt = daysAgoDate(fp.daysAgo);
			const lastSeenAt = daysAgoDate(Math.max(0, fp.daysAgo - 1));

			await sql`
				INSERT INTO attachment_fingerprint_guilds (
					hash,
					guild_id,
					first_seen_at,
					last_seen_at,
					occurrence_count,
					user_count
				) VALUES (
					${fp.hash},
					${guildId},
					${firstSeenAt},
					${lastSeenAt},
					${guildOccurrences},
					${guildUsers}
				)
			`;
		}
	}

	// 3. Insert user associations
	console.log("Inserting attachment_fingerprint_users...");
	for (const [fpIndex, fp] of fingerprintData.entries()) {
		const users = getItemsFromIndex(USER_IDS, Math.min(fp.userCount, USER_IDS.length), fpIndex);
		for (const userId of users) {
			const firstSeenAt = daysAgoDate(fp.daysAgo);

			await sql`
				INSERT INTO attachment_fingerprint_users (
					hash,
					user_id,
					first_seen_at
				) VALUES (
					${fp.hash},
					${userId},
					${firstSeenAt}
				)
			`;
		}
	}

	// 4. Insert guild-user associations
	console.log("Inserting attachment_fingerprint_guild_users...");
	for (const [fpIndex, fp] of fingerprintData.entries()) {
		const guilds = getItemsFromIndex(GUILD_IDS, Math.min(fp.guildCount, GUILD_IDS.length), fpIndex);
		const users = getItemsFromIndex(USER_IDS, Math.min(fp.userCount, USER_IDS.length), fpIndex);

		// Distribute users across guilds
		for (const [guildIndex, guildId] of guilds.entries()) {
			const usersPerGuild = Math.ceil(users.length / guilds.length);
			const startIndex = guildIndex * usersPerGuild;
			const guildUsers = users.slice(startIndex, startIndex + usersPerGuild);

			for (const userId of guildUsers) {
				const firstSeenAt = daysAgoDate(fp.daysAgo);

				await sql`
					INSERT INTO attachment_fingerprint_guild_users (
						hash,
						guild_id,
						user_id,
						first_seen_at
					) VALUES (
						${fp.hash},
						${guildId},
						${userId},
						${firstSeenAt}
					)
					ON CONFLICT (hash, guild_id, user_id) DO NOTHING
				`;
			}
		}
	}

	// 5. Insert occurrences
	console.log("Inserting attachment_fingerprint_occurrences...");
	let messageIdCounter = 800_000_000_000_000_000n;

	for (const [fpIndex, fp] of fingerprintData.entries()) {
		const guilds = getItemsFromIndex(GUILD_IDS, Math.min(fp.guildCount, GUILD_IDS.length), fpIndex);
		const users = getItemsFromIndex(USER_IDS, Math.min(fp.userCount, USER_IDS.length), fpIndex);

		// Limit occurrences to 50 per fingerprint for seed data
		const occurrencesToInsert = Math.min(fp.occurrenceCount, 50);
		for (let occurrence = 0; occurrence < occurrencesToInsert; occurrence++) {
			const guildId = guilds[occurrence % guilds.length]!;
			const userId = users[occurrence % users.length]!;
			const channelId = CHANNEL_IDS[occurrence % CHANNEL_IDS.length]!;
			const messageId = String(messageIdCounter++);
			const createdAt = daysAgoDate(fp.daysAgo - Math.floor(occurrence / 10));

			// Some occurrences have case_id (simulating moderation action taken)
			const hasCaseId = fp.status === STATUS_FLAGGED && occurrence < 5;

			await sql`
				INSERT INTO attachment_fingerprint_occurrences (
					hash,
					guild_id,
					user_id,
					channel_id,
					message_id,
					case_id,
					created_at
				) VALUES (
					${fp.hash},
					${guildId},
					${userId},
					${channelId},
					${messageId},
					${hasCaseId ? occurrence + 1 : null},
					${createdAt}
				)
			`;
		}
	}

	console.log("\n✓ Fingerprint seed data inserted successfully");
	console.log(`  - ${fingerprintData.length} fingerprints`);
	console.log(`  - Various guild, user, and occurrence associations`);

	await sql.end();
}

try {
	await seed();
} catch (error) {
	console.error("Failed to seed fingerprint data:", error);
	process.exit(1);
}
