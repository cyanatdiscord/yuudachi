"use client";

import { format } from "@lukeed/ms";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@/components/ui/Table";
import type { FingerprintGuild } from "@/types/fingerprints";

export function GuildBreakdownTable({ items }: { readonly items: readonly FingerprintGuild[] }) {
	const numberFormatter = new Intl.NumberFormat("en-US");

	return (
		<Table aria-label="Guild breakdown" className="text-base-sm">
			<TableHeader>
				<TableColumn isRowHeader>Guild ID</TableColumn>
				<TableColumn>Occurrences</TableColumn>
				<TableColumn>Users</TableColumn>
				<TableColumn>First seen</TableColumn>
				<TableColumn>Last seen</TableColumn>
			</TableHeader>
			<TableBody items={items}>
				{(item) => (
					<TableRow id={item.guildId}>
						<TableCell className="font-mono">{item.guildId}</TableCell>
						<TableCell>{numberFormatter.format(item.occurrenceCount)}</TableCell>
						<TableCell>{numberFormatter.format(item.userCount)}</TableCell>
						<TableCell className="text-base-neutral-600 dark:text-base-neutral-300">
							{format(Date.now() - new Date(item.firstSeenAt).getTime(), true)} ago
						</TableCell>
						<TableCell className="text-base-neutral-600 dark:text-base-neutral-300">
							{format(Date.now() - new Date(item.lastSeenAt).getTime(), true)} ago
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}
