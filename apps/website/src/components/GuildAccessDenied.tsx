import { LockIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Breadcrumbs, BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { Link } from "@/components/ui/Link";
import { buttonStyles } from "@/styles/ui/button";

type Breadcrumb = {
	readonly label: ReactNode;
	readonly href?: string;
};

export function GuildAccessDenied({
	guildId,
	guildName,
	title,
	description,
	trail,
	backHref,
	backLabel = "Back to overview",
}: {
	readonly guildId: string;
	readonly guildName: string;
	readonly title: string;
	readonly description: string;
	readonly trail?: readonly Breadcrumb[];
	readonly backHref?: string;
	readonly backLabel?: string;
}) {
	return (
		<div className="mx-auto w-full max-w-6xl px-6 pb-10">
			<div className="flex flex-col gap-6 py-6">
				<Breadcrumbs>
					<BreadcrumbItem href="/dashboard/moderation">Moderation</BreadcrumbItem>
					<BreadcrumbItem href="/dashboard/moderation/guilds">Guilds</BreadcrumbItem>
					<BreadcrumbItem href={`/dashboard/moderation/guilds/${guildId}`}>{guildName}</BreadcrumbItem>
					{(trail ?? []).map((item, idx) =>
						item.href ? (
							<BreadcrumbItem href={item.href} key={idx}>
								{item.label}
							</BreadcrumbItem>
						) : (
							<BreadcrumbItem key={idx}>{item.label}</BreadcrumbItem>
						),
					)}
				</Breadcrumbs>

				<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 dark:border-base-neutral-700 dark:bg-base-neutral-800">
					<div className="flex place-items-start gap-3">
						<LockIcon aria-hidden className="mt-0.5 size-5 text-base-neutral-600 dark:text-base-neutral-300" />
						<div className="flex flex-col gap-1">
							<p className="text-base-label-lg">{title}</p>
							<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">{description}</p>
						</div>
					</div>
				</div>

				{backHref ? (
					<div className="flex flex-wrap gap-2">
						<Link className={buttonStyles({ variant: "secondary-filled" })} href={backHref} variant="unset">
							{backLabel}
						</Link>
					</div>
				) : null}
			</div>
		</div>
	);
}
