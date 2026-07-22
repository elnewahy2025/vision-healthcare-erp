import { useState, useMemo } from 'react';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function usePagination(initialPage = 1, initialLimit = 20): PaginationState & { setPage: (page: number) => void; setLimit: (limit: number) => void; setTotal: (total: number) => void; nextPage: () => void; prevPage: () => void; paginationParams: { page: number; limit: number } } {
  const [state, setState] = useState<PaginationState>({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
  });

  const setPage = (page: number) => setState((s) => ({ ...s, page }));
  const setLimit = (limit: number) => setState((s) => ({ ...s, limit, page: 1 }));
  const setTotal = (total: number) =>
    setState((s) => ({ ...s, total, totalPages: Math.ceil(total / s.limit) }));

  const nextPage = () => setState((s) => ({ ...s, page: Math.min(s.page + 1, s.totalPages || 1) }));
  const prevPage = () => setState((s) => ({ ...s, page: Math.max(s.page - 1, 1) }));

  const paginationParams = useMemo(() => ({ page: state.page, limit: state.limit }), [state.page, state.limit]);

  return {
    ...state,
    setPage,
    setLimit,
    setTotal,
    nextPage,
    prevPage,
    paginationParams,
  };
}
