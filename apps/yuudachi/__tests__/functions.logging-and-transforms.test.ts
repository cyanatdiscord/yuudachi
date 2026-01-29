import type * as FrameworkModule from "@yuudachi/framework";
import type { APIEmbed, APIEmbedField } from "discord.js";
import i18next from "i18next";
import { describe, expect, it, vi } from "vitest";
import { Color } from "../src/Constants.js";
import { transformAppeal } from "../src/functions/appeals/transformAppeal.js";
import { transformCase } from "../src/functions/cases/transformCase.js";
import { formatMessageToEmbed } from "../src/functions/logging/formatMessageToEmbed.js";
import { generateCaseEmbed } from "../src/functions/logging/generateCaseEmbed.js";
import { generateCasePayload } from "../src/functions/logging/generateCasePayload.js";
import { generateReportEmbed } from "../src/functions/logging/generateReportEmbed.js";
import { generateSpamGuildLogEmbed } from "../src/functions/logging/generateSpamGuildLogEmbed.js";
import { transformReport } from "../src/functions/reports/transformReport.js";

vi.mock("@yuudachi/framework", async (importOriginal) => {
	const mod = await importOriginal<typeof FrameworkModule>();
	return {
		...mod,
		addFields: vi.fn((embed: APIEmbed, ...fields: APIEmbedField[]) => {
			if (fields.length > 0) {
				return { ...embed, fields: [...(embed.fields ?? []), ...fields] };
			}

			return embed;
		}),
	};
});

vi.mock("../src/functions/logging/generateCaseColor.js", () => ({
	generateCaseColor: vi.fn(() => 123),
}));

vi.mock("../src/functions/logging/generateCaseLog.js", () => ({
	generateCaseLog: vi.fn(async () => "case log"),
}));

vi.mock("../src/functions/settings/getGuildSetting.js", () => ({
	getGuildSetting: vi.fn(async () => "en"),
	SettingsKeys: { Locale: "locale" },
}));

vi.mock("../src/functions/logging/generateReportLog.js", () => ({
	generateReportLog: vi.fn(async () => "report log"),
}));

const locale = "en-US";

describe("transformers", () => {
	it("transforms case, appeal and report rows", () => {
		const rawCase = {
			case_id: 1,
			guild_id: "1",
			action: 2,
			role_id: "10",
			action_expiration: "2024-01-01",
			reason: "reason",
			mod_id: "2",
			mod_tag: "Mod#0001",
			target_id: "3",
			target_tag: "User#0003",
			context_message_id: "5",
			ref_id: 6,
			report_ref_id: 7,
			appeal_ref_id: 8,
			log_message_id: "9",
			action_processed: true,
			multi: false,
			created_at: "2024-01-01",
		};
		expect(transformCase(rawCase as any)).toMatchObject({
			caseId: 1,
			guildId: "1",
			roleId: "10",
			actionProcessed: true,
			createdAt: "2024-01-01",
		});

		const rawAppeal = {
			appeal_id: 1,
			guild_id: "1",
			status: 0,
			target_id: "3",
			target_tag: "User#0003",
			mod_id: "2",
			mod_tag: "Mod#0001",
			reason: "reason",
			ref_id: 4,
			updated_at: null,
			created_at: "2024-01-01",
		};
		expect(transformAppeal(rawAppeal as any)).toMatchObject({
			appealId: 1,
			refId: 4,
			createdAt: "2024-01-01",
		});

		const rawReport = {
			attachment_url: null,
			author_id: "2",
			author_tag: "Author",
			channel_id: "3",
			context_messages_ids: ["10"],
			created_at: "2024-01-01",
			guild_id: "1",
			log_post_id: null,
			message_id: "4",
			mod_id: "5",
			mod_tag: "Mod",
			reason: "Reason",
			ref_id: 6,
			report_id: 7,
			status: 1,
			target_id: "8",
			target_tag: "User",
			type: 2,
			updated_at: null,
		};
		expect(transformReport(rawReport as any)).toMatchObject({
			reportId: 7,
			contextMessagesIds: ["10"],
			targetId: "8",
		});
	});
});

