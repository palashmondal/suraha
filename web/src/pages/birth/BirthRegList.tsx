import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
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
  const { version } = useSelectedTenant();
  const [status, setStatus] = useState('all');
  const [rows, setRows] = useState<BirthReg[]>([]);
  const [tabs, setTabs] = useState<BirthRegTab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listBirthRegs({ status })
      .then((r) => {
        setRows(r.data);
        setTabs(r.tabs);
      })
      .catch(() => {
        setRows([]);
        setTabs([]);
      })
      .finally(() => setLoading(false));
  }, [status, version]);

  const tableTabs: TableTab[] = tabs.map((t) => ({
    key: t.key,
    label: TAB_LABEL[t.key] ?? t.key,
    total: t.total,
    tone: TAB_TONE[t.key],
  }));

  const columns: Column<BirthReg>[] = [
    { key: 'registration_no', header: S.birthReg.colRegNo, render: (r) => (r.registration_no ? bn(r.registration_no) : '—') },
    { key: 'child_name', header: S.birthReg.colChild, render: (r) => r.child_name ?? '—' },
    { key: 'mother_name', header: S.birthReg.colMother },
    { key: 'father_name', header: S.birthReg.colFather, render: (r) => r.father_name ?? '—' },
    { key: 'union', header: S.birthReg.colUnion, render: (r) => r.union ?? '—' },
    { key: 'ward_no', header: S.birthReg.colWard, render: (r) => (r.ward_no ? bn(r.ward_no) : '—') },
    { key: 'status', header: S.birthReg.colStatus, render: (r) => <StatusPill label={r.status_label} tone={r.status_tone} /> },
  ];

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PageHeader title={S.birthReg.listTitle} onSearch={() => {}} onFilter={() => {}} />
      <Box sx={{ mb: 2 }}>
        <TableTabs tabs={tableTabs} active={status} onChange={setStatus} />
      </Box>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
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
