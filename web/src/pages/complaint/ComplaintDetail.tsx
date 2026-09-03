import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, IconButton, Link, Paper, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { ApiError } from '../../api/client';
import { bn, bnDate } from '../../utils/bnNum';
import SectionTitle from '../../components/SectionTitle';
import DetailRow from '../../components/DetailRow';
import SummaryPanel from '../../components/SummaryPanel';
import StatusPill from '../../components/StatusPill';
import AppDialog from '../../components/AppDialog';
import { DateField, SelectField, FormField, type Option } from '../../components/form/FormFields';
import { useAuth } from '../../auth/AuthContext';
import {
  getComplaint, listInvestigators, acceptComplaint, rejectComplaint, submitReport,
  scheduleHearing, completeComplaint, reinvestigate,
  type Complaint, type TimelineEntry,
} from '../../api/complaint';

type Dlg = null | 'accept' | 'reject' | 'report' | 'hearing' | 'complete' | 'reinvestigate';

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [c, setC] = useState<Complaint | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = () => { if (id) getComplaint(id).then((r) => setC(r.data)).catch(() => setC(null)); };
  useEffect(load, [id]);

  if (!c) return null;

  const isManager = user?.role === 'uno' || user?.role === 'seal_admin';
  const isMyCase = user?.role === 'investigating_officer' && c.investigating_officer_id === user?.id;
  const timeline = c.timeline ?? [];
  const last = timeline[timeline.length - 1]?.type;

  // Whose turn is it (only meaningful while status === 'assigned'):
  const officersTurn = c.status === 'assigned' && (last === 'accepted' || last === 'reinvestigation');
  const awaitingHearing = c.status === 'assigned' && last === 'report';
  const hearingSet = c.status === 'assigned' && !!c.hearing_date;

  const mapLink = c.latitude ? `https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=16/${c.latitude}/${c.longitude}` : null;
  const done = () => { setDlg(null); setFlash(S.complaint.done); load(); };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 340px' }, gap: 3, alignItems: 'start' }}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/complaint')}><ArrowBackRoundedIcon /></IconButton>
          <Typography sx={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{S.complaint.listTitle} — {c.title}</Typography>
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
            <DetailRow label={S.complaint.colDate} value={c.complaint_date ? bnDate(c.complaint_date) : '—'} />
            <DetailRow label={S.complaint.colTime} value={c.complaint_time ? bn(c.complaint_time) : '—'} />
            <DetailRow label={S.complaint.fDesc} value={c.description ?? '—'} divider={false} />
          </Box>
        </Paper>

      </Box>

      {/* Right column: who the case belongs to and what can be done with it, then how it got
          here. The timeline reads as context for those facts, so it sits under them rather than
          below the complaint text in the main column. */}
      <Box sx={{ position: 'sticky', top: 16, display: 'grid', gap: 2 }}>
        <SummaryPanel
          title={c.complainant_name}
          lines={[
            { label: S.complaint.fOfficer, value: c.investigating_officer ?? '—' },
            { label: S.complaint.dueDate, value: c.due_date ? bnDate(c.due_date) : '—' },
            { label: S.complaint.hearingDateLabel, value: c.hearing_date ? bnDate(c.hearing_date) : '—' },
          ]}
        >
          <Stack spacing={1}>
            {isManager && c.status === 'pending' && (
              <>
                <Button variant="contained" onClick={() => setDlg('accept')}>{S.complaint.accept}</Button>
                <Button variant="outlined" color="error" onClick={() => setDlg('reject')}>{S.complaint.reject}</Button>
              </>
            )}
            {isMyCase && officersTurn && (
              <Button variant="contained" onClick={() => setDlg('report')}>{S.complaint.submitReport}</Button>
            )}
            {isManager && awaitingHearing && (
              <Button variant="contained" onClick={() => setDlg('hearing')}>{S.complaint.scheduleHearing}</Button>
            )}
            {isManager && hearingSet && (
              <>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mt: 0.5 }}>{S.complaint.writeOrder}</Typography>
                <Button variant="contained" color="success" onClick={() => setDlg('complete')}>{S.complaint.complete}</Button>
                <Button variant="outlined" onClick={() => setDlg('reinvestigate')}>{S.complaint.reinvestigate}</Button>
              </>
            )}
          </Stack>
        </SummaryPanel>

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.complaint.secTimeline}</SectionTitle>
          <ProcessTimeline entries={timeline} />
        </Paper>
      </Box>

      <ActionDialogs which={dlg} complaint={c} onClose={() => setDlg(null)} onDone={done} />
    </Box>
  );
}

// ---- Timeline ----------------------------------------------------------

function ProcessTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) return <Typography sx={{ color: 'text.secondary', mt: 1 }}>—</Typography>;

  return (
    <Box sx={{ mt: 1.5 }}>
      {entries.map((e, i) => (
        <Box key={e.id} sx={{ display: 'flex', gap: 1.5 }}>
          {/* rail */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.5 }} />
            {i < entries.length - 1 && <Box sx={{ flex: 1, width: 2, bgcolor: 'divider', my: 0.5 }} />}
          </Box>
          <Box sx={{ pb: 2.5, flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 700 }}>{e.label}</Typography>
              {e.at && <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{bn(e.at.slice(0, 10))}</Typography>}
            </Box>
            {e.actor_name && (
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{e.actor_name}</Typography>
            )}
            {typeof e.meta?.officer_name === 'string' && (
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                {S.complaint.fOfficer}: {e.meta.officer_name}
                {typeof e.meta?.due_date === 'string' && ` · ${S.complaint.dueDate}: ${bnDate(e.meta.due_date)}`}
              </Typography>
            )}
            {typeof e.meta?.hearing_date === 'string' && (
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                {S.complaint.hearingOn}: {bnDate(e.meta.hearing_date)}
              </Typography>
            )}
            {e.comment && (
              <Typography sx={{ fontSize: 14, mt: 0.5, whiteSpace: 'pre-wrap' }}>{e.comment}</Typography>
            )}
            {e.attachments.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                {e.attachments.filter((a) => a.kind === 'image').map((a) => (
                  <Box
                    key={a.url}
                    component="img"
                    src={a.url}
                    onClick={() => window.open(a.url, '_blank')}
                    sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: (t) => `1px solid ${t.palette.divider}` }}
                  />
                ))}
                {e.attachments.filter((a) => a.kind === 'pdf').map((a) => (
                  <Chip
                    key={a.url}
                    icon={<PictureAsPdfRoundedIcon />}
                    label={S.complaint.viewPdf}
                    component="a"
                    href={a.url}
                    target="_blank"
                    clickable
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ---- Action dialogs ----------------------------------------------------

function ActionDialogs({
  which, complaint, onClose, onDone,
}: {
  which: Dlg;
  complaint: Complaint;
  onClose: () => void;
  onDone: () => void;
}) {
  const [officer, setOfficer] = useState('');
  const [date, setDate] = useState('');
  const [comment, setComment] = useState('');
  const [pdf, setPdf] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [investigators, setInvestigators] = useState<Option[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pdfRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOfficer(''); setDate(''); setComment(''); setPdf(null); setImages([]); setErr(null);
    if (which === 'accept') {
      listInvestigators()
        .then((r) => setInvestigators(r.investigators.map((i) => ({ value: String(i.id), label: i.name }))))
        .catch(() => setInvestigators([]));
    }
  }, [which]);

  if (!which) return null;

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const id = complaint.id;
      if (which === 'accept') {
        await acceptComplaint(id, { investigating_officer_id: Number(officer), due_date: date, comment: comment || undefined });
      } else if (which === 'reject') {
        await rejectComplaint(id, comment || undefined);
      } else if (which === 'report') {
        const fd = new FormData();
        if (comment) fd.append('comment', comment);
        if (pdf) fd.append('document', pdf);
        images.forEach((img) => fd.append('images[]', img));
        await submitReport(id, fd);
      } else if (which === 'hearing') {
        await scheduleHearing(id, { hearing_date: date, comment: comment || undefined });
      } else if (which === 'complete') {
        await completeComplaint(id, comment);
      } else if (which === 'reinvestigate') {
        await reinvestigate(id, { comment, due_date: date || undefined });
      }
      onDone();
    } catch (e) {
      // Without this the promise rejected into nothing: the dialog stayed open, unchanged and
      // unexplained, which reads as a button that does not work. A rejected date or an unchosen
      // officer both land here.
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Exclude<Dlg, null>, string> = {
    accept: S.complaint.accept,
    reject: S.complaint.reject,
    report: S.complaint.submitReport,
    hearing: S.complaint.scheduleHearing,
    complete: S.complaint.complete,
    reinvestigate: S.complaint.reinvestigate,
  };

  return (
    <AppDialog open title={titles[which]} onClose={onClose} onSubmit={run} submitting={busy} maxWidth="xs">
      {err && <Alert severity="error">{err}</Alert>}
      {which === 'accept' && (
        <>
          <SelectField label={S.complaint.chooseOfficer} value={officer} onChange={setOfficer} options={investigators} placeholder="নির্বাচন করুন" />
          <DateField label={S.complaint.dueDateField} value={date} onChange={setDate} />
          <FormField label={S.complaint.comment} value={comment} onChange={setComment} multiline rows={2} />
        </>
      )}
      {which === 'reject' && <FormField label={S.complaint.comment} value={comment} onChange={setComment} multiline rows={3} />}
      {which === 'report' && (
        <>
          <Button variant="outlined" onClick={() => pdfRef.current?.click()}>
            {pdf ? pdf.name : S.complaint.reportDoc}
          </Button>
          <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
          <Button variant="outlined" onClick={() => imgRef.current?.click()}>
            {images.length > 0 ? `${bn(images.length)} ${S.complaint.attachedFiles}` : S.complaint.reportImages}
          </Button>
          <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={(e) => setImages(Array.from(e.target.files ?? []))} />
          <FormField label={S.complaint.comment} value={comment} onChange={setComment} multiline rows={3} />
        </>
      )}
      {which === 'hearing' && (
        <>
          <DateField label={S.complaint.hearingDateField} value={date} onChange={setDate} />
          <FormField label={S.complaint.comment} value={comment} onChange={setComment} multiline rows={2} />
        </>
      )}
      {which === 'complete' && <FormField label={S.complaint.orderInstruction} value={comment} onChange={setComment} multiline rows={4} />}
      {which === 'reinvestigate' && (
        <>
          <FormField label={S.complaint.orderInstruction} value={comment} onChange={setComment} multiline rows={4} />
          <DateField label={S.complaint.dueDateField} value={date} onChange={setDate} />
        </>
      )}
    </AppDialog>
  );
}
