/**
 * Represents an attachment fingerprint with metadata and statistics.
 */
export type Fingerprint = {
	readonly actionCount: number;
	readonly firstSeenAt: string;
	readonly flaggedAt: string | null;
	readonly flaggedBy: string | null;
	readonly guildCount: number;
	readonly hash: string;
	readonly lastSeenAt: string;
	readonly notes: string | null;
	readonly occurrenceCount: number;
	readonly sampleContentType: string | null;
	readonly sampleFileSize: number | null;
	readonly sampleFilename: string | null;
	readonly status: number;
	readonly unflaggedAt: string | null;
	readonly unflaggedBy: string | null;
	readonly updatedAt: string | null;
	readonly userCount: number;
};

/**
 * Represents fingerprint statistics for a specific guild.
 */
export type FingerprintGuild = {
	readonly firstSeenAt: string;
	readonly guildId: string;
	readonly hash: string;
	readonly lastSeenAt: string;
	readonly occurrenceCount: number;
	readonly userCount: number;
};

/**
 * Represents a single occurrence of a fingerprint.
 */
export type FingerprintOccurrence = {
	readonly caseId: number | null;
	readonly channelId: string | null;
	readonly createdAt: string;
	readonly guildId: string;
	readonly hash: string;
	readonly id: string;
	readonly messageId: string | null;
	readonly userId: string;
};

/**
 * API response for paginated fingerprints list.
 */
export type FingerprintsResponse = {
	readonly fingerprints: readonly Fingerprint[];
	readonly page: number;
	readonly pageSize: number;
	readonly total: number;
};

/**
 * Global fingerprint statistics.
 */
export type FingerprintStats = {
	readonly flaggedCount: number;
	readonly seenLast24h: number;
	readonly seenLast7d: number;
	readonly suspiciousCount: number;
	readonly suspiciousThresholdGuilds: number;
	readonly suspiciousThresholdOccurrences: number;
	readonly totalActionsTaken: number;
	readonly totalFingerprints: number;
	readonly totalOccurrences: number;
	readonly totalUniqueUsers: number;
	readonly trustedCount: number;
};

/**
 * Fingerprint with optional related data (guilds and occurrences).
 * Used for detail page responses.
 */
export type FingerprintWithRelations = Fingerprint & {
	readonly guilds?: readonly FingerprintGuild[];
	readonly occurrences?: readonly FingerprintOccurrence[];
};
