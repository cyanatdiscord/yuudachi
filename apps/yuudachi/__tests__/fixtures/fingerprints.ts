import type {
	RawFingerprint,
	RawFingerprintGuild,
	RawFingerprintOccurrence,
	RawFingerprintUser,
} from "../../src/functions/fingerprints/transformFingerprint.js";

export const mockRawFingerprint: RawFingerprint = {
	hash: "abc123def456789012345678901234567890123456789012345678901234",
	first_seen_at: "2024-01-01T00:00:00.000Z",
	last_seen_at: "2024-01-15T12:00:00.000Z",
	occurrence_count: 25,
	guild_count: 5,
	user_count: 10,
	action_count: 3,
	status: 0,
	flagged_at: null,
	flagged_by: null,
	unflagged_at: null,
	unflagged_by: null,
	sample_file_size: "12345",
	sample_content_type: "image/png",
	sample_filename: "spam.png",
	notes: null,
	updated_at: null,
};

export const mockRawFingerprintFlagged: RawFingerprint = {
	...mockRawFingerprint,
	hash: "flagged123def456789012345678901234567890123456789012345678901234",
	status: 1,
	flagged_at: "2024-01-10T08:00:00.000Z",
	flagged_by: "123456789012345678",
	notes: "Known spam image",
};

export const mockRawFingerprintTrusted: RawFingerprint = {
	...mockRawFingerprint,
	hash: "trusted123def456789012345678901234567890123456789012345678901234",
	status: 2,
	flagged_at: "2024-01-05T10:00:00.000Z",
	flagged_by: "123456789012345678",
	notes: "Verified safe content",
};

export const mockRawFingerprintWithNullFileSize: RawFingerprint = {
	...mockRawFingerprint,
	hash: "nullsize123def456789012345678901234567890123456789012345678901234",
	sample_file_size: null,
};

export const mockRawFingerprintWithEmptyFileSize: RawFingerprint = {
	...mockRawFingerprint,
	hash: "emptysize123def456789012345678901234567890123456789012345678901234",
	sample_file_size: "",
};

export const mockRawFingerprintGuild: RawFingerprintGuild = {
	hash: "abc123def456789012345678901234567890123456789012345678901234",
	guild_id: "987654321098765432",
	first_seen_at: "2024-01-02T00:00:00.000Z",
	last_seen_at: "2024-01-14T18:30:00.000Z",
	occurrence_count: 8,
	user_count: 4,
};

export const mockRawFingerprintUser: RawFingerprintUser = {
	hash: "abc123def456789012345678901234567890123456789012345678901234",
	user_id: "111222333444555666",
	first_seen_at: "2024-01-03T14:00:00.000Z",
};

export const mockRawFingerprintOccurrence: RawFingerprintOccurrence = {
	id: "550e8400-e29b-41d4-a716-446655440000",
	hash: "abc123def456789012345678901234567890123456789012345678901234",
	guild_id: "987654321098765432",
	user_id: "111222333444555666",
	channel_id: "222333444555666777",
	message_id: "333444555666777888",
	case_id: 42,
	created_at: "2024-01-15T10:00:00.000Z",
};

export const mockRawFingerprintOccurrenceNulls: RawFingerprintOccurrence = {
	id: "550e8400-e29b-41d4-a716-446655440001",
	hash: "abc123def456789012345678901234567890123456789012345678901234",
	guild_id: "987654321098765432",
	user_id: "111222333444555666",
	channel_id: null,
	message_id: null,
	case_id: null,
	created_at: "2024-01-14T09:00:00.000Z",
};

export function createMockRawFingerprint(overrides: Partial<RawFingerprint> = {}): RawFingerprint {
	return {
		...mockRawFingerprint,
		...overrides,
	};
}

export function createMockRawFingerprintGuild(overrides: Partial<RawFingerprintGuild> = {}): RawFingerprintGuild {
	return {
		...mockRawFingerprintGuild,
		...overrides,
	};
}

export function createMockRawFingerprintUser(overrides: Partial<RawFingerprintUser> = {}): RawFingerprintUser {
	return {
		...mockRawFingerprintUser,
		...overrides,
	};
}

export function createMockRawFingerprintOccurrence(
	overrides: Partial<RawFingerprintOccurrence> = {},
): RawFingerprintOccurrence {
	return {
		...mockRawFingerprintOccurrence,
		...overrides,
	};
}
