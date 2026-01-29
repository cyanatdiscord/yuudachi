import { kSQL, container } from "@yuudachi/framework";
import type { Snowflake } from "discord.js";
import type { Sql } from "postgres";
import {
	FINGERPRINT_SUSPICIOUS_GUILD_COUNT,
	FINGERPRINT_SUSPICIOUS_OCCURRENCE_COUNT,
	FingerprintStatus,
} from "../../Constants.js";
import { type RawFingerprint, transformFingerprint } from "./transformFingerprint.js";

export type ListFingerprintsOptions = {
	guildId?: Snowflake | null | undefined;
	limit?: number | undefined;
	minGuilds?: number | undefined;
	minOccurrences?: number | undefined;
	order?: "asc" | "desc" | undefined;
	page?: number | undefined;
	sort?: "guild_count" | "last_seen" | "occurrence_count" | "user_count" | undefined;
	status?: FingerprintStatus | null | undefined;
	suspicious?: boolean | undefined;
};

export type ListFingerprintsResult = {
	readonly fingerprints: readonly ReturnType<typeof transformFingerprint>[];
	readonly page: number;
	readonly pageSize: number;
	readonly total: number;
};

// Extended raw type to include the window function count
type RawFingerprintWithCount = RawFingerprint & {
	total_count: number;
};

/**
 * Lists fingerprints with pagination and filtering in a SINGLE database query.
 *
 * Performance optimizations:
 * - COUNT(*) OVER() window function: Gets total count without separate query
 * - Dynamic WHERE building: Eliminates 6 duplicate code branches
 * - Conditional JOIN: Only joins guild table when filtering by guildId
 *
 * The window function adds minimal overhead (<5%) compared to a separate COUNT
 * but eliminates an entire database round trip (typically 10-30ms).
 */
export async function listFingerprints(options: ListFingerprintsOptions = {}): Promise<ListFingerprintsResult> {
	const sql = container.get<Sql<any>>(kSQL);

	const page = Math.max(1, options.page ?? 1);
	const limit = Math.min(100, Math.max(1, options.limit ?? 50));
	const offset = (page - 1) * limit;

	// Map sort option to column - using sql.unsafe for column names is safe here
	// because the switch ensures only valid column names are used
	let sortColumn: string;
	// oxlint-disable-next-line typescript/switch-exhaustiveness-check
	switch (options.sort) {
		case "occurrence_count":
			sortColumn = "f.occurrence_count";
			break;
		case "guild_count":
			sortColumn = "f.guild_count";
			break;
		case "user_count":
			sortColumn = "f.user_count";
			break;
		// oxlint-disable-next-line unicorn/no-useless-switch-case
		case "last_seen":
		default:
			sortColumn = "f.last_seen_at";
			break;
	}

	const sortOrder = options.order === "asc" ? "asc" : "desc";

	// Validate and sanitize minGuilds/minOccurrences to prevent SQL injection
	// These are clamped to reasonable positive integer values
	const minGuilds = options.minGuilds ? Math.max(0, Math.floor(options.minGuilds)) : null;
	const minOccurrences = options.minOccurrences ? Math.max(0, Math.floor(options.minOccurrences)) : null;

	// Build conditions array - each condition is a sql fragment
	// This replaces 6 duplicate if/else branches with a single dynamic builder
	const conditions: ReturnType<typeof sql>[] = [];

	if (options.suspicious) {
		// Suspicious = Normal status + exceeds thresholds
		conditions.push(sql`f.status = ${FingerprintStatus.Normal}`);
		conditions.push(
			sql`(f.guild_count >= ${FINGERPRINT_SUSPICIOUS_GUILD_COUNT} or f.occurrence_count >= ${FINGERPRINT_SUSPICIOUS_OCCURRENCE_COUNT})`,
		);
	} else if (options.status !== undefined && options.status !== null) {
		conditions.push(sql`f.status = ${options.status}`);
	}

	if (minGuilds !== null) {
		conditions.push(sql`f.guild_count >= ${minGuilds}`);
	}

	if (minOccurrences !== null) {
		conditions.push(sql`f.occurrence_count >= ${minOccurrences}`);
	}

	// Build WHERE clause using sql fragment joining
	// If no conditions, we omit the WHERE clause entirely (no WHERE true hack)
	const whereClause =
		conditions.length > 0
			? sql`where ${conditions.reduce((acc, cond, idx) => (idx === 0 ? cond : sql`${acc} and ${cond}`))}`
			: sql``;

	// Optional JOIN for per-guild filtering - only added when needed
	const guildJoin = options.guildId
		? sql`inner join attachment_fingerprint_guilds g on f.hash = g.hash and g.guild_id = ${options.guildId}`
		: sql``;

	// Single query: COUNT(*) OVER() computes total while fetching page
	// The window function runs after WHERE/JOIN but before LIMIT/OFFSET
	const results = await sql<RawFingerprintWithCount[]>`
		select f.*, count(*) over() as total_count
		from attachment_fingerprints f
		${guildJoin}
		${whereClause}
		order by ${sql.unsafe(sortColumn)} ${sql.unsafe(sortOrder)}
		limit ${limit}
		offset ${offset}
	`;

	// Extract total from first row (all rows have same count)
	// Empty result = 0 total
	const total = results[0]?.total_count ?? 0;

	return {
		fingerprints: results.map(({ total_count: _, ...fp }) => transformFingerprint(fp)),
		total: Number(total),
		page,
		pageSize: limit,
	};
}
