import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';
import DetailRow from '../../components/DetailRow';
import SummaryPanel from '../../components/SummaryPanel';
import AppDialog from '../../components/AppDialog';
import { DateField, RadioGroupField, SelectField, FormField } from '../../components/form/FormFields';
import { getPregnancy, updateDeliveryStatus, type Pregnancy } from '../../api/pregnancy';
import { approvePregnancy } from '../../api/birthReg';
import { useAuth } from '../../auth/AuthContext';

const yn = (v: boolean | null) => (v == null ? '—' : v ? S.pregnancy.yes : S.pregnancy.no);
const dash = (v: string | number | null) => (v == null || v === '' ? '—' : bn(v));

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

  const load = () => {
    if (id) getPregnancy(id).then((r) => setP(r.data)).catch(() => setP(null));
  };
  useEffect(load, [id]);

  if (!p) return null;

  const setNotDelivered = async () => {
    await updateDeliveryStatus(p.id, { delivery_status: 'not_delivered' });
    load();
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 3, alignItems: 'start' }}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/pregnancy')}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Typography sx={{ fontSize: 19, fontWeight: 700 }}>
            {S.pregnancy.listTitle}- {p.mother_name_bn}
          </Typography>
        </Paper>

        {flash && <Alert severity="success" onClose={() => setFlash(null)}>{flash}</Alert>}

        <Paper elevation={0} sx={{ borderRadius: '16px', p: 0 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label={S.pregnancy.stepGeneral} />
            <Tab label={S.pregnancy.stepAddress} />
            <Tab label={S.pregnancy.stepHealth} />
            <Tab label={S.pregnancy.stepDelivery} />
          </Tabs>

          <Box sx={{ p: 2.5 }}>
            {tab === 0 && (
              <>
                <DetailRow label={S.pregnancy.fMotherBn} value={p.mother_name_bn} />
                <DetailRow label={S.pregnancy.fMotherEn} value={p.mother_name_en ?? '—'} />
                <DetailRow label={S.pregnancy.fHusband} value={p.husband_name ?? '—'} />
                <DetailRow label={S.pregnancy.fRegister} value={dash(p.register_no)} />
                <DetailRow label={S.pregnancy.fWhichChild} value={dash(p.which_child)} />
                <DetailRow label={S.pregnancy.fHeight} value={dash(p.height_inch)} />
                <DetailRow label={S.pregnancy.fWeight} value={dash(p.weight_kg)} />
                <DetailRow label={S.pregnancy.fCurrentAge} value={dash(p.current_age)} />
                <DetailRow label={S.pregnancy.fMarriageAge} value={dash(p.marriage_age)} />
                <DetailRow label={S.pregnancy.fBloodGroup} value={p.blood_group ?? '—'} />
                <DetailRow label={S.pregnancy.fChronic} value={p.chronic_diseases.join(', ') || '—'} divider={false} />
              </>
            )}
            {tab === 1 && (
              <>
                <DetailRow label={S.pregnancy.fUnion} value={p.union ?? '—'} />
                <DetailRow label={S.pregnancy.fWard} value={dash(p.ward_no)} />
                <DetailRow label={S.pregnancy.fAddress} value={p.address ?? '—'} />
                <DetailRow label={S.pregnancy.fLocation} value={p.latitude ? `${p.latitude}, ${p.longitude}` : '—'} />
                <DetailRow label={S.pregnancy.fMobile} value={dash(p.mobile)} divider={false} />
              </>
            )}
            {tab === 2 && (
              <>
                <DetailRow label={S.pregnancy.fTtCount} value={dash(p.tt_vaccine_count)} />
                <DetailRow label={S.pregnancy.fLastTt} value={dash(p.last_tt_date)} />
                <DetailRow label={S.pregnancy.fLastMenstruation} value={dash(p.last_menstruation_date)} />
                <DetailRow label={S.pregnancy.fGravida} value={dash(p.gravida_count)} />
                <DetailRow label={S.pregnancy.fMiscarriage} value={dash(p.prior_miscarriages)} />
                <DetailRow label={S.pregnancy.fLastChildAge} value={dash(p.last_child_age)} />
                <DetailRow label={S.pregnancy.fPriorNormal} value={dash(p.prior_normal_deliveries)} />
                <DetailRow label={S.pregnancy.fPriorCesarean} value={dash(p.prior_cesarean_deliveries)} />
                <DetailRow label={S.pregnancy.fPriorPlace} value={p.prior_delivery_place ?? '—'} divider={false} />
              </>
            )}
            {tab === 3 && (
              <>
                <DetailRow label={S.pregnancy.fExpected} value={dash(p.expected_delivery_date)} />
                <DetailRow label={S.pregnancy.fDeliveryPlan} value={p.delivery_place_plan ?? '—'} />
                <DetailRow label={S.pregnancy.fTransport} value={yn(p.emergency_transport)} />
                <DetailRow label={S.pregnancy.fMoney} value={yn(p.enough_money)} />
                <DetailRow label={S.pregnancy.fDonor} value={yn(p.blood_donor_arranged)} />
                {p.delivery_status === 'delivered' && (
                  <>
                    <DetailRow label={S.pregnancy.fActualDate} value={dash(p.actual_delivery_date)} />
                    <DetailRow label={S.pregnancy.fBabySex} value={p.baby_sex === 'female' ? S.pregnancy.girl : p.baby_sex === 'male' ? S.pregnancy.boy : '—'} />
                    <DetailRow label={S.pregnancy.fBirthWeight} value={dash(p.birth_weight_kg)} divider={false} />
                  </>
                )}
              </>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Sticky right panel: subject summary + delivery status control */}
      <Box sx={{ position: 'sticky', top: 16 }}>
        <SummaryPanel
          title={p.mother_name_bn}
          lines={[
            { label: S.pregnancy.fMobile, value: dash(p.mobile) },
            { label: S.pregnancy.fRegister, value: dash(p.register_no) },
            { label: S.pregnancy.fExpected, value: dash(p.expected_delivery_date) },
          ]}
        >
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.75 }}>{S.pregnancy.deliveryStatus}</Typography>
            <TextField
              select
              fullWidth
              size="small"
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
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateDeliveryStatus(id, {
        delivery_status: 'delivered',
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
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog open={open} title={S.pregnancy.confirmDelivery} onClose={onClose} onSubmit={submit} submitLabel={S.common.save} submitting={busy}>
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
  const [child, setChild] = useState('');
  const [father, setFather] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await approvePregnancy(pregnancyId, {
        child_name: child || undefined,
        father_name: father || undefined,
      });
      onDone();
      navigate('/birth');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog open={open} title={S.birthReg.approveTitle} onClose={onClose} onSubmit={submit} submitLabel={S.birthReg.approve} submitColor="error" submitting={busy}>
      <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{S.birthReg.approveHelp}</Typography>
      <FormField label={S.birthReg.childName} value={child} onChange={setChild} />
      <FormField label={S.birthReg.fatherName} value={father} onChange={setFather} />
    </AppDialog>
  );
}
