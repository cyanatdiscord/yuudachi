import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buttonStyles } from "src/styles/ui/button";

export default async function Page() {
	const cookieStore = await cookies();

	const token = cookieStore.get("discord_token");
	if (!token) {
		return (
			<div className="flex h-dvh grow flex-col place-content-center place-items-center">
				<a
					className={buttonStyles({ variant: "filled" })}
					href={`https://discord.com/api/oauth2/authorize?client_id=${
						process.env.DISCORD_CLIENT_ID
					}&redirect_uri=${encodeURIComponent(
						process.env.DISCORD_REDIRECT_URI!,
					)}&response_type=code&scope=identify%20guilds.members.read%20guilds.join%20guilds`}
				>
					Login with Discord
				</a>
			</div>
		);
	}

	redirect("/dashboard/moderation");
}
