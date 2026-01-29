import { kSQL, container, logger } from "@yuudachi/framework";
import type { Snowflake } from "discord.js";
import type { Sql } from "postgres";

export type RecordFingerprintOptions = {
	caseId?: number | null | undefined;
	channelId?: Snowflake | null | undefined;
	contentType?: string | null | undefined;
	fileSize?: number | null | undefined;
	filename?: string | null | undefined;
	guildId?: Snowflake | null | undefined;
	hash: string;
	messageId?: Snowflake | null | undefined;
	userId?: Snowflake | null | undefined;
};

/**
 * Records a fingerprint occurrence to the database.
 * This function is designed to be called in a fire-and-forget manner.
 *
 * - Always increments occurrence_count on the main fingerprint
 * - Creates guild association if guildId is provided (increments guild_count for new guilds)
 * - Creates user association if userId is provided (increments user_count for new users)
 * - Records occurrence in the occurrences table for forensic analysis
 *
 * Uses PostgreSQL's xmax system column to detect whether an upsert was an INSERT or UPDATE:
 * - xmax = 0 means the row was newly inserted
 * - xmax > 0 means the row was updated (conflict occurred)
 */
export async function recordFingerprint(options: RecordFingerprintOptions): Promise<void> {
	const sql = container.get<Sql<any>>(kSQL);

	const { hash, guildId, userId, channelId, messageId, caseId, fileSize, contentType, filename } = options;

	try {
		// Step 1: Upsert main fingerprint with RETURNING to detect if this was a new insert
		// For new fingerprints, we set initial counts based on provided guildId/userId
		// For existing fingerprints, we only increment occurrence_count
		const [upsertResult] = await sql<[{ inserted: boolean }?]>`
			insert into attachment_fingerprints (
				hash,
				sample_file_size,
				sample_content_type,
				sample_filename,
				guild_count,
				user_count
			) values (
				${hash},
				${fileSize ?? null},
				${contentType ?? null},
				${filename ?? null},
				${guildId ? 1 : 0},
				${userId ? 1 : 0}
			)
			on conflict (hash) do update set
				last_seen_at = now(),
				occurrence_count = attachment_fingerprints.occurrence_count + 1,
				sample_file_size = coalesce(attachment_fingerprints.sample_file_size, excluded.sample_file_size),
				sample_content_type = coalesce(attachment_fingerprints.sample_content_type, excluded.sample_content_type),
				sample_filename = coalesce(attachment_fingerprints.sample_filename, excluded.sample_filename)
			returning (xmax = 0) as inserted
		`;

		const isNewFingerprint = upsertResult?.inserted ?? false;

		// Step 2: Upsert guild association if guildId provided
		if (guildId) {
			const [guildUpsert] = await sql<[{ inserted: boolean }?]>`
				insert into attachment_fingerprint_guilds (hash, guild_id, user_count)
				values (${hash}, ${guildId}, 0)
				on conflict (hash, guild_id) do update set
					last_seen_at = now(),
					occurrence_count = attachment_fingerprint_guilds.occurrence_count + 1
				returning (xmax = 0) as inserted
			`;

			// Only increment main table's guild_count if:
			// 1. This is an EXISTING fingerprint (not new - new ones already have guild_count=1)
			// 2. AND this is a new guild association
			if (!isNewFingerprint && guildUpsert?.inserted) {
				await sql`
					update attachment_fingerprints set
						guild_count = guild_count + 1
					where hash = ${hash}
				`;
			}
		}

		// Step 3: Upsert user association if userId provided
		if (userId) {
			const [userUpsert] = await sql<[{ inserted: boolean }?]>`
				insert into attachment_fingerprint_users (hash, user_id)
				values (${hash}, ${userId})
				on conflict (hash, user_id) do nothing
				returning (xmax = 0) as inserted
			`;

			// Only increment main table's user_count if:
			// 1. This is an EXISTING fingerprint (not new - new ones already have user_count=1)
			// 2. AND this is a new user association
			if (!isNewFingerprint && userUpsert?.inserted) {
				await sql`
					update attachment_fingerprints set
						user_count = user_count + 1
					where hash = ${hash}
				`;
			}
		}

		// Step 4: Track per-guild user associations (for accurate per-guild user_count)
		if (guildId && userId) {
			const [guildUserUpsert] = await sql<[{ inserted: boolean }?]>`
				insert into attachment_fingerprint_guild_users (hash, guild_id, user_id)
				values (${hash}, ${guildId}, ${userId})
				on conflict (hash, guild_id, user_id) do nothing
				returning (xmax = 0) as inserted
			`;

			// Only increment per-guild user_count if this is a NEW user in this guild
			if (guildUserUpsert?.inserted) {
				await sql`
					update attachment_fingerprint_guilds set
						user_count = user_count + 1
					where hash = ${hash} and guild_id = ${guildId}
				`;
			}
		}

		// Step 5: Record occurrence for forensic analysis (if we have at least guild and user)
		if (guildId && userId) {
			await sql`
				insert into attachment_fingerprint_occurrences (
					hash,
					guild_id,
					user_id,
					channel_id,
					message_id,
					case_id
				) values (
					${hash},
					${guildId},
					${userId},
					${channelId ?? null},
					${messageId ?? null},
					${caseId ?? null}
				)
			`;
		}
	} catch (error) {
		const error_ = error as Error;
		logger.error({ error: error_, hash, guildId, userId }, "Failed to record fingerprint");
	}
}
