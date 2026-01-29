import {
	ActivityIcon,
	ArrowUpRightIcon,
	BanIcon,
	CalendarDaysIcon,
	GavelIcon,
	HashIcon,
	ShieldIcon,
	SparklesIcon,
	UsersIcon,
} from "lucide-react";
import { notFound } from "next/navigation";
import { UserDisplay } from "@/components/UserDisplay";
import { BreadcrumbItem, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Link } from "@/components/ui/Link";
import { Separator } from "@/components/ui/Separator";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/Tabs";
import { buttonStyles } from "@/styles/ui/button";
import { GuildAccessDenied } from "../../../../../components/GuildAccessDenied";
import { getGuildModerationContext } from "../../../../../utils/guildModerationContext";
import { KeyValueTableClient, type KeyValueTableRowValue } from "./KeyValueTableClient";

type BotGuild = {
	readonly id: string;
	readonly name: string;
	readonly description?: string | null;
	readonly icon?: string | null;
	readonly iconURL?: string | null;
	readonly nameAcronym?: string | null;
	readonly preferredLocale?: string | null;
	readonly ownerId?: string | null;
	readonly createdTimestamp?: number | null;
	readonly joinedTimestamp?: number | null;
	readonly premiumTier?: number | null;
	readonly memberCount?: number | null;
	readonly features?: readonly string[] | null;
	readonly channels?: readonly string[] | null;
	readonly roles?: readonly string[] | null;
	readonly bans?: readonly unknown[] | null;
	readonly scheduledEvents?: readonly unknown[] | null;
	readonly autoModerationRules?: readonly unknown[] | null;
};

type GuildRole = {
	readonly id: string;
	readonly name: string;
};

type GuildChannel = {
	readonly id: string;
	readonly name: string;
	readonly type: number;
};

type GuildRolesResponse = {
	readonly roles: readonly GuildRole[];
};

type GuildChannelsResponse = {
	readonly channels: readonly GuildChannel[];
};

type KeyValueRow = {
	readonly id: string;
	readonly label: string;
	readonly value: KeyValueTableRowValue;
};

