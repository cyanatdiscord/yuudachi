import { format } from "@lukeed/ms";
import { ArrowLeftIcon, CalendarIcon, FingerprintIcon, HashIcon, UsersIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { FingerprintAccessDenied } from "@/components/FingerprintAccessDenied";
import { FingerprintStatusBadge } from "@/components/FingerprintStatusBadge";
import { BreadcrumbItem, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Link } from "@/components/ui/Link";
import { Separator } from "@/components/ui/Separator";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@/components/ui/Table";
import { buttonStyles } from "@/styles/ui/button";
import type { FingerprintStats, FingerprintWithRelations } from "@/types/fingerprints";
import { checkFingerprintAccess } from "@/utils/fingerprintAccess";
import { FINGERPRINT_STATUS_FLAGGED, FINGERPRINT_STATUS_TRUSTED, isSuspiciousFingerprint } from "@/utils/fingerprints";
import { convertDataRateLogBinary } from "@/utils/format";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "short",
	day: "2-digit",
	hour: "numeric",
	minute: "2-digit",
});

function getStatusLabel(status: number) {
	switch (status) {
		case FINGERPRINT_STATUS_FLAGGED:
			return "Flagged";
		case FINGERPRINT_STATUS_TRUSTED:
			return "Trusted";
		default:
			return "Normal";
	}
}