describe("generateCasePayload", () => {
	it("builds payload with references and expiration", () => {
		const payload = generateCasePayload({
			guildId: "1",
			action: 2,
			roleId: "10",
			duration: 1_000,
			args: {
				reason: "reason",
				case_reference: 5,
				report_reference: 6,
				appeal_reference: 7,
				days: 2,
				user: {
					member: null,
					user: { id: "3", tag: "User#0003" } as any,
				},
			},
			user: { id: "4", tag: "Mod#0004" } as any,
			messageId: "11",
		});

		expect(payload).toMatchObject({
			guildId: "1",
			roleId: "10",
			reason: "reason",
			modId: "4",
			targetId: "3",
			refId: 5,
			reportRefId: 6,
			appealRefId: 7,
			contextMessageId: "11",
		});
		expect(payload.actionExpiration).toBeInstanceOf(Date);
	});
});

describe("generateCaseEmbed", () => {
	it("builds embed with author and localized footer", async () => {
		const caseData = {
			caseId: 1,
			guildId: "1",
			action: 1,
			createdAt: "2024-01-01",
		} as any;

		const embed = await generateCaseEmbed(
			"1" as any,
			"2" as any,
			{ id: "4", tag: "Mod#4", displayAvatarURL: () => "url" } as any,
			caseData,
		);
		expect(embed).toMatchObject({
			author: { name: "Mod#4 (4)", icon_url: "url" },
			color: 123,
		});
	});
});

describe("generateReportEmbed", () => {
	it("maps status to color and attaches image", async () => {
		const report = {
			status: 2,
			attachmentUrl: "https://image",
			targetId: "1",
			targetTag: "Target",
			authorId: "2",
			authorTag: "Author",
			guildId: "3",
		} as any;
		const user = {
			id: "10",
			tag: "Author",
			avatarURL: () => "avatar",
			client: { user: { displayAvatarURL: () => "client-avatar" } },
		} as any;

		const embed = await generateReportEmbed(user, report, "en");
		expect(embed.color).toBeDefined();
		expect(embed.image?.url).toBe("https://image");
		expect(embed.description).toBe("report log");
	});
});

describe("formatMessageToEmbed", () => {
	it("builds embed from message content without attachment image", () => {
		const message = {
			author: {
				tag: "User#0001",
				id: "1",
				displayAvatarURL: () => "avatar.png",
			},
			content: "hello world",
			createdAt: new Date("2024-01-01T00:00:00.000Z"),
			channel: { name: "general" },
			attachments: { first: () => null },
		} as any;

		const embed = formatMessageToEmbed(message, "en");

		expect(embed.description).toBe("hello world");
		expect(embed.author?.name).toBe("User#0001 (1)");
		expect(embed.footer?.text).toBe("#general");
		expect(embed.color).toBe(Color.DiscordEmbedBackground);
		expect(embed.image).toBeUndefined();
	});

	it("uses fallback translation and attaches image when present", () => {
		const message = {
			author: {
				tag: "User#0001",
				id: "1",
				displayAvatarURL: () => "avatar.png",
			},
			content: "",
			createdAt: new Date("2024-01-01T00:00:00.000Z"),
			channel: { name: "general" },
			attachments: {
				first: () => ({
					url: "https://example.com/image.png",
					contentType: "image/png",
					name: "image.png",
				}),
			},
		} as any;

		const embed = formatMessageToEmbed(message, locale);

		expect(embed.description).toBe(i18next.t("common.errors.no_content", { lng: locale }));
		expect(embed.image?.url).toBe("https://example.com/image.png");
	});
});

