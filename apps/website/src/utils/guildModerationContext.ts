import { notFound, redirect } from "next/navigation";
import { getDiscordTokenOrRedirect } from "./discordAuth";

export type PartialDiscordGuild = {
	readonly id: string;
	readonly name: string;
	readonly icon?: string | null;
};

export type DiscordMember = {
	readonly joined_at?: string | null;
	readonly communication_disabled_until?: string | null;
	readonly roles?: readonly string[] | null;
	readonly user?: {
		readonly id: string;
		readonly username: string;
		readonly avatar?: string | null;
		readonly banner?: string | null;
		readonly accent_color?: number | null;
	} | null;
	readonly permissions?: string | null;
};

export type GuildSettings = {
	readonly guild_id?: string | null;
	readonly mod_log_channel_id?: string | null;
	readonly mod_role_id?: string | null;
	readonly guild_log_webhook_id?: string | null;
	readonly member_log_webhook_id?: string | null;
	readonly locale?: string | null;
	readonly force_locale?: boolean | null;
	readonly report_channel_id?: string | null;
	readonly appeal_channel_id?: string | null;
	readonly log_ignore_channels?: readonly string[] | null;
	readonly automod_ignore_roles?: readonly string[] | null;
};

export function getDiscordGuildIconUrl(guild: PartialDiscordGuild, size: number) {
	return guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=${size}` : null;
}

export function getGuildAcronym(name: string) {
	return name.slice(0, 2).toUpperCase();
}

async function fetchDiscordGuilds(tokenValue: string) {
	const guildsData = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
		headers: {
			Authorization: `Bearer ${tokenValue}`,
		},
		next: { revalidate: 3_600 },
	});

	if (guildsData.status !== 200) {
		redirect("/api/discord/logout");
	}

	return (await guildsData.json()) as PartialDiscordGuild[];
}

async function fetchDiscordMember(tokenValue: string, guildId: string) {
	const memberData = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
		headers: {
			Authorization: `Bearer ${tokenValue}`,
		},
		next: { revalidate: 3_600 },
	});

	if (memberData.status !== 200) {
		redirect("/api/discord/logout");
	}

	return (await memberData.json()) as DiscordMember;
}

async function fetchGuildSettings(guildId: string) {
	const guildSettingsData = await fetch(`${process.env.BOT_API_URL}/api/guilds/${guildId}/settings`, {
		headers: {
			Authorization: `Bearer ${process.env.JWT_TOKEN}`,
		},
		next: { revalidate: 300 },
	});

	if (guildSettingsData.status !== 200) {
		return notFound();
	}

	return (await guildSettingsData.json()) as GuildSettings;
}

export async function getGuildModerationContext(guildId: string) {
	const tokenValue = await getDiscordTokenOrRedirect();

	const [guilds, member, guildSettings] = await Promise.all([
		fetchDiscordGuilds(tokenValue),
		fetchDiscordMember(tokenValue, guildId),
		fetchGuildSettings(guildId),
	]);

	const partialGuild = guilds.find((guild) => guild.id === guildId);

	if (!partialGuild) {
		return notFound();
	}

	const modRoleId = guildSettings.mod_role_id ?? null;
	const memberRoleIds = member.roles ?? [];
	const hasModRole = modRoleId ? memberRoleIds.includes(modRoleId) : false;

	return {
		tokenValue,
		partialGuild,
		member,
		guildSettings,
		modRoleId,
		memberRoleIds,
		hasModRole,
	} as const;
}
