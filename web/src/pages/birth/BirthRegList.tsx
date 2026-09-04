import { useEffect, useState } from 'react';
import { Box, Button, Link } from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
import { bnAge } from '../../utils/timeAgo';
import PageHeader from '../../components/PageHeader';
import TableTabs, { type TableTab } from '../../components/TableTabs';
import DataTable, { type Column } from '../../components/DataTable';
import StatusPill from '../../components/StatusPill';
import { listBirthRegs, downloadCertificate, type BirthReg, type BirthRegTab } from '../../api/birthReg';
import { useSelectedTenant } from '../../tenant/SelectedTenantContext';

const TAB_LABEL: Record<string, string> = {
  all: S.birthReg.tabAll,
  pending_entry: S.birthReg.tabPending,
  entered: S.birthReg.tabEntered,
};
const TAB_TONE: Record<string, 'pending' | 'success' | 'info'> = {
  all: 'info',
  pending_entry: 'pending',
  entered: 'success',
};

export default function BirthRegList() {
  const navigate = useNavigate();
  const { version } = useSelectedTenant();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<BirthReg[]>([]);
  const [tabs, setTabs] = useState<BirthRegTab[]>([]);
  const [loading, setLoading] = useState(true);

  // Searched on the server, like the mothers' register: the page holds one page of rows, so
  // filtering what is already loaded would search a slice and call it the answer. Debounced, and
  // a response is dropped if a newer request has gone out since.
  useEffect(() => {
    let current = true;
    const t = setTimeout(() => {
      setLoading(true);
      listBirthRegs({ status, q: q.trim() || undefined })
        .then((r) => {
          if (!current) return;
          setRows(r.data);
          setTabs(r.tabs);
        })
        .catch(() => {
          if (!current) return;
          setRows([]);
          setTabs([]);
        })
        .finally(() => current && setLoading(false));
    }, q ? 250 : 0);

    return () => {
      current = false;
      clearTimeout(t);
    };
  }, [status, version, q]);

  const tableTabs: TableTab[] = tabs.map((t) => ({
    key: t.key,
    label: TAB_LABEL[t.key] ?? t.key,
    total: t.total,
    tone: TAB_TONE[t.key],
  }));

  const columns: Column<BirthReg>[] = [
    { key: 'registration_no', header: S.birthReg.colRegNo, render: (r) => (r.registration_no ? bn(r.registration_no) : '—') },
    { key: 'child_name', header: S.birthReg.colChild, render: (r) => r.child_name ?? '—' },
    {
      // Straight through to her প্রসূতি record — a manual entry has no mother to link to.
      key: 'mother_name',
      header: S.birthReg.colMother,
      render: (r) =>
        r.pregnancy_id ? (
          <Link component="button" underline="hover" onClick={() => navigate(`/pregnancy/${r.pregnancy_id}`)}>
            {r.mother_name}
          </Link>
        ) : (
          r.mother_name
        ),
    },
    { key: 'father_name', header: S.birthReg.colFather, render: (r) => r.father_name ?? '—' },
    { key: 'upazila', header: S.birthReg.colUpazila, render: (r) => r.upazila ?? '—' },
    { key: 'union', header: S.birthReg.colUnion, render: (r) => r.union ?? '—' },
    { key: 'ward_no', header: S.birthReg.colWard, render: (r) => (r.ward_no ? bn(r.ward_no) : '—') },
    { key: 'age', header: S.birthReg.colAge, render: (r) => bnAge(r.date_of_birth) },
    { key: 'status', header: S.birthReg.colStatus, render: (r) => <StatusPill label={r.status_label} tone={r.status_tone} /> },
    {
      key: 'details',
      header: S.common.details,
      align: 'right',
      render: (r) => (
        <Button size="small" onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/birth/${r.id}`); }}>
          {S.common.details}
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title={S.birthReg.listTitle}
        search={{ value: q, onChange: setQ, placeholder: S.birthReg.searchPlaceholder }}
      />
      <Box sx={{ mb: 2 }}>
        <TableTabs tabs={tableTabs} active={status} onChange={setStatus} />
      </Box>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onRowClick={(r) => navigate(`/birth/${r.id}`)}
        rowActions={(r) =>
          r.has_certificate
            ? [
                {
                  key: 'cert',
                  label: S.birthReg.downloadCert,
                  icon: <DownloadRoundedIcon fontSize="small" />,
                  onClick: () => downloadCertificate(r),
                },
              ]
            : []
        }
      />
    </Box>
  );
}
