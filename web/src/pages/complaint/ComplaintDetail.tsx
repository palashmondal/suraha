import { useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Link, Paper, Stack,
  TextField, Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import ZoomOutMapRoundedIcon from '@mui/icons-material/ZoomOutMapRounded';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { ApiError } from '../../api/client';
import { bn, bnDate } from '../../utils/bnNum';
import SectionTitle from '../../components/SectionTitle';
import TrackingCard from '../../components/TrackingCard';
import AttachmentGallery from '../../components/AttachmentGallery';
import LocationMap from '../../components/LocationMap';
import DetailRow from '../../components/DetailRow';
import StatusPill from '../../components/StatusPill';
import AppDialog from '../../components/AppDialog';
import { DateField, SelectField, FormField, type Option } from '../../components/form/FormFields';
import PhoneLink from '../../components/PhoneLink';
import { useAuth } from '../../auth/AuthContext';
import {
  getComplaint, listInvestigators, acceptComplaint, rejectComplaint, submitReport,
  scheduleHearing, completeComplaint, reinvestigate, hearingCalendarUrl,
  type Complaint, type TimelineEntry,
} from '../../api/complaint';

type Dlg = null | 'accept' | 'reject' | 'hearing' | 'complete' | 'reinvestigate';

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [c, setC] = useState<Complaint | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  // navigator.share is the native sheet on a phone (WhatsApp, SMS, Maps); on a desktop browser
  // there is none, so the link goes to the clipboard instead.
  const shareLocation = async (lat: number, lon: number) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    try {
      if (navigator.share) await navigator.share({ title: S.complaint.fPlace, url });
      else {
        await navigator.clipboard.writeText(url);
        setFlash(S.complaint.locationCopied);
      }
    } catch {
      /* the user dismissed the share sheet — not an error */
    }
  };

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
  // Matches what the API allows: the assigned officer, or SEAL. A UNO's POST would 403.
  // `officersTurn` is the other half — once the report is submitted the ball is with the UNO, so
  // the upload panel goes away until a পুনঃতদন্ত hands the case back.
  const canSubmitReport = officersTurn && (isMyCase || user?.role === 'seal_admin');

  // Overdue only while the officer still owes the report — once it is in, a past due date is
  // history, not a problem. toLocaleDateString('en-CA') is today in the *viewer's* timezone in
  // ISO shape, so the comparison does not flip a day early against a UTC clock.
  const today = new Date().toLocaleDateString('en-CA');
  const reportOverdue = officersTurn && !!c.due_date && c.due_date < today;
  const daysLate = reportOverdue
    ? Math.floor((Date.parse(today) - Date.parse(c.due_date!)) / 86_400_000)
    : 0;

  const done = () => { setDlg(null); setFlash(S.complaint.done); load(); };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 420px' }, gap: 3, alignItems: 'start' }}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/app/complaint')}><ArrowBackRoundedIcon /></IconButton>
          <Typography sx={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{S.complaint.detailTitle} — {c.title}</Typography>
          {/* The pill alone read as a bare label; naming it says what the word is telling you. */}
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>{S.complaint.colStatus}:</Typography>
          <StatusPill label={c.status_label} tone={c.status_tone} />
        </Paper>

        {flash && <Alert severity="success" onClose={() => setFlash(null)}>{flash}</Alert>}

        {reportOverdue && (
          <Alert severity="warning" icon={<ReportProblemOutlinedIcon />}>
            <Typography sx={{ fontWeight: 700 }}>
              {isMyCase ? S.complaint.reportOverdueMine : S.complaint.reportOverdue}
            </Typography>
            <Typography sx={{ fontSize: 13.5 }}>
              {S.complaint.dueDate}: {bnDate(c.due_date)} · {S.complaint.reportOverdueBy(bn(daysLate))}
            </Typography>
          </Alert>
        )}

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.complaint.secComplainant}</SectionTitle>
          {/* Paired side by side rather than as one tall column; the row dividers are dropped
              because they would cut across each pair. */}
          <Box
            sx={{
              mt: 1,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              columnGap: 3,
            }}
          >
            <DetailRow label={S.complaint.fName} value={c.complainant_name} divider={false} />
            <DetailRow label={S.complaint.fFather} value={c.father_name ?? '—'} divider={false} />
            <DetailRow label={S.complaint.fMobile} value={<PhoneLink phone={c.mobile} />} divider={false} />
            <DetailRow label={S.complaint.fUnion} value={c.union ?? '—'} divider={false} />
            <DetailRow label={S.complaint.fWard} value={c.ward_no ? bn(c.ward_no) : '—'} divider={false} />
            <DetailRow label={S.complaint.fAddress} value={c.address ?? '—'} divider={false} />
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.complaint.secDetails}</SectionTitle>
          <Box
            sx={{
              mt: 1,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: c.latitude && c.longitude ? '1fr 1fr' : '1fr' },
              columnGap: 3,
              alignItems: 'start',
            }}
          >
            <Box>
              <DetailRow label={S.complaint.fTitle} value={c.title} />
              <DetailRow label={S.complaint.colDate} value={c.complaint_date ? bnDate(c.complaint_date) : '—'} />
              <DetailRow label={S.complaint.colTime} value={c.complaint_time ? bn(c.complaint_time) : '—'} />
              <DetailRow label={S.complaint.fDesc} value={c.description ?? '—'} divider={false} />
            </Box>

            {/* Where the incident is, not where the complainant lives — so it sits with the
                complaint. A coordinate pair means nothing read as digits; the OSM embed shows it
                without pulling in a map library. Nothing is drawn when the complaint carries no
                coordinates — an empty frame says less than no frame. */}
            {c.latitude && c.longitude && (
              <Box sx={{ mt: { xs: 2, md: 1.5 } }}>
                <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 0.75 }}>
                  {S.complaint.fPlace} ({c.latitude}, {c.longitude})
                </Typography>
                <Box sx={{ position: 'relative', '&:hover .map-expand, &:focus-within .map-expand': { opacity: 1 } }}>
                  <LocationMap lat={c.latitude} lon={c.longitude} height={240} />
                  <Button
                    className="map-expand"
                    size="small"
                    variant="contained"
                    startIcon={<ZoomOutMapRoundedIcon />}
                    onClick={() => setMapOpen(true)}
                    sx={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      zIndex: 2, // above Leaflet's own panes
                      opacity: 0,
                      transition: 'opacity 120ms ease',
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      '&:hover': { bgcolor: 'background.paper' },
                    }}
                  >
                    {S.complaint.largerMap}
                  </Button>
                  <Button
                    className="map-expand"
                    size="small"
                    variant="contained"
                    startIcon={<ShareOutlinedIcon />}
                    onClick={() => void shareLocation(c.latitude!, c.longitude!)}
                    sx={{
                      position: 'absolute',
                      bottom: 10,
                      right: 10,
                      zIndex: 2,
                      opacity: 0,
                      transition: 'opacity 120ms ease',
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      '&:hover': { bgcolor: 'background.paper' },
                    }}
                  >
                    {S.complaint.shareLocation}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Paper>

        {(c.attachments?.length ?? 0) > 0 && (
          <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
            <SectionTitle>{S.attachments.title}</SectionTitle>
            <Box sx={{ mt: 1.5 }}>
              <AttachmentGallery attachments={c.attachments!} />
            </Box>
          </Paper>
        )}
      </Box>

      {/* Right column: how the case got here, then what can be done with it. The তদন্তকারী
          কর্মকর্তা / জমার শেষ তারিখ / শুনানির তারিখ are already stated in the কার্যক্রম steps
          that set them, so a summary card only repeated them. */}
      {/* Dropped clear of the back/title bar so the column starts level with the first content
          card, not with the header above it. */}
      <Box sx={{ position: 'sticky', top: 16, mt: { md: 16 }, display: 'grid', gap: 2 }}>
        <TrackingCard token={c.tracking_token} />

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
          <SectionTitle>{S.complaint.secTimeline}</SectionTitle>
          <ProcessTimeline entries={timeline} />
        </Paper>

        {/* The decisions available right now, bare rather than in a card of their own. */}
        <Stack spacing={1.75}>
          {isManager && c.status === 'pending' && (
            <>
              <Button variant="contained" onClick={() => setDlg('accept')}>{S.complaint.accept}</Button>
              <Button variant="outlined" color="error" onClick={() => setDlg('reject')}>{S.complaint.reject}</Button>
            </>
          )}
          {isManager && awaitingHearing && (
            <Button variant="contained" onClick={() => setDlg('hearing')}>{S.complaint.scheduleHearing}</Button>
          )}
          {isManager && hearingSet && (
            <>
              <Button variant="contained" color="success" onClick={() => setDlg('complete')}>{S.complaint.complete}</Button>
              <Button variant="outlined" onClick={() => setDlg('reinvestigate')}>{S.complaint.reinvestigate}</Button>
            </>
          )}
          {/* Not gated to the UNO — the officer due to attend wants the date in their own
              calendar too. */}
          {hearingSet && hearingCalendarUrl(c) && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<EventAvailableRoundedIcon />}
              href={hearingCalendarUrl(c)!}
              target="_blank"
              rel="noopener"
            >
              {S.complaint.addHearingToGcal}
            </Button>
          )}
        </Stack>

        {canSubmitReport && (
          <ReportUpload
            complaint={c}
            onDone={() => { setFlash(S.complaint.reportSubmitted); load(); }}
          />
        )}
      </Box>

      {/* The same place, room to actually look at it. */}
      <Dialog open={mapOpen} onClose={() => setMapOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700 }}>
            {S.complaint.fPlace} ({c.latitude}, {c.longitude})
          </Box>
          <IconButton
            aria-label={S.complaint.shareLocation}
            title={S.complaint.shareLocation}
            onClick={() => void shareLocation(c.latitude!, c.longitude!)}
          >
            <ShareOutlinedIcon />
          </IconButton>
          <IconButton
            aria-label={S.complaint.openInNewTab}
            title={S.complaint.openInNewTab}
            onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=15/${c.latitude}/${c.longitude}`, '_blank', 'noopener')}
          >
            <OpenInNewRoundedIcon />
          </IconButton>
          <IconButton aria-label={S.common.cancel} onClick={() => setMapOpen(false)}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: '75vh', overflow: 'hidden' }}>
          {c.latitude && c.longitude && (
            <LocationMap lat={c.latitude} lon={c.longitude} height="100%" zoom={15} layers />
          )}
        </DialogContent>
      </Dialog>

      <ActionDialogs which={dlg} complaint={c} onClose={() => setDlg(null)} onDone={done} />
    </Box>
  );
}


// ---- Report upload -----------------------------------------------------

/**
 * The তদন্ত প্রতিবেদন goes in right here rather than behind a dialog: it is the one thing the
 * assigned officer opens this page to do. Shown to whoever the API actually lets submit — the
 * assigned officer, or SEAL.
 */
function ReportUpload({ complaint, onDone }: { complaint: Complaint; onDone: () => void }) {
  const [pdf, setPdf] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  // Object URLs are revoked when the selection changes, or the previews leak for the page's life.
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setPreviews(urls);

    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  const dropSx = {
    border: '1.5px dashed',
    borderColor: 'divider',
    borderRadius: '14px',
    p: 2,
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'border-color 120ms ease, background-color 120ms ease',
    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
  };

  const onDropPdf = (e: React.DragEvent) => {
    e.preventDefault();
    const f = Array.from(e.dataTransfer.files).find((x) => x.type === 'application/pdf');
    if (f) setPdf(f);
  };

  const onDropImages = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((x) => x.type.startsWith('image/'));
    if (files.length) setImages((cur) => [...cur, ...files]);
  };

  const submit = async () => {
    if (!pdf && images.length === 0 && !comment.trim()) {
      setErr(S.complaint.reportNeedsFile);

      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      if (comment.trim()) fd.append('comment', comment.trim());
      if (pdf) fd.append('document', pdf);
      images.forEach((img) => fd.append('images[]', img));
      await submitReport(complaint.id, fd);
      setPdf(null);
      setImages([]);
      setComment('');
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <UploadFileRoundedIcon fontSize="small" sx={{ color: 'primary.main' }} />
        <SectionTitle>{S.complaint.submitReport}</SectionTitle>
      </Stack>

      <Stack spacing={1.5}>
        {err && <Alert severity="error" onClose={() => setErr(null)}>{err}</Alert>}

        {/* PDF */}
        <Box sx={dropSx} onClick={() => pdfRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={onDropPdf}>
          {pdf ? (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <PictureAsPdfRoundedIcon color="error" />
              <Typography sx={{ fontSize: 13.5, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pdf.name}
              </Typography>
              <IconButton
                size="small"
                aria-label={S.complaint.remove}
                onClick={(e) => { e.stopPropagation(); setPdf(null); }}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          ) : (
            <>
              <PictureAsPdfRoundedIcon sx={{ color: 'text.disabled' }} />
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{S.complaint.reportDropPdf}</Typography>
            </>
          )}
        </Box>
        <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />

        {/* Images */}
        <Box sx={dropSx} onClick={() => imgRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={onDropImages}>
          <AddPhotoAlternateOutlinedIcon sx={{ color: 'text.disabled' }} />
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{S.complaint.reportDropImages}</Typography>
        </Box>
        <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={(e) => setImages((cur) => [...cur, ...Array.from(e.target.files ?? [])])} />

        {previews.length > 0 && (
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {previews.map((url, i) => (
              <Box key={url} sx={{ position: 'relative' }}>
                <Box component="img" src={url} alt="" sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                <IconButton
                  size="small"
                  aria-label={S.complaint.remove}
                  onClick={() => setImages((cur) => cur.filter((_, n) => n !== i))}
                  sx={{
                    position: 'absolute', top: -6, right: -6, p: 0.25,
                    bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                    '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' },
                  }}
                >
                  <CloseRoundedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}

        <TextField
          multiline
          minRows={3}
          size="small"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={S.complaint.reportNote}
        />

        <Button variant="contained" disabled={busy} onClick={() => void submit()}>
          {S.complaint.submitReport}
        </Button>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{S.common.maxFile}</Typography>
      </Stack>
    </Paper>
  );
}

// ---- Timeline ----------------------------------------------------------

function ProcessTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) return <Typography sx={{ color: 'text.secondary', mt: 1 }}>—</Typography>;

  return (
    <Box sx={{ mt: 1.5 }}>
      {entries.map((e, i) => (
        <TimelineStep key={e.id} entry={e} last={i === entries.length - 1} />
      ))}
    </Box>
  );
}

/** One step. Holds its own expand state, since a report runs to several paragraphs. */
function TimelineStep({ entry: e, last }: {
  entry: TimelineEntry;
  last: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      {/* rail */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.5 }} />
        {!last && <Box sx={{ flex: 1, width: 2, bgcolor: 'divider', my: 0.5 }} />}
      </Box>
      <Box sx={{ pb: 2.5, flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 700 }}>{e.label}</Typography>
          {/* bnDate, not bn(): the raw ISO read ২০২৬-০৯-০৪ where every other date on the
              page reads ০৪/০৯/২০২৬. */}
          {e.at && <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{bnDate(e.at)}</Typography>}
        </Box>
        {/* A দাখিল step is the only thing an অপেক্ষমাণ complaint's কার্যক্রম has, so it says
            what happened rather than leaving the step bare. The date is already in the header. */}
        {e.type === 'filed' && (
          <Typography sx={{ fontSize: 14, mt: 0.5 }}>{S.complaint.complaintReceived}</Typography>
        )}
        {e.actor_name && (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{e.actor_name}</Typography>
        )}
        {/* Composed from meta rather than read out of a stored comment, so a corrected name
            or designation shows through on entries written before the correction. */}
        {typeof e.meta?.officer_name === 'string' && (
          <>
            <Typography sx={{ fontSize: 14, mt: 0.5 }}>
              {S.complaint.officerAppointed(
                e.meta.officer_name,
                typeof e.meta?.officer_designation === 'string' ? e.meta.officer_designation : null,
              )}
            </Typography>
            {typeof e.meta?.due_date === 'string' && (
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                {S.complaint.reportDue}: {bnDate(e.meta.due_date)}
              </Typography>
            )}
          </>
        )}
        {/* Composed from meta, like the appointment sentence — the seeded prose it replaced
            said the same thing twice, once as a note and once as a bare date. */}
        {typeof e.meta?.hearing_date === 'string' && (
          <Typography sx={{ fontSize: 14, mt: 0.5 }}>
            {S.complaint.hearingSetOn}: {bnDate(e.meta.hearing_date)}
          </Typography>
        )}
        {e.comment && (
          <>
            <Typography
              sx={{
                fontSize: 14,
                mt: 0.5,
                whiteSpace: 'pre-wrap',
                // A report is several paragraphs; clamped it keeps the timeline readable as a
                // timeline. The clamp is CSS, so nothing is cut from the text itself.
                ...(open ? {} : {
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 4,
                  overflow: 'hidden',
                }),
              }}
            >
              {e.comment}
            </Typography>
            {/* Only offered when there is more to see — a two-line note needs no toggle. */}
            {e.comment.length > 200 && (
              <Link
                component="button"
                type="button"
                underline="hover"
                onClick={() => setOpen((v) => !v)}
                sx={{ fontSize: 13.5, fontWeight: 600, mt: 0.25 }}
              >
                {open ? S.complaint.showLess : S.common.details}
              </Link>
            )}
          </>
        )}
        {e.attachments.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <AttachmentGallery attachments={e.attachments} dense />
          </Box>
        )}
      </Box>
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
  const [investigators, setInvestigators] = useState<Option[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOfficer(which === 'reinvestigate' && complaint.investigating_officer_id
      ? String(complaint.investigating_officer_id)
      : '');
    setDate(''); setComment(''); setErr(null);
    if (which === 'accept' || which === 'reinvestigate') {
      listInvestigators()
        // Name alone is not enough to pick the right officer when two share one; the পদবী is
        // what distinguishes them on the list page too.
        .then((r) => setInvestigators(r.investigators.map((i) => ({
          value: String(i.id),
          label: i.designation ? `${i.name} — ${i.designation}` : i.name,
        }))))
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
      } else if (which === 'hearing') {
        await scheduleHearing(id, { hearing_date: date, comment: comment || undefined });
      } else if (which === 'complete') {
        await completeComplaint(id, comment);
      } else if (which === 'reinvestigate') {
        await reinvestigate(id, {
          comment,
          due_date: date || undefined,
          investigating_officer_id: officer ? Number(officer) : undefined,
        });
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
    hearing: S.complaint.scheduleHearing,
    complete: S.complaint.complete,
    reinvestigate: S.complaint.reinvestigate,
  };

  return (
    <AppDialog
      open
      title={titles[which]}
      onClose={onClose}
      onSubmit={run}
      submitting={busy}
      maxWidth="xs"
      {...(which === 'reject'
        ? { cancelLabel: S.complaint.rejectClose, submitLabel: S.complaint.rejectConfirm }
        : {})}
    >
      {err && <Alert severity="error">{err}</Alert>}
      {which === 'accept' && (
        <>
          <SelectField label={S.complaint.chooseOfficer} value={officer} onChange={setOfficer} options={investigators} placeholder="নির্বাচন করুন" />
          <DateField label={S.complaint.dueDateField} value={date} onChange={setDate} />
          <FormField label={S.complaint.comment} value={comment} onChange={setComment} multiline rows={2} />
        </>
      )}
      {which === 'reject' && <FormField label={S.complaint.comment} value={comment} onChange={setComment} multiline rows={3} />}
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
          {/* Defaults to whoever holds the case — re-investigating usually means the same officer
              looks again, but the UNO can hand it to someone else here. */}
          <SelectField
            label={S.complaint.fOfficer}
            value={officer}
            onChange={setOfficer}
            options={investigators}
            placeholder="নির্বাচন করুন"
          />
          <DateField label={S.complaint.dueDateField} value={date} onChange={setDate} />
        </>
      )}
    </AppDialog>
  );
}
