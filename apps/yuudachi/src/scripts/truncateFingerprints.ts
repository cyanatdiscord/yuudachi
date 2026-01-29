import postgres from "postgres";

const sql = postgres({
	types: {
		date: {
			to: 1_184,
			from: [1_082, 1_083, 1_114, 1_184],
			serialize: (date: Date) => date.toISOString(),
			parse: (isoString: string) => isoString,
		},
	},
});

async function truncate() {
	console.log("Truncating fingerprint tables...\n");

	// TRUNCATE with CASCADE will delete from all child tables:
	// - attachment_fingerprint_guilds
	// - attachment_fingerprint_users
	// - attachment_fingerprint_guild_users
	// - attachment_fingerprint_occurrences
	await sql`TRUNCATE attachment_fingerprints CASCADE`;
	console.log("✓ Truncated attachment_fingerprints (and all child tables via CASCADE)");

	// Reset the sequence for occurrences.id
	await sql`ALTER SEQUENCE attachment_fingerprint_occurrences_id_seq RESTART WITH 1`;
	console.log("✓ Reset attachment_fingerprint_occurrences_id_seq to 1");

	console.log("\n✓ Fingerprint tables truncated successfully");

	await sql.end();
}

try {
	await truncate();
} catch (error) {
	console.error("Failed to truncate fingerprint tables:", error);
	process.exit(1);
}
