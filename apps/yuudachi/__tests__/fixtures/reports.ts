import { ReportStatus } from "../../src/functions/reports/createReport.js";

/**
 * Raw report record as returned from the database
 */
export type RawReportRecord = {
	author_id: string;
	created_at: string;
	guild_id: string;
	log_post_id: string | null;
	reason: string;
	report_id: number;
	status: ReportStatus;
	target_id: string;
};

/**
 * Base mock report record
 */
export const mockReportRecord: RawReportRecord = {
	author_id: "author-id",
	created_at: "2024-03-01T00:00:00.000Z",
	guild_id: "222078108977594368",
	log_post_id: "channel",
	reason: "Report reason",
	report_id: 10,
	status: ReportStatus.Approved,
	target_id: "target-id",
};

/**
 * Creates a mock report record with optional overrides
 */
export function createMockReport(overrides: Partial<RawReportRecord> = {}): RawReportRecord {
	return {
		...mockReportRecord,
		...overrides,
	};
}

/**
 * Creates multiple mock reports for list testing
 */
export function createMockReportList(count: number, baseOverrides: Partial<RawReportRecord> = {}): RawReportRecord[] {
	return Array.from({ length: count }, (_, index) =>
		createMockReport({
			report_id: index + 1,
			...baseOverrides,
		}),
	);
}
