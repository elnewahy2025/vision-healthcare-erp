export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleResponse<T> {
  data: T;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface IdParams {
  id: string;
}
