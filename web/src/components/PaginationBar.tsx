import { Box, MenuItem, Pagination, PaginationItem, Select, Typography } from '@mui/material';
import { bnStrings as S } from '../i18n';
import { bn } from '../utils/bnNum';
import { PAGE_SIZES, type PageSize } from './usePagination';

// Shared listing footer: page-size selector (10/20/30/50/সব) on the left, numbered page
// navigation (Bengali digits) on the right. Used by DataTable and the custom list pages.
export default function PaginationBar({
  page,
  pageCount,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  pageSize: PageSize;
  onPage: (p: number) => void;
  onPageSize: (s: PageSize) => void;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifySelf: 'start' }}>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>{S.common.show}</Typography>
        <Select
          size="small"
          value={String(pageSize)}
          onChange={(e) => onPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          sx={{ borderRadius: '8px', fontSize: 13.5, '& .MuiSelect-select': { py: 0.5 } }}
        >
          {PAGE_SIZES.map((s) => (
            <MenuItem key={String(s)} value={String(s)} sx={{ fontSize: 13.5 }}>
              {s === 'all' ? S.common.allItems : bn(s)}
            </MenuItem>
          ))}
        </Select>
      </Box>
      {pageCount > 1 && (
        <Pagination
          count={pageCount}
          page={page}
          onChange={(_, p) => onPage(p)}
          color="primary"
          shape="rounded"
          siblingCount={1}
          renderItem={(item) => (
            <PaginationItem
              {...item}
              page={typeof item.page === 'number' ? (bn(item.page) as unknown as number) : item.page}
            />
          )}
        />
      )}
    </Box>
  );
}
