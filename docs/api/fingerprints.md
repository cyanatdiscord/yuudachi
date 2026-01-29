# Fingerprints API

> API for tracking and managing attachment fingerprints across Discord guilds.

Fingerprints are SHA256 hashes of attachment content, used to detect and track duplicate or malicious attachments across servers. The API provides endpoints for listing, inspecting, and moderating fingerprints.

## Authentication

All endpoints require JWT bearer token authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints Overview

| Method | Endpoint                       | Description                               |
| ------ | ------------------------------ | ----------------------------------------- |
| GET    | `/api/fingerprints`            | List fingerprints (paginated, filterable) |
| GET    | `/api/fingerprints/stats`      | Get aggregate statistics                  |
| GET    | `/api/fingerprints/:hash`      | Get single fingerprint with relations     |
| PATCH  | `/api/fingerprints/:hash/flag` | Update fingerprint status                 |
| POST   | `/api/fingerprints/ingest`     | Batch import fingerprints                 |
| GET    | `/api/guilds/:id/fingerprints` | List fingerprints for a specific guild    |

---

## List Fingerprints

```
GET /api/fingerprints
```

Lists fingerprints with pagination and filtering options.

### Query Parameters

| Parameter         | Type    | Default     | Description                                                              |
| ----------------- | ------- | ----------- | ------------------------------------------------------------------------ |
| `page`            | integer | `1`         | Page number (1-indexed)                                                  |
| `limit`           | integer | `50`        | Items per page (max: 100)                                                |
| `status`          | integer | -           | Filter by status (0=Normal, 1=Flagged, 2=Trusted)                        |
| `sort`            | string  | `last_seen` | Sort field: `last_seen`, `occurrence_count`, `guild_count`, `user_count` |
| `order`           | string  | `desc`      | Sort order: `asc`, `desc`                                                |
| `min_occurrences` | integer | -           | Filter to fingerprints with at least N occurrences                       |
| `min_guilds`      | integer | -           | Filter to fingerprints seen in at least N guilds                         |
| `suspicious`      | boolean | `false`     | Filter to suspicious fingerprints only (Normal status with high spread)  |

### Response

```json
{
  "fingerprints": [Fingerprint],
  "total": 1234,
  "page": 1,
  "pageSize": 50
}
```

### Example

```bash
# List flagged fingerprints, sorted by guild count
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/fingerprints?status=1&sort=guild_count&order=desc"

# List suspicious fingerprints (high spread, not yet flagged)
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/fingerprints?suspicious=true"
```

---

## Get Statistics

```
GET /api/fingerprints/stats
```

Returns aggregate statistics about the fingerprint database.

### Response

```json
{
  "totalFingerprints": 15234,
  "flaggedCount": 127,
  "trustedCount": 45,
  "totalOccurrences": 89432,
  "totalUniqueUsers": 5621,
  "totalActionsTaken": 892,
  "seenLast24h": 234,
  "seenLast7d": 1456,
  "suspiciousCount": 78,
  "suspiciousThresholdGuilds": 5,
  "suspiciousThresholdOccurrences": 10,
  "topByOccurrence": [Fingerprint],
  "topByGuildSpread": [Fingerprint],
  "topByUserSpread": [Fingerprint],
  "recentlyFlagged": [Fingerprint],
  "recentlyUnflagged": [Fingerprint]
}
```

### Response Fields

