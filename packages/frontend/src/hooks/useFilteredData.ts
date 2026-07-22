import { useMemo } from 'react';

/**
 * Memoized data filtering hook.
 * Prevents unnecessary re-renders when filtering large datasets.
 */
export function useFilteredData<T>(
  data: T[],
  filterFn: (item: T) => boolean,
): T[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => data.filter(filterFn), [data, filterFn]);
}

/**
 * Memoized data sorting hook.
 */
export function useSortedData<T>(
  data: T[],
  sortKey: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, order]);
}

/**
 * Memoized stats computation hook.
 */
export function useStats<T>(data: T[], computeFn: (data: T[]) => Record<string, number>): Record<string, number> {
  return useMemo(() => computeFn(data), [data, computeFn]);
}
