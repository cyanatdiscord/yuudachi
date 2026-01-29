import { kSQL, container, logger } from "@yuudachi/framework";
import type { Sql } from "postgres";
import { FINGERPRINT_OCCURRENCE_RETENTION_DAYS } from "../../Constants.js";

/**
 * Prunes fingerprint occurrences older than the retention period.
 * This is designed to be called from a scheduled job.
 */
export async function pruneOccurrences(): Promise<number> {
	const sql = container.get<Sql<any>>(kSQL);

	const [result] = await sql<[{ count: string }]>`
		with deleted as (
			delete from attachment_fingerprint_occurrences
			where created_at < now() - make_interval(days => ${FINGERPRINT_OCCURRENCE_RETENTION_DAYS})
			returning id
		)
		select count(*)::text as count from deleted
	`;

	const deletedCount = Number.parseInt(result.count, 10);

	if (deletedCount > 0) {
		logger.info(
			{ job: { name: "pruneFingerprints" }, deletedCount, retentionDays: FINGERPRINT_OCCURRENCE_RETENTION_DAYS },
			`Pruned ${deletedCount} old fingerprint occurrences`,
		);
	}

	return deletedCount;
}
