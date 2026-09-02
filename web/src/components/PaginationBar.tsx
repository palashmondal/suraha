import { Box, Pagination, PaginationItem } from '@mui/material';
import { bn } from '../utils/bnNum';

// Shared listing footer: numbered page navigation in Bengali digits, centred.
//
// Renders nothing while everything fits on one page (10 rows), so short lists end at the last row
// instead of carrying a control that cannot do anything. Every caller gets that for free rather
// than guarding at each call site.
export default function PaginationBar({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <Box
      sx={{
        // Sinks to the bottom of its container, so a short last page does not pull the pager up
        // to meet the final row.
        mt: 'auto',
        display: 'flex',
        justifyContent: 'center',
        px: 2,
        py: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
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
    </Box>
  );
}
