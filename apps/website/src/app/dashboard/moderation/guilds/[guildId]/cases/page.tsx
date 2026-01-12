import { ArrowUpRightIcon, InboxIcon, SearchIcon, UserRoundIcon, UsersIcon } from "lucide-react";
import { notFound } from "next/navigation";
import type { SearchParams } from "nuqs/server";
import { BreadcrumbItem, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Description, Label } from "@/components/ui/Field";
import { Input, InputGroup } from "@/components/ui/Input";
import { Link } from "@/components/ui/Link";
import { SearchField } from "@/components/ui/SearchField";
import { Separator } from "@/components/ui/Separator";
import { buttonStyles } from "@/styles/ui/button";
import { GuildAccessDenied } from "../../../../../../components/GuildAccessDenied";
import {
	getDiscordGuildIconUrl,
	getGuildAcronym,
	getGuildModerationContext,
} from "../../../../../../utils/guildModerationContext";
import { casesSearchParamsCache, serializeCasesSearchParams } from "./searchParams";

type CasesAggregate = {
	readonly target_id: string;
	readonly target_tag: string;
	readonly cases_count: string;
};

type CasesResponse = {
	readonly cases: readonly CasesAggregate[];
	readonly count: number;
};

function parseCount(value: string) {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : 0;
}

