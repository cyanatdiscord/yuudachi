import { redirect } from "next/navigation";
import { getDiscordTokenOrRedirect } from "./discordAuth";

export type DiscordUser = {
	readonly id: string;
	readonly username: string;
	readonly avatar?: string | null;
	readonly discriminator?: string | null;
	readonly global_name?: string | null;
};

/**
 * Fetches the current user's Discord profile.
 */
async function fetchDiscordUser(tokenValue: string): Promise<DiscordUser> {
	const userData = await fetch("https://discord.com/api/v10/users/@me", {
		headers: {
			Authorization: `Bearer ${tokenValue}`,
		},
		next: { revalidate: 3_600 },
	});

	if (userData.status !== 200) {
		redirect("/api/discord/logout");
	}

	return (await userData.json()) as DiscordUser;
}

/**
 * Parses the FINGERPRINT_ALLOWED_USER_IDS environment variable.
 * Expects a comma-separated list of Discord user IDs.
 * Returns an empty set if the variable is not set (access denied to all).
 */
function getAllowedUserIds(): Set<string> {
	const envValue = process.env.FINGERPRINT_ALLOWED_USER_IDS;

	if (!envValue || envValue.trim() === "") {
		return new Set();
	}

	return new Set(
		envValue
			.split(",")
			.map((id) => id.trim())
			.filter((id) => id.length > 0),
	);
}

export type FingerprintAccessResult = {
	readonly hasAccess: boolean;
	readonly user: DiscordUser;
};

/**
 * Checks if the current user has access to global fingerprint pages.
 *
 * Access is granted if:
 * 1. The user is authenticated with Discord
 * 2. Their Discord user ID is in the FINGERPRINT_ALLOWED_USER_IDS env variable
 *
 * @returns Object containing access status and user info
 */
export async function checkFingerprintAccess(): Promise<FingerprintAccessResult> {
	const tokenValue = await getDiscordTokenOrRedirect();
	const user = await fetchDiscordUser(tokenValue);
	const allowedUserIds = getAllowedUserIds();

	return {
		hasAccess: allowedUserIds.has(user.id),
		user,
	};
}
