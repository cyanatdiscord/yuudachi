import { createSearchParamsCache, createSerializer, parseAsString, parseAsStringLiteral } from "nuqs/server";

export const casesSearchParamsParsers = {
	q: parseAsString.withDefault(""),
	sort: parseAsStringLiteral(["recent", "count"]).withDefault("recent"),
};

export const casesSearchParamsCache = createSearchParamsCache(casesSearchParamsParsers);

export const serializeCasesSearchParams = createSerializer(casesSearchParamsParsers);
