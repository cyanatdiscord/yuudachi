import type { Snowflake } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	FINGERPRINT_SUSPICIOUS_GUILD_COUNT,
	FINGERPRINT_SUSPICIOUS_OCCURRENCE_COUNT,
	FingerprintStatus,
} from "../src/Constants.js";
import { flagFingerprint } from "../src/functions/fingerprints/flagFingerprint.js";
import { getFingerprint } from "../src/functions/fingerprints/getFingerprint.js";
import { getFingerprintStats } from "../src/functions/fingerprints/getFingerprintStats.js";
import { incrementActionCount } from "../src/functions/fingerprints/incrementActionCount.js";
import { listFingerprints } from "../src/functions/fingerprints/listFingerprints.js";
import { pruneOccurrences } from "../src/functions/fingerprints/pruneOccurrences.js";
import { recordFingerprint } from "../src/functions/fingerprints/recordFingerprint.js";
import {
	createMockRawFingerprint,
	mockRawFingerprint,
	mockRawFingerprintFlagged,
	mockRawFingerprintGuild,
	mockRawFingerprintOccurrence,
	mockRawFingerprintUser,
} from "./fixtures/fingerprints.js";
import { createAdvancedSqlMock, createQueryHandler, mockContainerGet, mockLogger } from "./mocks.js";

