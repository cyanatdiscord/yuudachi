import { cookies } from "next/headers";
import Image from "next/image";
import type { PropsWithChildren } from "react";
import { Link } from "@/components/ui/Link";
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarInset,
	SidebarLabel,
	SidebarNav,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/Sidebar";
import { ModerationSidebarTargets } from "./ModerationSidebarTargets";

export default async function Layout({ children }: PropsWithChildren) {
	const cookieStore = await cookies();
	const sidebarState = cookieStore.get("sidebar_state");

	return (
		<SidebarProvider
			className="[--sidebar-width-dock:3.25rem] [--sidebar-width:17rem]"
			defaultOpen={sidebarState?.value === "true"}
		>
			<Sidebar className="rounded-none">
				<SidebarHeader>
					<Link className="flex place-items-center gap-3" href="/dashboard/moderation" variant="unset">
						<Image alt="Yuudachi" className="drop-shadow-md" height={32} src="/yuudachi_logo.svg" width={32} />
						<SidebarLabel className="text-base-label-xl font-bold">Yuudachi</SidebarLabel>
					</Link>
				</SidebarHeader>
				<SidebarContent>
					<ModerationSidebarTargets />
				</SidebarContent>
			</Sidebar>
			<SidebarInset>
				<SidebarNav>
					<SidebarTrigger />
				</SidebarNav>
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
