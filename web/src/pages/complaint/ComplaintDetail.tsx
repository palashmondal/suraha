import { useEffect, useState } from 'react';
import { Alert, Box, Button, IconButton, Link, Paper, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { useNavigate, useParams } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
import SectionTitle from '../../components/SectionTitle';
import DetailRow from '../../components/DetailRow';
import SummaryPanel from '../../components/SummaryPanel';
import StatusTimeline, { type TimelineNode } from '../../components/StatusTimeline';
import StatusPill from '../../components/StatusPill';
import AppDialog from '../../components/AppDialog';
import { DateField, SelectField, FormField, type Option } from '../../components/form/FormFields';
import { useAuth } from '../../auth/AuthContext';
import {
  getComplaint, listInvestigators, scheduleComplaint, assignComplaint,
  resolveComplaint, rejectComplaint, submitFindings, type Complaint,
} from '../../api/complaint';

const d = (v: string | null) => (v ? bn(v.slice(0, 10)) : undefined);

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [c, setC] = useState<Complaint | null>(null);
  const [dlg, setDlg] = useState<null | 'schedule' | 'assign' | 'resolve' | 'reject' | 'findings'>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = () => { if (id) getComplaint(id).then((r) => setC(r.data)).catch(() => setC(null)); };
  useEffect(load, [id]);

  if (!c) return null;

  const isManager = user?.role === 'uno' || user?.role === 'seal_admin';
  const isMyCase = user?.role === 'investigating_officer' && c.investigating_officer_id === user?.id;
  const open = (final: boolean) => c.status === 'resolved' || c.status === 'rejected' ? false : !final;

  const nodes: TimelineNode[] = [
    { key: 'filed', label: S.complaint.tlFiled, timestamp: d(c.filed_at), done: true },
    { key: 'scheduled', label: S.complaint.tlScheduled, timestamp: d(c.scheduled_at), done: !!c.scheduled_at },
    { key: 'assigned', label: S.complaint.tlAssigned, timestamp: d(c.assigned_at), done: !!c.assigned_at },
    c.status === 'rejected'
      ? { key: 'rejected', label: S.complaint.tlRejected, timestamp: d(c.rejected_at), done: true }
      : { key: 'resolved', label: S.complaint.tlResolved, timestamp: d(c.resolved_at), done: !!c.resolved_at },
  ];

  const mapLink = c.latitude ? `https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=16/${c.latitude}/${c.longitude}` : null;

  const done = () => { setDlg(null); setFlash(S.complaint.done); load(); };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 3, alignItems: 'start' }}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/complaint')}><ArrowBackRoundedIcon /></IconButton>
          <Typography sx={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{S.complaint.listTitle}- {c.title}</Typography>
          <StatusPill label={c.status_label} tone={c.status_tone} />
        </Paper>

        {flash && <Alert severity="success" onClose={() => setFlash(null)}>{flash}</Alert>}

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.complaint.secComplainant}</SectionTitle>
          <Box sx={{ mt: 1 }}>
            <DetailRow label={S.complaint.fName} value={c.complainant_name} />
            <DetailRow label={S.complaint.fUnion} value={c.union ?? '—'} />
            <DetailRow label={S.complaint.fWard} value={c.ward_no ? bn(c.ward_no) : '—'} />
            <DetailRow
              label={S.complaint.fPlace}
              value={c.latitude ? `${c.latitude}, ${c.longitude}` : '—'}
              action={mapLink && (
                <Link href={mapLink} target="_blank" rel="noopener" sx={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                  <PlaceOutlinedIcon sx={{ fontSize: 15 }} /> {S.common.track}
                </Link>
              )}
            />
            <DetailRow label={S.complaint.fAddress} value={c.address ?? '—'} />
            <DetailRow label={S.complaint.fMobile} value={c.mobile ? bn(c.mobile) : '—'} divider={false} />
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.complaint.secDetails}</SectionTitle>
          <Box sx={{ mt: 1 }}>
            <DetailRow label={S.complaint.fTitle} value={c.title} />
            <DetailRow label={S.complaint.colDate} value={c.complaint_date ? bn(c.complaint_date) : '—'} />
            <DetailRow label={S.complaint.colTime} value={c.complaint_time ? bn(c.complaint_time) : '—'} />
            <DetailRow label={S.complaint.fDesc} value={c.description ?? '—'} divider={false} />
          </Box>
        </Paper>

        {(c.investigating_officer || c.findings) && (
          <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
            <SectionTitle>{S.complaint.secResolution}</SectionTitle>
            <Box sx={{ mt: 1 }}>
              <DetailRow label={S.complaint.fOfficer} value={c.investigating_officer ?? '—'} />
              <DetailRow label={S.complaint.fFindings} value={c.findings ?? '—'} divider={false} />
            </Box>
          </Paper>
        )}
      </Box>

      <Box sx={{ position: 'sticky', top: 16 }}>
        <SummaryPanel
          title={c.complainant_name}
          lines={[
            { label: S.complaint.colDate, value: c.complaint_date ? bn(c.complaint_date) : '—' },
            { label: S.complaint.colTime, value: c.complaint_time ? bn(c.complaint_time) : '—' },
          ]}
        >
          <StatusTimeline nodes={nodes} />

          <Stack spacing={1}>
            {isManager && open(false) && (
              <>
                <Button variant="contained" onClick={() => setDlg('schedule')}>
                  {c.scheduled_at ? S.complaint.reschedule : S.complaint.schedule}
                </Button>
                {c.status !== 'filed' && (
                  <Button variant="outlined" onClick={() => setDlg('assign')}>{S.complaint.assign}</Button>
                )}
                {c.status === 'assigned' && (
                  <Button variant="contained" color="success" onClick={() => setDlg('resolve')}>{S.complaint.resolve}</Button>
                )}
                <Button variant="outlined" color="error" onClick={() => setDlg('reject')}>{S.complaint.reject}</Button>
              </>
            )}
            {isMyCase && c.status !== 'resolved' && c.status !== 'rejected' && (
              <Button variant="contained" onClick={() => setDlg('findings')}>{S.complaint.submitFindings}</Button>
            )}
          </Stack>
        </SummaryPanel>
      </Box>

      <ActionDialogs which={dlg} complaint={c} onClose={() => setDlg(null)} onDone={done} />
    </Box>
  );
}

