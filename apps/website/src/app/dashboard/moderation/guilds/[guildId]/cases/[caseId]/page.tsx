import { InboxIcon, ShieldIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { CaseCard } from "@/components/CaseCard";
import { UserDisplay } from "@/components/UserDisplay";
import { Breadcrumbs, BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { Link } from "@/components/ui/Link";
import { Separator } from "@/components/ui/Separator";
import { buttonStyles } from "@/styles/ui/button";
import { GuildAccessDenied } from "../../../../../../../components/GuildAccessDenied";
import {
	getDiscordGuildIconUrl,
	getGuildAcronym,
	getGuildModerationContext,
} from "../../../../../../../utils/guildModerationContext";

export default async function Page({ params }: { readonly params: Promise<{ guildId: string; caseId: string }> }) {
	const { guildId, caseId: targetId } = await params;

	const numberFormatter = new Intl.NumberFormat("en-US");
	const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "2-digit",
		hour: "numeric",
		minute: "2-digit",
	});

	const { partialGuild, hasModRole } = await getGuildModerationContext(guildId);

	if (!hasModRole) {
		return (
			<GuildAccessDenied
				backHref={`/dashboard/moderation/guilds/${guildId}`}
				description="This page is limited to members with the configured moderator role."
				guildId={guildId}
				guildName={partialGuild.name}
				title="You don't have access to cases in this guild"
				trail={[
					{ href: `/dashboard/moderation/guilds/${guildId}/cases`, label: "Cases" },
					{ label: <span className="font-mono break-all">{targetId}</span> },
				]}
			/>
		);
	}

	const caseData = await fetch(`${process.env.BOT_API_URL}/api/guilds/${guildId}/cases/${targetId}`, {
		headers: {
			Authorization: `Bearer ${process.env.JWT_TOKEN}`,
		},
	});

	if (caseData.status === 404) {
		return notFound();
	}

	if (caseData.status !== 200) {
		return (
			<div className="mx-auto w-full max-w-6xl px-6 pb-10">
				<div className="flex flex-col gap-6 py-6">
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 text-base-neutral-900 dark:border-base-neutral-700 dark:bg-base-neutral-800 dark:text-base-neutral-40">
						<div className="flex flex-col gap-1">
							<p className="text-base-label-lg">Failed to load cases</p>
							<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
								The cases service returned HTTP {caseData.status}.
							</p>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<Link
							className={buttonStyles({ variant: "secondary-discreet" })}
							href={`/dashboard/moderation/guilds/${guildId}/cases`}
							variant="unset"
						>
							Back to cases
						</Link>
					</div>
				</div>
			</div>
		);
	}

	const data = (await caseData.json()) as {
		readonly user?: {
			readonly id: string;
			readonly username: string;
			readonly avatar?: string | null;
			readonly banner?: string | null;
			readonly accent_color?: number | null;
		} | null;
		readonly cases?: readonly any[] | null;
		readonly count?: number | null;
	};

	const user = data.user ?? null;
	const cases = data.cases ?? [];
	const totalCases = data.count ?? cases.length;

	if (!user) {
		return (
			<div className="mx-auto w-full max-w-6xl px-6 pb-10">
				<div className="flex flex-col gap-6 py-6">
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 text-base-neutral-900 dark:border-base-neutral-700 dark:bg-base-neutral-800 dark:text-base-neutral-40">
						<div className="flex flex-col gap-1">
							<p className="text-base-label-lg">No user found</p>
							<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
								We couldn't resolve a Discord user for <span className="font-mono break-all">{targetId}</span>.
							</p>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<Link
							className={buttonStyles({ variant: "secondary-discreet" })}
							href={`/dashboard/moderation/guilds/${guildId}/cases`}
							variant="unset"
						>
							Back to cases
						</Link>
					</div>
				</div>
			</div>
		);
	}

	const guildIcon = getDiscordGuildIconUrl(partialGuild, 160);
	const guildAcronym = getGuildAcronym(partialGuild.name);

	const mostRecentAt = cases[0]?.created_at ? new Date(cases[0].created_at as string) : null;

	return (
		<div className="mx-auto w-full max-w-6xl px-6 pb-10">
			<div className="flex flex-col gap-6 py-6">
				<Breadcrumbs>
					<BreadcrumbItem href="/dashboard/moderation">Moderation</BreadcrumbItem>
					<BreadcrumbItem href="/dashboard/moderation/guilds">Guilds</BreadcrumbItem>
					<BreadcrumbItem href={`/dashboard/moderation/guilds/${guildId}`}>{partialGuild.name}</BreadcrumbItem>
					<BreadcrumbItem href={`/dashboard/moderation/guilds/${guildId}/cases`}>Cases</BreadcrumbItem>
					<BreadcrumbItem>
						<span className="font-mono break-all">{targetId}</span>
					</BreadcrumbItem>
				</Breadcrumbs>

				<div className="flex flex-col gap-4 lg:flex-row lg:place-content-between lg:place-items-center">
					<div className="flex place-items-center gap-4">
						<div className="size-16 shrink-0 overflow-hidden rounded-2xl border border-base-neutral-200 bg-base-neutral-0 dark:border-base-neutral-700 dark:bg-base-neutral-800">
							{guildIcon ? (
								<picture>
									<img alt={partialGuild.name} className="size-full object-cover" src={guildIcon} />
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
							<h1 className="text-3xl font-semibold tracking-tight">Case review</h1>
							<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
								Review moderation case activity for <span className="font-medium">{user.username}</span>.
							</p>
							<div className="flex flex-wrap gap-2 pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
								<span className="rounded-full border border-base-neutral-200 px-2.5 py-1 dark:border-base-neutral-700">
									{numberFormatter.format(totalCases)} cases
								</span>
								<span className="max-w-full rounded-full border border-base-neutral-200 px-2.5 py-1 dark:border-base-neutral-700">
									Target: <span className="font-mono break-all">{user.id}</span>
								</span>
								{mostRecentAt ? (
									<span className="rounded-full border border-base-neutral-200 px-2.5 py-1 dark:border-base-neutral-700">
										Last activity: {dateTimeFormatter.format(mostRecentAt)}
									</span>
								) : null}
							</div>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<Link className={buttonStyles()} href={`/dashboard/moderation/guilds/${guildId}`} variant="unset">
							<InboxIcon aria-hidden data-slot="icon" />
							Overview
						</Link>
						<Link className={buttonStyles()} href={`/dashboard/moderation/guilds/${guildId}/cases`} variant="unset">
							<ShieldIcon aria-hidden data-slot="icon" />
							Cases
						</Link>
					</div>
				</div>

				<Separator className="mx-0" />

				<div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
					<div className="lg:sticky lg:top-6 lg:self-start">
						<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
							<UserDisplay className="w-full max-w-none" user={user} />
							<div className="mt-3 flex flex-col gap-2 text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
								<div className="flex flex-wrap gap-x-2 gap-y-1">
									<span className="font-medium text-base-neutral-900 dark:text-base-neutral-40">Guild</span>
									<span className="font-mono break-all">{partialGuild.id}</span>
								</div>
								<div className="flex flex-wrap gap-x-2 gap-y-1">
									<span className="font-medium text-base-neutral-900 dark:text-base-neutral-40">User</span>
									<span className="font-mono break-all">{user.id}</span>
								</div>
							</div>
						</div>
					</div>

					<div className="flex min-w-0 flex-col gap-6">
						<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 dark:border-base-neutral-700 dark:bg-base-neutral-800">
							<div className="flex place-items-center gap-3">
								<div className="flex flex-col">
									<p className="text-base-label-lg text-base-neutral-900 dark:text-base-neutral-40">Cases</p>
									<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
										Chronological list (newest first).
									</p>
								</div>
							</div>
						</div>

						{cases.length ? (
							<div className="flex flex-col gap-6">
								{cases.map((case_: any) => (
									<div
										key={case_.case_id}
										className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 dark:border-base-neutral-700 dark:bg-base-neutral-800"
									>
										<div className="flex flex-col gap-3">
											<div className="flex flex-wrap place-content-between place-items-end gap-2">
												<h2 className="text-base-label-lg text-base-neutral-900 dark:text-base-neutral-40">
													Case <span className="font-mono">#{case_.case_id}</span>
												</h2>
												{case_.created_at ? (
													<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
														{dateTimeFormatter.format(new Date(case_.created_at))}
													</p>
												) : null}
											</div>
											<CaseCard case_={case_} />
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-10 text-center dark:border-base-neutral-700 dark:bg-base-neutral-800">
								<p className="text-base-label-lg text-base-neutral-900 dark:text-base-neutral-40">No cases</p>
								<p className="mt-1 text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
									No moderation cases were found for this user in this guild.
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
