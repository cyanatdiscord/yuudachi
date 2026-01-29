/**
 * @param {import('postgres').Sql} sql
 */
export async function up(sql) {
	// Main fingerprints table (global, not per-guild)
	await sql.unsafe(`
		create table attachment_fingerprints (
			hash text primary key,
			first_seen_at timestamp with time zone default now() not null,
			last_seen_at timestamp with time zone default now() not null,
			occurrence_count integer default 1 not null,
			guild_count integer default 1 not null,
			user_count integer default 1 not null,
			action_count integer default 0 not null,
			status integer default 0 not null,
			flagged_at timestamp with time zone,
			flagged_by text,
			unflagged_at timestamp with time zone,
			unflagged_by text,
			sample_file_size bigint,
			sample_content_type text,
			sample_filename text,
			notes text,
			updated_at timestamp with time zone
		);

		comment on table attachment_fingerprints is 'Global attachment fingerprint tracking for scam detection';
		comment on column attachment_fingerprints.hash is 'SHA256 fingerprint of the attachment';
		comment on column attachment_fingerprints.first_seen_at is 'When this fingerprint was first observed';
		comment on column attachment_fingerprints.last_seen_at is 'When this fingerprint was last observed';
		comment on column attachment_fingerprints.occurrence_count is 'Total times this fingerprint has been seen';
		comment on column attachment_fingerprints.guild_count is 'Number of distinct guilds where this fingerprint appeared';
		comment on column attachment_fingerprints.user_count is 'Number of distinct users who posted this fingerprint';
		comment on column attachment_fingerprints.action_count is 'Number of times this fingerprint led to moderation action';
		comment on column attachment_fingerprints.status is 'Status: 0=normal, 1=flagged, 2=trusted';
		comment on column attachment_fingerprints.flagged_at is 'When this fingerprint was flagged';
		comment on column attachment_fingerprints.flagged_by is 'Who flagged this fingerprint';
		comment on column attachment_fingerprints.unflagged_at is 'When this fingerprint was unflagged (audit trail)';
		comment on column attachment_fingerprints.unflagged_by is 'Who unflagged this fingerprint';
		comment on column attachment_fingerprints.sample_file_size is 'Size of a sample file with this fingerprint';
		comment on column attachment_fingerprints.sample_content_type is 'MIME type of a sample file';
		comment on column attachment_fingerprints.sample_filename is 'Filename of a sample file';
		comment on column attachment_fingerprints.notes is 'Admin notes about this fingerprint';
		comment on column attachment_fingerprints.updated_at is 'Last time the record was updated';

		create index idx_fingerprints_status on attachment_fingerprints(status);
		create index idx_fingerprints_occurrence_count on attachment_fingerprints(occurrence_count desc);
		create index idx_fingerprints_guild_count on attachment_fingerprints(guild_count desc);
		create index idx_fingerprints_user_count on attachment_fingerprints(user_count desc);
		create index idx_fingerprints_last_seen on attachment_fingerprints(last_seen_at desc);
		create index idx_fingerprints_suspicious on attachment_fingerprints(status, occurrence_count, guild_count)
			where status = 0 and (guild_count >= 5 or occurrence_count >= 10);

		create trigger set_updated_at before update on attachment_fingerprints
			for each row execute function set_current_timestamp_updated_at();
		comment on trigger set_updated_at on attachment_fingerprints is 'Sets the updated_at field to the current time';
	`);

	// Per-guild statistics
	await sql.unsafe(`
		create table attachment_fingerprint_guilds (
			hash text not null references attachment_fingerprints(hash) on delete cascade,
			guild_id text not null,
			first_seen_at timestamp with time zone default now() not null,
			last_seen_at timestamp with time zone default now() not null,
			occurrence_count integer default 1 not null,
			user_count integer default 1 not null,
			primary key (hash, guild_id)
		);

		comment on table attachment_fingerprint_guilds is 'Per-guild statistics for attachment fingerprints';
		comment on column attachment_fingerprint_guilds.hash is 'Reference to the fingerprint';
		comment on column attachment_fingerprint_guilds.guild_id is 'The guild where this fingerprint was seen';
		comment on column attachment_fingerprint_guilds.first_seen_at is 'When first seen in this guild';
		comment on column attachment_fingerprint_guilds.last_seen_at is 'When last seen in this guild';
		comment on column attachment_fingerprint_guilds.occurrence_count is 'Times seen in this specific guild';
		comment on column attachment_fingerprint_guilds.user_count is 'Distinct users in this guild who posted this';

		create index idx_fingerprint_guilds_guild on attachment_fingerprint_guilds(guild_id);
	`);

	// Track distinct users per fingerprint
	await sql.unsafe(`
		create table attachment_fingerprint_users (
			hash text not null references attachment_fingerprints(hash) on delete cascade,
			user_id text not null,
			first_seen_at timestamp with time zone default now() not null,
			primary key (hash, user_id)
		);

		comment on table attachment_fingerprint_users is 'Tracks distinct users who posted each fingerprint';
		comment on column attachment_fingerprint_users.hash is 'Reference to the fingerprint';
		comment on column attachment_fingerprint_users.user_id is 'The user who posted this fingerprint';
		comment on column attachment_fingerprint_users.first_seen_at is 'When this user first posted this fingerprint';

		create index idx_fingerprint_users_user on attachment_fingerprint_users(user_id);
	`);

	// Individual occurrences for forensic analysis
	await sql.unsafe(`
		create table attachment_fingerprint_occurrences (
			id bigserial primary key,
			hash text not null references attachment_fingerprints(hash) on delete cascade,
			guild_id text not null,
			user_id text not null,
			channel_id text,
			message_id text,
			case_id integer,
			created_at timestamp with time zone default now() not null
		);

		comment on table attachment_fingerprint_occurrences is 'Individual sightings of fingerprints for forensic analysis';
		comment on column attachment_fingerprint_occurrences.id is 'Unique occurrence identifier';
		comment on column attachment_fingerprint_occurrences.hash is 'Reference to the fingerprint';
		comment on column attachment_fingerprint_occurrences.guild_id is 'Guild where this occurrence happened';
		comment on column attachment_fingerprint_occurrences.user_id is 'User who posted the attachment';
		comment on column attachment_fingerprint_occurrences.channel_id is 'Channel where the attachment was posted';
		comment on column attachment_fingerprint_occurrences.message_id is 'Message containing the attachment';
		comment on column attachment_fingerprint_occurrences.case_id is 'Optional link to moderation case if action taken';
		comment on column attachment_fingerprint_occurrences.created_at is 'When this occurrence was recorded';

		create index idx_occurrences_hash on attachment_fingerprint_occurrences(hash);
		create index idx_occurrences_guild on attachment_fingerprint_occurrences(guild_id);
		create index idx_occurrences_user on attachment_fingerprint_occurrences(user_id);
		create index idx_occurrences_created on attachment_fingerprint_occurrences(created_at desc);
		create index idx_occurrences_case on attachment_fingerprint_occurrences(case_id) where case_id is not null;
	`);
}