| Field                            | Type    | Description                                                       |
| -------------------------------- | ------- | ----------------------------------------------------------------- |
| `totalFingerprints`              | integer | Total unique fingerprints in database                             |
| `flaggedCount`                   | integer | Count with status = Flagged                                       |
| `trustedCount`                   | integer | Count with status = Trusted                                       |
| `totalOccurrences`               | integer | Sum of all occurrence counts                                      |
| `totalUniqueUsers`               | integer | Distinct users who uploaded fingerprinted attachments             |
| `totalActionsTaken`              | integer | Sum of moderation actions taken on fingerprints                   |
| `seenLast24h`                    | integer | Fingerprints with activity in last 24 hours                       |
| `seenLast7d`                     | integer | Fingerprints with activity in last 7 days                         |
| `suspiciousCount`                | integer | Normal status fingerprints exceeding suspicious thresholds        |
| `suspiciousThresholdGuilds`      | integer | Guild count threshold for suspicious classification (currently 5) |
| `suspiciousThresholdOccurrences` | integer | Occurrence threshold for suspicious classification (currently 10) |
| `topByOccurrence`                | array   | Top 10 fingerprints by occurrence count                           |
| `topByGuildSpread`               | array   | Top 10 fingerprints by guild count                                |
| `topByUserSpread`                | array   | Top 10 fingerprints by user count                                 |
| `recentlyFlagged`                | array   | 10 most recently flagged fingerprints                             |
| `recentlyUnflagged`              | array   | 10 most recently unflagged fingerprints                           |

### Example

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/fingerprints/stats"
```

---

## Get Single Fingerprint

```
GET /api/fingerprints/:hash
```

Retrieves a single fingerprint by its SHA256 hash, with optional related data.

### Path Parameters

| Parameter | Type   | Description                             |
| --------- | ------ | --------------------------------------- |
| `hash`    | string | SHA256 hash (64 hexadecimal characters) |

### Query Parameters

| Parameter             | Type    | Default | Description                          |
| --------------------- | ------- | ------- | ------------------------------------ |
| `include_guilds`      | boolean | `false` | Include per-guild statistics         |
| `include_users`       | boolean | `false` | Include user list (limited to 100)   |
| `include_occurrences` | boolean | `false` | Include occurrence history           |
| `occurrence_limit`    | integer | `50`    | Max occurrences to return (max: 500) |

### Response

Returns a [Fingerprint](#fingerprint) object, optionally extended with:

```json
{
  "hash": "abc123...",
  "firstSeenAt": "2024-01-15T10:30:00.000Z",
  "lastSeenAt": "2024-01-20T14:22:00.000Z",
  "occurrenceCount": 47,
  "guildCount": 12,
  "userCount": 23,
  "actionCount": 5,
  "status": 1,
  "flaggedAt": "2024-01-18T09:00:00.000Z",
  "flaggedBy": "123456789012345678",
  "notes": "Known spam image",
  "sampleFileSize": 102400,
  "sampleContentType": "image/png",
  "sampleFilename": "image.png",
  "guilds": [FingerprintGuild],
  "users": [FingerprintUser],
  "occurrences": [FingerprintOccurrence]
}
```

### Error Responses

| Status | Description           |
| ------ | --------------------- |
| 404    | Fingerprint not found |

### Example

```bash
# Get fingerprint with all related data
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/fingerprints/abc123...?include_guilds=true&include_users=true&include_occurrences=true"
```

---

## Update Fingerprint Status

```
PATCH /api/fingerprints/:hash/flag
```

Updates the moderation status of a fingerprint.

### Path Parameters

| Parameter | Type   | Description                             |
| --------- | ------ | --------------------------------------- |
| `hash`    | string | SHA256 hash (64 hexadecimal characters) |

### Request Body

```json
{
	"status": 1,
	"flagged_by": "123456789012345678",
	"notes": "Confirmed spam - matches known raid image"
}
```

| Field        | Type    | Required      | Description                                 |
| ------------ | ------- | ------------- | ------------------------------------------- |
| `status`     | integer | Yes           | New status (0=Normal, 1=Flagged, 2=Trusted) |
| `flagged_by` | string  | When flagging | Discord user ID of the moderator            |
| `notes`      | string  | No            | Moderation notes                            |

### Response

Returns the updated [Fingerprint](#fingerprint) object.

### Error Responses

| Status | Description           |
| ------ | --------------------- |
| 400    | Invalid status value  |
| 404    | Fingerprint not found |

### Example

```bash
# Flag a fingerprint as malicious
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": 1, "flagged_by": "123456789012345678", "notes": "Spam image"}' \
  "https://api.example.com/api/fingerprints/abc123.../flag"

