import { container, kWebhooks, logger, truncateEmbed, addFields } from "@yuudachi/framework";
import type { Guild, GuildMember, Snowflake, Webhook } from "discord.js";
import { Client, channelMention, codeBlock } from "discord.js";
import i18next from "i18next";
import {
	ATTACHMENT_DUPLICATE_THRESHOLD,
	ATTACHMENT_SPAM_THRESHOLD,
	Color,
	INTERACTION_SPAM_THRESHOLD,
	MENTION_THRESHOLD,
	SPAM_THRESHOLD,
} from "../../Constants.js";
import type { Case } from "../cases/createCase.js";
import { getGuildSetting, SettingsKeys } from "../settings/getGuildSetting.js";

type SpamType = "attachments" | "content" | "interactions" | "mentions";

type SpamMetrics = {
	attachmentHashes?: readonly string[] | undefined;
	maxDuplicateCount?: number | undefined;
	totalAttachmentCount?: number | undefined;
	totalContentCount?: number | undefined;
	totalInteractionCount?: number | undefined;
	totalMentionCount?: number | undefined;
};

const SPAM_TYPE_ACTIONS: Record<SpamType, string> = {
	mentions: "Ban",
	attachments: "Softban",
	content: "Softban",
	interactions: "Softban",
};

export async function sendSpamGuildLog(
	guild: Guild,
	member: GuildMember,
	channelId: Snowflake | null,
	spamType: SpamType,
	metrics: SpamMetrics,
	case_: Case,
	locale: string,
): Promise<void> {
	try {
		const guildLogWebhookId = await getGuildSetting(guild.id, SettingsKeys.GuildLogWebhookId);

		if (!guildLogWebhookId) {
			return;
		}

		const webhooks = container.get<Map<string, Webhook>>(kWebhooks);
		const webhook = webhooks.get(guildLogWebhookId);

		if (!webhook) {
			return;
		}

		const infoParts: string[] = [];

		if (channelId) {
			infoParts.push(
				i18next.t("log.guild_log.spam_detection.channel", { channel: channelMention(channelId), lng: locale }),
			);
		}

		infoParts.push(i18next.t(`log.guild_log.spam_detection.type_${spamType}`, { lng: locale }));

		switch (spamType) {
			case "mentions": {
				infoParts.push(
					i18next.t("log.guild_log.spam_detection.total_mentions", {
						count: metrics.totalMentionCount,
						threshold: MENTION_THRESHOLD,
						lng: locale,
					}),
				);
				break;
			}

			case "attachments": {
				infoParts.push(
					i18next.t("log.guild_log.spam_detection.total_attachments", {
						count: metrics.totalAttachmentCount,
						threshold: ATTACHMENT_SPAM_THRESHOLD,
						lng: locale,
					}),
				);

				if (metrics.maxDuplicateCount) {
					infoParts.push(
						i18next.t("log.guild_log.spam_detection.max_duplicates", {
							count: metrics.maxDuplicateCount,
							threshold: ATTACHMENT_DUPLICATE_THRESHOLD,
							lng: locale,
						}),
					);
				}

				break;
			}

			case "content": {
				infoParts.push(
					i18next.t("log.guild_log.spam_detection.total_content", {
						count: metrics.totalContentCount,
						threshold: SPAM_THRESHOLD,
						lng: locale,
					}),
				);
				break;
			}

			case "interactions": {
				infoParts.push(
					i18next.t("log.guild_log.spam_detection.total_interactions", {
						count: metrics.totalInteractionCount,
						threshold: INTERACTION_SPAM_THRESHOLD,
						lng: locale,
					}),
				);
				break;
			}
		}

		infoParts.push(
			i18next.t("log.guild_log.spam_detection.action", { action: SPAM_TYPE_ACTIONS[spamType], lng: locale }),
		);

		const hasAttachmentHashes = spamType === "attachments" && Boolean(metrics.attachmentHashes?.length);

		let embed = addFields({
			author: {
				name: `${member.user.tag} (${member.user.id})`,
				icon_url: member.user.displayAvatarURL(),
			},
			color: Color.DiscordWarning,
			title: i18next.t("log.guild_log.spam_detection.title", { lng: locale }),
			description: hasAttachmentHashes ? codeBlock(metrics.attachmentHashes!.join("\n")) : infoParts.join("\n"),
			footer: { text: i18next.t("log.guild_log.spam_detection.case_footer", { case_id: case_.caseId, lng: locale }) },
			timestamp: new Date().toISOString(),
		});

		if (hasAttachmentHashes) {
			embed = addFields(embed, {
				name: "\u200B",
				value: infoParts.join("\n"),
			});
		}

		const client = container.get<Client<true>>(Client);

		await webhook.send({
			embeds: [truncateEmbed(embed)],
			username: client.user.username,
			avatarURL: client.user.displayAvatarURL(),
		});
	} catch (error) {
		const error_ = error as Error;
		logger.error(error_, error_.message);
	}
}
