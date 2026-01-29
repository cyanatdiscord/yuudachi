import { vi } from "vitest";

export const mockCreateButton = vi.fn<(input: unknown) => unknown>();
export const mockAddFields = vi.fn((...parts: unknown[]) => Object.assign({}, ...parts));
export const mockTruncate = vi.fn((value: string, max: number, suffix = "...") =>
	value.length > max ? `${value.slice(0, max)}${suffix}` : value,
);
export const mockTruncateEmbed = vi.fn(<T>(embed: T) => embed);
export const mockContainerGet = vi.fn<(token: unknown) => unknown>();
export const mockContainerBind = vi.fn<(binding: { provide: unknown; useValue: unknown }) => void>();
export const mockLogger = {
	warn: vi.fn<(message: unknown, extra?: string) => void>(),
	info: vi.fn<(message: unknown) => void>(),
	error: vi.fn<(error: unknown, message?: string) => void>(),
};
export const mockEllipsis = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value);

// ============================================================================
// SQL Mocking Utilities
// ============================================================================

export type SqlMock<T> = ReturnType<typeof vi.fn<(strings?: TemplateStringsArray) => Promise<T[]> | T[]>> & {
	unsafe: ReturnType<typeof vi.fn<(query: string, params?: unknown[]) => Promise<{ value: unknown }[]>>>;
};

/**
 * Creates a simple SQL mock with a single handler function.
 * Use this for straightforward tests that don't need query pattern matching.
 */
export function createSqlMock<T = unknown>(
	handler: (strings?: TemplateStringsArray) => Promise<T[]> | T[] = async () => [],
	unsafeResult: unknown = null,
): SqlMock<T> {
	const sqlMock = vi.fn(handler) as SqlMock<T>;
	sqlMock.unsafe = vi.fn(async () => [{ value: unsafeResult }]);
	return sqlMock;
}

/**
 * Tracks SQL calls for inspection in tests.
 */
export type SqlCallTracker = {
	calls: Array<{ strings: TemplateStringsArray; values: unknown[] }>;
	unsafeCalls: Array<{ query: string; params: unknown[] }>;
};

export type AdvancedSqlMock = ReturnType<typeof vi.fn> & { unsafe: ReturnType<typeof vi.fn> };

/**
 * Handler function type for custom query matching logic.
 * Receives the joined query string and values, returns the response array.
 */
export type SqlQueryHandler = (query: string, values: unknown[]) => unknown[] | Promise<unknown[]>;

/**
 * Creates a query handler from a response map.
 * This is a helper for simple cases where patterns don't overlap.
 *
 * @param responses - Map of patterns to response arrays
 * @returns A handler function that matches patterns case-insensitively
 */
export function createQueryHandler(responses: Map<string, unknown[]>): SqlQueryHandler {
	return (query: string) => {
		const queryLower = query.toLowerCase();
		for (const [pattern, response] of responses) {
			if (queryLower.includes(pattern.toLowerCase())) {
				return response;
			}
		}

		return [];
	};
}

/**
 * Creates an advanced SQL mock with a handler function and call tracking.
 *
 * Use this when you need to:
 * - Return different responses based on query content
 * - Track which queries were executed and with what parameters
 * - Test complex database interactions with multiple query types
 *
 * The handler receives the query as a joined string (template strings concatenated)
 * and an array of interpolated values. Use string methods like `includes()` to
 * match query patterns.
 *
 * For simple cases with non-overlapping patterns, use `createQueryHandler()` to
 * create a handler from a Map of patterns.
 *
 * @param handler - Function that receives query string and returns response array
 * @returns An object containing the mock function and call trackers
 *
 * @example Handler function (flexible, recommended)
 * ```ts
 * const { mock, calls } = createAdvancedSqlMock((query) => {
 *   if (query.includes("from cases") && query.includes("limit 1")) {
 *     return [caseRecord];
 *   }
 *   if (query.includes("count(*)")) {
 *     return [{ count: "42" }];
 *   }
 *   return [];
 * });
 * ```
 *
 * @example Using createQueryHandler for simple patterns
 * ```ts
 * const { mock } = createAdvancedSqlMock(createQueryHandler(new Map([
 *   ["count(*)", [{ count: "42" }]],
 *   ["select * from users", [{ id: 1 }]],
 * ])));
 * ```
 */
export function createAdvancedSqlMock(handler: SqlQueryHandler = () => []): SqlCallTracker & { mock: AdvancedSqlMock } {
	const tracker: SqlCallTracker = {
		calls: [],
		unsafeCalls: [],
	};

	const sqlMock = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
		tracker.calls.push({ strings, values });

		// Join template strings to form the query text
		const queryText = strings.join("");
		return Promise.resolve(handler(queryText, values));
	}) as AdvancedSqlMock;

	sqlMock.unsafe = vi.fn((query: string, params: unknown[] = []) => {
		tracker.unsafeCalls.push({ query, params });
		return Promise.resolve(handler(query, params));
	});

	return { ...tracker, mock: sqlMock };
}

// ============================================================================
// Redis Mocking Utilities
// ============================================================================

/**
 * Type for a standard Redis mock with common operations.
 */
export type RedisMock = {
	del: ReturnType<typeof vi.fn>;
	expire: ReturnType<typeof vi.fn>;
	get: ReturnType<typeof vi.fn>;
	incr: ReturnType<typeof vi.fn>;
	incrby: ReturnType<typeof vi.fn>;
	set: ReturnType<typeof vi.fn>;
	sismember: ReturnType<typeof vi.fn>;
	smembers: ReturnType<typeof vi.fn>;
};

/**
 * Creates a standardized Redis mock with sensible defaults.
 * All methods return successful responses by default and can be overridden.
 *
 * @param overrides - Partial mock implementations to override defaults
 * @returns A Redis mock object suitable for injection
 *
 * @example
 * ```ts
 * const redis = createRedisMock({
 *   incr: vi.fn(async () => 5),
 *   get: vi.fn(async () => "cached-value"),
 * });
 * mockContainerGet.mockReturnValue(redis);
 * ```
 */
export function createRedisMock(overrides: Partial<RedisMock> = {}): RedisMock {
	return {
		del: vi.fn(async () => 1),
		expire: vi.fn(async () => 1),
		get: vi.fn(async () => null),
		incr: vi.fn(async () => 1),
		incrby: vi.fn(async (_key: string, amount: number) => amount),
		set: vi.fn(async () => "OK"),
		sismember: vi.fn(async () => 0),
		smembers: vi.fn(async () => []),
		...overrides,
	};
}
