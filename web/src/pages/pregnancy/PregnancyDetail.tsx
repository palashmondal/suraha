import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn, bnDate } from '../../utils/bnNum';
import DetailRow from '../../components/DetailRow';
import SummaryPanel from '../../components/SummaryPanel';
import AppDialog from '../../components/AppDialog';
import { ApiError } from '../../api/client';
import { DateField, RadioGroupField, SelectField, FormField } from '../../components/form/FormFields';
import { getPregnancy, updateDeliveryStatus, type Pregnancy, type Vulnerability } from '../../api/pregnancy';
import { approvePregnancy, birthRegDraft, type CertificateForm } from '../../api/birthReg';
import LoadingState from '../../components/LoadingState';
import PhoneLink from '../../components/PhoneLink';
import { useAuth } from '../../auth/AuthContext';

const yn = (v: boolean | null) => (v == null ? '—' : v ? S.pregnancy.yes : S.pregnancy.no);
// bnDate leaves anything that is not an ISO date alone, so this stays safe for the plain
// numbers and text it is also used for.
const dash = (v: string | number | null) => (v == null || v === '' ? '—' : bnDate(String(v)));

// The detail tabs hold short values — a name, a number, a blood group. Stacked one per row they
// made a column far taller than the summary panel beside it, so they are laid out two per row
// (one on a phone). A field whose value runs long — an address, a list of conditions — takes the
// full width via `wide`.
/**
 * Counts from 0 to `target` over ~900ms on mount, easing out. Drives both the ring's arc and the
 * number in it from the same value, so they can never disagree mid-animation. Honours
 * prefers-reduced-motion by landing on the value immediately.
 */
function useCountUp(target: number | null, ms = 900): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target == null) {
      setValue(0);
      return;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / ms);
      setValue(target * (1 - (1 - t) ** 3)); // easeOutCubic
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, ms]);

  return value;
}

/**
 * ঝুঁকি মাত্রা as a ring: the score fills a coloured arc, the number sits in the middle, and the
 * reasons are listed underneath so the figure is never a verdict without an explanation. An
 * under-filled record shows the gap instead of a reassuring low number.
 */
function RiskGauge({ v }: { v: Vulnerability }) {
  const tone = v.band === 'high' ? 'error' : v.band === 'moderate' ? 'warning' : 'success';
  const unknown = v.score == null;
  const shown = useCountUp(v.score);

  return (
    <Box sx={{ display: 'grid', justifyItems: 'center', gap: 1.25 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={112}
          thickness={4.5}
          sx={{ color: 'action.hover' }}
        />
        <CircularProgress
          variant="determinate"
          value={unknown ? 0 : shown}
          size={112}
          thickness={4.5}
          color={tone}
          sx={{
            position: 'absolute',
            left: 0,
            // The arc is driven frame by frame; MUI's own easing on top of that would smear it.
            '& circle': { strokeLinecap: 'round', transition: 'none' },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            lineHeight: 1.1,
          }}
        >
          {unknown ? (
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.disabled' }}>—</Typography>
          ) : (
            <Typography sx={{ fontSize: 26, fontWeight: 800, color: `${tone}.main` }}>
              {bn(Math.round(shown))}%
            </Typography>
          )}
        </Box>
      </Box>

      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: unknown ? 'text.secondary' : `${tone}.main` }}>
        {v.label_bn}
      </Typography>
    </Box>
  );
}

/** ঝুঁকি মাত্রা as its own card above the profile: the ring, then the reasons behind it. */
function RiskCard({ v }: { v: Vulnerability }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: (t) => `1px solid ${t.palette.divider}`,
        borderRadius: '16px',
        p: 3,
      }}
    >
      {/* The ring and the reasons for it read together, side by side. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' },
          gap: 2,
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 19, fontWeight: 800, mb: 1.25, textAlign: 'center' }}>
            {S.pregnancy.riskTitle}
          </Typography>
          <RiskGauge v={v} />
        </Box>

        {/* Lifted by the height of that heading, so the reasons sit level with the middle of the
            ring rather than with the middle of the whole column. */}
        <Box sx={{ minWidth: 0, mt: { xs: 0, sm: -3.5 } }}>
          {v.score == null ? (
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{S.pregnancy.riskIncompleteHelp}</Typography>
          ) : v.factors.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{S.pregnancy.riskNone}</Typography>
          ) : (
            <>
              <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 0.75 }}>
                {S.pregnancy.riskFactors}
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.25, display: 'grid', gap: 0.5 }}>
                {v.factors.map((f) => (
                  <Typography key={f.label} component="li" sx={{ fontSize: 12.5, lineHeight: 1.45 }}>
                    {f.label}
                  </Typography>
                ))}
              </Box>
            </>
          )}
        </Box>
      </Box>

      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 1.75, fontStyle: 'italic' }}>
        {S.pregnancy.riskNote}
      </Typography>
    </Box>
  );
}

