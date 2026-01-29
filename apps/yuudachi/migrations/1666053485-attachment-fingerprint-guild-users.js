/**
 * @param {import('postgres').Sql} sql
 */
export async function up(sql) {
	// Add junction table for tracking unique users per fingerprint per guild
	// This enables accurate per-guild user_count tracking that persists even when occurrences are pruned
	await sql.unsafe(`
		create table attachment_fingerprint_guild_users (
			hash text not null references attachment_fingerprints(hash) on delete cascade,
			guild_id text not null,
			user_id text not null,
			first_seen_at timestamp with time zone default now() not null,
			primary key (hash, guild_id, user_id)
		);

		comment on table attachment_fingerprint_guild_users is 'Tracks unique users per fingerprint per guild (persistent, not pruned)';
		comment on column attachment_fingerprint_guild_users.hash is 'Reference to the fingerprint';
		comment on column attachment_fingerprint_guild_users.guild_id is 'The guild where this user posted this fingerprint';
		comment on column attachment_fingerprint_guild_users.user_id is 'The user who posted this fingerprint in this guild';
		comment on column attachment_fingerprint_guild_users.first_seen_at is 'When this user first posted this fingerprint in this guild';

		create index idx_fingerprint_guild_users_guild on attachment_fingerprint_guild_users(guild_id);
		create index idx_fingerprint_guild_users_user on attachment_fingerprint_guild_users(user_id);
	`);

	// Update default for user_count in attachment_fingerprint_guilds from 1 to 0
	// New guild associations should start with user_count=0 and be incremented via the guild_users table
	await sql.unsafe(`
		alter table attachment_fingerprint_guilds
		alter column user_count set default 0;
	`);
}
