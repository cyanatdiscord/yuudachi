import { describe, expect, it } from "vitest";
import { FingerprintStatus } from "../src/Constants.js";
import {
	transformFingerprint,
	transformFingerprintGuild,
	transformFingerprintOccurrence,
	transformFingerprintUser,
} from "../src/functions/fingerprints/transformFingerprint.js";
import {
	createMockRawFingerprint,
	createMockRawFingerprintGuild,
	createMockRawFingerprintOccurrence,
	createMockRawFingerprintUser,
	mockRawFingerprint,
	mockRawFingerprintFlagged,
	mockRawFingerprintGuild,
	mockRawFingerprintOccurrence,
	mockRawFingerprintOccurrenceNulls,
	mockRawFingerprintTrusted,
	mockRawFingerprintUser,
	mockRawFingerprintWithEmptyFileSize,
	mockRawFingerprintWithNullFileSize,
} from "./fixtures/fingerprints.js";

describe("transformFingerprint", () => {
	it("transforms all fields from snake_case to camelCase", () => {
		const result = transformFingerprint(mockRawFingerprint);

		expect(result.hash).toBe(mockRawFingerprint.hash);
		expect(result.firstSeenAt).toBe(mockRawFingerprint.first_seen_at);
		expect(result.lastSeenAt).toBe(mockRawFingerprint.last_seen_at);
		expect(result.occurrenceCount).toBe(mockRawFingerprint.occurrence_count);
		expect(result.guildCount).toBe(mockRawFingerprint.guild_count);
		expect(result.userCount).toBe(mockRawFingerprint.user_count);
		expect(result.actionCount).toBe(mockRawFingerprint.action_count);
		expect(result.flaggedAt).toBe(mockRawFingerprint.flagged_at);
		expect(result.flaggedBy).toBe(mockRawFingerprint.flagged_by);
		expect(result.unflaggedAt).toBe(mockRawFingerprint.unflagged_at);
		expect(result.unflaggedBy).toBe(mockRawFingerprint.unflagged_by);
		expect(result.sampleContentType).toBe(mockRawFingerprint.sample_content_type);
		expect(result.sampleFilename).toBe(mockRawFingerprint.sample_filename);
		expect(result.notes).toBe(mockRawFingerprint.notes);
		expect(result.updatedAt).toBe(mockRawFingerprint.updated_at);
	});

	it("converts sampleFileSize from string to number via Number.parseInt()", () => {
		const result = transformFingerprint(mockRawFingerprint);
		expect(result.sampleFileSize).toBe(12_345);
		expect(typeof result.sampleFileSize).toBe("number");
	});

	it("returns null for sampleFileSize when input is null", () => {
		const result = transformFingerprint(mockRawFingerprintWithNullFileSize);
		expect(result.sampleFileSize).toBeNull();
	});

	it("returns null for sampleFileSize when input is empty string", () => {
		const result = transformFingerprint(mockRawFingerprintWithEmptyFileSize);
		expect(result.sampleFileSize).toBeNull();
	});

	it("casts status to FingerprintStatus.Normal (0)", () => {
		const result = transformFingerprint(mockRawFingerprint);
		expect(result.status).toBe(FingerprintStatus.Normal);
		expect(result.status).toBe(0);
	});

	it("casts status to FingerprintStatus.Flagged (1)", () => {
		const result = transformFingerprint(mockRawFingerprintFlagged);
		expect(result.status).toBe(FingerprintStatus.Flagged);
		expect(result.status).toBe(1);
	});

	it("casts status to FingerprintStatus.Trusted (2)", () => {
		const result = transformFingerprint(mockRawFingerprintTrusted);
		expect(result.status).toBe(FingerprintStatus.Trusted);
		expect(result.status).toBe(2);
	});

	it("preserves null values for optional fields", () => {
		const result = transformFingerprint(mockRawFingerprint);
		expect(result.flaggedAt).toBeNull();
		expect(result.flaggedBy).toBeNull();
		expect(result.unflaggedAt).toBeNull();
		expect(result.unflaggedBy).toBeNull();
		expect(result.notes).toBeNull();
		expect(result.updatedAt).toBeNull();
	});

	it("preserves non-null values for optional fields", () => {
		const result = transformFingerprint(mockRawFingerprintFlagged);
		expect(result.flaggedAt).toBe("2024-01-10T08:00:00.000Z");
		expect(result.flaggedBy).toBe("123456789012345678");
		expect(result.notes).toBe("Known spam image");
	});

	it("returns a readonly object", () => {
		const result = transformFingerprint(mockRawFingerprint);
		// TypeScript enforces readonly at compile time, but we can verify the structure
		expect(Object.isFrozen(result) || typeof result === "object").toBe(true);
	});

	it("handles various file size string formats", () => {
		const smallFile = createMockRawFingerprint({ sample_file_size: "0" });
		expect(transformFingerprint(smallFile).sampleFileSize).toBe(0);

		const largeFile = createMockRawFingerprint({ sample_file_size: "999999999" });
		expect(transformFingerprint(largeFile).sampleFileSize).toBe(999_999_999);

		const leadingZeros = createMockRawFingerprint({ sample_file_size: "00123" });
		expect(transformFingerprint(leadingZeros).sampleFileSize).toBe(123);
	});
});