export default async function Page({ params }: { readonly params: Promise<{ hash: string }> }) {
	const { hasAccess, user } = await checkFingerprintAccess();

	if (!hasAccess) {
		return <FingerprintAccessDenied username={user.global_name ?? user.username} />;
	}

	const { hash } = await params;
	const numberFormatter = new Intl.NumberFormat("en-US");

	// Fetch fingerprint with all related data and stats in parallel
	const fingerprintUrl = new URL(`${process.env.BOT_API_URL}/api/fingerprints/${hash}`);
	fingerprintUrl.searchParams.set("include_guilds", "true");
	fingerprintUrl.searchParams.set("include_occurrences", "true");
	fingerprintUrl.searchParams.set("occurrence_limit", "25");

	const [fingerprintRes, statsRes] = await Promise.all([
		fetch(fingerprintUrl, {
			headers: { Authorization: `Bearer ${process.env.JWT_TOKEN}` },
		}),
		fetch(`${process.env.BOT_API_URL}/api/fingerprints/stats`, {
			headers: { Authorization: `Bearer ${process.env.JWT_TOKEN}` },
		}),
	]);

	if (fingerprintRes.status !== 200) {
		return notFound();
	}

	const fp = (await fingerprintRes.json()) as FingerprintWithRelations;

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

	const suspicious = isSuspiciousFingerprint(
		fp.status,
		fp.guildCount,
		fp.occurrenceCount,
		stats.suspiciousThresholdGuilds,
		stats.suspiciousThresholdOccurrences,
	);

	return (
		<div className="mx-auto w-full max-w-6xl px-6 pb-10">
			<div className="flex flex-col gap-6 py-6">
				<Breadcrumbs>
					<BreadcrumbItem href="/dashboard/moderation">Moderation</BreadcrumbItem>
					<BreadcrumbItem href="/dashboard/moderation/fingerprints">Fingerprints</BreadcrumbItem>
					<BreadcrumbItem>{hash.slice(0, 12)}…</BreadcrumbItem>
				</Breadcrumbs>

				<div className="flex flex-col gap-4 lg:flex-row lg:place-content-between lg:place-items-start">
					<div className="flex place-items-start gap-4">
						<div className="grid size-16 shrink-0 place-content-center overflow-hidden rounded-2xl border border-base-neutral-200 bg-base-neutral-0 dark:border-base-neutral-700 dark:bg-base-neutral-800">
							<FingerprintIcon aria-hidden className="size-8 text-base-neutral-600 dark:text-base-neutral-300" />
						</div>

						<div className="flex flex-col gap-2">
							<div className="flex flex-wrap items-center gap-3">
								<h1 className="font-mono text-xl font-semibold tracking-tight">{hash.slice(0, 16)}…</h1>
								<FingerprintStatusBadge isSuspicious={suspicious} size="md" status={fp.status} />
							</div>
							<p className="font-mono text-base-xs break-all text-base-neutral-600 dark:text-base-neutral-300">
								{hash}
							</p>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<Link
							className={buttonStyles({ variant: "secondary-outline" })}
							href="/dashboard/moderation/fingerprints"
							variant="unset"
						>
							<ArrowLeftIcon aria-hidden data-slot="icon" />
							Back to list
						</Link>
					</div>
				</div>

				<Separator className="mx-0" />

				{/* Stats cards */}
				<div className="grid gap-4 sm:grid-cols-4">
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Occurrences</p>
						<p className="pt-1 text-2xl font-semibold">{numberFormatter.format(fp.occurrenceCount)}</p>
						<p className="pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Total times seen</p>
					</div>
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Guilds</p>
						<p className="pt-1 text-2xl font-semibold">{numberFormatter.format(fp.guildCount)}</p>
						<p className="pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Distinct servers</p>
					</div>
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Users</p>
						<p className="pt-1 text-2xl font-semibold">{numberFormatter.format(fp.userCount)}</p>
						<p className="pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Distinct uploaders</p>
					</div>
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
						<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Actions</p>
						<p className="pt-1 text-2xl font-semibold">{numberFormatter.format(fp.actionCount)}</p>
						<p className="pt-1 text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Mod actions taken</p>
					</div>
				</div>

				{/* Metadata */}
				<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
					<h2 className="pb-4 text-base-label-lg">Metadata</h2>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<div className="flex items-start gap-3">
							<CalendarIcon aria-hidden className="size-5 shrink-0 text-base-neutral-500 dark:text-base-neutral-400" />
							<div>
								<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">First seen</p>
								<p className="text-base-sm font-medium">{dateTimeFormatter.format(new Date(fp.firstSeenAt))}</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<CalendarIcon aria-hidden className="size-5 shrink-0 text-base-neutral-500 dark:text-base-neutral-400" />
							<div>
								<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Last seen</p>
								<p className="text-base-sm font-medium">{dateTimeFormatter.format(new Date(fp.lastSeenAt))}</p>
								<p className="text-base-xs text-base-neutral-500">
									{format(Date.now() - new Date(fp.lastSeenAt).getTime(), true)} ago
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<HashIcon aria-hidden className="size-5 shrink-0 text-base-neutral-500 dark:text-base-neutral-400" />
							<div>
								<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Status</p>
								<p className="text-base-sm font-medium">{getStatusLabel(fp.status)}</p>
							</div>
						</div>
						{fp.sampleFilename ? (
							<div className="flex items-start gap-3">
								<FingerprintIcon
									aria-hidden
									className="size-5 shrink-0 text-base-neutral-500 dark:text-base-neutral-400"
								/>
								<div>
									<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Sample filename</p>
									<p className="text-base-sm font-medium break-all">{fp.sampleFilename}</p>
								</div>
							</div>
						) : null}
						{fp.sampleContentType ? (
							<div className="flex items-start gap-3">
								<FingerprintIcon
									aria-hidden
									className="size-5 shrink-0 text-base-neutral-500 dark:text-base-neutral-400"
								/>
								<div>
									<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">Content type</p>
									<p className="text-base-sm font-medium">{fp.sampleContentType}</p>
								</div>
							</div>
						) : null}
						{fp.sampleFileSize === null ? null : (
							<div className="flex items-start gap-3">
								<FingerprintIcon
									aria-hidden
									className="size-5 shrink-0 text-base-neutral-500 dark:text-base-neutral-400"
								/>
								<div>
									<p className="text-base-xs text-base-neutral-600 dark:text-base-neutral-300">File size</p>
									<p className="text-base-sm font-medium">{convertDataRateLogBinary(fp.sampleFileSize)}</p>
								</div>
							</div>
						)}
					</div>

					{fp.flaggedAt ? (
						<div className="mt-4 border-t border-base-neutral-200 pt-4 dark:border-base-neutral-700">
							<h3 className="pb-2 text-base-label-md">Flag history</h3>
							<div className="space-y-2 text-base-sm">
								<p>
									<span className="text-base-neutral-600 dark:text-base-neutral-300">Flagged:</span>{" "}
									{dateTimeFormatter.format(new Date(fp.flaggedAt))}
									{fp.flaggedBy ? ` by ${fp.flaggedBy}` : ""}
								</p>
								{fp.unflaggedAt ? (
									<p>
										<span className="text-base-neutral-600 dark:text-base-neutral-300">Unflagged:</span>{" "}
										{dateTimeFormatter.format(new Date(fp.unflaggedAt))}
										{fp.unflaggedBy ? ` by ${fp.unflaggedBy}` : ""}
									</p>
								) : null}
							</div>
						</div>
					) : null}

					{fp.notes ? (
						<div className="mt-4 border-t border-base-neutral-200 pt-4 dark:border-base-neutral-700">
							<h3 className="pb-2 text-base-label-md">Notes</h3>
							<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">{fp.notes}</p>
						</div>
					) : null}
				</div>

				{/* Guild breakdown */}
				{fp.guilds && fp.guilds.length > 0 ? (
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
						<h2 className="pb-4 text-base-label-lg">Guild breakdown</h2>
						<Table aria-label="Guild breakdown" className="text-base-sm">
							<TableHeader>
								<TableColumn className="text-left" isRowHeader>
									Guild ID
								</TableColumn>
								<TableColumn className="text-right">Occurrences</TableColumn>
								<TableColumn className="text-right">Users</TableColumn>
								<TableColumn className="text-right">First seen</TableColumn>
								<TableColumn className="text-right">Last seen</TableColumn>
							</TableHeader>
							<TableBody items={fp.guilds}>
								{(item) => (
									<TableRow id={item.guildId}>
										<TableCell className="font-mono">{item.guildId}</TableCell>
										<TableCell className="text-right">{numberFormatter.format(item.occurrenceCount)}</TableCell>
										<TableCell className="text-right">{numberFormatter.format(item.userCount)}</TableCell>
										<TableCell className="text-right text-base-neutral-600 dark:text-base-neutral-300">
											{format(Date.now() - new Date(item.firstSeenAt).getTime(), true)} ago
										</TableCell>
										<TableCell className="text-right text-base-neutral-600 dark:text-base-neutral-300">
											{format(Date.now() - new Date(item.lastSeenAt).getTime(), true)} ago
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				) : null}

				{/* Recent occurrences */}
				{fp.occurrences && fp.occurrences.length > 0 ? (
					<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-4 dark:border-base-neutral-700 dark:bg-base-neutral-800">
						<h2 className="pb-4 text-base-label-lg">Recent occurrences</h2>
						<div className="space-y-3">
							{fp.occurrences.map((occ) => (
								<div
									key={occ.id}
									className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-base-neutral-100 pb-3 last:border-b-0 last:pb-0 dark:border-base-neutral-800"
								>
									<div className="flex items-center gap-2">
										<UsersIcon aria-hidden className="size-4 text-base-neutral-500" />
										<span className="font-mono text-base-xs">{occ.userId}</span>
									</div>
									<span className="text-base-xs text-base-neutral-500">in</span>
									<span className="font-mono text-base-xs">{occ.guildId}</span>
									{occ.channelId ? (
										<>
											<span className="text-base-xs text-base-neutral-500">#</span>
											<span className="font-mono text-base-xs">{occ.channelId}</span>
										</>
									) : null}
									{occ.caseId ? (
										<span className="rounded-full border border-base-tangerine-300 bg-base-tangerine-100 px-2 py-0.5 text-base-xs text-base-tangerine-700 dark:border-base-tangerine-700 dark:bg-base-tangerine-900/30 dark:text-base-tangerine-400">
											Case #{occ.caseId}
										</span>
									) : null}
									<span className="ml-auto text-base-xs text-base-neutral-500">
										{format(Date.now() - new Date(occ.createdAt).getTime(), true)} ago
									</span>
								</div>
							))}
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