export default async function Page({
	params,
	searchParams,
}: {
	readonly params: Promise<{ guildId: string }>;
	readonly searchParams?: Promise<SearchParams>;
}) {
	const { guildId } = await params;
	const parsedSearchParams = await casesSearchParamsCache.parse(searchParams ?? Promise.resolve({}));
	const q = parsedSearchParams.q.trim();
	const sort = parsedSearchParams.sort;

	const numberFormatter = new Intl.NumberFormat("en-US");

	const { partialGuild, hasModRole } = await getGuildModerationContext(guildId);

	const guildIcon = getDiscordGuildIconUrl(partialGuild, 240);
	const guildAcronym = getGuildAcronym(partialGuild.name);

	const buildHref = (next: Partial<{ q: string; sort: "recent" | "count" }>) => {
		const nextQ = typeof next.q === "string" ? next.q.trim() : q;
		const nextSort = next.sort ?? sort;

		return serializeCasesSearchParams(`/dashboard/moderation/guilds/${guildId}/cases`, {
			q: nextQ,
			sort: nextSort,
		});
	};

	if (!hasModRole) {
		return (
			<GuildAccessDenied
				backHref={`/dashboard/moderation/guilds/${guildId}`}
				description="This page is limited to members with the configured moderator role."
				guildId={guildId}
				guildName={partialGuild.name}
				title="You don't have access to cases in this guild"
				trail={[{ label: "Cases" }]}
			/>
		);
	}

	const casesData = await fetch(`${process.env.BOT_API_URL}/api/guilds/${guildId}/cases`, {
		headers: {
			Authorization: `Bearer ${process.env.JWT_TOKEN}`,
		},
	});

	if (casesData.status !== 200) {
		return notFound();
	}

	const { cases, count } = (await casesData.json()) as CasesResponse;

	const needle = q.toLowerCase();
	const filtered = needle
		? cases.filter((case_) => case_.target_id.includes(q) || case_.target_tag.toLowerCase().includes(needle))
		: cases;

	const sorted = [...filtered].sort((a, b) => {
		if (sort === "count") {
			return parseCount(b.cases_count) - parseCount(a.cases_count);
		}
		return 0;
	});

	const totalTargets = cases.length;
	const shownTargets = sorted.length;
	const totalCases = count;

	return (
		<div className="mx-auto w-full max-w-6xl px-6 pb-10">
			<div className="flex flex-col gap-6 py-6">
				<Breadcrumbs>
					<BreadcrumbItem href="/dashboard/moderation">Moderation</BreadcrumbItem>
					<BreadcrumbItem href="/dashboard/moderation/guilds">Guilds</BreadcrumbItem>
					<BreadcrumbItem href={`/dashboard/moderation/guilds/${guildId}`}>{partialGuild.name}</BreadcrumbItem>
					<BreadcrumbItem>Cases</BreadcrumbItem>
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
							<h1 className="text-3xl font-semibold tracking-tight">Cases</h1>
							<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
								Review recent moderation case activity for <span className="font-medium">{partialGuild.name}</span>.
							</p>
							<div className="flex flex-wrap gap-2 pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
								<span className="max-w-full rounded-full border border-base-neutral-200 px-2.5 py-1 dark:border-base-neutral-700">
									Guild: <span className="font-mono break-all">{guildId}</span>
								</span>
								<span className="rounded-full border border-base-neutral-200 px-2.5 py-1 dark:border-base-neutral-700">
									Scope: latest 50 targets
								</span>
							</div>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<Link className={buttonStyles()} href={`/dashboard/moderation/guilds/${guildId}`} variant="unset">
							<InboxIcon aria-hidden data-slot="icon" />
							Overview
						</Link>
						<Link className={buttonStyles()} href={`/dashboard/moderation/guilds/${guildId}/appeals`} variant="unset">
							<UsersIcon aria-hidden data-slot="icon" />
							Appeals
						</Link>
					</div>
				</div>

				<Separator className="mx-0" />

				<div className="grid gap-4 sm:grid-cols-3">
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Total cases</p>
						<p className="pt-1 text-2xl font-semibold">{numberFormatter.format(totalCases)}</p>
						<p className="pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
							Actions excluding warns/notes
						</p>
					</div>
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Targets</p>
						<p className="pt-1 text-2xl font-semibold">{numberFormatter.format(totalTargets)}</p>
						<p className="pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
							Users with recorded cases
						</p>
					</div>
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Showing</p>
						<p className="pt-1 text-2xl font-semibold">{numberFormatter.format(shownTargets)}</p>
						<p className="pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
							{q ? "Filtered results" : "All results"}
						</p>
					</div>
				</div>

				<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
					<form className="flex flex-col gap-3 md:flex-row md:place-items-center" method="get">
						<div className="flex w-full flex-col gap-1">
							<SearchField>
								<Label>Search</Label>
								<InputGroup>
									<SearchIcon aria-hidden data-slot="icon" />
									<Input name="q" placeholder="Search by user tag or ID…" defaultValue={q} />
								</InputGroup>
								<Description>
									Matches against <span className="font-mono">target_tag</span> and{" "}
									<span className="font-mono">target_id</span>.
								</Description>
							</SearchField>
						</div>

						<Button type="submit" variant="secondary-filled" className="md:mt-1">
							Search
						</Button>
					</form>

					<div className="flex flex-wrap gap-2 pt-4 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
						<Link
							className={buttonStyles({ variant: sort === "recent" ? "secondary-filled" : "secondary-outline" })}
							href={buildHref({ sort: "recent" })}
							variant="unset"
						>
							Recent activity
						</Link>
						<Link
							className={buttonStyles({ variant: sort === "count" ? "secondary-filled" : "secondary-outline" })}
							href={buildHref({ sort: "count" })}
							variant="unset"
						>
							Most cases
						</Link>
					</div>
				</div>

				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1 sm:flex-row sm:place-content-between sm:place-items-baseline">
						<h2 className="text-base-label-lg text-base-neutral-900 dark:text-base-neutral-40">Targets</h2>
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
							Showing {numberFormatter.format(shownTargets)} of {numberFormatter.format(totalTargets)}
						</p>
					</div>

					{sorted.length ? (
						<div className="grid gap-3 md:grid-cols-2">
							{sorted.map((case_) => {
								const caseCount = parseCount(case_.cases_count);
								return (
									<div
										key={case_.target_id}
										className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800"
									>
										<div className="flex gap-4">
											<div className="grid size-10 shrink-0 place-content-center rounded-lg border border-base-neutral-200 bg-base-neutral-0 text-base-neutral-600 dark:border-base-neutral-700 dark:bg-base-neutral-900 dark:text-base-neutral-300">
												<UserRoundIcon aria-hidden className="size-5" />
											</div>

											<div className="min-w-0 grow">
												<div className="flex flex-wrap place-content-between place-items-start gap-2">
													<div className="min-w-0">
														<p className="truncate text-base-label-md text-base-neutral-900 dark:text-base-neutral-40">
															{case_.target_tag}
														</p>
														<p className="pt-0.5 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
															<span className="font-mono break-all">{case_.target_id}</span>
														</p>
													</div>

													<span className="shrink-0 rounded-full border border-base-neutral-200 bg-base-neutral-0 px-2.5 py-1 text-base-xs text-base-neutral-600 dark:border-base-neutral-700 dark:bg-base-neutral-900 dark:text-base-neutral-300">
														{numberFormatter.format(caseCount)} cases
													</span>
												</div>

												<div className="flex flex-wrap gap-2 pt-3">
													<Link
														className={buttonStyles({ variant: "secondary-filled" })}
														href={`/dashboard/moderation/guilds/${guildId}/cases/${case_.target_id}`}
														variant="unset"
													>
														Open cases
													</Link>
													<Link
														className={buttonStyles({ variant: "discreet" })}
														href={`https://discord.com/users/${case_.target_id}`}
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
							<p className="text-base-label-lg text-base-neutral-900 dark:text-base-neutral-40">
								{q ? "No matches" : "No cases"}
							</p>
							<p className="pt-1 text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
								{q ? "Try a different search query." : "This guild has no recorded cases yet."}
							</p>
							{q ? (
								<div className="flex place-content-center pt-4">
									<Link
										className={buttonStyles({ variant: "secondary-filled" })}
										href={buildHref({ q: "" })}
										variant="unset"
									>
										Clear search
									</Link>
								</div>
							) : null}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