/** One rounded fact box. Every number in the profile panel is presented as one of these. */
function Tile({
  value,
  label,
  tone,
  span = 1,
}: {
  value: ReactNode;
  label: string;
  tone?: 'primary' | 'error';
  span?: number;
}) {
  return (
    <Box
      sx={{
        gridColumn: `span ${span}`,
        textAlign: 'center',
        py: 1.75,
        px: 1,
        borderRadius: '12px',
        border: (t) => `1px solid ${t.palette.divider}`,
      }}
    >
      <Typography sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35, color: tone ? `${tone}.main` : 'text.primary' }} noWrap>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }} noWrap>
        {label}
      </Typography>
    </Box>
  );
}

function PanelLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.5, fontSize: 14, color: 'text.secondary' }}>
      <Box sx={{ display: 'flex', color: 'text.disabled' }}>{icon}</Box>
      <Box sx={{ minWidth: 0, color: 'text.primary', overflowWrap: 'anywhere' }}>{children}</Box>
    </Box>
  );
}

/**
 * How far off the expected delivery is — the thing an officer opens this record to know. Null once
 * she has delivered, or when no date was ever recorded; days are whole days from today.
 */
function deliveryCountdown(p: Pregnancy): { value: string; label: string; overdue: boolean } | null {
  if (p.delivery_status === 'delivered' || !p.expected_delivery_date) return null;

  const day = 24 * 60 * 60 * 1000;
  const today = new Date();
  const due = new Date(p.expected_delivery_date);
  if (Number.isNaN(due.getTime())) return null;

  const days = Math.round(
    (Date.UTC(due.getFullYear(), due.getMonth(), due.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / day,
  );

  if (days === 0) return { value: S.pregnancy.today, label: S.pregnancy.fExpected, overdue: false };

  return days > 0
    ? { value: S.pregnancy.days(bn(days)), label: S.pregnancy.remaining, overdue: false }
    : { value: S.pregnancy.days(bn(-days)), label: S.pregnancy.overdue, overdue: true };
}

/**
 * The mother's GPS point at union scale, with her address bound to the marker. Rendered only
 * when the FWA actually captured coordinates — a map centred on nothing tells the reader less
 * than no map at all.
 *
 * This is a real Leaflet map rather than OpenStreetMap's keyless embed iframe, because the label
 * has to travel with the marker: an overlay drawn on top of an iframe stays where the box puts it
 * while the map pans away underneath, and the pointer events that would fix that live inside a
 * cross-origin frame the page cannot reach.
 *
 * The marker is a CSS `divIcon`, not Leaflet's default PNG — the default resolves its images
 * relative to the CSS file and comes out broken under a bundler. Tiles are still fetched from
 * openstreetmap.org, so the box is empty with no internet; the coordinates above it still read.
 */
function LocationMap({ lat, lon, lines }: { lat: number; lon: number; lines: [string, string] }) {
  const host = useRef<HTMLDivElement>(null);
  const label = lines.join('\n');

  useEffect(() => {
    if (!host.current) return;

    const map = L.map(host.current, {
      // Wheel-zoom off: the map sits mid-page, and scrolling past it should scroll the page.
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView([lat, lon], 14); // ~union scale: a few km across, so neighbouring villages read

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const pin = `
      <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 39C15 39 28 24.5 28 14.8 28 7.2 22.2 1 15 1S2 7.2 2 14.8C2 24.5 15 39 15 39Z"
              fill="#6750A4" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="15" cy="14.5" r="5" fill="#fff"/>
      </svg>`;

    const marker = L.marker([lat, lon], {
      icon: L.divIcon({
        className: '',
        html: pin,
        iconSize: [30, 40],
        // The tip of the pin is the coordinate, not its middle.
        iconAnchor: [15, 40],
        tooltipAnchor: [0, -34],
      }),
    }).addTo(map);

    // Built as DOM, not an HTML string: these lines are the address a user typed.
    const tooltip = document.createElement('div');
    for (const line of label.split('\n')) {
      const row = document.createElement('div');
      row.textContent = line;
      tooltip.appendChild(row);
    }
    marker.bindTooltip(tooltip, { permanent: true, direction: 'top' }).openTooltip();

    return () => {
      map.remove();
    };
  }, [lat, lon, label]);

  return (
    <Box sx={{ py: 1.5 }}>
      <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 1 }}>{S.pregnancy.mapTitle}</Typography>
      <Box
        ref={host}
        sx={{
          height: 280,
          borderRadius: '16px',
          overflow: 'hidden',
          border: (t) => `1px solid ${t.palette.divider}`,
          '& .leaflet-tooltip': { fontSize: 12.5, lineHeight: 1.45, fontWeight: 500 },
        }}
      />
      <Link
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`}
        target="_blank"
        rel="noreferrer"
        underline="hover"
        sx={{ fontSize: 13, display: 'inline-block', mt: 1 }}
      >
        {S.pregnancy.openInMaps}
      </Link>
    </Box>
  );
}

function Fields({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        columnGap: 3,
        '& > *': { borderBottom: '1px solid', borderColor: 'divider' },
      }}
    >
      {children}
    </Box>
  );
}

function Wide({ children }: { children: ReactNode }) {
  return <Box sx={{ gridColumn: '1 / -1' }}>{children}</Box>;
}

export default function PregnancyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [p, setP] = useState<Pregnancy | null>(null);
  const [tab, setTab] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [approve, setApprove] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Only the Sochib (or SEAL) approves a delivery → triggers BDRIS birth registration (§8.1).
  const canApprove = user?.role === 'up_sochib' || user?.role === 'seal_admin';
  // Delivery status is the FWA's to change (API: role:fwa,seal_admin).
  const canEdit = user?.role === 'fwa' || user?.role === 'seal_admin';

  const load = () => {
    if (id) getPregnancy(id).then((r) => setP(r.data)).catch(() => setP(null));
  };
  useEffect(load, [id]);

  if (!p) return null;

  const countdown = deliveryCountdown(p);

  const setNotDelivered = async () => {
    await updateDeliveryStatus(p.id, { delivery_status: 'not_delivered' });
    load();
  };

  return (
    /* The title bar spans both columns, so the tabs and the profile panel start on the same line
       instead of the panel floating a header's height above the content it summarises. */
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Paper elevation={0} sx={{ borderRadius: '16px', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate('/pregnancy')}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Typography sx={{ fontSize: 19, fontWeight: 700 }}>
          {S.pregnancy.detailTitle} - {p.mother_name_bn}
        </Typography>
        {canEdit && (
          <Button
            sx={{ ml: 'auto' }}
            variant="outlined"
            startIcon={<EditRoundedIcon />}
            onClick={() => navigate(`/pregnancy/${p.id}/edit`)}
          >
            {S.pregnancy.edit}
          </Button>
        )}
      </Paper>

      {flash && <Alert severity="success" onClose={() => setFlash(null)}>{flash}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 400px' }, gap: 3, alignItems: 'start' }}>
        <Paper elevation={0} sx={{ borderRadius: '16px', p: 0 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label={S.pregnancy.stepGeneral} />
            <Tab label={S.pregnancy.stepAddress} />
            <Tab label={S.pregnancy.stepHealth} />
            <Tab label={S.pregnancy.stepDelivery} />
          </Tabs>

          <Box sx={{ p: 2.5 }}>
            {tab === 0 && (
              <Fields>
                <DetailRow label={S.pregnancy.fMotherBn} value={p.mother_name_bn} divider={false} />
                <DetailRow label={S.pregnancy.fMotherEn} value={p.mother_name_en ?? '—'} divider={false} />
                <DetailRow label={S.pregnancy.fHusband} value={p.husband_name ?? '—'} divider={false} />
                <DetailRow label={S.pregnancy.fHusbandEn} value={p.husband_name_en ?? '—'} divider={false} />
                <DetailRow label={S.pregnancy.fMotherNid} value={dash(p.mother_nid)} divider={false} />
                <DetailRow label={S.pregnancy.fMotherBrn} value={dash(p.mother_birth_reg_no)} divider={false} />
                <DetailRow label={S.pregnancy.fFatherNid} value={dash(p.father_nid)} divider={false} />
                <DetailRow label={S.pregnancy.fFatherBrn} value={dash(p.father_birth_reg_no)} divider={false} />
                <DetailRow label={S.pregnancy.fRegister} value={dash(p.register_no)} divider={false} />
                <DetailRow label={S.pregnancy.fWhichChild} value={dash(p.which_child)} divider={false} />
                <DetailRow label={S.pregnancy.fHeight} value={dash(p.height_inch)} divider={false} />
                <DetailRow label={S.pregnancy.fWeight} value={dash(p.weight_kg)} divider={false} />
                <DetailRow label={S.pregnancy.fCurrentAge} value={dash(p.current_age)} divider={false} />
                <DetailRow label={S.pregnancy.fMarriageAge} value={dash(p.marriage_age)} divider={false} />
                <DetailRow label={S.pregnancy.fBloodGroup} value={p.blood_group ?? '—'} divider={false} />
                <Wide><DetailRow label={S.pregnancy.fChronic} value={p.chronic_diseases.join(', ') || '—'} divider={false} /></Wide>
              </Fields>
            )}
            {tab === 1 && (
              <Fields>
                <DetailRow label={S.pregnancy.fUnion} value={p.union ?? '—'} divider={false} />
                <DetailRow label={S.pregnancy.fWard} value={dash(p.ward_no)} divider={false} />
                <Wide><DetailRow label={S.pregnancy.fAddress} value={p.address ?? '—'} divider={false} /></Wide>
                <DetailRow label={S.pregnancy.fLocation} value={p.latitude ? `${p.latitude}, ${p.longitude}` : '—'} divider={false} />
                <DetailRow label={S.pregnancy.fMobile} value={dash(p.mobile)} divider={false} />
                {p.latitude != null && p.longitude != null && (
                  <Wide>
                    <LocationMap
                      lat={Number(p.latitude)}
                      lon={Number(p.longitude)}
                      lines={[
                        p.address || p.mother_name_bn,
                        [
                          p.union,
                          p.ward_no ? `${S.pregnancy.fWard} ${bn(p.ward_no)}` : null,
                          p.upazila,
                        ].filter(Boolean).join(', ') || '—',
                      ]}
                    />
                  </Wide>
                )}
              </Fields>
            )}
            {tab === 2 && (
              <Fields>
                <DetailRow label={S.pregnancy.fTtCount} value={dash(p.tt_vaccine_count)} divider={false} />
                <DetailRow label={S.pregnancy.fLastTt} value={dash(p.last_tt_date)} divider={false} />
                <DetailRow label={S.pregnancy.fLastMenstruation} value={dash(p.last_menstruation_date)} divider={false} />
                <DetailRow label={S.pregnancy.fGravida} value={dash(p.gravida_count)} divider={false} />
                <DetailRow label={S.pregnancy.fMiscarriage} value={dash(p.prior_miscarriages)} divider={false} />
                <DetailRow label={S.pregnancy.fLastChildAge} value={dash(p.last_child_age)} divider={false} />
                <DetailRow label={S.pregnancy.fPriorNormal} value={dash(p.prior_normal_deliveries)} divider={false} />
                <DetailRow label={S.pregnancy.fPriorCesarean} value={dash(p.prior_cesarean_deliveries)} divider={false} />
                <Wide><DetailRow label={S.pregnancy.fPriorPlace} value={p.prior_delivery_place ?? '—'} divider={false} /></Wide>
              </Fields>
            )}
            {tab === 3 && (
              <Fields>
                <DetailRow label={S.pregnancy.fExpected} value={dash(p.expected_delivery_date)} divider={false} />
                <Wide><DetailRow label={S.pregnancy.fDeliveryPlan} value={p.delivery_place_plan ?? '—'} divider={false} /></Wide>
                <DetailRow label={S.pregnancy.fTransport} value={yn(p.emergency_transport)} divider={false} />
                <DetailRow label={S.pregnancy.fMoney} value={yn(p.enough_money)} divider={false} />
                <DetailRow label={S.pregnancy.fDonor} value={yn(p.blood_donor_arranged)} divider={false} />
                {p.delivery_status === 'delivered' && (
                  <>
                    <DetailRow label={S.pregnancy.fActualDate} value={dash(p.actual_delivery_date)} divider={false} />
                    <DetailRow label={S.pregnancy.fBabySex} value={p.baby_sex === 'female' ? S.pregnancy.girl : p.baby_sex === 'male' ? S.pregnancy.boy : '—'} divider={false} />
                    <DetailRow label={S.pregnancy.fBirthWeight} value={dash(p.birth_weight_kg)} divider={false} />
                  </>
                )}
              </Fields>
            )}
          </Box>
        </Paper>

        {/* Right column: the profile, sticky so it stays in view as the left column scrolls and
            stays put when the tabs change. Dropped by the height of the tab strip (48px) so it
            lines up with the fields under the tabs rather than with the tabs themselves. */}
        <Box sx={{ position: 'sticky', top: 16, mt: { xs: 0, md: 6 }, display: 'grid', gap: 2 }}>
          <RiskCard v={p.vulnerability} />

          <SummaryPanel
            title={
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, pb: 0.5 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 52, height: 52, fontSize: 22, fontWeight: 700 }}>
                    {p.mother_name_bn.trim().charAt(0)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 19, fontWeight: 700, lineHeight: 1.35 }} noWrap>
                      {p.mother_name_bn}
                    </Typography>
                    {p.husband_name && (
                      <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mt: 0.25 }} noWrap>
                        {S.pregnancy.husbandShort}: {p.husband_name}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* The date the record turns on, then the vitals — all one family of tiles. */}
                <Box sx={{ mt: 2.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
                  <Tile
                    value={dash(p.delivery_status === 'delivered' ? p.actual_delivery_date : p.expected_delivery_date)}
                    label={p.delivery_status === 'delivered' ? S.pregnancy.deliveredOn : S.pregnancy.fExpected}
                    span={countdown ? 1 : 2}
                  />
                  {countdown && <Tile value={countdown.value} label={countdown.label} tone={countdown.overdue ? 'error' : 'primary'} />}
                </Box>

                {/* Vitals worth knowing before reading anything else. */}
                <Box sx={{ mt: 1.25, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25 }}>
                  <Tile value={p.current_age != null ? bn(p.current_age) : '—'} label={S.pregnancy.fCurrentAge} />
                  <Tile value={p.blood_group ?? '—'} label={S.pregnancy.fBloodGroup} />
                  <Tile value={p.which_child != null ? bn(p.which_child) : '—'} label={S.pregnancy.fWhichChild} />
                </Box>

                <Box sx={{ mt: 2.5, display: 'grid', gap: 0.5 }}>
                  <PanelLine icon={<PhoneRoundedIcon fontSize="small" />}>
                    {p.mobile ? (
                      <PhoneLink phone={p.mobile} />
                    ) : (
                      S.pregnancy.noContact
                    )}
                  </PanelLine>
                  <PanelLine icon={<PlaceRoundedIcon fontSize="small" />}>
                    {[p.union, p.ward_no ? `${S.pregnancy.fWard} ${bn(p.ward_no)}` : null, p.upazila, p.district]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </PanelLine>
                  <PanelLine icon={<BadgeRoundedIcon fontSize="small" />}>
                    {S.pregnancy.fRegister}: {dash(p.register_no)}
                  </PanelLine>
                  {p.birth_registration_no && (
                    <PanelLine icon={<DescriptionRoundedIcon fontSize="small" />}>
                      {S.pregnancy.fBirthRegNo}: {bn(p.birth_registration_no)}
                    </PanelLine>
                  )}
                </Box>
              </>
            }
          >
            {/* The actions stay at the bottom of the panel, under a rule that separates them from
                the profile above. */}
            <Box sx={{ pt: 2, borderTop: (t) => `1px solid ${t.palette.divider}` }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.75 }}>{S.pregnancy.deliveryStatus}</Typography>
              <TextField
                select
                fullWidth
                size="small"
                disabled={!canEdit}
                value={p.delivery_status}
                onChange={(e) => {
                  if (e.target.value === 'delivered') setConfirm(true);
                  else setNotDelivered();
                }}
              >
                <MenuItem value="not_delivered">{S.pregnancy.tabNotDelivered}</MenuItem>
                <MenuItem value="delivered">{S.pregnancy.tabDelivered}</MenuItem>
              </TextField>
            </Box>

            {p.delivery_status === 'delivered' && canApprove && (
              <Button variant="contained" color="error" fullWidth onClick={() => setApprove(true)}>
                {S.pregnancy.createBirthReg}
              </Button>
            )}
          </SummaryPanel>
        </Box>
      </Box>

      <ApproveDialog
        open={approve}
        pregnancyId={p.id}
        onClose={() => setApprove(false)}
        onDone={() => {
          setApprove(false);
          setFlash(S.birthReg.approved);
        }}
      />

      <ConfirmDeliveryDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onDone={() => {
          setConfirm(false);
          setFlash(S.pregnancy.saved);
          load();
        }}
        id={p.id}
      />
    </Box>
  );
}

function ConfirmDeliveryDialog({
  open,
  onClose,
  onDone,
  id,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  id: number;
}) {
  const [f, setF] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await updateDeliveryStatus(id, {
        delivery_status: 'delivered',
        child_name: f.child_name?.trim() || undefined,
        actual_delivery_date: f.actual_delivery_date || undefined,
        delivery_type: f.delivery_type || undefined,
        baby_sex: f.baby_sex || undefined,
        birth_weight_kg: f.birth_weight_kg ? Number(f.birth_weight_kg) : undefined,
        birth_time: f.birth_time || undefined,
        mother_alive: true,
        newborn_alive: true,
        newborn_count: 1,
      });
      onDone();
    } catch (e) {
      // A rejected submission used to reject into nothing: the dialog stayed open, unchanged and
      // unexplained, which reads as a button that does not work.
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog open={open} title={S.pregnancy.confirmDelivery} onClose={onClose} onSubmit={submit} submitLabel={S.common.save} submitting={busy}>
      {err && <Alert severity="error">{err}</Alert>}
      {/* First field, and optional: a name is often not chosen on the day, but when it is, the
          সচিব's জন্ম নিবন্ধন form opens with it already filled. */}
      <FormField
        label={S.pregnancy.fChildName}
        value={f.child_name ?? ''}
        onChange={set('child_name')}
        placeholder={S.pregnancy.childNamePlaceholder}
      />
      <DateField label={S.pregnancy.fActualDate} value={f.actual_delivery_date ?? ''} onChange={set('actual_delivery_date')} />
      <SelectField
        label={S.pregnancy.fDeliveryType}
        value={f.delivery_type ?? ''}
        onChange={set('delivery_type')}
        options={[{ value: 'normal', label: S.pregnancy.normal }, { value: 'cesarean', label: S.pregnancy.cesarean }]}
        placeholder="নির্বাচন করুন"
      />
      <RadioGroupField
        label={S.pregnancy.fBabySex}
        value={f.baby_sex ?? ''}
        onChange={set('baby_sex')}
        options={[{ value: 'male', label: S.pregnancy.boy }, { value: 'female', label: S.pregnancy.girl }]}
      />
      <FormField label={S.pregnancy.fBirthWeight} value={f.birth_weight_kg ?? ''} onChange={set('birth_weight_kg')} type="number" />
      <FormField label={S.pregnancy.fBirthTime} value={f.birth_time ?? ''} onChange={set('birth_time')} type="time" />
    </AppDialog>
  );
}

/**
 * The জন্ম নিবন্ধন সনদ itself, as a form: every field the certificate prints, prefilled from the
 * mother's record and blank where she never gave one, all of it editable by the সচিব before it
 * goes to BDRIS. Reopening an already-filed pregnancy shows the number rather than a second form —
 * approval is idempotent server-side, and offering the form again would imply otherwise.
 */
function ApproveDialog({
  open,
  pregnancyId,
  onClose,
  onDone,
}: {
  open: boolean;
  pregnancyId: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const navigate = useNavigate();
  const [f, setF] = useState<Partial<CertificateForm>>({});
  const [filedNo, setFiledNo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setLoading(true);
    birthRegDraft(pregnancyId)
      .then((r) => {
        setF(r.data);
        setFiledNo(r.already_registered ? (r.data.registration_no ?? '—') : null);
      })
      .catch(() => setErr(S.birthReg.draftError))
      .finally(() => setLoading(false));
  }, [open, pregnancyId]);

  const set = (k: keyof CertificateForm) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const val = (k: keyof CertificateForm) => (f[k] ?? '') as string;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await approvePregnancy(pregnancyId, f);
      onDone();
      navigate('/birth');
    } catch (e) {
      // A rejected submission used to reject into nothing: the dialog stayed open, unchanged and
      // unexplained, which reads as a button that does not work.
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const section = (title: string) => (
    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mt: 1 }}>{title}</Typography>
  );
  const pair = (children: React.ReactNode) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>{children}</Box>
  );

  return (
    <AppDialog
      open={open}
      title={S.birthReg.approveTitle}
      onClose={onClose}
      onSubmit={filedNo || loading ? undefined : submit}
      submitLabel={S.birthReg.submitToBdris}
      submitColor="error"
      submitting={busy}
      maxWidth="md"
    >
      {err && <Alert severity="error">{err}</Alert>}
      {loading && <LoadingState />}

      {!loading && filedNo && (
        <Alert severity="info">{S.birthReg.alreadyRegistered} {filedNo}</Alert>
      )}

      {!loading && !filedNo && (
        <>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{S.birthReg.approveHelp}</Typography>

          {section(S.birthReg.secChild)}
          {pair(
            <>
              <FormField label={S.birthReg.childName} value={val('child_name')} onChange={set('child_name')} />
              <FormField label={S.birthReg.childNameEn} value={val('child_name_en')} onChange={set('child_name_en')} placeholder="Name in English" />
              <DateField label={S.birthReg.dob} value={val('date_of_birth')} onChange={set('date_of_birth')} />
              <SelectField
                label={S.birthReg.sex}
                value={val('sex')}
                onChange={set('sex')}
                options={[{ value: 'male', label: S.birthReg.boy }, { value: 'female', label: S.birthReg.girl }]}
                placeholder="নির্বাচন করুন"
              />
            </>,
          )}

          {section(S.birthReg.secMother)}
          {pair(
            <>
              <FormField label={S.birthReg.motherName} value={val('mother_name')} onChange={set('mother_name')} />
              <FormField label={S.birthReg.motherNameEn} value={val('mother_name_en')} onChange={set('mother_name_en')} />
              <FormField label={S.birthReg.nid} value={val('mother_nid')} onChange={set('mother_nid')} placeholder="১০ / ১৩ / ১৭ সংখ্যা" />
              <FormField label={S.birthReg.brn} value={val('mother_birth_reg_no')} onChange={set('mother_birth_reg_no')} placeholder="১৭ সংখ্যা" />
              <FormField label={S.birthReg.nationality} value={val('mother_nationality')} onChange={set('mother_nationality')} />
            </>,
          )}

          {section(S.birthReg.secFather)}
          {pair(
            <>
              <FormField label={S.birthReg.fatherName} value={val('father_name')} onChange={set('father_name')} />
              <FormField label={S.birthReg.fatherNameEn} value={val('father_name_en')} onChange={set('father_name_en')} />
              <FormField label={S.birthReg.nid} value={val('father_nid')} onChange={set('father_nid')} placeholder="১০ / ১৩ / ১৭ সংখ্যা" />
              <FormField label={S.birthReg.brn} value={val('father_birth_reg_no')} onChange={set('father_birth_reg_no')} placeholder="১৭ সংখ্যা" />
              <FormField label={S.birthReg.nationality} value={val('father_nationality')} onChange={set('father_nationality')} />
            </>,
          )}

          {section(S.birthReg.secPlace)}
          {pair(
            <>
              <FormField label={S.birthReg.placeOfBirth} value={val('place_of_birth')} onChange={set('place_of_birth')} />
              <FormField label={S.birthReg.ward} value={val('ward_no')} onChange={set('ward_no')} type="number" />
            </>,
          )}
          <FormField label={S.birthReg.permanentAddress} value={val('permanent_address')} onChange={set('permanent_address')} multiline rows={2} />
        </>
      )}
    </AppDialog>
  );
}