export default async function Page({ params }: { readonly params: Promise<{ guildId: string }> }) {
	const { guildId } = await params;
	const { partialGuild, member, guildSettings, modRoleId, memberRoleIds, hasModRole } =
		await getGuildModerationContext(guildId);

	if (!hasModRole) {
		return (
			<GuildAccessDenied
				description="This dashboard is limited to members with the configured moderator role."
				guildId={guildId}
				guildName={partialGuild.name}
				title="You don't have access to this guild"
			/>
		);
	}

	const guildData = await fetch(`https://bot.yuudachi.dev/api/guilds/222078108977594368`, {
		headers: {
			Authorization: `Bearer ${process.env.JWT_TOKEN}`,
		},
	});

	if (guildData.status !== 200) {
		return notFound();
	}

	const guild = (await guildData.json()) as BotGuild;

	const [rolesData, channelsData] = await Promise.all([
		fetch(`${process.env.BOT_API_URL}/api/guilds/${guildId}/roles`, {
			headers: {
				Authorization: `Bearer ${process.env.JWT_TOKEN}`,
			},
		}),
		fetch(`${process.env.BOT_API_URL}/api/guilds/${guildId}/channels`, {
			headers: {
				Authorization: `Bearer ${process.env.JWT_TOKEN}`,
			},
		}),
	]);

	const roles = rolesData.status === 200 ? ((await rolesData.json()) as GuildRolesResponse).roles : [];
	const channels = channelsData.status === 200 ? ((await channelsData.json()) as GuildChannelsResponse).channels : [];
	const roleLookup = new Map(roles.map((role) => [role.id, role.name]));
	const channelLookup = new Map(channels.map((channel) => [channel.id, channel.name]));

	const resolveRoleName = (roleId?: string | null) => (roleId ? (roleLookup.get(roleId) ?? null) : null);
	const resolveChannelName = (channelId?: string | null) => (channelId ? (channelLookup.get(channelId) ?? null) : null);

	const numberFormatter = new Intl.NumberFormat("en-US");

	const dateFormatter = new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	});

	const formatNumber = (value: number | null | undefined) =>
		typeof value === "number" && Number.isFinite(value) ? numberFormatter.format(value) : "—";

	const formatDate = (value: number | string | null | undefined) => {
		if (!value) {
			return "—";
		}

		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
	};

	const isIconAnimated = guild.icon?.startsWith("a_") ?? false;
	const guildIcon =
		guild.iconURL ??
		(guild.icon
			? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${isIconAnimated ? "gif" : "png"}?size=240`
			: partialGuild.icon
				? `https://cdn.discordapp.com/icons/${partialGuild.id}/${partialGuild.icon}.png?size=240`
				: null);
	const guildAcronym = guild.nameAcronym ?? guild.name.slice(0, 2).toUpperCase();
	const description = guild.description?.trim() ? guild.description : "No guild description has been set yet.";

	const stats = [
		{
			id: "members",
			label: "Members",
			value: guild.memberCount,
			helper: "Community size",
			icon: UsersIcon,
		},
		{
			id: "channels",
			label: "Channels",
			value: guild.channels?.length ?? 0,
			helper: "Text, voice, stages",
			icon: HashIcon,
		},
		{
			id: "roles",
			label: "Roles",
			value: guild.roles?.length ?? 0,
			helper: "Assignable permissions",
			icon: GavelIcon,
		},
		{
			id: "bans",
			label: "Bans",
			value: guild.bans?.length ?? 0,
			helper: "Active restrictions",
			icon: BanIcon,
		},
		{
			id: "events",
			label: "Events",
			value: guild.scheduledEvents?.length ?? 0,
			helper: "Upcoming",
			icon: CalendarDaysIcon,
		},
		{
			id: "automod",
			label: "AutoMod",
			value: guild.autoModerationRules?.length ?? 0,
			helper: "Rules enabled",
			icon: SparklesIcon,
		},
	] as const;

	const settingsRows: KeyValueRow[] = [
		{
			id: "mod-role",
			label: "Moderator role",
			value: modRoleId
				? {
						kind: "role",
						roleId: modRoleId,
						roleName: resolveRoleName(modRoleId),
					}
				: { kind: "text", text: "Not set" },
		},

		{
			id: "mod-log",
			label: "Mod log channel",
			value: guildSettings.mod_log_channel_id
				? {
						kind: "channelLink",
						channelId: guildSettings.mod_log_channel_id,
						channelName: resolveChannelName(guildSettings.mod_log_channel_id),
					}
				: { kind: "text", text: "Not set" },
		},

		{
			id: "guild-log-webhook",
			label: "Guild log webhook",
			value: {
				kind: "text",
				text: guildSettings.guild_log_webhook_id ? "Connected" : "Not set",
			},
		},
		{
			id: "member-log-webhook",
			label: "Member log webhook",
			value: {
				kind: "text",
				text: guildSettings.member_log_webhook_id ? "Connected" : "Not set",
			},
		},
		{
			id: "report-channel",
			label: "Report channel",
			value: guildSettings.report_channel_id
				? {
						kind: "channelLink",
						channelId: guildSettings.report_channel_id,
						channelName: resolveChannelName(guildSettings.report_channel_id),
					}
				: { kind: "text", text: "Not set" },
		},

		{
			id: "appeal-channel",
			label: "Appeal channel",
			value: guildSettings.appeal_channel_id
				? {
						kind: "channelLink",
						channelId: guildSettings.appeal_channel_id,
						channelName: resolveChannelName(guildSettings.appeal_channel_id),
					}
				: { kind: "text", text: "Not set" },
		},

		{
			id: "locale",
			label: "Locale",
			value: {
				kind: "text",
				text: guildSettings.locale ?? guild.preferredLocale ?? "—",
			},
		},
		{
			id: "force-locale",
			label: "Force locale",
			value: {
				kind: "text",
				text: guildSettings.force_locale ? "Enabled" : "Disabled",
			},
		},
		{
			id: "log-ignore",
			label: "Log ignore channels",
			value: {
				kind: "text",
				text: `${guildSettings.log_ignore_channels?.length ?? 0} channels`,
			},
		},
		{
			id: "automod-ignore",
			label: "AutoMod ignore roles",
			value: {
				kind: "text",
				text: `${guildSettings.automod_ignore_roles?.length ?? 0} roles`,
			},
		},
	];

	const detailsRows: KeyValueRow[] = [
		{
			id: "guild-id",
			label: "Guild ID",
			value: { kind: "mono", text: guild.id },
		},
		{
			id: "owner-id",
			label: "Owner ID",
			value: guild.ownerId ? { kind: "mono", text: guild.ownerId } : { kind: "text", text: "—" },
		},
		{
			id: "created",
			label: "Created",
			value: { kind: "text", text: formatDate(guild.createdTimestamp) },
		},
		{
			id: "bot-joined",
			label: "Bot joined",
			value: { kind: "text", text: formatDate(guild.joinedTimestamp) },
		},
		{
			id: "tier",
			label: "Premium tier",
			value: { kind: "text", text: `Tier ${guild.premiumTier ?? 0}` },
		},
	];

	const accessRows: KeyValueRow[] = [
		{
			id: "joined",
			label: "Joined guild",
			value: { kind: "text", text: formatDate(member.joined_at) },
		},
		{
			id: "roles",
			label: "Roles",
			value: { kind: "text", text: formatNumber(memberRoleIds.length) },
		},
		{
			id: "timeout",
			label: "Timeout",
			value: {
				kind: "text",
				text: member.communication_disabled_until
					? formatDate(member.communication_disabled_until)
					: "No active timeout",
			},
		},
		{
			id: "mod-role",
			label: "Mod role",
			value: {
				kind: "text",
				text: modRoleId ? (hasModRole ? "Granted" : "Missing") : "Not required",
			},
		},
		{
			id: "permissions",
			label: "Permissions",
			value: member.permissions ? { kind: "mono", text: member.permissions } : { kind: "text", text: "—" },
		},
	];

	return (
		<div className="mx-auto w-full max-w-6xl px-6 pb-10">
			<div className="flex flex-col gap-6 py-6">
				<Breadcrumbs>
					<BreadcrumbItem href="/dashboard/moderation">Moderation</BreadcrumbItem>
					<BreadcrumbItem href="/dashboard/moderation/guilds">Guilds</BreadcrumbItem>
					<BreadcrumbItem>{guild.name}</BreadcrumbItem>
				</Breadcrumbs>

				<div className="flex flex-col gap-4 lg:flex-row lg:place-content-between lg:place-items-center">
					<div className="flex place-items-center gap-4">
						<div className="size-16 shrink-0 overflow-hidden rounded-2xl border border-base-neutral-200 bg-base-neutral-0 dark:border-base-neutral-700 dark:bg-base-neutral-800">
							{guildIcon ? (
								<picture>
									<img alt={guild.name} className="size-full object-cover" src={guildIcon} />
								</picture>
							) : (
								<div className="grid size-full place-content-center">
									<span className="text-base-label-lg text-base-neutral-600 dark:text-base-neutral-300">
										{guildAcronym}
									</span>
								</div>
							)}
						</div>

						<div className="flex flex-col gap-1">
							<h1 className="text-3xl font-semibold tracking-tight">{guild.name}</h1>
							<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">{description}</p>
							<div className="flex flex-wrap gap-2 pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
								<span className="max-w-full rounded-full border border-base-neutral-200 px-2.5 py-1 dark:border-base-neutral-700">
									ID: <span className="font-mono break-all">{guild.id}</span>
								</span>
								<span className="rounded-full border border-base-neutral-200 px-2.5 py-1 dark:border-base-neutral-700">
									Locale: {guildSettings.locale ?? guild.preferredLocale ?? "—"}
								</span>
							</div>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<Link className={buttonStyles()} href={`/dashboard/moderation/guilds/${guildId}/cases`} variant="unset">
							<ShieldIcon aria-hidden data-slot="icon" />
							Cases
						</Link>
						<Link className={buttonStyles()} href={`/dashboard/moderation/guilds/${guildId}/appeals`} variant="unset">
							<UsersIcon aria-hidden data-slot="icon" />
							Appeals
						</Link>
						<Link
							className={buttonStyles({ variant: "secondary-filled" })}
							href={`https://discord.com/channels/${guildId}`}
							target="_blank"
							variant="unset"
						>
							<ActivityIcon aria-hidden data-slot="icon" />
							Open Discord
							<ArrowUpRightIcon aria-hidden data-slot="icon" />
						</Link>
					</div>
				</div>
			</div>

			<Separator className="mx-0" />

			<div className="pt-6">
				<Tabs defaultSelectedKey="overview">
					<TabList aria-label="Guild dashboard sections">
						<Tab id="overview">Overview</Tab>
						<Tab id="settings">Settings</Tab>
						<Tab id="access">Your access</Tab>
					</TabList>

					<TabPanel className="pt-6" id="overview">
						<div className="flex flex-col gap-6">
							<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
								{stats.map((stat) => {
									const Icon = stat.icon;

									return (
										<div
											className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800"
											key={stat.id}
										>
											<div className="flex items-start gap-4">
												<div className="rounded-full bg-base-neutral-100 p-2 text-base-neutral-600 dark:bg-base-neutral-700 dark:text-base-neutral-200">
													<Icon aria-hidden className="size-5" />
												</div>
												<div className="flex flex-1 flex-col gap-1">
													<span className="text-base-xs font-semibold tracking-wide text-base-neutral-500 uppercase">
														{stat.label}
													</span>
													<span className="text-2xl font-semibold">{formatNumber(stat.value)}</span>
													<span className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
														{stat.helper}
													</span>
												</div>
											</div>
										</div>
									);
								})}
							</div>

							<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
								<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 dark:border-base-neutral-700 dark:bg-base-neutral-800">
									<div className="flex place-items-center gap-2">
										<ActivityIcon aria-hidden className="size-4 text-base-neutral-500" />
										<h2 className="text-base-label-lg font-semibold">Guild snapshot</h2>
									</div>
									<div className="pt-4">
										<KeyValueTableClient ariaLabel="Guild snapshot" guildId={guildId} rows={detailsRows} />
									</div>
								</div>

								<div className="flex flex-col gap-6">
									<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 dark:border-base-neutral-700 dark:bg-base-neutral-800">
										<div className="flex place-items-center gap-2">
											<ShieldIcon aria-hidden className="size-4 text-base-neutral-500" />
											<h2 className="text-base-label-lg font-semibold">Quick checks</h2>
										</div>
										<div className="grid gap-3 pt-4 text-base-sm">
											<div className="flex place-content-between place-items-center">
												<span className="text-base-neutral-600 dark:text-base-neutral-300">Moderator role</span>
												<span className="font-medium">{modRoleId ? "Configured" : "Not set"}</span>
											</div>
											<div className="flex place-content-between place-items-center">
												<span className="text-base-neutral-600 dark:text-base-neutral-300">Mod log</span>
												<span className="font-medium">
													{guildSettings.mod_log_channel_id ? "Connected" : "Not set"}
												</span>
											</div>
											<div className="flex place-content-between place-items-center">
												<span className="text-base-neutral-600 dark:text-base-neutral-300">Guild logs</span>
												<span className="font-medium">
													{guildSettings.guild_log_webhook_id ? "Connected" : "Not set"}
												</span>
											</div>
											<div className="flex place-content-between place-items-center">
												<span className="text-base-neutral-600 dark:text-base-neutral-300">Member logs</span>
												<span className="font-medium">
													{guildSettings.member_log_webhook_id ? "Connected" : "Not set"}
												</span>
											</div>
										</div>
									</div>

									<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 dark:border-base-neutral-700 dark:bg-base-neutral-800">
										<div className="flex place-items-center gap-2">
											<ShieldIcon aria-hidden className="size-4 text-base-neutral-500" />
											<h2 className="text-base-label-lg font-semibold">Features</h2>
										</div>
										<div className="pt-4">
											{(guild.features?.length ?? 0) > 0 ? (
												<div className="flex flex-wrap gap-2">
													{(guild.features ?? []).slice(0, 12).map((feature) => (
														<span
															className="max-w-full rounded-full border border-base-neutral-200 px-2.5 py-1 text-base-xs font-semibold break-all text-base-neutral-600 dark:border-base-neutral-600 dark:text-base-neutral-200"
															key={feature}
														>
															{feature}
														</span>
													))}
													{(guild.features?.length ?? 0) > 12 ? (
														<span className="max-w-full rounded-full border border-base-neutral-200 px-2.5 py-1 text-base-xs font-semibold break-all text-base-neutral-600 dark:border-base-neutral-600 dark:text-base-neutral-200">
															+{formatNumber((guild.features?.length ?? 0) - 12)} more
														</span>
													) : null}
												</div>
											) : (
												<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
													No special features are listed for this guild.
												</p>
											)}
										</div>
									</div>
								</div>
							</div>
						</div>
					</TabPanel>

					<TabPanel className="pt-6" id="settings">
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
							<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 dark:border-base-neutral-700 dark:bg-base-neutral-800">
								<div className="flex place-items-center gap-2">
									<ShieldIcon aria-hidden className="size-4 text-base-neutral-500" />
									<h2 className="text-base-label-lg font-semibold">Moderation settings</h2>
								</div>
								<div className="pt-4">
									<KeyValueTableClient ariaLabel="Moderation settings" guildId={guildId} rows={settingsRows} />
								</div>
							</div>

							<div className="flex flex-col gap-6">
								<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 dark:border-base-neutral-700 dark:bg-base-neutral-800">
									<div className="flex place-items-center gap-2">
										<SparklesIcon aria-hidden className="size-4 text-base-neutral-500" />
										<h2 className="text-base-label-lg font-semibold">Tips</h2>
									</div>
									<ul className="list-disc space-y-2 pt-4 pl-5 text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
										<li>
											Set a <span className="font-medium">moderator role</span> to restrict dashboard access.
										</li>
										<li>
											Configure a <span className="font-medium">mod log channel</span> to centralize actions.
										</li>
										<li>
											Enable <span className="font-medium">webhooks</span> for richer audit events.
										</li>
									</ul>
								</div>

								<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 dark:border-base-neutral-700 dark:bg-base-neutral-800">
									<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
										Want to adjust settings? Add an editor page under{" "}
										<span className="font-mono break-all">/dashboard/moderation/guilds/{guildId}/settings</span>.
									</p>
								</div>
							</div>
						</div>
					</TabPanel>

					<TabPanel className="pt-6" id="access">
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
							<div className="flex flex-col gap-4">
								{member.user ? (
									<div className="place-items-center rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
										<UserDisplay user={member.user} />
									</div>
								) : (
									<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 dark:border-base-neutral-700 dark:bg-base-neutral-800">
										<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
											Discord did not return a user object for your membership payload.
										</p>
									</div>
								)}
							</div>

							<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 dark:border-base-neutral-700 dark:bg-base-neutral-800">
								<div className="flex place-items-center gap-2">
									<UsersIcon aria-hidden className="size-4 text-base-neutral-500" />
									<h2 className="text-base-label-lg font-semibold">Your access</h2>
								</div>
								<div className="pt-4">
									<KeyValueTableClient ariaLabel="Your access" guildId={guildId} rows={accessRows} />
								</div>
							</div>
						</div>
					</TabPanel>
				</Tabs>
			</div>
		</div>
	);
}