# Mark a fingerprint as trusted (whitelist)
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": 2, "flagged_by": "123456789012345678", "notes": "Official server emoji"}' \
  "https://api.example.com/api/fingerprints/abc123.../flag"

# Reset to normal status
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": 0}' \
  "https://api.example.com/api/fingerprints/abc123.../flag"
```

---

## Batch Ingest

```
POST /api/fingerprints/ingest
```

Imports multiple fingerprints in a single request. Useful for bulk importing known malicious hashes or seeding the database.

### Request Body

```json
{
	"fingerprints": [
		{
			"hash": "abc123...",
			"guild_id": "123456789012345678",
			"user_id": "123456789012345678",
			"channel_id": "123456789012345678",
			"file_size": 102400,
			"content_type": "image/png",
			"filename": "suspicious.png"
		}
	],
	"status": 1,
	"flagged_by": "123456789012345678",
	"notes": "Imported from external blocklist"
}
```

| Field                         | Type    | Required      | Description                             |
| ----------------------------- | ------- | ------------- | --------------------------------------- |
| `fingerprints`                | array   | Yes           | Array of fingerprint objects (max: 100) |
| `fingerprints[].hash`         | string  | Yes           | SHA256 hash (64 hex characters)         |
| `fingerprints[].guild_id`     | string  | No            | Discord guild ID                        |
| `fingerprints[].user_id`      | string  | No            | Discord user ID                         |
| `fingerprints[].channel_id`   | string  | No            | Discord channel ID                      |
| `fingerprints[].file_size`    | integer | No            | File size in bytes                      |
| `fingerprints[].content_type` | string  | No            | MIME type                               |
| `fingerprints[].filename`     | string  | No            | Original filename                       |
| `status`                      | integer | No            | Status to apply (default: 0=Normal)     |
| `flagged_by`                  | string  | When status=1 | Required when flagging                  |
| `notes`                       | string  | No            | Notes to apply to all fingerprints      |

### Response

```json
{
  "ingested": 10,
  "created": 7,
  "updated": 3,
  "hashes": ["abc123...", "def456...", ...]
}
```

| Field      | Type    | Description                   |
| ---------- | ------- | ----------------------------- |
| `ingested` | integer | Total fingerprints processed  |
| `created`  | integer | New fingerprints created      |
| `updated`  | integer | Existing fingerprints updated |
| `hashes`   | array   | List of all processed hashes  |

### Error Responses

| Status | Description                                  |
| ------ | -------------------------------------------- |
| 400    | Empty fingerprints array                     |
| 400    | Exceeds maximum batch size (100)             |
| 400    | Invalid hash format                          |
| 400    | Invalid status value                         |
| 400    | `flagged_by` required when status is Flagged |

### Example

```bash
# Import known malicious hashes
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fingerprints": [
      {"hash": "abc123..."},
      {"hash": "def456..."}
    ],
    "status": 1,
    "flagged_by": "123456789012345678",
    "notes": "Known spam images from blocklist v2.3"
  }' \
  "https://api.example.com/api/fingerprints/ingest"
```

---

## Per-Guild Fingerprints

```
GET /api/guilds/:id/fingerprints
```

Lists fingerprints that have been seen in a specific guild. Accepts the same query parameters as [List Fingerprints](#list-fingerprints).

### Path Parameters

| Parameter | Type   | Description      |
| --------- | ------ | ---------------- |
| `id`      | string | Discord guild ID |

### Query Parameters

Same as [List Fingerprints](#list-fingerprints).

### Response

Same format as [List Fingerprints](#list-fingerprints).

### Example

```bash
# List all flagged fingerprints seen in a guild
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/guilds/123456789012345678/fingerprints?status=1"