describe("listFingerprints", () => {
	beforeEach(() => {
		mockContainerGet.mockReset();
		mockLogger.info.mockReset();
		mockLogger.error.mockReset();
	});

	it("uses default pagination values (page 1, limit 50)", async () => {
		const responses = new Map<string, unknown[]>([
			["count(*)", [{ count: "0" }]],
			["select f.*", []],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await listFingerprints();

		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(50);
	});

	it("clamps page to minimum of 1", async () => {
		const responses = new Map<string, unknown[]>([
			["count(*)", [{ count: "0" }]],
			["select f.*", []],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await listFingerprints({ page: -5 });

		expect(result.page).toBe(1);
	});

	it("clamps limit to range 1-100", async () => {
		const responses = new Map<string, unknown[]>([
			["count(*)", [{ count: "0" }]],
			["select f.*", []],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		// Test upper bound
		let result = await listFingerprints({ limit: 500 });
		expect(result.pageSize).toBe(100);

		// Test lower bound
		result = await listFingerprints({ limit: 0 });
		expect(result.pageSize).toBe(1);

		// Test negative
		result = await listFingerprints({ limit: -10 });
		expect(result.pageSize).toBe(1);
	});

	it("calculates offset correctly as (page-1)*limit", async () => {
		const responses = new Map<string, unknown[]>([
			["count(*)", [{ count: "100" }]],
			["select f.*", []],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await listFingerprints({ page: 3, limit: 25 });

		// Offset should be (3-1)*25 = 50
		const selectCall = calls.find((call) => call.strings.join("").includes("select f.*"));
		expect(selectCall?.values).toContain(50); // offset
	});

	it("returns transformed fingerprints", async () => {
		const responses = new Map<string, unknown[]>([
			["count(*)", [{ count: "1" }]],
			["select f.*", [mockRawFingerprint]],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await listFingerprints();

		expect(result.fingerprints).toHaveLength(1);
		expect(result.fingerprints[0]?.hash).toBe(mockRawFingerprint.hash);
		expect(result.fingerprints[0]?.occurrenceCount).toBe(mockRawFingerprint.occurrence_count);
	});

	it("filters by status when provided", async () => {
		const responses = new Map<string, unknown[]>([
			["count(*)", [{ count: "1" }]],
			["select f.*", [mockRawFingerprintFlagged]],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await listFingerprints({ status: FingerprintStatus.Flagged });

		// Check that status filter was applied
		const statusCalls = calls.filter((call) => call.strings.join("").includes("status"));
		expect(statusCalls.length).toBeGreaterThan(0);
	});

	it("applies suspicious filter with correct thresholds", async () => {
		const responses = new Map<string, unknown[]>([
			["count(*)", [{ count: "5" }]],
			["select f.*", []],
		]);
		const { mock, calls, unsafeCalls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await listFingerprints({ suspicious: true });

		// Should filter by Normal status and guild_count/occurrence_count thresholds
		const allCalls = [...calls.map((c) => c.strings.join("")), ...unsafeCalls.map((c) => c.query)].join(" ");
		expect(allCalls).toContain("guild_count");
		expect(allCalls).toContain("occurrence_count");
	});

	it("filters by guildId when provided", async () => {
		const responses = new Map<string, unknown[]>([
			["count(*)", [{ count: "3" }]],
			["select f.*", [mockRawFingerprint]],
		]);
		const { mock, calls, unsafeCalls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await listFingerprints({ guildId: "123456789" as Snowflake });

		// Should join with fingerprint_guilds table
		const allCalls = [...calls.map((c) => c.strings.join("")), ...unsafeCalls.map((c) => c.query)].join(" ");
		expect(allCalls).toContain("fingerprint_guilds");
	});

	it("returns correct total count", async () => {
		const responses = new Map<string, unknown[]>([
			["count(*)", [{ count: "42" }]],
			["select f.*", []],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await listFingerprints();

		expect(result.total).toBe(42);
	});
});

describe("getFingerprint", () => {
	beforeEach(() => {
		mockContainerGet.mockReset();
	});

	it("returns null when fingerprint not found", async () => {
		const responses = new Map<string, unknown[]>([["select * from attachment_fingerprints", []]]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await getFingerprint({ hash: "nonexistent" });

		expect(result).toBeNull();
	});

	it("returns transformed fingerprint when found", async () => {
		const responses = new Map<string, unknown[]>([["select * from attachment_fingerprints", [mockRawFingerprint]]]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await getFingerprint({ hash: mockRawFingerprint.hash });

		expect(result).not.toBeNull();
		expect(result?.hash).toBe(mockRawFingerprint.hash);
		expect(result?.occurrenceCount).toBe(mockRawFingerprint.occurrence_count);
	});

	it("includes guilds when includeGuilds is true", async () => {
		const responses = new Map<string, unknown[]>([
			["select * from attachment_fingerprints", [mockRawFingerprint]],
			["select * from attachment_fingerprint_guilds", [mockRawFingerprintGuild]],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await getFingerprint({
			hash: mockRawFingerprint.hash,
			includeGuilds: true,
		});

		expect(result?.guilds).toBeDefined();
		expect(result?.guilds).toHaveLength(1);
		expect(result?.guilds?.[0]?.guildId).toBe(mockRawFingerprintGuild.guild_id);
	});

	it("includes users when includeUsers is true (limited to 100)", async () => {
		const responses = new Map<string, unknown[]>([
			["select * from attachment_fingerprints", [mockRawFingerprint]],
			["select * from attachment_fingerprint_users", [mockRawFingerprintUser]],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await getFingerprint({
			hash: mockRawFingerprint.hash,
			includeUsers: true,
		});

		expect(result?.users).toBeDefined();
		expect(result?.users).toHaveLength(1);

		// Verify limit 100 is applied
		const userQuery = calls.find((c) => c.strings.join("").includes("attachment_fingerprint_users"));
		expect(userQuery?.strings.join("")).toContain("limit");
	});

	it("includes occurrences when includeOccurrences is true", async () => {
		const responses = new Map<string, unknown[]>([
			["select * from attachment_fingerprints", [mockRawFingerprint]],
			["select * from attachment_fingerprint_occurrences", [mockRawFingerprintOccurrence]],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await getFingerprint({
			hash: mockRawFingerprint.hash,
			includeOccurrences: true,
		});

		expect(result?.occurrences).toBeDefined();
		expect(result?.occurrences).toHaveLength(1);
		expect(result?.occurrences?.[0]?.id).toBe(mockRawFingerprintOccurrence.id);
	});

	it("respects occurrenceLimit option (default 50)", async () => {
		const responses = new Map<string, unknown[]>([
			["select * from attachment_fingerprints", [mockRawFingerprint]],
			["select * from attachment_fingerprint_occurrences", []],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await getFingerprint({
			hash: mockRawFingerprint.hash,
			includeOccurrences: true,
		});

		// Default limit should be 50
		const occurrenceQuery = calls.find((c) => c.strings.join("").includes("attachment_fingerprint_occurrences"));
		expect(occurrenceQuery?.values).toContain(50);
	});

	it("filters occurrences by guildId when provided", async () => {
		const responses = new Map<string, unknown[]>([
			["select * from attachment_fingerprints", [mockRawFingerprint]],
			["select * from attachment_fingerprint_occurrences", [mockRawFingerprintOccurrence]],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await getFingerprint({
			hash: mockRawFingerprint.hash,
			guildId: "987654321098765432" as Snowflake,
			includeOccurrences: true,
		});

		const occurrenceQuery = calls.find((c) => c.strings.join("").includes("attachment_fingerprint_occurrences"));
		expect(occurrenceQuery?.strings.join("")).toContain("guild_id");
	});
});

describe("recordFingerprint", () => {
	beforeEach(() => {
		mockContainerGet.mockReset();
		mockLogger.error.mockReset();
	});

	it("upserts main fingerprint and returns inserted status via xmax", async () => {
		// New insert returns inserted: true (xmax = 0)
		const responses = new Map<string, unknown[]>([["insert into attachment_fingerprints", [{ inserted: true }]]]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await recordFingerprint({ hash: "testhash123" });

		const insertCall = calls.find((c) => c.strings.join("").includes("insert into attachment_fingerprints"));
		expect(insertCall).toBeDefined();
		expect(insertCall?.strings.join("")).toContain("on conflict");
		expect(insertCall?.strings.join("")).toContain("occurrence_count");
		expect(insertCall?.strings.join("")).toContain("xmax");
	});

	it("creates guild association when guildId provided", async () => {
		// New fingerprint with new guild - both return inserted: true
		const responses = new Map<string, unknown[]>([
			["insert into attachment_fingerprints", [{ inserted: true }]],
			["insert into attachment_fingerprint_guilds", [{ inserted: true }]],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await recordFingerprint({
			hash: "testhash123",
			guildId: "123456789" as Snowflake,
		});

		const guildInsert = calls.find((c) => c.strings.join("").includes("attachment_fingerprint_guilds"));
		expect(guildInsert).toBeDefined();
	});

	it("does not double-increment guild_count for new fingerprint", async () => {
		// New fingerprint (inserted: true) should NOT trigger the guild_count increment
		// because the initial insert already sets guild_count = 1
		const responses = new Map<string, unknown[]>([
			["insert into attachment_fingerprints", [{ inserted: true }]],
			["insert into attachment_fingerprint_guilds", [{ inserted: true }]],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await recordFingerprint({
			hash: "testhash123",
			guildId: "123456789" as Snowflake,
		});

		// Should NOT have a separate update to increment guild_count
		const guildCountUpdate = calls.find(
			(c) =>
				c.strings.join("").includes("update attachment_fingerprints") && c.strings.join("").includes("guild_count"),
		);
		expect(guildCountUpdate).toBeUndefined();
	});

	it("increments guild_count for existing fingerprint with new guild", async () => {
		// Existing fingerprint (inserted: false) with new guild should increment guild_count
		const responses = new Map<string, unknown[]>([
			["insert into attachment_fingerprints", [{ inserted: false }]],
			["insert into attachment_fingerprint_guilds", [{ inserted: true }]],
			["update attachment_fingerprints set", []],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await recordFingerprint({
			hash: "testhash123",
			guildId: "123456789" as Snowflake,
		});

		// Should have an update to increment guild_count
		const guildCountUpdate = calls.find(
			(c) =>
				c.strings.join("").includes("update attachment_fingerprints") && c.strings.join("").includes("guild_count"),
		);
		expect(guildCountUpdate).toBeDefined();
	});

	it("creates user association when userId provided", async () => {
		// New fingerprint with new user
		const responses = new Map<string, unknown[]>([
			["insert into attachment_fingerprints", [{ inserted: true }]],
			["insert into attachment_fingerprint_users", [{ inserted: true }]],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await recordFingerprint({
			hash: "testhash123",
			userId: "987654321" as Snowflake,
		});

		const userInsert = calls.find((c) => c.strings.join("").includes("attachment_fingerprint_users"));
		expect(userInsert).toBeDefined();
	});

	it("records occurrence and guild_user when both guildId AND userId provided", async () => {
		// New fingerprint with new guild and user - includes guild_users table insert
		const responses = new Map<string, unknown[]>([
			["insert into attachment_fingerprints", [{ inserted: true }]],
			["insert into attachment_fingerprint_guilds", [{ inserted: true }]],
			["insert into attachment_fingerprint_users", [{ inserted: true }]],
			["insert into attachment_fingerprint_guild_users", [{ inserted: true }]],
			["update attachment_fingerprint_guilds", []],
			["insert into attachment_fingerprint_occurrences", []],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await recordFingerprint({
			hash: "testhash123",
			guildId: "123456789" as Snowflake,
			userId: "987654321" as Snowflake,
			channelId: "111222333" as Snowflake,
			messageId: "444555666" as Snowflake,
		});

		const occurrenceInsert = calls.find((c) => c.strings.join("").includes("attachment_fingerprint_occurrences"));
		expect(occurrenceInsert).toBeDefined();

		const guildUserInsert = calls.find((c) => c.strings.join("").includes("attachment_fingerprint_guild_users"));
		expect(guildUserInsert).toBeDefined();
	});

	it("logs error and continues on failure (fire-and-forget)", async () => {
		const errorMock = vi.fn(() => {
			throw new Error("Database error");
		}) as unknown as ReturnType<typeof vi.fn> & { unsafe: ReturnType<typeof vi.fn> };
		errorMock.unsafe = vi.fn();
		mockContainerGet.mockReturnValue(errorMock);

		// Should not throw
		await expect(recordFingerprint({ hash: "testhash123" })).resolves.toBeUndefined();

		expect(mockLogger.error).toHaveBeenCalled();
	});
});

describe("flagFingerprint", () => {
	beforeEach(() => {
		mockContainerGet.mockReset();
		mockLogger.info.mockReset();
	});

	it("returns null when fingerprint not found", async () => {
		const responses = new Map<string, unknown[]>([["select * from attachment_fingerprints", []]]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await flagFingerprint({
			hash: "nonexistent",
			status: FingerprintStatus.Flagged,
		});

		expect(result).toBeNull();
	});

	it("sets flagged_at and flagged_by when changing Normal to Flagged", async () => {
		const updatedFingerprint = createMockRawFingerprint({
			status: FingerprintStatus.Flagged,
			flagged_at: "2024-01-20T00:00:00.000Z",
			flagged_by: "moderator123",
		});

		const responses = new Map<string, unknown[]>([
			["select * from attachment_fingerprints", [mockRawFingerprint]],
			["update attachment_fingerprints set", [updatedFingerprint]],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await flagFingerprint({
			hash: mockRawFingerprint.hash,
			status: FingerprintStatus.Flagged,
			flaggedBy: "moderator123",
		});

		expect(result?.status).toBe(FingerprintStatus.Flagged);

		const updateCall = calls.find((c) => c.strings.join("").includes("update attachment_fingerprints"));
		expect(updateCall?.strings.join("")).toContain("flagged_at");
		expect(updateCall?.strings.join("")).toContain("flagged_by");
	});

	it("sets unflagged_at and unflagged_by when changing Flagged to Normal", async () => {
		const updatedFingerprint = createMockRawFingerprint({
			status: FingerprintStatus.Normal,
			flagged_at: "2024-01-10T00:00:00.000Z",
			unflagged_at: "2024-01-20T00:00:00.000Z",
			unflagged_by: "admin456",
		});

		const responses = new Map<string, unknown[]>([
			["select * from attachment_fingerprints", [mockRawFingerprintFlagged]],
			["update attachment_fingerprints set", [updatedFingerprint]],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await flagFingerprint({
			hash: mockRawFingerprintFlagged.hash,
			status: FingerprintStatus.Normal,
			flaggedBy: "admin456",
		});

		expect(result?.status).toBe(FingerprintStatus.Normal);

		const updateCall = calls.find((c) => c.strings.join("").includes("update attachment_fingerprints"));
		expect(updateCall?.strings.join("")).toContain("unflagged_at");
		expect(updateCall?.strings.join("")).toContain("unflagged_by");
	});

	it("preserves flagged_at when changing Flagged to Trusted", async () => {
		const updatedFingerprint = createMockRawFingerprint({
			status: FingerprintStatus.Trusted,
			flagged_at: "2024-01-10T00:00:00.000Z",
			flagged_by: "original_flagger",
		});

		const responses = new Map<string, unknown[]>([
			["select * from attachment_fingerprints", [mockRawFingerprintFlagged]],
			["update attachment_fingerprints set", [updatedFingerprint]],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await flagFingerprint({
			hash: mockRawFingerprintFlagged.hash,
			status: FingerprintStatus.Trusted,
			flaggedBy: "new_admin",
		});

		expect(result?.status).toBe(FingerprintStatus.Trusted);
		// The original flagged_at should be preserved
		expect(result?.flaggedAt).toBe("2024-01-10T00:00:00.000Z");
	});

	it("sets flagged_at when changing Normal to Trusted", async () => {
		const updatedFingerprint = createMockRawFingerprint({
			status: FingerprintStatus.Trusted,
			flagged_at: "2024-01-20T00:00:00.000Z",
			flagged_by: "admin123",
		});

		const responses = new Map<string, unknown[]>([
			["select * from attachment_fingerprints", [mockRawFingerprint]],
			["update attachment_fingerprints set", [updatedFingerprint]],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await flagFingerprint({
			hash: mockRawFingerprint.hash,
			status: FingerprintStatus.Trusted,
			flaggedBy: "admin123",
		});

		const updateCall = calls.find((c) => c.strings.join("").includes("update attachment_fingerprints"));
		expect(updateCall?.strings.join("")).toContain("flagged_at");
	});

	it("preserves existing notes when new notes not provided (COALESCE)", async () => {
		const existingWithNotes = createMockRawFingerprint({
			notes: "Existing important note",
		});
		const updatedFingerprint = createMockRawFingerprint({
			status: FingerprintStatus.Flagged,
			notes: "Existing important note",
		});

		const responses = new Map<string, unknown[]>([
			["select * from attachment_fingerprints", [existingWithNotes]],
			["update attachment_fingerprints set", [updatedFingerprint]],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await flagFingerprint({
			hash: existingWithNotes.hash,
			status: FingerprintStatus.Flagged,
			// notes not provided
		});

		const updateCall = calls.find((c) => c.strings.join("").includes("update attachment_fingerprints"));
		expect(updateCall?.strings.join("")).toContain("coalesce");
	});

	it("logs status changes", async () => {
		const updatedFingerprint = createMockRawFingerprint({
			status: FingerprintStatus.Flagged,
		});

		const responses = new Map<string, unknown[]>([
			["select * from attachment_fingerprints", [mockRawFingerprint]],
			["update attachment_fingerprints set", [updatedFingerprint]],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await flagFingerprint({
			hash: mockRawFingerprint.hash,
			status: FingerprintStatus.Flagged,
		});

		expect(mockLogger.info).toHaveBeenCalled();
	});
});

describe("getFingerprintStats", () => {
	beforeEach(() => {
		mockContainerGet.mockReset();
	});

	it("returns all aggregate counts", async () => {
		const countResult = {
			total: "100",
			flagged: "10",
			trusted: "5",
			total_occurrences: "500",
			total_actions: "50",
			seen_24h: "20",
			seen_7d: "80",
			suspicious: "15",
		};

		const responses = new Map<string, unknown[]>([
			["count(*)", [countResult]],
			["count(distinct user_id)", [{ count: "75" }]],
			["order by occurrence_count desc", [mockRawFingerprint]],
			["order by guild_count desc", [mockRawFingerprint]],
			["order by user_count desc", [mockRawFingerprint]],
			["order by flagged_at desc", [mockRawFingerprintFlagged]],
			["order by unflagged_at desc", []],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await getFingerprintStats();

		expect(result.totalFingerprints).toBe(100);
		expect(result.flaggedCount).toBe(10);
		expect(result.trustedCount).toBe(5);
		expect(result.totalOccurrences).toBe(500);
		expect(result.totalActionsTaken).toBe(50);
		expect(result.seenLast24h).toBe(20);
		expect(result.seenLast7d).toBe(80);
		expect(result.suspiciousCount).toBe(15);
		expect(result.totalUniqueUsers).toBe(75);
	});

	it("returns top 10 lists transformed correctly", async () => {
		const fingerprints = [
			createMockRawFingerprint({ hash: "hash1", occurrence_count: 100 }),
			createMockRawFingerprint({ hash: "hash2", occurrence_count: 90 }),
		];

		const countResult = {
			total: "2",
			flagged: "0",
			trusted: "0",
			total_occurrences: "190",
			total_actions: "0",
			seen_24h: "2",
			seen_7d: "2",
			suspicious: "0",
		};

		const responses = new Map<string, unknown[]>([
			["count(*)", [countResult]],
			["count(distinct user_id)", [{ count: "10" }]],
			["order by occurrence_count desc", fingerprints],
			["order by guild_count desc", fingerprints],
			["order by user_count desc", fingerprints],
			["order by flagged_at desc", []],
			["order by unflagged_at desc", []],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await getFingerprintStats();

		expect(result.topByOccurrence).toHaveLength(2);
		expect(result.topByOccurrence[0]?.hash).toBe("hash1");
		expect(result.topByOccurrence[0]?.occurrenceCount).toBe(100);
	});

	it("calculates suspicious count with correct thresholds", async () => {
		// Suspicious = Normal status AND (guild_count >= 5 OR occurrence_count >= 10)
		const countResult = {
			total: "50",
			flagged: "5",
			trusted: "3",
			total_occurrences: "200",
			total_actions: "10",
			seen_24h: "10",
			seen_7d: "40",
			suspicious: "12",
		};

		const responses = new Map<string, unknown[]>([
			["count(*)", [countResult]],
			["count(distinct user_id)", [{ count: "30" }]],
			["order by", []],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await getFingerprintStats();

		expect(result.suspiciousCount).toBe(12);

		// Verify the thresholds are used in the query
		const countQuery = calls.find((c) => c.strings.join("").includes("suspicious"));
		expect(countQuery?.values).toContain(FINGERPRINT_SUSPICIOUS_GUILD_COUNT);
		expect(countQuery?.values).toContain(FINGERPRINT_SUSPICIOUS_OCCURRENCE_COUNT);
	});
});

describe("incrementActionCount", () => {
	beforeEach(() => {
		mockContainerGet.mockReset();
		mockLogger.error.mockReset();
	});

	it("increments action_count on fingerprint", async () => {
		const responses = new Map<string, unknown[]>([["update attachment_fingerprints set", []]]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await incrementActionCount("testhash123");

		const updateCall = calls.find((c) => c.strings.join("").includes("action_count"));
		expect(updateCall).toBeDefined();
		expect(updateCall?.strings.join("")).toContain("action_count + 1");
	});

	it("updates case_id on most recent occurrence when caseId provided", async () => {
		const responses = new Map<string, unknown[]>([
			["update attachment_fingerprints set", []],
			["update attachment_fingerprint_occurrences set", []],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await incrementActionCount("testhash123", 42);

		const occurrenceUpdate = calls.find((c) => c.strings.join("").includes("attachment_fingerprint_occurrences"));
		expect(occurrenceUpdate).toBeDefined();
		expect(occurrenceUpdate?.values).toContain(42);
	});

	it("does not update occurrence when caseId not provided", async () => {
		const responses = new Map<string, unknown[]>([["update attachment_fingerprints set", []]]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await incrementActionCount("testhash123");

		const occurrenceUpdate = calls.find((c) => c.strings.join("").includes("attachment_fingerprint_occurrences"));
		expect(occurrenceUpdate).toBeUndefined();
	});

	it("accepts guildId parameter without error", async () => {
		const responses = new Map<string, unknown[]>([
			["update attachment_fingerprints set", []],
			["update attachment_fingerprint_occurrences set", []],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		// Should not throw when guildId is provided
		await expect(incrementActionCount("testhash123", 42, "123456789012345678" as Snowflake)).resolves.toBeUndefined();

		// The occurrence update query should still be called
		const occurrenceUpdate = calls.find((c) => c.strings.join("").includes("attachment_fingerprint_occurrences"));
		expect(occurrenceUpdate).toBeDefined();
	});

	it("logs error and continues on failure", async () => {
		const errorMock = vi.fn(() => {
			throw new Error("Database error");
		}) as unknown as ReturnType<typeof vi.fn> & { unsafe: ReturnType<typeof vi.fn> };
		errorMock.unsafe = vi.fn();
		mockContainerGet.mockReturnValue(errorMock);

		// Should not throw
		await expect(incrementActionCount("testhash123")).resolves.toBeUndefined();

		expect(mockLogger.error).toHaveBeenCalled();
	});
});

describe("pruneOccurrences", () => {
	beforeEach(() => {
		mockContainerGet.mockReset();
		mockLogger.info.mockReset();
	});

	it("deletes occurrences older than retention period", async () => {
		const responses = new Map<string, unknown[]>([
			["delete from attachment_fingerprint_occurrences", [{ count: "10" }]],
		]);
		const { mock, calls } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await pruneOccurrences();

		const deleteCall = calls.find((c) => c.strings.join("").includes("delete from"));
		expect(deleteCall).toBeDefined();
		// The retention days value is injected via make_interval(), which is safe parameterization
		expect(deleteCall?.strings.join("")).toContain("attachment_fingerprint_occurrences");
		expect(deleteCall?.strings.join("")).toContain("created_at < now() - make_interval");
	});

	it("returns count of deleted records", async () => {
		const responses = new Map<string, unknown[]>([
			["delete from attachment_fingerprint_occurrences", [{ count: "25" }]],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await pruneOccurrences();

		expect(result).toBe(25);
	});

	it("logs when records are pruned", async () => {
		const responses = new Map<string, unknown[]>([
			["delete from attachment_fingerprint_occurrences", [{ count: "5" }]],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await pruneOccurrences();

		expect(mockLogger.info).toHaveBeenCalled();
	});

	it("does not log when no records pruned", async () => {
		const responses = new Map<string, unknown[]>([
			["delete from attachment_fingerprint_occurrences", [{ count: "0" }]],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		await pruneOccurrences();

		expect(mockLogger.info).not.toHaveBeenCalled();
	});

	it("returns 0 when no records deleted", async () => {
		const responses = new Map<string, unknown[]>([
			["delete from attachment_fingerprint_occurrences", [{ count: "0" }]],
		]);
		const { mock } = createAdvancedSqlMock(createQueryHandler(responses));
		mockContainerGet.mockReturnValue(mock);

		const result = await pruneOccurrences();

		expect(result).toBe(0);
	});
});
