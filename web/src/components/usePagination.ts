import { useEffect, useMemo, useState } from 'react';

export type PageSize = number | 'all';
export const PAGE_SIZES: PageSize[] = [10, 20, 30, 50, 'all'];

// Client-side pagination shared by every listing (tables + card grids). Defaults to 10/page and
// resets to page 1 whenever the data set or page size changes (e.g. a tab switch).
export function usePagination<T>(rows: T[]) {
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);

  const total = rows.length;
  const perPage = pageSize === 'all' ? Math.max(total, 1) : pageSize;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, pageCount);

  useEffect(() => setPage(1), [pageSize, total]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return rows.slice(start, start + perPage);
  }, [rows, currentPage, perPage]);

  return { pageRows, page: currentPage, setPage, pageSize, setPageSize, pageCount, total };
}
