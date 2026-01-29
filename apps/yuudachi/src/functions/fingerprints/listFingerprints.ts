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

/**
 * Lists fingerprints with pagination and filtering options.
 * When guildId is provided, filters to fingerprints seen in that guild.
 */
export async function listFingerprints(options: ListFingerprintsOptions = {}): Promise<ListFingerprintsResult> {
	const sql = container.get<Sql<any>>(kSQL);

	const page = Math.max(1, options.page ?? 1);
	const limit = Math.min(100, Math.max(1, options.limit ?? 50));
	const offset = (page - 1) * limit;

	// Determine sort column and order
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

	if (options.guildId) {
		// Per-guild view: join with fingerprint_guilds to filter by guild
		if (options.suspicious) {
			const [countResult] = await sql<[{ count: string }]>`
				select count(*)::text as count
				from attachment_fingerprints f
				inner join attachment_fingerprint_guilds g on f.hash = g.hash and g.guild_id = ${options.guildId}
				where f.status = ${FingerprintStatus.Normal}
					and (f.guild_count >= ${FINGERPRINT_SUSPICIOUS_GUILD_COUNT} or f.occurrence_count >= ${FINGERPRINT_SUSPICIOUS_OCCURRENCE_COUNT})
					${minGuilds === null ? sql`` : sql`and f.guild_count >= ${minGuilds}`}
					${minOccurrences === null ? sql`` : sql`and f.occurrence_count >= ${minOccurrences}`}
			`;

			const fingerprints = await sql<RawFingerprint[]>`
				select f.*
				from attachment_fingerprints f
				inner join attachment_fingerprint_guilds g on f.hash = g.hash and g.guild_id = ${options.guildId}
				where f.status = ${FingerprintStatus.Normal}
					and (f.guild_count >= ${FINGERPRINT_SUSPICIOUS_GUILD_COUNT} or f.occurrence_count >= ${FINGERPRINT_SUSPICIOUS_OCCURRENCE_COUNT})
					${minGuilds === null ? sql`` : sql`and f.guild_count >= ${minGuilds}`}
					${minOccurrences === null ? sql`` : sql`and f.occurrence_count >= ${minOccurrences}`}
				order by ${sql.unsafe(sortColumn)} ${sql.unsafe(sortOrder)}
				limit ${limit}
				offset ${offset}
			`;

			return {
				fingerprints: fingerprints.map(transformFingerprint),
				total: Number.parseInt(countResult?.count ?? "0", 10),
				page,
				pageSize: limit,
			};
		}

		if (options.status !== undefined && options.status !== null) {
			const [countResult] = await sql<[{ count: string }]>`
				select count(*)::text as count
				from attachment_fingerprints f
				inner join attachment_fingerprint_guilds g on f.hash = g.hash and g.guild_id = ${options.guildId}
				where f.status = ${options.status}
					${minGuilds === null ? sql`` : sql`and f.guild_count >= ${minGuilds}`}
					${minOccurrences === null ? sql`` : sql`and f.occurrence_count >= ${minOccurrences}`}
			`;

			const fingerprints = await sql<RawFingerprint[]>`
				select f.*
				from attachment_fingerprints f
				inner join attachment_fingerprint_guilds g on f.hash = g.hash and g.guild_id = ${options.guildId}
				where f.status = ${options.status}
					${minGuilds === null ? sql`` : sql`and f.guild_count >= ${minGuilds}`}
					${minOccurrences === null ? sql`` : sql`and f.occurrence_count >= ${minOccurrences}`}
				order by ${sql.unsafe(sortColumn)} ${sql.unsafe(sortOrder)}
				limit ${limit}
				offset ${offset}
			`;

			return {
				fingerprints: fingerprints.map(transformFingerprint),
				total: Number.parseInt(countResult?.count ?? "0", 10),
				page,
				pageSize: limit,
			};
		}

		// No status/suspicious filters, just guildId
		const [countResult] = await sql<[{ count: string }]>`
			select count(*)::text as count
			from attachment_fingerprints f
			inner join attachment_fingerprint_guilds g on f.hash = g.hash and g.guild_id = ${options.guildId}
			where true
				${minGuilds === null ? sql`` : sql`and f.guild_count >= ${minGuilds}`}
				${minOccurrences === null ? sql`` : sql`and f.occurrence_count >= ${minOccurrences}`}
		`;

		const fingerprints = await sql<RawFingerprint[]>`
			select f.*
			from attachment_fingerprints f
			inner join attachment_fingerprint_guilds g on f.hash = g.hash and g.guild_id = ${options.guildId}
			where true
				${minGuilds === null ? sql`` : sql`and f.guild_count >= ${minGuilds}`}
				${minOccurrences === null ? sql`` : sql`and f.occurrence_count >= ${minOccurrences}`}
			order by ${sql.unsafe(sortColumn)} ${sql.unsafe(sortOrder)}
			limit ${limit}
			offset ${offset}
		`;

		return {
			fingerprints: fingerprints.map(transformFingerprint),
			total: Number.parseInt(countResult?.count ?? "0", 10),
			page,
			pageSize: limit,
		};
	}

	// Global view
	if (options.suspicious) {
		const [countResult] = await sql<[{ count: string }]>`
			select count(*)::text as count
			from attachment_fingerprints f
			where f.status = ${FingerprintStatus.Normal}
				and (f.guild_count >= ${FINGERPRINT_SUSPICIOUS_GUILD_COUNT} or f.occurrence_count >= ${FINGERPRINT_SUSPICIOUS_OCCURRENCE_COUNT})
				${minGuilds === null ? sql`` : sql`and f.guild_count >= ${minGuilds}`}
				${minOccurrences === null ? sql`` : sql`and f.occurrence_count >= ${minOccurrences}`}
		`;

		const fingerprints = await sql<RawFingerprint[]>`
			select f.*
			from attachment_fingerprints f
			where f.status = ${FingerprintStatus.Normal}
				and (f.guild_count >= ${FINGERPRINT_SUSPICIOUS_GUILD_COUNT} or f.occurrence_count >= ${FINGERPRINT_SUSPICIOUS_OCCURRENCE_COUNT})
				${minGuilds === null ? sql`` : sql`and f.guild_count >= ${minGuilds}`}
				${minOccurrences === null ? sql`` : sql`and f.occurrence_count >= ${minOccurrences}`}
			order by ${sql.unsafe(sortColumn)} ${sql.unsafe(sortOrder)}
			limit ${limit}
			offset ${offset}
		`;

		return {
			fingerprints: fingerprints.map(transformFingerprint),
			total: Number.parseInt(countResult?.count ?? "0", 10),
			page,
			pageSize: limit,
		};
	}

	if (options.status !== undefined && options.status !== null) {
		const [countResult] = await sql<[{ count: string }]>`
			select count(*)::text as count
			from attachment_fingerprints f
			where f.status = ${options.status}
				${minGuilds === null ? sql`` : sql`and f.guild_count >= ${minGuilds}`}
				${minOccurrences === null ? sql`` : sql`and f.occurrence_count >= ${minOccurrences}`}
		`;

		const fingerprints = await sql<RawFingerprint[]>`
			select f.*
			from attachment_fingerprints f
			where f.status = ${options.status}
				${minGuilds === null ? sql`` : sql`and f.guild_count >= ${minGuilds}`}
				${minOccurrences === null ? sql`` : sql`and f.occurrence_count >= ${minOccurrences}`}
			order by ${sql.unsafe(sortColumn)} ${sql.unsafe(sortOrder)}
			limit ${limit}
			offset ${offset}
		`;

		return {
			fingerprints: fingerprints.map(transformFingerprint),
			total: Number.parseInt(countResult?.count ?? "0", 10),
			page,
			pageSize: limit,
		};
	}

	// No filters
	const [countResult] = await sql<[{ count: string }]>`
		select count(*)::text as count
		from attachment_fingerprints f
		where true
			${minGuilds === null ? sql`` : sql`and f.guild_count >= ${minGuilds}`}
			${minOccurrences === null ? sql`` : sql`and f.occurrence_count >= ${minOccurrences}`}
	`;

	const fingerprints = await sql<RawFingerprint[]>`
		select f.*
		from attachment_fingerprints f
		where true
			${minGuilds === null ? sql`` : sql`and f.guild_count >= ${minGuilds}`}
			${minOccurrences === null ? sql`` : sql`and f.occurrence_count >= ${minOccurrences}`}
		order by ${sql.unsafe(sortColumn)} ${sql.unsafe(sortOrder)}
		limit ${limit}
		offset ${offset}
	`;

	return {
		fingerprints: fingerprints.map(transformFingerprint),
		total: Number.parseInt(countResult?.count ?? "0", 10),
		page,
		pageSize: limit,
	};
}
