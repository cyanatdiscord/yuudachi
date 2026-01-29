import { LockIcon } from "lucide-react";
import { BreadcrumbItem, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Link } from "@/components/ui/Link";
import { buttonStyles } from "@/styles/ui/button";

export function FingerprintAccessDenied() {
	return (
		<div className="mx-auto w-full max-w-6xl px-6 pb-10">
			<div className="flex flex-col gap-6 py-6">
				<Breadcrumbs>
					<BreadcrumbItem href="/dashboard/moderation">Moderation</BreadcrumbItem>
					<BreadcrumbItem>Fingerprints</BreadcrumbItem>
				</Breadcrumbs>

				<div className="rounded border border-base-neutral-200 bg-base-neutral-0 p-6 dark:border-base-neutral-700 dark:bg-base-neutral-800">
					<div className="flex place-items-start gap-3">
						<LockIcon aria-hidden className="mt-0.5 size-5 text-base-neutral-600 dark:text-base-neutral-300" />
						<div className="flex flex-col gap-1">
							<p className="text-base-label-lg">You don't have access to global fingerprint data</p>
							<p className="text-base-sm text-base-neutral-600 dark:text-base-neutral-300">
								This page is limited to authorized users.
							</p>
						</div>
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					<Link className={buttonStyles({ variant: "secondary-filled" })} href="/dashboard/moderation" variant="unset">
						Back to moderation
					</Link>
				</div>
			</div>
		</div>
	);
}
