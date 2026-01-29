import { kSQL, container, logger } from "@yuudachi/framework";
import type { Snowflake } from "discord.js";
import type { Sql } from "postgres";

/**
 * Increments the action_count for a fingerprint when a moderation action is taken.
 * Optionally updates the case_id on the most recent occurrence.
 *
 * @param hash - The fingerprint hash
 * @param caseId - Optional case ID to attach to the most recent occurrence
 * @param guildId - Optional guild ID to scope the occurrence update to a specific guild
 */
export async function incrementActionCount(hash: string, caseId?: number | null, guildId?: Snowflake): Promise<void> {
	const sql = container.get<Sql<any>>(kSQL);

	try {
		// Increment action_count on main fingerprint
		await sql`
			update attachment_fingerprints set
				action_count = action_count + 1
			where hash = ${hash}
		`;

		// If we have a case_id, update the most recent occurrence that doesn't have one
		// Optionally scope to a specific guild to prevent cross-guild case attachment
		if (caseId) {
			await sql`
				update attachment_fingerprint_occurrences set
					case_id = ${caseId}
				where id = (
					select id from attachment_fingerprint_occurrences
					where hash = ${hash}
						and case_id is null
						${guildId ? sql`and guild_id = ${guildId}` : sql``}
					order by created_at desc
					limit 1
				)
			`;
		}
	} catch (error) {
		const error_ = error as Error;
		logger.error({ error: error_, hash, caseId, guildId }, "Failed to increment fingerprint action count");
	}
}
