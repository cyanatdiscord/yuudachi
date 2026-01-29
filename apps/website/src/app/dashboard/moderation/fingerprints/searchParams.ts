import { createSearchParamsCache, createSerializer, parseAsInteger, parseAsStringLiteral } from "nuqs/server";

export const fingerprintsSearchParamsParsers = {
	status: parseAsStringLiteral(["all", "flagged", "suspicious", "trusted"]).withDefault("all"),
	sort: parseAsStringLiteral(["last_seen", "occurrence_count", "guild_count", "user_count"]).withDefault("last_seen"),
	page: parseAsInteger.withDefault(1),
};

export const fingerprintsSearchParamsCache = createSearchParamsCache(fingerprintsSearchParamsParsers);

export const serializeFingerprintsSearchParams = createSerializer(fingerprintsSearchParamsParsers);
