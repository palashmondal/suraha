import { useEffect, useMemo, useState } from 'react';

/** Rows per page across every listing. Lists at or under this never show a pager. */
export const PAGE_SIZE = 11;

// Client-side pagination shared by every listing (tables + card grids). Resets to page 1 whenever
// the data set changes (e.g. a tab switch).
export function usePagination<T>(rows: T[]) {
  const [page, setPage] = useState(1);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  useEffect(() => setPage(1), [total]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, currentPage]);

  return { pageRows, page: currentPage, setPage, pageCount, total };
}
