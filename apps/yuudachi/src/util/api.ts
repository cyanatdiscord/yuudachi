import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import { container, ellipsis, kSQL } from "@yuudachi/framework";
import { Client } from "discord.js";
import { fastify } from "fastify";
import type { Sql } from "postgres";
import { APPEAL_REASON_MAX_LENGTH, FingerprintStatus } from "../Constants.js";
import { createAppeal } from "../functions/appeals/createAppeal.js";
import { CaseAction } from "../functions/cases/createCase.js";
import type { RawCase } from "../functions/cases/transformCase.js";
import { flagFingerprint } from "../functions/fingerprints/flagFingerprint.js";
import { getFingerprint } from "../functions/fingerprints/getFingerprint.js";
import { getFingerprintStats } from "../functions/fingerprints/getFingerprintStats.js";
import { listFingerprints } from "../functions/fingerprints/listFingerprints.js";
import { recordFingerprint } from "../functions/fingerprints/recordFingerprint.js";

const CASES_PAGE_SIZE = 50;
const FINGERPRINT_INGEST_MAX_BATCH = 100;

export const api = fastify({ trustProxy: true })
	.register(helmet)
	.register(sensible)
	.register(jwt, { secret: process.env.API_JWT_SECRET! })
	.addHook("onRequest", async (request, reply) => {
		try {
			await request.jwtVerify();
		} catch (error) {
			void reply.send(error);
		}
	})
	.register(
		(app, _, done) => {
			app.get("/", () => "Welcome to the yuudachi api.");

			app.get("/guilds", async () => {
				const sql = container.get<Sql<any>>(kSQL);

				return sql<any>`
					select guild_id
					from guild_settings
				`;
			});

			app.get("/guilds/:id", async (request) => {
				const { id } = request.params as any;
				const client = container.get(Client);

				const guild = await client.guilds.fetch(id);

				return guild;
			});

			app.get("/guilds/:id/roles", async (request) => {
				const { id } = request.params as any;
				const client = container.get(Client);
				const guild = client.guilds.cache.get(id);

				if (!guild) {
					throw app.httpErrors.notFound("Guild not found.");
				}

				const roles = [...guild.roles.cache.values()].map((role) => ({
					id: role.id,
					name: role.name,
				}));

				return { roles };
			});

			app.get("/guilds/:id/channels", async (request) => {
				const { id } = request.params as any;
				const client = container.get(Client);
				const guild = client.guilds.cache.get(id);

				if (!guild) {
					throw app.httpErrors.notFound("Guild not found.");
				}

				const channels = [...guild.channels.cache.values()].map((channel) => ({
					id: channel.id,
					name: channel.name,
					type: channel.type,
				}));

				return { channels };
			});

			app.get("/guilds/:id/settings", async (request) => {
				const { id } = request.params as any;
				const sql = container.get<Sql<any>>(kSQL);

				const [guild] = await sql<[any]>`
					select *
					from guild_settings
					where guild_id = ${id}
				`;

				return guild;
			});

			app.get("/users/:id", async (request) => {
				const { id } = request.params as any;
				const client = container.get(Client);
				const sql = container.get<Sql<any>>(kSQL);

				let banned = false;

				try {
					await client.guilds.cache.get("222078108977594368")!.bans.fetch(id);
					banned = true;
				} catch {
					banned = false;
				}

				if (banned) {
					const user = await client.users.fetch(id, { force: true });
					const [case_] = await sql<[RawCase]>`
						select *
						from cases
						where guild_id = '222078108977594368'
							and target_id = ${id}
							and action = ${CaseAction.Ban}
						order by created_at desc
						limit 1
					`;
					const moderator = await client.users.fetch(case_.mod_id, {
						force: true,
					});

					return { user, moderator, banned, case: case_ };
				}

				return { banned };
			});

			app.get("/guilds/:id/cases", async (request) => {
				const { id } = request.params as any;
				const { page } = request.query as { page?: string };
				const sql = container.get<Sql<any>>(kSQL);

				const parsedPage = Number.parseInt(page ?? "1", 10);
				const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
				const offset = (currentPage - 1) * CASES_PAGE_SIZE;

				const cases = await sql<RawCase[]>`
					select target_id, target_tag, count(*) cases_count
					from cases
					where guild_id = ${id}
						and action not in (1, 8)
					group by target_id, target_tag
					order by max(created_at) desc
					limit ${CASES_PAGE_SIZE}
					offset ${offset}
				`;

				const [{ count }] = await sql<[{ count: number }]>`
					select count(*)
					from cases
					where guild_id = ${id}
						and action not in (1, 8)
				`;

				const [{ count: targets }] = await sql<[{ count: number }]>`
					select count(distinct target_id)
					from cases
					where guild_id = ${id}
						and action not in (1, 8)
				`;

				return { cases, count, targets };
			});

			app.get("/guilds/:id/cases/:targetId", async (request) => {
				const { id, targetId } = request.params as any;
				const client = container.get(Client);
				const sql = container.get<Sql<any>>(kSQL);

				const user = await client.users.fetch(targetId, { force: true });
				const cases = await sql<RawCase[]>`
					select *
					from cases
					where guild_id = ${id}
						and target_id = ${targetId}
						and action not in (1, 8)
					order by created_at desc
				`;

				const [{ count }] = await sql<[{ count: number }]>`
					select count(*)
					from cases
					where guild_id = ${id}
						and target_id = ${targetId}
						and action not in (1, 8)
				`;

				return { user, cases, count };
			});

			app.get("/appeals", async (_) => {
				const sql = container.get<Sql<any>>(kSQL);

				const appeals = await sql<RawCase[]>`
					select *, (select count(*) from appeals) as appeals_count
					from appeals
					where guild_id = '222078108977594368'
					order by created_at desc
					limit 50
				`;

				const [{ count }] = await sql<[{ count: number }]>`
					select count(*)
					from appeals
					where guild_id = '222078108977594368'
				`;

				return { appeals, count };
			});

			app.post("/appeals", async (request) => {
				const { guildId, targetId, targetTag, reason } = request.body as any;
				const trimmedReason = reason.trim();

				const appeal = await createAppeal({
					guildId,
					targetId,
					targetTag,
					reason: ellipsis(trimmedReason, APPEAL_REASON_MAX_LENGTH),
				});

				return { appeal };
			});

			// Fingerprint endpoints
			app.get("/fingerprints", async (request) => {
				const { page, limit, status, sort, order, min_occurrences, min_guilds, suspicious } = request.query as {
					limit?: string;
					min_guilds?: string;
					min_occurrences?: string;
					order?: string;
					page?: string;
					sort?: string;
					status?: string;
					suspicious?: string;
				};

				const parsedStatus = status === undefined ? null : Number.parseInt(status, 10);

				return listFingerprints({
					page: page ? Number.parseInt(page, 10) : undefined,
					limit: limit ? Number.parseInt(limit, 10) : undefined,
					status:
						parsedStatus !== null && Number.isFinite(parsedStatus) ? (parsedStatus as FingerprintStatus) : undefined,
					sort: sort as "last_seen" | "occurrence_count" | "guild_count" | "user_count" | undefined,
					order: order as "asc" | "desc" | undefined,
					minOccurrences: min_occurrences ? Number.parseInt(min_occurrences, 10) : undefined,
					minGuilds: min_guilds ? Number.parseInt(min_guilds, 10) : undefined,
					suspicious: suspicious === "true",
				});
			});

			app.get("/fingerprints/stats", async () => getFingerprintStats());

			app.get("/fingerprints/:hash", async (request) => {
				const { hash } = request.params as { hash: string };
				const { include_guilds, include_users, include_occurrences, occurrence_limit } = request.query as {
					include_guilds?: string;
					include_occurrences?: string;
					include_users?: string;
					occurrence_limit?: string;
				};

				const fingerprint = await getFingerprint({
					hash,
					includeGuilds: include_guilds === "true",
					includeUsers: include_users === "true",
					includeOccurrences: include_occurrences === "true",
					occurrenceLimit: occurrence_limit ? Number.parseInt(occurrence_limit, 10) : undefined,
				});

				if (!fingerprint) {
					throw app.httpErrors.notFound("Fingerprint not found.");
				}

				return fingerprint;
			});

			app.patch("/fingerprints/:hash/flag", async (request) => {
				const { hash } = request.params as { hash: string };
				const { status, flagged_by, notes } = request.body as {
					flagged_by?: string;
					notes?: string;
					status: number;
				};

				if (![FingerprintStatus.Normal, FingerprintStatus.Flagged, FingerprintStatus.Trusted].includes(status)) {
					throw app.httpErrors.badRequest("Invalid status value.");
				}

				const fingerprint = await flagFingerprint({
					hash,
					status: status as FingerprintStatus,
					flaggedBy: flagged_by,
					notes,
				});

				if (!fingerprint) {
					throw app.httpErrors.notFound("Fingerprint not found.");
				}

				return fingerprint;
			});

			app.post("/fingerprints/ingest", async (request) => {
				const { fingerprints, status, flagged_by, notes } = request.body as {
					fingerprints: {
						channel_id?: string;
						content_type?: string;
						file_size?: number;
						filename?: string;
						guild_id?: string;
						hash: string;
						user_id?: string;
					}[];
					flagged_by?: string;
					notes?: string;
					status?: number;
				};

				if (!Array.isArray(fingerprints) || fingerprints.length === 0) {
					throw app.httpErrors.badRequest("fingerprints array is required.");
				}

				if (fingerprints.length > FINGERPRINT_INGEST_MAX_BATCH) {
					throw app.httpErrors.badRequest(`Maximum ${FINGERPRINT_INGEST_MAX_BATCH} fingerprints per request.`);
				}

				const parsedStatus = status ?? FingerprintStatus.Normal;
				if (![FingerprintStatus.Normal, FingerprintStatus.Flagged, FingerprintStatus.Trusted].includes(parsedStatus)) {
					throw app.httpErrors.badRequest("Invalid status value.");
				}

				if (parsedStatus === FingerprintStatus.Flagged && !flagged_by) {
					throw app.httpErrors.badRequest("flagged_by is required when status is flagged.");
				}

				// Validate all hashes are valid SHA256 (64 hex chars)
				const hashRegex = /^[a-f0-9]{64}$/i;
				for (const fp of fingerprints) {
					if (!fp.hash || !hashRegex.test(fp.hash)) {
						throw app.httpErrors.badRequest(`Invalid hash format: ${fp.hash}`);
					}
				}

				const sql = container.get<Sql<any>>(kSQL);
				let created = 0;
				let updated = 0;
				const hashes: string[] = [];

				for (const fp of fingerprints) {
					// Check if fingerprint exists
					const [existing] = await sql<[{ hash: string }?]>`
						select hash from attachment_fingerprints where hash = ${fp.hash}
					`;

					// Record the fingerprint
					await recordFingerprint({
						hash: fp.hash,
						guildId: fp.guild_id ?? null,
						userId: fp.user_id ?? null,
						channelId: fp.channel_id ?? null,
						fileSize: fp.file_size ?? null,
						contentType: fp.content_type ?? null,
						filename: fp.filename ?? null,
					});

					// If status is not normal, flag it
					if (parsedStatus !== FingerprintStatus.Normal) {
						await flagFingerprint({
							hash: fp.hash,
							status: parsedStatus as FingerprintStatus,
							flaggedBy: flagged_by,
							notes,
						});
					}

					if (existing) {
						updated++;
					} else {
						created++;
					}

					hashes.push(fp.hash);
				}

				return { ingested: fingerprints.length, created, updated, hashes };
			});

			// Per-guild fingerprints
			app.get("/guilds/:id/fingerprints", async (request) => {
				const { id } = request.params as { id: string };
				const { page, limit, status, sort, order, min_occurrences, min_guilds, suspicious } = request.query as {
					limit?: string;
					min_guilds?: string;
					min_occurrences?: string;
					order?: string;
					page?: string;
					sort?: string;
					status?: string;
					suspicious?: string;
				};

				const parsedStatus = status === undefined ? null : Number.parseInt(status, 10);

				return listFingerprints({
					guildId: id,
					page: page ? Number.parseInt(page, 10) : undefined,
					limit: limit ? Number.parseInt(limit, 10) : undefined,
					status:
						parsedStatus !== null && Number.isFinite(parsedStatus) ? (parsedStatus as FingerprintStatus) : undefined,
					sort: sort as "last_seen" | "occurrence_count" | "guild_count" | "user_count" | undefined,
					order: order as "asc" | "desc" | undefined,
					minOccurrences: min_occurrences ? Number.parseInt(min_occurrences, 10) : undefined,
					minGuilds: min_guilds ? Number.parseInt(min_guilds, 10) : undefined,
					suspicious: suspicious === "true",
				});
			});

			done();
		},
		{ prefix: "/api" },
	);
