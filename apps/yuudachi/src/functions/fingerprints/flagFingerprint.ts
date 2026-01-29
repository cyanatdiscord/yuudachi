import { kSQL, container, logger } from "@yuudachi/framework";
import type { Sql } from "postgres";
import { FingerprintStatus } from "../../Constants.js";
import { type RawFingerprint, transformFingerprint } from "./transformFingerprint.js";

export type FlagFingerprintOptions = {
	flaggedBy?: string | null | undefined;
	hash: string;
	notes?: string | null | undefined;
	status: FingerprintStatus;
};

/**
 * Updates the status of a fingerprint (flag/unflag/trust).
 * Maintains audit trail for flagged_at/flagged_by and unflagged_at/unflagged_by.
 */
export async function flagFingerprint(options: FlagFingerprintOptions) {
	const sql = container.get<Sql<any>>(kSQL);

	const { hash, status, flaggedBy, notes } = options;

	// Get current status to determine audit trail updates
	const [current] = await sql<[RawFingerprint?]>`
		select * from attachment_fingerprints
		where hash = ${hash}
	`;

	if (!current) {
		return null;
	}

	const currentStatus = current.status as FingerprintStatus;

	// Build update fields based on status transition
	if (status === FingerprintStatus.Flagged) {
		// Setting to flagged
		const [updated] = await sql<[RawFingerprint]>`
			update attachment_fingerprints set
				status = ${status},
				flagged_at = now(),
				flagged_by = ${flaggedBy ?? null},
				notes = coalesce(${notes ?? null}, notes)
			where hash = ${hash}
			returning *
		`;

		logger.info({ hash, status, flaggedBy }, "Fingerprint flagged");
		return transformFingerprint(updated);
	}

	if (status === FingerprintStatus.Normal && currentStatus === FingerprintStatus.Flagged) {
		// Unflagging - record audit trail
		const [updated] = await sql<[RawFingerprint]>`
			update attachment_fingerprints set
				status = ${status},
				unflagged_at = now(),
				unflagged_by = ${flaggedBy ?? null},
				notes = coalesce(${notes ?? null}, notes)
			where hash = ${hash}
			returning *
		`;

		logger.info({ hash, status, unflaggedBy: flaggedBy }, "Fingerprint unflagged");
		return transformFingerprint(updated);
	}

	if (status === FingerprintStatus.Trusted) {
		// Setting to trusted
		const [updated] = await sql<[RawFingerprint]>`
			update attachment_fingerprints set
				status = ${status},
				flagged_at = ${currentStatus === FingerprintStatus.Flagged ? sql`flagged_at` : sql`now()`},
				flagged_by = ${currentStatus === FingerprintStatus.Flagged ? sql`flagged_by` : (flaggedBy ?? null)},
				notes = coalesce(${notes ?? null}, notes)
			where hash = ${hash}
			returning *
		`;

		logger.info({ hash, status, flaggedBy }, "Fingerprint marked as trusted");
		return transformFingerprint(updated);
	}

	// Generic status update (e.g., from trusted back to normal)
	const [updated] = await sql<[RawFingerprint]>`
		update attachment_fingerprints set
			status = ${status},
			notes = coalesce(${notes ?? null}, notes)
		where hash = ${hash}
		returning *
	`;

	logger.info({ hash, status, flaggedBy }, "Fingerprint status updated");
	return transformFingerprint(updated);
}
