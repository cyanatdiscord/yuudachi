import { vi } from "vitest";

/**
 * Mock user object matching Discord.js User interface
 */
export type MockUser = {
	createdTimestamp: number;
	displayAvatarURL: () => string;
	id: string;
	tag: string;
	toString: () => string;
};

/**
 * Mock role object
 */
export type MockRole = {
	id: string;
	name: string;
};

/**
 * Mock channel object
 */
export type MockChannel = {
	id: string;
	name: string;
	type: number;
};

/**
 * Base mock user
 */
export const mockUser: MockUser = {
	createdTimestamp: Date.parse("2020-01-01T00:00:00.000Z"),
	displayAvatarURL: () => "https://cdn.discordapp.com/avatars/test/test.png",
	id: "user-id",
	tag: "user#0001",
	toString: () => "<@user-id>",
};

/**
 * Base mock role
 */
export const mockRole: MockRole = {
	id: "role-id",
	name: "Moderators",
};

/**
 * Base mock channel
 */
export const mockChannel: MockChannel = {
	id: "channel-id",
	name: "general",
	type: 0,
};

/**
 * Creates a mock user with optional overrides
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
	const base = { ...mockUser };
	const merged = { ...base, ...overrides };

	// Ensure toString returns the correct user mention
	if (!overrides.toString && overrides.id) {
		merged.toString = () => `<@${merged.id}>`;
	}

	return merged;
}

/**
 * Creates a mock role with optional overrides
 */
export function createMockRole(overrides: Partial<MockRole> = {}): MockRole {
	return {
		...mockRole,
		...overrides,
	};
}

/**
 * Creates a mock channel with optional overrides
 */
export function createMockChannel(overrides: Partial<MockChannel> = {}): MockChannel {
	return {
		...mockChannel,
		...overrides,
	};
}

/**
 * Creates a guild stub with roles and channels caches
 */
export function createMockGuildStub(
	options: {
		channels?: MockChannel[];
		roles?: MockRole[];
	} = {},
) {
	const roles = options.roles ?? [mockRole];
	const channels = options.channels ?? [mockChannel];

	const bansFetch = vi.fn();

	return {
		bans: { fetch: bansFetch },
		channels: {
			cache: new Map(channels.map((channel) => [channel.id, channel])),
		},
		roles: {
			cache: new Map(roles.map((role) => [role.id, role])),
		},
	};
}

/**
 * Creates a mock Discord client with guilds and users
 */
export function createMockClient(
	options: {
		guilds?: Map<string, ReturnType<typeof createMockGuildStub>>;
		usersFetch?: ReturnType<typeof vi.fn>;
	} = {},
) {
	const usersFetch = options.usersFetch ?? vi.fn(async (id: string) => ({ id, tag: `user#${id}` }));

	return {
		guilds: {
			cache: options.guilds ?? new Map([["222078108977594368", createMockGuildStub()]]),
		},
		users: { fetch: usersFetch },
	};
}
