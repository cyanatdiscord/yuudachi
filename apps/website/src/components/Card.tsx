import type { PropsWithChildren } from "react";

export function Card({ children }: PropsWithChildren) {
	return (
		<div className="rounded border border-base-neutral-200 bg-base-neutral-0 dark:border-base-neutral-700 dark:bg-base-neutral-800">
			{children}
		</div>
	);
}
