import { kSQL } from "@yuudachi/framework";
import { Client } from "discord.js";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "../src/util/api.js";
import { createMockAppeal, createMockCase, mockCaseListEntry, mockAppealListEntry } from "./fixtures/cases.js";
import { createMockClient, createMockGuildStub, mockChannel, mockRole } from "./fixtures/discord.js";
import { createAdvancedSqlMock, mockContainerGet } from "./mocks.js";

const insertedAppeal = createMockAppeal({
	appeal_id: 2,
	created_at: "2024-02-01T00:00:00.000Z",
	guild_id: "guild",
	reason: "reason",
});

let api!: typeof ApiModule.api;

const createAppeal = vi.fn(async (input) => ({ id: "appeal-id", ...input }));
vi.mock("../functions/appeals/createAppeal.js", () => ({ createAppeal }));

const rolesList = [mockRole];
const channelsList = [mockChannel];

const guildStub = createMockGuildStub({ roles: rolesList, channels: channelsList });
const bansFetch = guildStub.bans.fetch;
const usersFetch = vi.fn(async (id: string) => ({ id, tag: `user#${id}` }));
const client = createMockClient({
	guilds: new Map([["222078108977594368", guildStub]]),
	usersFetch,
}) as unknown as Client<true>;

const caseRecord = createMockCase();
const casesList = [mockCaseListEntry];
const targetsCount = casesList.length;
const appealsList = [mockAppealListEntry];

// SQL handler for complex API route queries
// Uses handler-based approach for order-dependent pattern matching
const { mock: sqlMock } = createAdvancedSqlMock((query: string) => {
	// Cases - check more specific patterns first
	if (query.includes("from cases") && query.includes("limit 1")) {
		return [caseRecord];
	}

	if (query.includes("from cases") && query.includes("group by")) {
		return casesList;
	}

	if (query.includes("count(distinct target_id)")) {
		return [{ count: targetsCount }];
	}

	if (query.includes("from cases") && query.includes("count(*)")) {
		return [{ count: 2 }];
	}

	if (query.includes("from cases")) {
		return [caseRecord];
	}

	// Appeals
	if (query.includes("from appeals") && query.includes("appeals_count")) {
		return appealsList;
	}

	if (query.includes("from appeals") && query.includes("count(*)")) {
		return [{ count: appealsList.length }];
	}

	if (query.includes("insert into appeals")) {
		return [insertedAppeal];
	}

	return [];
});

beforeEach(() => {
	createAppeal.mockClear();
	usersFetch.mockClear();
	bansFetch.mockClear();
	mockContainerGet.mockImplementation((token) => {
		if (token === Client) return client;
		if (token === kSQL) return sqlMock;
		return undefined;
	});
	bansFetch.mockResolvedValue({});
});

let authHeader: Record<string, string>;

beforeAll(async () => {
	process.env.API_JWT_SECRET = "test-secret";
	const { api: importedApi } = await import("../src/util/api.js");
	api = importedApi;
	await api.ready();
	const token = api.jwt.sign({ sub: "tester" });
	authHeader = { authorization: `Bearer ${token}` };
});

describe("api", () => {
	it("rejects requests without token", async () => {
		const res = await api.inject({ method: "GET", url: "/api/" });

		expect(res.statusCode).toBe(401);
	});

	it("responds to root route", async () => {
		const res = await api.inject({
			method: "GET",
			url: "/api/",
			headers: authHeader,
		});

		expect(res.statusCode).toBe(200);
		expect(res.body).toBe("Welcome to the yuudachi api.");
	});

	it("returns banned user details", async () => {
		const res = await api.inject({
			method: "GET",
			url: "/api/users/user-id",
			headers: authHeader,
		});
		const body = res.json();

		expect(body.banned).toBe(true);
		expect(body.case.case_id).toBe(1);
		expect(usersFetch).toHaveBeenCalledWith("mod-id", { force: true });
	});

	it("returns non-banned state when ban lookup fails", async () => {
		bansFetch.mockRejectedValue(new Error("not banned"));

		const res = await api.inject({
			method: "GET",
			url: "/api/users/user-id",
			headers: authHeader,
		});

		expect(res.json()).toEqual({ banned: false });
	});

	it("lists cases with counts", async () => {
		const res = await api.inject({
			method: "GET",
			url: "/api/guilds/222078108977594368/cases",
			headers: authHeader,
		});
		const body = res.json();

		expect(body.cases).toEqual(casesList);
		expect(body.count).toBe(2);
		expect(body.targets).toBe(targetsCount);
	});

	it("returns guild roles", async () => {
		const res = await api.inject({
			method: "GET",
			url: "/api/guilds/222078108977594368/roles",
			headers: authHeader,
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ roles: rolesList });
	});

	it("returns guild channels", async () => {
		const res = await api.inject({
			method: "GET",
			url: "/api/guilds/222078108977594368/channels",
			headers: authHeader,
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ channels: channelsList });
	});

	it("returns cases for a single user", async () => {
		const res = await api.inject({
			method: "GET",
			url: "/api/guilds/222078108977594368/cases/user-id",
			headers: authHeader,
		});

		const body = res.json();

		expect(body.user.id).toBe("user-id");
		expect(body.cases).toHaveLength(1);
		expect(body.count).toBe(2);
	});

	it("returns appeals overview", async () => {
		const res = await api.inject({
			method: "GET",
			url: "/api/appeals",
			headers: authHeader,
		});
		const body = res.json();

		expect(body.appeals).toEqual(appealsList);
		expect(body.count).toBe(appealsList.length);
	});

	it("creates appeal entries", async () => {
		const appealParams = {
			guildId: "guild",
			targetId: "target",
			targetTag: "target#0001",
			reason: " reason ",
		};

		const res = await api.inject({
			method: "POST",
			url: "/api/appeals",
			headers: { ...authHeader, "content-type": "application/json" },
			payload: appealParams,
		});

		const body = res.json();

		expect(res.statusCode).toBe(200);
		expect(body.appeal.targetId).toBe("target");
		expect(body.appeal.targetTag).toBe("target#0001");
		expect(body.appeal.reason).toBe("reason");
	});
});
