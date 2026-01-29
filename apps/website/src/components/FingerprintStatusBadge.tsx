import { AlertTriangleIcon, ShieldAlertIcon, ShieldCheckIcon } from "lucide-react";
import { FINGERPRINT_STATUS_FLAGGED, FINGERPRINT_STATUS_TRUSTED } from "@/utils/fingerprints";

type FingerprintStatusBadgeProps = {
	readonly isSuspicious?: boolean;
	readonly size?: "md" | "sm";
	readonly status: number;
};

/**
 * Displays a status badge for a fingerprint based on its status and suspicious state.
 *
 * - `sm` size is used in list views (compact badges)
 * - `md` size is used in detail views (larger badges with font-medium)
 *
 * For normal status with `sm` size, returns null (no badge shown in lists).
 * For normal status with `md` size, shows a "Normal" badge.
 */
export function FingerprintStatusBadge({ status, isSuspicious = false, size = "sm" }: FingerprintStatusBadgeProps) {
	const isSmall = size === "sm";
	const iconClass = isSmall ? "size-3" : "size-4";
	const baseClass = isSmall
		? "flex items-center gap-1 rounded-full px-2 py-0.5 text-base-xs"
		: "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base-sm font-medium";

	if (status === FINGERPRINT_STATUS_FLAGGED) {
		return (
			<span
				className={`${baseClass} border border-base-sunset-300 bg-base-sunset-100 text-base-sunset-700 dark:border-base-sunset-700 dark:bg-base-sunset-900/30 dark:text-base-sunset-400`}
			>
				<ShieldAlertIcon aria-hidden className={iconClass} />
				Flagged
			</span>
		);
	}

	if (status === FINGERPRINT_STATUS_TRUSTED) {
		return (
			<span
				className={`${baseClass} border border-base-neutral-300 bg-base-neutral-80 text-base-neutral-700 dark:border-base-neutral-600 dark:bg-base-neutral-800 dark:text-base-neutral-200`}
			>
				<ShieldCheckIcon aria-hidden className={iconClass} />
				Trusted
			</span>
		);
	}

	if (isSuspicious) {
		return (
			<span
				className={`${baseClass} border border-base-tangerine-300 bg-base-tangerine-100 text-base-tangerine-700 dark:border-base-tangerine-700 dark:bg-base-tangerine-900/30 dark:text-base-tangerine-400`}
			>
				<AlertTriangleIcon aria-hidden className={iconClass} />
				Suspicious
			</span>
		);
	}

	// Only show "Normal" badge for medium size (detail view)
	if (!isSmall) {
		return (
			<span
				className={`${baseClass} border border-base-neutral-200 bg-base-neutral-100 text-base-neutral-700 dark:border-base-neutral-700 dark:bg-base-neutral-800 dark:text-base-neutral-300`}
			>
				Normal
			</span>
		);
	}

	return null;
}
