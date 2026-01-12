"use client";

import { ArrowUpRightIcon, HomeIcon, InboxIcon, ShieldIcon, UsersIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { SidebarItem, SidebarLabel, SidebarSection, SidebarSectionGroup } from "@/components/ui/Sidebar";

export function ModerationSidebarTargets() {
	const params = useParams<{ guildId?: string; caseId?: string }>();
	const guildId = params.guildId;
	const caseId = params.caseId;

	return (
		<SidebarSectionGroup>
			<SidebarSection label="Overview">
				<SidebarItem href="/dashboard/moderation" tooltip="Home">
					<HomeIcon data-slot="icon" />
					<SidebarLabel>Home</SidebarLabel>
				</SidebarItem>
				<SidebarItem href="/dashboard/moderation/guilds" tooltip="Connected guilds">
					<UsersIcon data-slot="icon" />
					<SidebarLabel>Guilds</SidebarLabel>
				</SidebarItem>
			</SidebarSection>

			{guildId ? (
				<SidebarSection label="Guild">
					<SidebarItem href={`/dashboard/moderation/guilds/${guildId}`} tooltip="Guild overview">
						<InboxIcon data-slot="icon" />
						<SidebarLabel>Overview</SidebarLabel>
					</SidebarItem>
					<SidebarItem href={`/dashboard/moderation/guilds/${guildId}/cases`} tooltip="Cases">
						<ShieldIcon data-slot="icon" />
						<SidebarLabel>Cases</SidebarLabel>
					</SidebarItem>
					<SidebarItem href={`/dashboard/moderation/guilds/${guildId}/appeals`} tooltip="Appeals">
						<UsersIcon data-slot="icon" />
						<SidebarLabel>Appeals</SidebarLabel>
					</SidebarItem>
					<SidebarItem
						href={`https://discord.com/channels/${guildId}`}
						rel="noreferrer"
						target="_blank"
						tooltip="Open Discord"
					>
						<ArrowUpRightIcon data-slot="icon" />
						<SidebarLabel>Open Discord</SidebarLabel>
					</SidebarItem>
				</SidebarSection>
			) : null}

			{guildId && caseId ? (
				<SidebarSection label="Case">
					<SidebarItem href={`/dashboard/moderation/guilds/${guildId}/cases/${caseId}`} tooltip="Current case">
						<ShieldIcon data-slot="icon" />
						<SidebarLabel className="font-mono">#{caseId}</SidebarLabel>
					</SidebarItem>
				</SidebarSection>
			) : null}
		</SidebarSectionGroup>
	);
}
