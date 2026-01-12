import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
	const cookieStore = await cookies();

	const token = cookieStore.get("discord_token");

	if (!token) {
		redirect("/login");
	}

	redirect("/dashboard/moderation");
}
