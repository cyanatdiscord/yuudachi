import { FingerprintStatus } from "../../Constants.js";

export type RawFingerprint = {
	action_count: number;
	first_seen_at: string;
	flagged_at: string | null;
	flagged_by: string | null;
	guild_count: number;
	hash: string;
	last_seen_at: string;
	notes: string | null;
	occurrence_count: number;
	sample_content_type: string | null;
	sample_file_size: string | null;
	sample_filename: string | null;
	status: number;
	unflagged_at: string | null;
	unflagged_by: string | null;
	updated_at: string | null;
	user_count: number;
};

export type RawFingerprintGuild = {
	first_seen_at: string;
	guild_id: string;
	hash: string;
	last_seen_at: string;
	occurrence_count: number;
	user_count: number;
};

export type RawFingerprintUser = {
	first_seen_at: string;
	hash: string;
	user_id: string;
};

export type RawFingerprintOccurrence = {
	case_id: number | null;
	channel_id: string | null;
	created_at: string;
	guild_id: string;
	hash: string;
	id: string;
	message_id: string | null;
	user_id: string;
};

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
	readonly status: FingerprintStatus;
	readonly unflaggedAt: string | null;
	readonly unflaggedBy: string | null;
	readonly updatedAt: string | null;
	readonly userCount: number;
};

export type FingerprintGuild = {
	readonly firstSeenAt: string;
	readonly guildId: string;
	readonly hash: string;
	readonly lastSeenAt: string;
	readonly occurrenceCount: number;
	readonly userCount: number;
};

export type FingerprintUser = {
	readonly firstSeenAt: string;
	readonly hash: string;
	readonly userId: string;
};

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
 * Validates that a status value is a valid FingerprintStatus enum value.
 * Returns FingerprintStatus.Normal as the default if the value is invalid.
 */
function validateFingerprintStatus(status: number): FingerprintStatus {
	if (
		status === FingerprintStatus.Normal ||
		status === FingerprintStatus.Flagged ||
		status === FingerprintStatus.Trusted
	) {
		return status;
	}

	return FingerprintStatus.Normal;
}

export function transformFingerprint(raw: RawFingerprint): Fingerprint {
	return {
		hash: raw.hash,
		firstSeenAt: raw.first_seen_at,
		lastSeenAt: raw.last_seen_at,
		occurrenceCount: raw.occurrence_count,
		guildCount: raw.guild_count,
		userCount: raw.user_count,
		actionCount: raw.action_count,
		status: validateFingerprintStatus(raw.status),
		flaggedAt: raw.flagged_at,
		flaggedBy: raw.flagged_by,
		unflaggedAt: raw.unflagged_at,
		unflaggedBy: raw.unflagged_by,
		sampleFileSize: raw.sample_file_size ? Number.parseInt(raw.sample_file_size, 10) : null,
		sampleContentType: raw.sample_content_type,
		sampleFilename: raw.sample_filename,
		notes: raw.notes,
		updatedAt: raw.updated_at,
	} as const;
}

export function transformFingerprintGuild(raw: RawFingerprintGuild): FingerprintGuild {
	return {
		hash: raw.hash,
		guildId: raw.guild_id,
		firstSeenAt: raw.first_seen_at,
		lastSeenAt: raw.last_seen_at,
		occurrenceCount: raw.occurrence_count,
		userCount: raw.user_count,
	} as const;
}

export function transformFingerprintUser(raw: RawFingerprintUser): FingerprintUser {
	return {
		hash: raw.hash,
		userId: raw.user_id,
		firstSeenAt: raw.first_seen_at,
	} as const;
}

export function transformFingerprintOccurrence(raw: RawFingerprintOccurrence): FingerprintOccurrence {
	return {
		id: raw.id,
		hash: raw.hash,
		guildId: raw.guild_id,
		userId: raw.user_id,
		channelId: raw.channel_id,
		messageId: raw.message_id,
		caseId: raw.case_id,
		createdAt: raw.created_at,
	} as const;
}
