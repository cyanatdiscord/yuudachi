import { format } from "@lukeed/ms";
import { AlertTriangleIcon, CheckCircle2Icon, ClockIcon, FingerprintIcon, ShieldAlertIcon } from "lucide-react";
import { notFound } from "next/navigation";
import type { SearchParams } from "nuqs/server";
import { FingerprintAccessDenied } from "@/components/FingerprintAccessDenied";
import { FingerprintStatusBadge } from "@/components/FingerprintStatusBadge";
import { BreadcrumbItem, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Link } from "@/components/ui/Link";
import { Separator } from "@/components/ui/Separator";
import { buttonStyles } from "@/styles/ui/button";
import type { Fingerprint, FingerprintStats, FingerprintsResponse } from "@/types/fingerprints";
import { checkFingerprintAccess } from "@/utils/fingerprintAccess";
import { FINGERPRINT_STATUS_FLAGGED, FINGERPRINT_STATUS_TRUSTED, isSuspiciousFingerprint } from "@/utils/fingerprints";
import { convertDataRateLogBinary } from "@/utils/format";
import { fingerprintsSearchParamsCache, serializeFingerprintsSearchParams } from "./searchParams";

export default async function Page({ searchParams }: { readonly searchParams?: Promise<SearchParams> }) {
	const { hasAccess, user } = await checkFingerprintAccess();

	if (!hasAccess) {
		return <FingerprintAccessDenied username={user.global_name ?? user.username} />;
	}

	const parsedSearchParams = await fingerprintsSearchParamsCache.parse(searchParams ?? Promise.resolve({}));
	const statusFilter = parsedSearchParams.status;
	const sort = parsedSearchParams.sort;
	const page = parsedSearchParams.page > 0 ? parsedSearchParams.page : 1;

	const numberFormatter = new Intl.NumberFormat("en-US");

	const buildHref = (
		next: Partial<{
			status: "all" | "flagged" | "suspicious" | "trusted";
			sort: "last_seen" | "occurrence_count" | "guild_count" | "user_count";
			page: number;
		}>,
	) => {
		const nextStatus = next.status ?? statusFilter;
		const nextSort = next.sort ?? sort;
		const nextPage = typeof next.page === "number" ? next.page : page;

		return serializeFingerprintsSearchParams("/dashboard/moderation/fingerprints", {
			status: nextStatus,
			sort: nextSort,
			page: nextPage,
		});
	};

	// Build fingerprints API URL
	const fingerprintsUrl = new URL(`${process.env.BOT_API_URL}/api/fingerprints`);
	fingerprintsUrl.searchParams.set("page", String(page));
	fingerprintsUrl.searchParams.set("limit", "50");
	fingerprintsUrl.searchParams.set("sort", sort);
	fingerprintsUrl.searchParams.set("order", "desc");

	if (statusFilter === "flagged") {
		fingerprintsUrl.searchParams.set("status", String(FINGERPRINT_STATUS_FLAGGED));
	} else if (statusFilter === "trusted") {
		fingerprintsUrl.searchParams.set("status", String(FINGERPRINT_STATUS_TRUSTED));
	} else if (statusFilter === "suspicious") {
		fingerprintsUrl.searchParams.set("suspicious", "true");
	}

	// Fetch fingerprints and stats in parallel
	const [fingerprintsRes, statsRes] = await Promise.all([
		fetch(fingerprintsUrl, {
			headers: { Authorization: `Bearer ${process.env.JWT_TOKEN}` },
		}),
		fetch(`${process.env.BOT_API_URL}/api/fingerprints/stats`, {
			headers: { Authorization: `Bearer ${process.env.JWT_TOKEN}` },
		}),
	]);

	// Handle API errors - can't show page without fingerprints list
	if (!fingerprintsRes.ok) {
		return notFound();
	}

	const fingerprintsData = (await fingerprintsRes.json()) as FingerprintsResponse;

	// Stats are optional - use fallback if the request failed
	const stats: FingerprintStats = statsRes.ok
		? ((await statsRes.json()) as FingerprintStats)
		: {
				totalFingerprints: 0,
				flaggedCount: 0,
				trustedCount: 0,
				totalOccurrences: 0,
				totalActionsTaken: 0,
				seenLast24h: 0,
				seenLast7d: 0,
				suspiciousCount: 0,
				suspiciousThresholdGuilds: 5,
				suspiciousThresholdOccurrences: 10,
				totalUniqueUsers: 0,
			};

	const { fingerprints, total, pageSize } = fingerprintsData;
	const totalPages = total ? Math.ceil(total / pageSize) : 1;
	const hasPagination = totalPages > 1;
	const hasPrevPage = page > 1;
	const hasNextPage = page < totalPages;

	return (
		<div className="mx-auto w-full max-w-6xl px-6 pb-10">
			<div className="flex flex-col gap-6 py-6">
				<Breadcrumbs>
					<BreadcrumbItem href="/dashboard/moderation">Moderation</BreadcrumbItem>
					<BreadcrumbItem>Fingerprints</BreadcrumbItem>
				</Breadcrumbs>

				<div className="flex flex-col gap-4 lg:flex-row lg:place-content-between lg:place-items-center">
					<div className="flex place-items-center gap-4">
						<div className="grid size-16 shrink-0 place-content-center overflow-hidden rounded-2xl border border-base-neutral-200 bg-base-neutral-0 dark:border-base-neutral-700 dark:bg-base-neutral-800">
							<FingerprintIcon aria-hidden className="size-8 text-base-neutral-600 dark:text-base-neutral-300" />
						</div>

						<div className="flex flex-col gap-1">
							<h1 className="text-3xl font-semibold tracking-tight">Attachment Fingerprints</h1>
							<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
								Track attachment fingerprints across all guilds for scam detection.
							</p>
						</div>
					</div>
				</div>

				<Separator className="mx-0" />

				<div className="grid gap-4 sm:grid-cols-4">
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Total fingerprints</p>
						<p className="pt-1 text-2xl font-semibold">{numberFormatter.format(stats.totalFingerprints)}</p>
						<p className="pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
							{numberFormatter.format(stats.totalOccurrences)} total occurrences
						</p>
					</div>
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Flagged</p>
						<p className="pt-1 text-2xl font-semibold">{numberFormatter.format(stats.flaggedCount)}</p>
						<p className="pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
							{numberFormatter.format(stats.totalActionsTaken)} actions taken
						</p>
					</div>
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Suspicious</p>
						<p className="pt-1 text-2xl font-semibold">{numberFormatter.format(stats.suspiciousCount)}</p>
						<p className="pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
							{stats.suspiciousThresholdGuilds}+ guilds or {stats.suspiciousThresholdOccurrences}+ occurrences
						</p>
					</div>
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Seen (24h)</p>
						<p className="pt-1 text-2xl font-semibold">{numberFormatter.format(stats.seenLast24h)}</p>
						<p className="pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
							{numberFormatter.format(stats.seenLast7d)} in last 7 days
						</p>
					</div>
				</div>

				<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
					<div className="flex flex-col gap-4 md:flex-row md:place-content-between">
						<div className="flex flex-wrap gap-2">
							<span className="self-center text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Status:</span>
							<Link
								className={buttonStyles({
									variant: statusFilter === "all" ? "secondary-filled" : "secondary-outline",
								})}
								href={buildHref({ status: "all", page: 1 })}
								variant="unset"
							>
								All
							</Link>
							<Link
								className={buttonStyles({
									variant: statusFilter === "flagged" ? "secondary-filled" : "secondary-outline",
								})}
								href={buildHref({ status: "flagged", page: 1 })}
								variant="unset"
							>
								<ShieldAlertIcon aria-hidden data-slot="icon" />
								Flagged
							</Link>
							<Link
								className={buttonStyles({
									variant: statusFilter === "suspicious" ? "secondary-filled" : "secondary-outline",
								})}
								href={buildHref({ status: "suspicious", page: 1 })}
								variant="unset"
							>
								<AlertTriangleIcon aria-hidden data-slot="icon" />
								Suspicious
							</Link>
							<Link
								className={buttonStyles({
									variant: statusFilter === "trusted" ? "secondary-filled" : "secondary-outline",
								})}
								href={buildHref({ status: "trusted", page: 1 })}
								variant="unset"
							>
								<CheckCircle2Icon aria-hidden data-slot="icon" />
								Trusted
							</Link>
						</div>

						<div className="flex flex-wrap gap-2">
							<span className="self-center text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Sort:</span>
							<Link
								className={buttonStyles({
									variant: sort === "last_seen" ? "secondary-filled" : "secondary-outline",
								})}
								href={buildHref({ sort: "last_seen", page: 1 })}
								variant="unset"
							>
								<ClockIcon aria-hidden data-slot="icon" />
								Recent
							</Link>
							<Link
								className={buttonStyles({
									variant: sort === "occurrence_count" ? "secondary-filled" : "secondary-outline",
								})}
								href={buildHref({ sort: "occurrence_count", page: 1 })}
								variant="unset"
							>
								Most seen
							</Link>
							<Link
								className={buttonStyles({
									variant: sort === "guild_count" ? "secondary-filled" : "secondary-outline",
								})}
								href={buildHref({ sort: "guild_count", page: 1 })}
								variant="unset"
							>
								Most guilds
							</Link>
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1 sm:flex-row sm:place-content-between sm:place-items-baseline">
						<h2 className="text-base-label-lg">Fingerprints</h2>
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
							Showing {numberFormatter.format(fingerprints.length)} of {numberFormatter.format(total)}
						</p>
					</div>

					{fingerprints.length > 0 ? (
						<div className="grid gap-3 md:grid-cols-2">
							{fingerprints.map((fp: Fingerprint) => {
								const suspicious = isSuspiciousFingerprint(
									fp.status,
									fp.guildCount,
									fp.occurrenceCount,
									stats.suspiciousThresholdGuilds,
									stats.suspiciousThresholdOccurrences,
								);
								return (
									<div
										key={fp.hash}
										className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800"
									>
										<div className="flex gap-4">
											<div className="grid size-10 shrink-0 place-content-center rounded-lg border border-base-neutral-200 bg-base-neutral-0 text-base-neutral-600 dark:border-base-neutral-700 dark:bg-base-neutral-900 dark:text-base-neutral-300">
												<FingerprintIcon aria-hidden className="size-5" />
											</div>

											<div className="min-w-0 grow">
												<div className="flex flex-wrap place-content-between place-items-start gap-2">
													<div className="min-w-0">
														<p className="truncate font-mono text-base-sm">{fp.hash.slice(0, 16)}…</p>
														<div className="flex flex-wrap gap-2 pt-1">
															<FingerprintStatusBadge isSuspicious={suspicious} status={fp.status} />
															<span className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
																{format(Date.now() - new Date(fp.lastSeenAt).getTime(), true)} ago
															</span>
														</div>
													</div>
												</div>

												<div className="flex flex-wrap gap-3 pt-3 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
													<span>
														<span className="font-semibold">{numberFormatter.format(fp.occurrenceCount)}</span>{" "}
														occurrences
													</span>
													<span>
														<span className="font-semibold">{numberFormatter.format(fp.guildCount)}</span> guilds
													</span>
													<span>
														<span className="font-semibold">{numberFormatter.format(fp.userCount)}</span> users
													</span>
													{fp.sampleFileSize === null ? null : (
														<span>{convertDataRateLogBinary(fp.sampleFileSize)}</span>
													)}
												</div>

												<div className="flex flex-wrap gap-2 pt-3">
													<Link
														className={buttonStyles({
															variant: "secondary-filled",
														})}
														href={`/dashboard/moderation/fingerprints/${fp.hash}`}
														variant="unset"
													>
														View details
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
							<p className="text-base-label-lg">No fingerprints</p>
							<p className="pt-1 text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
								{statusFilter === "all" ? "No fingerprints have been recorded yet." : "Try a different filter."}
							</p>
							{statusFilter === "all" ? null : (
								<div className="flex place-content-center pt-4">
									<Link
										className={buttonStyles({ variant: "secondary-filled" })}
										href={buildHref({ status: "all", page: 1 })}
										variant="unset"
									>
										Clear filters
									</Link>
								</div>
							)}
						</div>
					)}

					{hasPagination ? (
						<div className="flex flex-wrap items-center justify-between gap-3">
							<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">
								Page {numberFormatter.format(page)} of {numberFormatter.format(totalPages)}
							</p>
							<div className="flex gap-2">
								{hasPrevPage ? (
									<Link
										className={buttonStyles({ variant: "secondary-outline" })}
										href={buildHref({ page: page - 1 })}
										variant="unset"
									>
										Previous
									</Link>
								) : (
									<Button isDisabled variant="secondary-outline">
										Previous
									</Button>
								)}
								{hasNextPage ? (
									<Link
										className={buttonStyles({ variant: "secondary-outline" })}
										href={buildHref({ page: page + 1 })}
										variant="unset"
									>
										Next
									</Link>
								) : (
									<Button isDisabled variant="secondary-outline">
										Next
									</Button>
								)}
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
