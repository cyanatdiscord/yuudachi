"use client";

import type { SearchFieldProps as RACSearchFieldProps } from "react-aria-components";
import { SearchField as RACSearchField } from "react-aria-components";
import { composeTailwindRenderProps } from "@/styles/util";

export function SearchField(props: RACSearchFieldProps) {
	return (
		<RACSearchField
			{...props}
			className={composeTailwindRenderProps(props.className, "group flex w-full flex-col gap-1")}
			data-slot="control"
		/>
	);
}
