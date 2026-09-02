import { useEffect, useState } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
import { api } from '../../api/client';
import PaginationBar from '../../components/PaginationBar';
import { usePagination } from '../../components/usePagination';

interface UpazilaRow {
  id: string;
  name_bn: string;
  domain: string;
  district?: { id: number; name_bn: string; slug: string | null; division?: { name_bn: string } | null };
}

interface DistrictRow {
  id: number;
  name_bn: string;
  division_bn: string;
  domain: string;
  upazila_count: number;
}

// The DC dashboards. Derived from the provisioned upazilas rather than provisioned in their own
// right: a district's dashboard exists as soon as it has one upazila on Suraha, and a second
// upazila only adds to its figures. So there is nothing to create or edit here — hence no add
// button, no row click, and no status column.
export default function Districts() {
  const [rows, setRows] = useState<DistrictRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ data: UpazilaRow[] }>('/upazilas')
      .then((r) => {
        const base = r.data[0]?.domain.split('.').slice(1).join('.') ?? '';
        const byId = new Map<number, DistrictRow>();

        for (const u of r.data) {
          const d = u.district;
          if (!d?.slug) continue;
          const seen = byId.get(d.id);
          if (seen) {
            seen.upazila_count += 1;
            continue;
          }
          byId.set(d.id, {
            id: d.id,
            name_bn: d.name_bn,
            division_bn: d.division?.name_bn ?? '—',
            domain: `${d.slug}.${base}`,
            upazila_count: 1,
          });
        }

        setRows([...byId.values()].sort((a, b) => a.name_bn.localeCompare(b.name_bn, 'bn')));
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const { pageRows, page, setPage, pageCount } = usePagination(rows);

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{S.instances.districtSectionTitle}</Typography>
        <Typography sx={{ color: 'text.secondary' }}>{S.instances.districtSectionHelp}</Typography>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '16px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{S.instances.colDistrict}</TableCell>
              <TableCell>{S.instances.colDivision}</TableCell>
              <TableCell>{S.instances.colSubdomain}</TableCell>
              <TableCell align="center">{S.instances.colUpazilaCount}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((d) => (
              <TableRow key={d.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{d.name_bn}</TableCell>
                <TableCell>{d.division_bn}</TableCell>
                <TableCell sx={{ direction: 'ltr', fontFamily: 'monospace', fontSize: 13 }}>
                  {d.domain}
                </TableCell>
                <TableCell align="center">{bn(d.upazila_count)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  {loading ? S.common.loading : S.common.noData}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationBar page={page} pageCount={pageCount} onPage={setPage} />
      </TableContainer>
    </Box>
  );
}
