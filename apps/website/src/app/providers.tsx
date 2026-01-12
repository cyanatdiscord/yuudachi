"use client";

import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { PropsWithChildren } from "react";

export function Providers({ children }: PropsWithChildren) {
	return (
		<ThemeProvider attribute="class" forcedTheme="dark">
			<NuqsAdapter>{children}</NuqsAdapter>
		</ThemeProvider>
	);
}