describe("generateSpamGuildLogEmbed", () => {
	const createMockMember = () =>
		({
			user: {
				tag: "SpamUser#0001",
				id: "123456789",
				displayAvatarURL: () => "https://avatar.url/spam.png",
			},
		}) as any;

	const createMockCase = (caseId = 42) =>
		({
			caseId,
			guildId: "987654321",
			action: 1,
			createdAt: "2024-01-01",
		}) as any;

	it("should build mention spam embed with correct structure", () => {
		const member = createMockMember();
		const case_ = createMockCase();

		const embed = generateSpamGuildLogEmbed(member, "111222333", "mentions", { totalMentionCount: 25 }, case_, locale);

		expect(embed.author?.name).toBe("SpamUser#0001 (123456789)");
		expect(embed.author?.icon_url).toBe("https://avatar.url/spam.png");
		expect(embed.color).toBe(Color.DiscordWarning);
		expect(embed.title).toBe(i18next.t("log.guild_log.spam_detection.title", { lng: locale }));
		expect(embed.footer?.text).toBe(
			i18next.t("log.guild_log.spam_detection.case_footer", { case_id: 42, lng: locale }),
		);
		expect(embed.description).toContain(i18next.t("log.guild_log.spam_detection.type_mentions", { lng: locale }));
		expect(embed.timestamp).toBeDefined();
	});

	it("should build attachment spam embed with hashes in description and metadata in field", () => {
		const member = createMockMember();
		const case_ = createMockCase();
		const hashes = ["abc123hash", "def456hash", "ghi789hash"];

		const embed = generateSpamGuildLogEmbed(
			member,
			"111222333",
			"attachments",
			{
				totalAttachmentCount: 15,
				maxDuplicateCount: 5,
				attachmentHashes: hashes,
			},
			case_,
			locale,
		);

		expect(embed.description).toContain("abc123hash");
		expect(embed.description).toContain("def456hash");
		expect(embed.description).toContain("ghi789hash");
		expect(embed.fields).toBeDefined();
		expect(embed.fields?.length).toBe(1);
		expect(embed.fields?.[0]?.name).toBe("\u200B");
		expect(embed.fields?.[0]?.value).toContain(
			i18next.t("log.guild_log.spam_detection.type_attachments", { lng: locale }),
		);
	});

	it("should build attachment spam embed without hashes when none provided", () => {
		const member = createMockMember();
		const case_ = createMockCase();

		const embed = generateSpamGuildLogEmbed(
			member,
			"111222333",
			"attachments",
			{
				totalAttachmentCount: 15,
				maxDuplicateCount: 0,
			},
			case_,
			locale,
		);

		expect(embed.description).toContain(i18next.t("log.guild_log.spam_detection.type_attachments", { lng: locale }));
		expect(embed.fields).toBeUndefined();
	});

	it("should build content spam embed", () => {
		const member = createMockMember();
		const case_ = createMockCase();

		const embed = generateSpamGuildLogEmbed(member, "111222333", "content", { totalContentCount: 10 }, case_, locale);

		expect(embed.description).toContain(i18next.t("log.guild_log.spam_detection.type_content", { lng: locale }));
		expect(embed.color).toBe(Color.DiscordWarning);
	});

	it("should build interaction spam embed", () => {
		const member = createMockMember();
		const case_ = createMockCase();

		const embed = generateSpamGuildLogEmbed(
			member,
			"111222333",
			"interactions",
			{ totalInteractionCount: 50 },
			case_,
			locale,
		);

		expect(embed.description).toContain(i18next.t("log.guild_log.spam_detection.type_interactions", { lng: locale }));
	});

	it("should include channel mention when channelId provided", () => {
		const member = createMockMember();
		const case_ = createMockCase();

		const embed = generateSpamGuildLogEmbed(member, "111222333", "mentions", { totalMentionCount: 25 }, case_, locale);

		expect(embed.description).toContain("<#111222333>");
	});

	it("should omit channel line when channelId is null", () => {
		const member = createMockMember();
		const case_ = createMockCase();

		const embed = generateSpamGuildLogEmbed(member, null, "mentions", { totalMentionCount: 25 }, case_, locale);

		expect(embed.description).not.toContain("<#");
	});
});
