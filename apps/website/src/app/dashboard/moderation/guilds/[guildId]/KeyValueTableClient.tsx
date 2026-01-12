"use client";

import { ArrowUpRightIcon } from "lucide-react";
import { Link } from "@/components/ui/Link";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@/components/ui/Table";

export type KeyValueTableRowValue =
	| { readonly kind: "text"; readonly text: string }
	| { readonly kind: "mono"; readonly text: string }
	| { readonly kind: "channelLink"; readonly channelId: string }
	| { readonly kind: "externalLink"; readonly href: string; readonly text: string; readonly mono?: boolean };

export type KeyValueTableRow = {
	readonly id: string;
	readonly label: string;
	readonly value: KeyValueTableRowValue;
};

function renderValue(value: KeyValueTableRowValue, { guildId }: { readonly guildId: string }) {
	switch (value.kind) {
		case "text": {
			return value.text;
		}
		case "mono": {
			return <span className="font-mono text-base-sm">{value.text}</span>;
		}
		case "channelLink": {
			const href = `https://discord.com/channels/${guildId}/${value.channelId}`;

			return (
				<Link href={href} target="_blank" variant="default">
					<span className="font-mono text-base-sm">{value.channelId}</span>
					<ArrowUpRightIcon aria-hidden className="ml-2 inline size-4" />
				</Link>
			);
		}
		case "externalLink": {
			return (
				<Link href={value.href} target="_blank" variant="default">
					{value.mono ? <span className="font-mono text-base-sm">{value.text}</span> : value.text}
					<ArrowUpRightIcon aria-hidden className="ml-2 inline size-4" />
				</Link>
			);
		}
	}
}

export function KeyValueTableClient({
	ariaLabel,
	guildId,
	rows,
}: {
	readonly ariaLabel: string;
	readonly guildId: string;
	readonly rows: readonly KeyValueTableRow[];
}) {
	return (
		<Table aria-label={ariaLabel}>
			<TableHeader>
				<TableColumn isRowHeader>Item</TableColumn>
				<TableColumn>Value</TableColumn>
			</TableHeader>
			<TableBody items={rows}>
				{(row) => (
					<TableRow id={row.id}>
						<TableCell className="font-medium">{row.label}</TableCell>
						<TableCell>{renderValue(row.value, { guildId })}</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}
