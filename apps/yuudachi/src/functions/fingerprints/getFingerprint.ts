import { kSQL, container } from "@yuudachi/framework";
import type { Snowflake } from "discord.js";
import type { Sql } from "postgres";
import {
	type RawFingerprint,
	type RawFingerprintGuild,
	type RawFingerprintOccurrence,
	type RawFingerprintUser,
	transformFingerprint,
	transformFingerprintGuild,
	transformFingerprintOccurrence,
	transformFingerprintUser,
} from "./transformFingerprint.js";

export type GetFingerprintOptions = {
	guildId?: Snowflake | null | undefined;
	hash: string;
	includeGuilds?: boolean | undefined;
	includeOccurrences?: boolean | undefined;
	includeUsers?: boolean | undefined;
	occurrenceLimit?: number | undefined;
};

export type FingerprintWithRelations = ReturnType<typeof transformFingerprint> & {
	readonly guilds?: readonly ReturnType<typeof transformFingerprintGuild>[];
	readonly occurrences?: readonly ReturnType<typeof transformFingerprintOccurrence>[];
	readonly users?: readonly ReturnType<typeof transformFingerprintUser>[];
};

/**
 * Fetches a single fingerprint by hash with optional related data.
 */
export async function getFingerprint(options: GetFingerprintOptions): Promise<FingerprintWithRelations | null> {
	const sql = container.get<Sql<any>>(kSQL);

	const { hash, guildId, includeGuilds = false, includeUsers = false, includeOccurrences = false } = options;
	// Clamp occurrenceLimit to prevent expensive queries (default 50, max 500)
	const occurrenceLimit = Math.min(Math.max(1, options.occurrenceLimit ?? 50), 500);

	const [raw] = await sql<[RawFingerprint?]>`
		select * from attachment_fingerprints
		where hash = ${hash}
	`;

	if (!raw) {
		return null;
	}

	const fingerprint = transformFingerprint(raw);

	// Fetch optional related data based on options
	const guilds = includeGuilds
		? await sql<RawFingerprintGuild[]>`
			select * from attachment_fingerprint_guilds
			where hash = ${hash}
			order by occurrence_count desc, last_seen_at desc
		`
		: undefined;

	const users = includeUsers
		? await sql<RawFingerprintUser[]>`
			select * from attachment_fingerprint_users
			where hash = ${hash}
			order by first_seen_at desc
			limit 100
		`
		: undefined;

	const occurrences = includeOccurrences
		? guildId
			? await sql<RawFingerprintOccurrence[]>`
				select * from attachment_fingerprint_occurrences
				where hash = ${hash} and guild_id = ${guildId}
				order by created_at desc
				limit ${occurrenceLimit}
			`
			: await sql<RawFingerprintOccurrence[]>`
				select * from attachment_fingerprint_occurrences
				where hash = ${hash}
				order by created_at desc
				limit ${occurrenceLimit}
			`
		: undefined;

	// Build result with conditional spreads to maintain type safety
	return {
		...fingerprint,
		...(guilds && { guilds: guilds.map(transformFingerprintGuild) }),
		...(users && { users: users.map(transformFingerprintUser) }),
		...(occurrences && { occurrences: occurrences.map(transformFingerprintOccurrence) }),
	};
}