# List suspicious fingerprints for review
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/guilds/123456789012345678/fingerprints?suspicious=true"
```

---

## Types

### Fingerprint

Core fingerprint record.

```typescript
type Fingerprint = {
	hash: string; // SHA256 hash (64 hex chars)
	firstSeenAt: string; // ISO 8601 timestamp
	lastSeenAt: string; // ISO 8601 timestamp
	occurrenceCount: number; // Total times seen across all guilds
	guildCount: number; // Unique guilds where seen
	userCount: number; // Unique users who posted
	actionCount: number; // Moderation actions taken
	status: FingerprintStatus; // 0=Normal, 1=Flagged, 2=Trusted
	flaggedAt: string | null; // When flagged
	flaggedBy: string | null; // Discord user ID who flagged
	unflaggedAt: string | null; // When unflagged
	unflaggedBy: string | null; // Discord user ID who unflagged
	sampleFileSize: number | null; // Sample file size in bytes
	sampleContentType: string | null; // Sample MIME type
	sampleFilename: string | null; // Sample filename
	notes: string | null; // Moderation notes
	updatedAt: string | null; // Last update timestamp
};
```

### FingerprintGuild

Per-guild statistics for a fingerprint.

```typescript
type FingerprintGuild = {
	hash: string; // SHA256 hash
	guildId: string; // Discord guild ID
	firstSeenAt: string; // First seen in this guild
	lastSeenAt: string; // Last seen in this guild
	occurrenceCount: number; // Times seen in this guild
	userCount: number; // Unique users in this guild
};
```

### FingerprintUser

User association with a fingerprint.

```typescript
type FingerprintUser = {
	hash: string; // SHA256 hash
	userId: string; // Discord user ID
	firstSeenAt: string; // First seen from this user
};
```

### FingerprintOccurrence

Individual occurrence record.

```typescript
type FingerprintOccurrence = {
	id: string; // Unique occurrence ID
	hash: string; // SHA256 hash
	guildId: string; // Discord guild ID
	userId: string; // Discord user ID
	channelId: string | null; // Discord channel ID
	messageId: string | null; // Discord message ID
	caseId: number | null; // Associated moderation case ID
	createdAt: string; // ISO 8601 timestamp
};
```

---

## Status Codes

The fingerprint status enum represents the moderation state:

| Value | Name    | Description                            |
| ----- | ------- | -------------------------------------- |
| `0`   | Normal  | Default state, no action taken         |
| `1`   | Flagged | Marked as malicious/spam               |
| `2`   | Trusted | Whitelisted, will not trigger warnings |

### Status Transitions

```
     ┌─────────────────┐
     │                 │
     ▼                 │
  Normal ─────► Flagged
     │                 │
     │                 │
     ▼                 │
  Trusted ◄────────────┘
```

All transitions are valid. When changing from Flagged to Normal or Trusted, the `unflaggedAt` and `unflaggedBy` fields are populated.

---

## Suspicious Fingerprints

Fingerprints are automatically classified as "suspicious" when they meet **both** criteria:

1. Status is Normal (not yet reviewed)
2. **Either** of these thresholds is exceeded:
   - Guild count >= 5 (seen across multiple servers)
   - Occurrence count >= 10 (posted many times)

Use `suspicious=true` query parameter to filter for these fingerprints for review.

---

## Error Responses

All endpoints return standard HTTP error responses:

```json
{
	"statusCode": 400,
	"error": "Bad Request",
	"message": "Description of what went wrong"
}
```

| Status | Description                        |
| ------ | ---------------------------------- |
| 400    | Invalid request parameters or body |
| 401    | Missing or invalid authentication  |
| 404    | Resource not found                 |
| 500    | Internal server error              |

---

## Rate Limits

The API does not currently enforce rate limits, but clients should implement reasonable request throttling. Consider:

- Batch operations via `/ingest` instead of individual requests
- Caching statistics responses (data updates in near-real-time)
- Using pagination with reasonable page sizes

---

## Documentation Links

- [PostgreSQL Database Guide](../libraries/postgres.md) - Database query patterns
- [BullMQ Job Queue](../libraries/bullmq.md) - Background job processing
