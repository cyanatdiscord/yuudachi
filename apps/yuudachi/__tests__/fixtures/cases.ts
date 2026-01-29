import { CaseAction } from "../../src/functions/cases/createCase.js";

/**
 * Raw case record as returned from the database
 */
export type RawCaseRecord = {
	action: CaseAction;
	case_id: number;
	created_at: string;
	guild_id: string;
	log_message_id: string | null;
	mod_id: string | null;
	mod_tag: string | null;
	reason: string | null;
	ref_id: number | null;
	target_id: string;
	target_tag: string | null;
};

/**
 * Raw appeal record as returned from the database
 */
export type RawAppealRecord = {
	appeal_id: number;
	created_at: string;
	guild_id: string;
	mod_id: string | null;
	mod_tag: string | null;
	reason: string;
	ref_id: number | null;
	status: number;
	target_id: string;
	target_tag: string;
	updated_at: string | null;
};

/**
 * Base mock case record
 */
export const mockCaseRecord: RawCaseRecord = {
	action: CaseAction.Ban,
	case_id: 1,
	created_at: "2024-01-01T00:00:00.000Z",
	guild_id: "222078108977594368",
	log_message_id: "log",
	mod_id: "mod-id",
	mod_tag: "mod#0001",
	reason: "Test reason",
	ref_id: null,
	target_id: "user-id",
	target_tag: "user#0001",
};

/**
 * Base mock appeal record
 */
export const mockAppealRecord: RawAppealRecord = {
	appeal_id: 1,
	created_at: "2024-01-01T00:00:00.000Z",
	guild_id: "222078108977594368",
	mod_id: null,
	mod_tag: null,
	reason: "Appeal reason",
	ref_id: null,
	status: 0,
	target_id: "target",
	target_tag: "target#0001",
	updated_at: null,
};

/**
 * Mock case list entry with aggregated counts
 */
export const mockCaseListEntry = {
	cases_count: 2,
	target_id: "target",
	target_tag: "target#0001",
};

/**
 * Mock appeal list entry with aggregated counts
 */
export const mockAppealListEntry = {
	appeal_id: "1",
	appeals_count: 1,
	created_at: "2024-01-01T00:00:00.000Z",
	guild_id: "222078108977594368",
	reason: "appeal",
};

/**
 * Creates a mock case record with optional overrides
 */
export function createMockCase(overrides: Partial<RawCaseRecord> = {}): RawCaseRecord {
	return {
		...mockCaseRecord,
		...overrides,
	};
}

/**
 * Creates a mock appeal record with optional overrides
 */
export function createMockAppeal(overrides: Partial<RawAppealRecord> = {}): RawAppealRecord {
	return {
		...mockAppealRecord,
		...overrides,
	};
}

/**
 * Creates multiple mock cases for list testing
 */
export function createMockCaseList(count: number, baseOverrides: Partial<RawCaseRecord> = {}): RawCaseRecord[] {
	return Array.from({ length: count }, (_, index) => createMockCase({ case_id: index + 1, ...baseOverrides }));
}
