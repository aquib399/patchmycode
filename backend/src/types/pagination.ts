export interface PaginatedResponse<T> {
  page: number;
  totalPages: number;
  limit: number;
  totalResults: number;
  next: number | null;
  previous: number | null;
  results: T[];
}
