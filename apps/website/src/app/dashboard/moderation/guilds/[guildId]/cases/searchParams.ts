import {
	createSearchParamsCache,
	createSerializer,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
} from "nuqs/server";

export const casesSearchParamsParsers = {
	q: parseAsString.withDefault(""),
	sort: parseAsStringLiteral(["recent", "count"]).withDefault("recent"),
	page: parseAsInteger.withDefault(1),
};

export const casesSearchParamsCache = createSearchParamsCache(casesSearchParamsParsers);

export const serializeCasesSearchParams = createSerializer(casesSearchParamsParsers);
