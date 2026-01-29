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

// Type for the raw stats result from the CTE query
type RawStatsResult = {
	flagged: number;
	recently_flagged: RawFingerprint[] | null;
	recently_unflagged: RawFingerprint[] | null;
	seen_24h: number;
	seen_7d: number;
	suspicious: number;
	top_by_guild_spread: RawFingerprint[] | null;
	top_by_occurrence: RawFingerprint[] | null;
	top_by_user_spread: RawFingerprint[] | null;
	total: number;
	total_actions: number;
	total_occurrences: number;
	trusted: number;
	unique_users: number;
};

/**
 * Gets aggregate statistics about fingerprints in a SINGLE database round trip.
 *
 * Query structure:
 * - `counts`: Main aggregates using FILTER for conditional counting
 * - `user_count`: Distinct user count from association table
 * - `top_*`: Top 10 lists aggregated via json_agg() into single JSON arrays
 * - `recent_*`: Audit trail queries for recently modified fingerprints
 *
 * The CROSS JOIN at the end combines all CTEs into a single row result.
 * PostgreSQL 12+ can parallelize independent CTEs for better performance.
 */
export async function getFingerprintStats(): Promise<FingerprintStats> {
	const sql = container.get<Sql<any>>(kSQL);

	const [stats] = await sql<[RawStatsResult]>`
		with
		-- Main aggregate counts: single pass over attachment_fingerprints table
		-- FILTER clause is more efficient than CASE WHEN for conditional aggregates
		counts as (
			select
				count(*) as total,
				count(*) filter (where status = ${FingerprintStatus.Flagged}) as flagged,
				count(*) filter (where status = ${FingerprintStatus.Trusted}) as trusted,
				coalesce(sum(occurrence_count), 0) as total_occurrences,
				coalesce(sum(action_count), 0) as total_actions,
				count(*) filter (where last_seen_at > now() - interval '24 hours') as seen_24h,
				count(*) filter (where last_seen_at > now() - interval '7 days') as seen_7d,
				count(*) filter (
					where status = ${FingerprintStatus.Normal}
					and (guild_count >= ${FINGERPRINT_SUSPICIOUS_GUILD_COUNT} or occurrence_count >= ${FINGERPRINT_SUSPICIOUS_OCCURRENCE_COUNT})
				) as suspicious
			from attachment_fingerprints
		),
		-- Distinct user count requires separate table scan (foreign table)
		user_count as (
			select count(distinct user_id) as count from attachment_fingerprint_users
		),
		-- json_agg() collapses top-10 results into single JSON array per CTE
		-- This avoids returning multiple rows that would complicate the final join
		top_occurrence as (
			select coalesce(json_agg(t), '[]'::json) as data from (
				select * from attachment_fingerprints order by occurrence_count desc limit 10
			) t
		),
		top_guild as (
			select coalesce(json_agg(t), '[]'::json) as data from (
				select * from attachment_fingerprints order by guild_count desc, occurrence_count desc limit 10
			) t
		),
		top_user as (
			select coalesce(json_agg(t), '[]'::json) as data from (
				select * from attachment_fingerprints order by user_count desc, occurrence_count desc limit 10
			) t
		),
		recent_flagged as (
			select coalesce(json_agg(t), '[]'::json) as data from (
				select * from attachment_fingerprints
				where status = ${FingerprintStatus.Flagged}
				order by flagged_at desc nulls last limit 10
			) t
		),
		recent_unflagged as (
			select coalesce(json_agg(t), '[]'::json) as data from (
				select * from attachment_fingerprints
				where unflagged_at is not null
				order by unflagged_at desc limit 10
			) t
		)
		-- Final SELECT: CROSS JOIN all single-row CTEs into one result row
		select
			c.total,
			c.flagged,
			c.trusted,
			c.total_occurrences,
			c.total_actions,
			c.seen_24h,
			c.seen_7d,
			c.suspicious,
			u.count as unique_users,
			toc.data as top_by_occurrence,
			tg.data as top_by_guild_spread,
			tu.data as top_by_user_spread,
			rf.data as recently_flagged,
			ru.data as recently_unflagged
		from counts c, user_count u, top_occurrence toc, top_guild tg, top_user tu, recent_flagged rf, recent_unflagged ru
	`;

	return {
		totalFingerprints: Number(stats.total),
		flaggedCount: Number(stats.flagged),
		trustedCount: Number(stats.trusted),
		totalOccurrences: Number(stats.total_occurrences),
		totalUniqueUsers: Number(stats.unique_users),
		totalActionsTaken: Number(stats.total_actions),
		seenLast24h: Number(stats.seen_24h),
		seenLast7d: Number(stats.seen_7d),
		suspiciousCount: Number(stats.suspicious),
		suspiciousThresholdGuilds: FINGERPRINT_SUSPICIOUS_GUILD_COUNT,
		suspiciousThresholdOccurrences: FINGERPRINT_SUSPICIOUS_OCCURRENCE_COUNT,
		topByOccurrence: (stats.top_by_occurrence ?? []).map(transformFingerprint),
		topByGuildSpread: (stats.top_by_guild_spread ?? []).map(transformFingerprint),
		topByUserSpread: (stats.top_by_user_spread ?? []).map(transformFingerprint),
		recentlyFlagged: (stats.recently_flagged ?? []).map(transformFingerprint),
		recentlyUnflagged: (stats.recently_unflagged ?? []).map(transformFingerprint),
	};
}
