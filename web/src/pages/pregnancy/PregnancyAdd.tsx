import { useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import VerticalStepper from '../../components/VerticalStepper';
import FieldCard from '../../components/form/FieldCard';
import { FormField, SelectField, DateField, RadioGroupField, type Option } from '../../components/form/FormFields';
import { useUnionOptions } from '../../tenant/useUnionOptions';
import { ApiError } from '../../api/client';
import { useSync } from '../../offline/SyncProvider';

type Form = Record<string, string>;

const BLOOD: Option[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((v) => ({ value: v, label: v }));
const YES_NO: Option[] = [
  { value: '1', label: S.pregnancy.yes },
  { value: '0', label: S.pregnancy.no },
];

const STEPS = [
  { key: 'general', label: S.pregnancy.stepGeneral },
  { key: 'address', label: S.pregnancy.stepAddress },
  { key: 'health', label: S.pregnancy.stepHealth },
  { key: 'delivery', label: S.pregnancy.stepDelivery },
];

const NUMS = ['which_child', 'height_inch', 'weight_kg', 'current_age', 'marriage_age', 'ward_no', 'union_id', 'tt_vaccine_count', 'gravida_count', 'prior_miscarriages', 'last_child_age', 'prior_normal_deliveries', 'prior_cesarean_deliveries', 'latitude', 'longitude'];
const BOOLS = ['emergency_transport', 'enough_money', 'blood_donor_arranged'];

export default function PregnancyAdd() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({});
  const unions = useUnionOptions();
  const { submit: submitOrQueue } = useSync();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const track = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setForm((f) => ({ ...f, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) }));
    });
  };

  const toPayload = (): Record<string, unknown> => {
    const p: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v === '' || v == null) continue;
      if (NUMS.includes(k)) p[k] = Number(v);
      else if (BOOLS.includes(k)) p[k] = v === '1';
      else if (k === 'chronic_diseases') p[k] = v.split(',').map((s) => s.trim()).filter(Boolean);
      else p[k] = v;
    }
    return p;
  };

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      // FWA field capture is offline-tolerant (SURAHA_BUILD_PROMPT §1.1(2), §8.1): submit-or-queue
      // stores the mother's record in the IndexedDB outbox when there is no connectivity and
      // background-syncs it on reconnect. The offline/pending banner in the app shell shows status.
      const payload = toPayload();
      const res = await submitOrQueue({
        kind: 'pregnancy.create',
        endpoint: '/pregnancies',
        method: 'POST',
        label: (payload.mother_name_bn as string) ?? undefined,
        payload,
      });
      navigate('/pregnancy', res.queued ? { state: { queued: true } } : undefined);
    } catch (e) {
      if (e instanceof ApiError) setErr(Object.values(e.errors ?? {})[0]?.[0] ?? e.message);
      else setErr(S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const isLast = step === STEPS.length - 1;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 300px' }, gap: 3, alignItems: 'start' }}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Paper elevation={0} sx={{ borderRadius: '16px', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/pregnancy')}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Typography sx={{ fontSize: 19, fontWeight: 700 }}>{S.pregnancy.addTitle}</Typography>
        </Paper>

        {err && <Alert severity="error">{err}</Alert>}

        {step === 0 && (
          <>
            <FormField label={S.pregnancy.fMotherBn} value={form.mother_name_bn ?? ''} onChange={set('mother_name_bn')} placeholder="নাম লিখুন" />
            <FormField label={S.pregnancy.fMotherEn} value={form.mother_name_en ?? ''} onChange={set('mother_name_en')} placeholder="Mother's name" />
            <FormField label={S.pregnancy.fHusband} value={form.husband_name ?? ''} onChange={set('husband_name')} />
            <FormField label={S.pregnancy.fRegister} value={form.register_no ?? ''} onChange={set('register_no')} />
            <FormField label={S.pregnancy.fWhichChild} value={form.which_child ?? ''} onChange={set('which_child')} type="number" />
            <FormField label={S.pregnancy.fHeight} value={form.height_inch ?? ''} onChange={set('height_inch')} type="number" />
            <FormField label={S.pregnancy.fWeight} value={form.weight_kg ?? ''} onChange={set('weight_kg')} type="number" />
            <FormField label={S.pregnancy.fCurrentAge} value={form.current_age ?? ''} onChange={set('current_age')} type="number" />
            <FormField label={S.pregnancy.fMarriageAge} value={form.marriage_age ?? ''} onChange={set('marriage_age')} type="number" />
            <SelectField label={S.pregnancy.fBloodGroup} value={form.blood_group ?? ''} onChange={set('blood_group')} options={BLOOD} placeholder="নির্বাচন করুন" />
            <FormField label={S.pregnancy.fChronic} value={form.chronic_diseases ?? ''} onChange={set('chronic_diseases')} placeholder="ডায়াবেটিস, উচ্চ রক্তচাপ" />
          </>
        )}

        {step === 1 && (
          <>
            <SelectField label={S.pregnancy.fUnion} value={form.union_id ?? ''} onChange={set('union_id')} options={unions} placeholder="নির্বাচন করুন" />
            <FormField label={S.pregnancy.fWard} value={form.ward_no ?? ''} onChange={set('ward_no')} type="number" />
            <FormField label={S.pregnancy.fAddress} value={form.address ?? ''} onChange={set('address')} />
            <FieldCard
              label={S.pregnancy.fLocation}
              action={
                <Button size="small" startIcon={<MyLocationRoundedIcon />} onClick={track}>
                  {S.pregnancy.track}
                </Button>
              }
            >
              <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                {form.latitude ? `${form.latitude}, ${form.longitude}` : '—'}
              </Typography>
            </FieldCard>
            <FormField label={S.pregnancy.fMobile} value={form.mobile ?? ''} onChange={set('mobile')} placeholder="01XXXXXXXXX" />
          </>
        )}

        {step === 2 && (
          <>
            <FormField label={S.pregnancy.fTtCount} value={form.tt_vaccine_count ?? ''} onChange={set('tt_vaccine_count')} type="number" />
            <DateField label={S.pregnancy.fLastTt} value={form.last_tt_date ?? ''} onChange={set('last_tt_date')} />
            <DateField label={S.pregnancy.fLastMenstruation} value={form.last_menstruation_date ?? ''} onChange={set('last_menstruation_date')} />
            <FormField label={S.pregnancy.fGravida} value={form.gravida_count ?? ''} onChange={set('gravida_count')} type="number" />
            <FormField label={S.pregnancy.fMiscarriage} value={form.prior_miscarriages ?? ''} onChange={set('prior_miscarriages')} type="number" />
            <FormField label={S.pregnancy.fLastChildAge} value={form.last_child_age ?? ''} onChange={set('last_child_age')} type="number" />
            <FormField label={S.pregnancy.fPriorNormal} value={form.prior_normal_deliveries ?? ''} onChange={set('prior_normal_deliveries')} type="number" />
            <FormField label={S.pregnancy.fPriorCesarean} value={form.prior_cesarean_deliveries ?? ''} onChange={set('prior_cesarean_deliveries')} type="number" />
            <FormField label={S.pregnancy.fPriorPlace} value={form.prior_delivery_place ?? ''} onChange={set('prior_delivery_place')} />
          </>
        )}

        {step === 3 && (
          <>
            <DateField label={S.pregnancy.fExpected} value={form.expected_delivery_date ?? ''} onChange={set('expected_delivery_date')} />
            <FormField label={S.pregnancy.fDeliveryPlan} value={form.delivery_place_plan ?? ''} onChange={set('delivery_place_plan')} />
            <RadioGroupField label={S.pregnancy.fTransport} value={form.emergency_transport ?? ''} onChange={set('emergency_transport')} options={YES_NO} />
            <RadioGroupField label={S.pregnancy.fMoney} value={form.enough_money ?? ''} onChange={set('enough_money')} options={YES_NO} />
            <RadioGroupField label={S.pregnancy.fDonor} value={form.blood_donor_arranged ?? ''} onChange={set('blood_donor_arranged')} options={YES_NO} />
          </>
        )}

        <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
          {step > 0 && (
            <Button variant="outlined" onClick={() => setStep((s) => s - 1)} disabled={busy}>
              {S.common.prev}
            </Button>
          )}
          {isLast ? (
            <Button variant="contained" onClick={submit} disabled={busy}>
              {S.common.save}
            </Button>
          ) : (
            <Button variant="contained" onClick={() => setStep((s) => s + 1)}>
              {S.common.next}
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ position: 'sticky', top: 16 }}>
        <VerticalStepper steps={STEPS} activeIndex={step} />
      </Box>
    </Box>
  );
}
