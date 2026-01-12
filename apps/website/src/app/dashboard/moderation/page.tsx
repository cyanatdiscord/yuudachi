import { ArrowUpRightIcon, LockIcon, ShieldIcon, UsersIcon } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BreadcrumbItem, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Link } from "@/components/ui/Link";
import { Separator } from "@/components/ui/Separator";
import { buttonStyles } from "@/styles/ui/button";

type DiscordGuild = {
	readonly id: string;
	readonly name: string;
	readonly icon?: string | null;
	readonly owner?: boolean;
};

type BotGuildRow = {
	readonly guild_id?: string | null;
};

function guildIconHref(guild: DiscordGuild) {
	if (!guild.icon) {
		return null;
	}

	const isIconAnimated = guild.icon.startsWith("a_");
	return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${isIconAnimated ? "gif" : "png"}?size=240`;
}

export default async function Page() {
	const cookieStore = await cookies();

	const token = cookieStore.get("discord_token");
	if (!token) {
		redirect("/login");
	}

	const guildsData = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
		headers: {
			Authorization: `Bearer ${token.value}`,
		},
		next: { revalidate: 3_600 },
	});

	if (guildsData.status !== 200) {
		return redirect("/api/discord/logout");
	}

	const guilds = (await guildsData.json()) as DiscordGuild[];

	const botGuildsData = await fetch(`${process.env.BOT_API_URL}/api/guilds`, {
		headers: {
			Authorization: `Bearer ${process.env.JWT_TOKEN}`,
		},
	});

	if (botGuildsData.status !== 200) {
		return redirect("/api/discord/logout");
	}

	const botGuilds = (await botGuildsData.json()) as BotGuildRow[];

	const resolvedGuilds = guilds.filter((guild: any) => botGuilds?.some((botGuild) => botGuild.guild_id === guild.id));

	const numberFormatter = new Intl.NumberFormat("en-US");

	const totalGuilds = guilds.length;
	const connectedGuilds = resolvedGuilds.length;

	return (
		<div className="mx-auto w-full max-w-6xl px-6 pb-10">
			<div className="flex flex-col gap-6 py-6">
				<Breadcrumbs>
					<BreadcrumbItem>Moderation</BreadcrumbItem>
				</Breadcrumbs>

				<div className="flex flex-col gap-4 lg:flex-row lg:place-content-between lg:place-items-center">
					<div className="flex place-items-center gap-4">
						<div className="grid size-16 shrink-0 place-content-center rounded-2xl border border-base-neutral-200 bg-base-neutral-0 text-base-neutral-600 dark:border-base-neutral-700 dark:bg-base-neutral-800 dark:text-base-neutral-300">
							<ShieldIcon aria-hidden className="size-7" />
						</div>

						<div className="flex flex-col gap-1">
							<h1 className="text-3xl font-semibold tracking-tight">Moderation</h1>
							<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
								Select a guild to review cases, appeals, and moderation settings.
							</p>
							<div className="flex flex-wrap gap-2 pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
								<span className="rounded-full border border-base-neutral-200 px-2.5 py-1 dark:border-base-neutral-700">
									Connected: <span className="font-mono">{numberFormatter.format(connectedGuilds)}</span>
								</span>
								<span className="rounded-full border border-base-neutral-200 px-2.5 py-1 dark:border-base-neutral-700">
									Total: <span className="font-mono">{numberFormatter.format(totalGuilds)}</span>
								</span>
							</div>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<Link className={buttonStyles({ variant: "secondary-outline" })} href="/dashboard" variant="unset">
							<UsersIcon aria-hidden data-slot="icon" />
							Dashboard
						</Link>
					</div>
				</div>
			</div>

			<Separator className="mx-0" />

			<div className="flex flex-col gap-6 pt-6">
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1 sm:flex-row sm:place-content-between sm:place-items-baseline">
						<h2 className="text-base-label-lg text-base-neutral-900 dark:text-base-neutral-40">Connected guilds</h2>
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
							Showing {numberFormatter.format(connectedGuilds)} of {numberFormatter.format(connectedGuilds)}
						</p>
					</div>

					{resolvedGuilds.length ? (
						<div className="grid gap-3 md:grid-cols-2">
							{resolvedGuilds.map((guild) => {
								const iconHref = guildIconHref(guild);
								const acronym = guild.name.slice(0, 2).toUpperCase();

								return (
									<div
										className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800"
										key={guild.id}
									>
										<div className="flex gap-4">
											<div className="size-12 shrink-0 overflow-hidden rounded-2xl border border-base-neutral-200 bg-base-neutral-0 dark:border-base-neutral-700 dark:bg-base-neutral-900">
												{iconHref ? (
													<picture>
														<img alt={guild.name} className="size-full object-cover" src={iconHref} />
													</picture>
												) : (
													<div className="grid size-full place-content-center">
														<span className="text-base-label-md text-base-neutral-600 dark:text-base-neutral-300">
															{acronym}
														</span>
													</div>
												)}
											</div>

											<div className="min-w-0 grow">
												<div className="flex flex-wrap place-content-between place-items-start gap-2">
													<div className="min-w-0">
														<p className="truncate text-base-label-md text-base-neutral-900 dark:text-base-neutral-40">
															{guild.name}
														</p>
														<p className="pt-0.5 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
															<span className="font-mono break-all">{guild.id}</span>
														</p>
													</div>

													{guild.owner ? (
														<span className="shrink-0 rounded-full border border-base-neutral-200 bg-base-neutral-0 px-2.5 py-1 text-base-xs text-base-neutral-600 dark:border-base-neutral-700 dark:bg-base-neutral-900 dark:text-base-neutral-300">
															Owner
														</span>
													) : null}
												</div>

												<div className="flex flex-wrap gap-2 pt-3">
													<Link
														className={buttonStyles({ variant: "secondary-filled" })}
														href={`/dashboard/moderation/guilds/${guild.id}`}
														variant="unset"
													>
														Open
													</Link>
													<Link
														className={buttonStyles({ variant: "discreet" })}
														href={`https://discord.com/channels/${guild.id}`}
														target="_blank"
														variant="unset"
													>
														Open Discord
														<ArrowUpRightIcon aria-hidden data-slot="icon" />
													</Link>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 text-center dark:border-base-neutral-700 dark:bg-base-neutral-800">
							<div className="mx-auto flex max-w-md flex-col gap-2">
								<div className="mx-auto grid size-10 place-content-center rounded-full bg-base-neutral-100 text-base-neutral-600 dark:bg-base-neutral-700 dark:text-base-neutral-200">
									<LockIcon aria-hidden className="size-5" />
								</div>
								<p className="text-base-label-lg text-base-neutral-900 dark:text-base-neutral-40">
									No connected guilds
								</p>
								<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
									You can only manage guilds where the bot is installed and you have access.
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
