import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Gets the Discord token from cookies or redirects to login.
 */
export async function getDiscordTokenOrRedirect() {
	const cookieStore = await cookies();
	const token = cookieStore.get("discord_token");

	if (!token) {
		redirect("/login");
	}

	return token.value;
}
