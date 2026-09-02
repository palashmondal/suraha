import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { ReactNode } from 'react';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';
import PaginationBar from './PaginationBar';
import RowMenu, { type RowAction } from './RowMenu';
import { usePagination } from './usePagination';

export interface Column<T> {
  key: string;
  header: string; // Bangla column header
  align?: 'left' | 'center' | 'right';
  width?: number | string;
  // Custom cell renderer; falls back to row[key] as text.
  render?: (row: T) => ReactNode;
}

// Generic list table (concept_ui/Frame 1171277087.png): left-aligned Bangla headers, a trailing
// kebab menu, rounded container, horizontal scroll for wide tables, and a built-in empty state.
export default function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  rowActions,
  onRowClick,
  emptyTitle,
  emptyHelper,
  loading = false,
}: {
  columns: Column<T>[];
  rows: T[];
  rowActions?: (row: T) => RowAction[];
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyHelper?: string;
  loading?: boolean;
}) {
  const { pageRows, page, setPage, pageCount } = usePagination(rows);

  // While fetching, show a loading state instead of flashing the empty state before data arrives.
  if (loading && rows.length === 0) {
    return (
      <Paper elevation={0} sx={{ borderRadius: '16px' }}>
        <LoadingState />
      </Paper>
    );
  }
  if (rows.length === 0) {
    return (
      <Paper elevation={0} sx={{ borderRadius: '16px' }}>
        <EmptyState title={emptyTitle} helper={emptyHelper} />
      </Paper>
    );
  }

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ borderRadius: '16px', overflowX: 'auto' }}
    >
      <Table sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow sx={{ '& th': { bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' } }}>
            {columns.map((c) => (
              <TableCell
                key={c.key}
                align={c.align ?? 'left'}
                sx={{ color: 'text.secondary', fontWeight: 600, width: c.width, whiteSpace: 'nowrap' }}
              >
                {c.header}
              </TableCell>
            ))}
            {rowActions && <TableCell sx={{ width: 56 }} />}
          </TableRow>
        </TableHead>
        <TableBody>
          {pageRows.map((row) => (
            <TableRow
              key={row.id}
              hover={Boolean(onRowClick)}
              onClick={() => onRowClick?.(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                verticalAlign: 'top',
                '& td': { borderBottom: '1px solid', borderColor: 'divider' },
                '&:last-child td': { borderBottom: 0 },
              }}
            >
              {columns.map((c) => (
                <TableCell key={c.key} align={c.align ?? 'left'}>
                  {c.render ? c.render(row) : ((row as Record<string, ReactNode>)[c.key] ?? '—')}
                </TableCell>
              ))}
              {rowActions && (
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <RowMenu actions={rowActions(row)} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <PaginationBar page={page} pageCount={pageCount} onPage={setPage} />
    </TableContainer>
  );
}
