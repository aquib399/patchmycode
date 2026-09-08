import { PaginatedResponse } from "@/types/pagination.js";

export function createPagination<T>(
  results: T[],
  totalResults: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(totalResults / limit) || 1;

  return {
    page,
    limit,
    totalResults,
    totalPages,
    next: page < totalPages ? page + 1 : null,
    previous: page > 1 ? page - 1 : null,
    results
  };
}

export function createPaginationFromAggregate<T>(
  data: any[],
  page: number,
  limit: number
) {
  const facetResult = data[0] || {};
  const totalResults = facetResult.metadata?.[0]?.totalResults || 0;
  const results = facetResult.results || [];

  return createPagination<T>(results, totalResults, page, limit);
}
