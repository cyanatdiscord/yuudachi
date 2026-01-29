import { kSQL, container } from "@yuudachi/framework";
import type { Sql } from "postgres";
import {
	FINGERPRINT_SUSPICIOUS_GUILD_COUNT,
	FINGERPRINT_SUSPICIOUS_OCCURRENCE_COUNT,
	FingerprintStatus,
} from "../../Constants.js";
import { type RawFingerprint, transformFingerprint } from "./transformFingerprint.js";

export type FingerprintStats = {
	readonly flaggedCount: number;
	readonly recentlyFlagged: readonly ReturnType<typeof transformFingerprint>[];
	readonly recentlyUnflagged: readonly ReturnType<typeof transformFingerprint>[];
	readonly seenLast24h: number;
	readonly seenLast7d: number;
	readonly suspiciousCount: number;
	readonly suspiciousThresholdGuilds: number;
	readonly suspiciousThresholdOccurrences: number;
	readonly topByGuildSpread: readonly ReturnType<typeof transformFingerprint>[];
	readonly topByOccurrence: readonly ReturnType<typeof transformFingerprint>[];
	readonly topByUserSpread: readonly ReturnType<typeof transformFingerprint>[];
	readonly totalActionsTaken: number;
	readonly totalFingerprints: number;
	readonly totalOccurrences: number;
	readonly totalUniqueUsers: number;
	readonly trustedCount: number;
};

/**
 * Gets aggregate statistics about fingerprints.
 */
export async function getFingerprintStats(): Promise<FingerprintStats> {
	const sql = container.get<Sql<any>>(kSQL);

	// Main counts
	const [counts] = await sql<
		[
			{
				flagged: string;
				seen_24h: string;
				seen_7d: string;
				suspicious: string;
				total: string;
				total_actions: string;
				total_occurrences: string;
				trusted: string;
			},
		]
	>`
		select
			count(*)::text as total,
			count(*) filter (where status = ${FingerprintStatus.Flagged})::text as flagged,
			count(*) filter (where status = ${FingerprintStatus.Trusted})::text as trusted,
			coalesce(sum(occurrence_count), 0)::text as total_occurrences,
			coalesce(sum(action_count), 0)::text as total_actions,
			count(*) filter (where last_seen_at > now() - interval '24 hours')::text as seen_24h,
			count(*) filter (where last_seen_at > now() - interval '7 days')::text as seen_7d,
			count(*) filter (
				where status = ${FingerprintStatus.Normal}
				and (guild_count >= ${FINGERPRINT_SUSPICIOUS_GUILD_COUNT} or occurrence_count >= ${FINGERPRINT_SUSPICIOUS_OCCURRENCE_COUNT})
			)::text as suspicious
		from attachment_fingerprints
	`;

	// Total unique users (from the users table)
	const [userCount] = await sql<[{ count: string }]>`
		select count(distinct user_id)::text as count
		from attachment_fingerprint_users
	`;

	// Top by occurrence
	const topByOccurrence = await sql<RawFingerprint[]>`
		select * from attachment_fingerprints
		order by occurrence_count desc
		limit 10
	`;

	// Top by guild spread
	const topByGuildSpread = await sql<RawFingerprint[]>`
		select * from attachment_fingerprints
		order by guild_count desc, occurrence_count desc
		limit 10
	`;

	// Top by user spread
	const topByUserSpread = await sql<RawFingerprint[]>`
		select * from attachment_fingerprints
		order by user_count desc, occurrence_count desc
		limit 10
	`;

	// Recently flagged
	const recentlyFlagged = await sql<RawFingerprint[]>`
		select * from attachment_fingerprints
		where status = ${FingerprintStatus.Flagged}
		order by flagged_at desc nulls last
		limit 10
	`;

	// Recently unflagged
	const recentlyUnflagged = await sql<RawFingerprint[]>`
		select * from attachment_fingerprints
		where unflagged_at is not null
		order by unflagged_at desc
		limit 10
	`;

	return {
		totalFingerprints: Number.parseInt(counts.total, 10),
		flaggedCount: Number.parseInt(counts.flagged, 10),
		trustedCount: Number.parseInt(counts.trusted, 10),
		totalOccurrences: Number.parseInt(counts.total_occurrences, 10),
		totalUniqueUsers: Number.parseInt(userCount.count, 10),
		totalActionsTaken: Number.parseInt(counts.total_actions, 10),
		seenLast24h: Number.parseInt(counts.seen_24h, 10),
		seenLast7d: Number.parseInt(counts.seen_7d, 10),
		suspiciousCount: Number.parseInt(counts.suspicious, 10),
		suspiciousThresholdGuilds: FINGERPRINT_SUSPICIOUS_GUILD_COUNT,
		suspiciousThresholdOccurrences: FINGERPRINT_SUSPICIOUS_OCCURRENCE_COUNT,
		topByOccurrence: topByOccurrence.map(transformFingerprint),
		topByGuildSpread: topByGuildSpread.map(transformFingerprint),
		topByUserSpread: topByUserSpread.map(transformFingerprint),
		recentlyFlagged: recentlyFlagged.map(transformFingerprint),
		recentlyUnflagged: recentlyUnflagged.map(transformFingerprint),
	};
}