function ActionDialogs({
  which, complaint, onClose, onDone,
}: {
  which: null | 'schedule' | 'assign' | 'resolve' | 'reject' | 'findings';
  complaint: Complaint;
  onClose: () => void;
  onDone: () => void;
}) {
  const [val, setVal] = useState('');
  const [investigators, setInvestigators] = useState<Option[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setVal('');
    if (which === 'assign') {
      listInvestigators()
        .then((r) => setInvestigators(r.investigators.map((i) => ({ value: String(i.id), label: i.name }))))
        .catch(() => setInvestigators([]));
    }
  }, [which]);

  if (!which) return null;

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const id = complaint.id;
      if (which === 'schedule') await scheduleComplaint(id, val);
      else if (which === 'assign') await assignComplaint(id, Number(val));
      else if (which === 'resolve') await resolveComplaint(id, val || undefined);
      else if (which === 'reject') await rejectComplaint(id, val || undefined);
      else if (which === 'findings') await submitFindings(id, val);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<string, string> = {
    schedule: S.complaint.schedule, assign: S.complaint.assign,
    resolve: S.complaint.resolve, reject: S.complaint.reject, findings: S.complaint.submitFindings,
  };

  return (
    <AppDialog open title={titles[which]} onClose={onClose} onSubmit={run} submitting={busy} maxWidth="xs">
      {which === 'schedule' && <DateField label={S.complaint.scheduleDate} value={val} onChange={setVal} />}
      {which === 'assign' && <SelectField label={S.complaint.chooseOfficer} value={val} onChange={setVal} options={investigators} placeholder="নির্বাচন করুন" />}
      {(which === 'resolve' || which === 'reject') && <FormField label={S.complaint.note} value={val} onChange={setVal} multiline rows={3} />}
      {which === 'findings' && <FormField label={S.complaint.fFindings} value={val} onChange={setVal} multiline rows={4} />}
    </AppDialog>
  );
}