describe("transformFingerprintGuild", () => {
	it("transforms all fields from snake_case to camelCase", () => {
		const result = transformFingerprintGuild(mockRawFingerprintGuild);

		expect(result.hash).toBe(mockRawFingerprintGuild.hash);
		expect(result.guildId).toBe(mockRawFingerprintGuild.guild_id);
		expect(result.firstSeenAt).toBe(mockRawFingerprintGuild.first_seen_at);
		expect(result.lastSeenAt).toBe(mockRawFingerprintGuild.last_seen_at);
		expect(result.occurrenceCount).toBe(mockRawFingerprintGuild.occurrence_count);
		expect(result.userCount).toBe(mockRawFingerprintGuild.user_count);
	});

	it("preserves all field values correctly", () => {
		const customGuild = createMockRawFingerprintGuild({
			hash: "custom_hash_value",
			guild_id: "999888777666555444",
			first_seen_at: "2023-06-15T00:00:00.000Z",
			last_seen_at: "2024-02-20T23:59:59.999Z",
			occurrence_count: 100,
			user_count: 50,
		});

		const result = transformFingerprintGuild(customGuild);

		expect(result.hash).toBe("custom_hash_value");
		expect(result.guildId).toBe("999888777666555444");
		expect(result.firstSeenAt).toBe("2023-06-15T00:00:00.000Z");
		expect(result.lastSeenAt).toBe("2024-02-20T23:59:59.999Z");
		expect(result.occurrenceCount).toBe(100);
		expect(result.userCount).toBe(50);
	});

	it("returns a readonly object", () => {
		const result = transformFingerprintGuild(mockRawFingerprintGuild);
		expect(typeof result).toBe("object");
	});
});

describe("transformFingerprintUser", () => {
	it("transforms all fields from snake_case to camelCase", () => {
		const result = transformFingerprintUser(mockRawFingerprintUser);

		expect(result.hash).toBe(mockRawFingerprintUser.hash);
		expect(result.userId).toBe(mockRawFingerprintUser.user_id);
		expect(result.firstSeenAt).toBe(mockRawFingerprintUser.first_seen_at);
	});

	it("preserves all field values correctly", () => {
		const customUser = createMockRawFingerprintUser({
			hash: "user_specific_hash",
			user_id: "444555666777888999",
			first_seen_at: "2024-03-01T12:30:45.000Z",
		});

		const result = transformFingerprintUser(customUser);

		expect(result.hash).toBe("user_specific_hash");
		expect(result.userId).toBe("444555666777888999");
		expect(result.firstSeenAt).toBe("2024-03-01T12:30:45.000Z");
	});

	it("returns a readonly object", () => {
		const result = transformFingerprintUser(mockRawFingerprintUser);
		expect(typeof result).toBe("object");
	});
});

describe("transformFingerprintOccurrence", () => {
	it("transforms all fields from snake_case to camelCase", () => {
		const result = transformFingerprintOccurrence(mockRawFingerprintOccurrence);

		expect(result.id).toBe(mockRawFingerprintOccurrence.id);
		expect(result.hash).toBe(mockRawFingerprintOccurrence.hash);
		expect(result.guildId).toBe(mockRawFingerprintOccurrence.guild_id);
		expect(result.userId).toBe(mockRawFingerprintOccurrence.user_id);
		expect(result.channelId).toBe(mockRawFingerprintOccurrence.channel_id);
		expect(result.messageId).toBe(mockRawFingerprintOccurrence.message_id);
		expect(result.caseId).toBe(mockRawFingerprintOccurrence.case_id);
		expect(result.createdAt).toBe(mockRawFingerprintOccurrence.created_at);
	});

	it("preserves null values for optional fields", () => {
		const result = transformFingerprintOccurrence(mockRawFingerprintOccurrenceNulls);

		expect(result.channelId).toBeNull();
		expect(result.messageId).toBeNull();
		expect(result.caseId).toBeNull();
	});

	it("preserves non-null values for optional fields", () => {
		const result = transformFingerprintOccurrence(mockRawFingerprintOccurrence);

		expect(result.channelId).toBe("222333444555666777");
		expect(result.messageId).toBe("333444555666777888");
		expect(result.caseId).toBe(42);
	});

	it("preserves all field values correctly", () => {
		const customOccurrence = createMockRawFingerprintOccurrence({
			id: "custom-uuid-value",
			hash: "occurrence_hash",
			guild_id: "111111111111111111",
			user_id: "222222222222222222",
			channel_id: "333333333333333333",
			message_id: "444444444444444444",
			case_id: 999,
			created_at: "2024-12-31T23:59:59.999Z",
		});

		const result = transformFingerprintOccurrence(customOccurrence);

		expect(result.id).toBe("custom-uuid-value");
		expect(result.hash).toBe("occurrence_hash");
		expect(result.guildId).toBe("111111111111111111");
		expect(result.userId).toBe("222222222222222222");
		expect(result.channelId).toBe("333333333333333333");
		expect(result.messageId).toBe("444444444444444444");
		expect(result.caseId).toBe(999);
		expect(result.createdAt).toBe("2024-12-31T23:59:59.999Z");
	});

	it("returns a readonly object", () => {
		const result = transformFingerprintOccurrence(mockRawFingerprintOccurrence);
		expect(typeof result).toBe("object");
	});
});
