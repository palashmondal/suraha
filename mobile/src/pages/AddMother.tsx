import { useEffect, useState } from 'react';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem,
  IonLabel, IonList, IonNote, IonPage, IonProgressBar, IonSelect, IonSelectOption, IonText,
  IonTitle, IonToolbar, useIonRouter, useIonToast,
} from '@ionic/react';
import { locateOutline, checkmarkCircle } from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';
import { useParams } from 'react-router-dom';
import { getMother, saveMother } from '../lib/mothers';
import { syncNow } from '../lib/sync';
import { isOnline } from '../lib/net';
import { BLOOD_GROUPS, DELIVERY_PLANS, type MotherFields } from '../data/mother';
import { S } from '../i18n';

const STEPS = [S.add.step1, S.add.step2, S.add.step3];

export default function AddMother() {
  const router = useIonRouter();
  const { id } = useParams<{ id?: string }>();
  const editing = id && id !== 'new' ? id : undefined;
  const [present] = useIonToast();

  const [step, setStep] = useState(0);
  const [f, setF] = useState<Partial<MotherFields>>({ mother_name_bn: '' });
  const [gpsBusy, setGpsBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState(false);

  useEffect(() => {
    if (!editing) return;
    getMother(editing)
      .then((m) => {
        if (m) setF(m);
        else present({ message: S.detail.notFound, duration: 2500, color: 'danger' });
      })
      .catch(() => present({ message: S.detail.notFound, duration: 2500, color: 'danger' }));
  }, [editing, present]);

  const set = <K extends keyof MotherFields>(k: K, v: MotherFields[K]) => setF((s) => ({ ...s, [k]: v }));
  const num = (v: string) => (v === '' ? null : Number(v));

  const captureGps = async () => {
    setGpsBusy(true);
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      set('latitude', pos.coords.latitude);
      set('longitude', pos.coords.longitude);
    } catch {
      present({ message: S.add.gpsError, duration: 2000, color: 'danger' });
    } finally {
      setGpsBusy(false);
    }
  };

  const save = async () => {
    if (!f.mother_name_bn?.trim()) {
      setNameError(true);
      setStep(0);
      return;
    }
    setBusy(true);
    try {
      await saveMother(f as MotherFields, editing);
      if (await isOnline()) syncNow();
      present({ message: S.sync.savedOffline, duration: 2000, color: 'success' });
      router.push('/mothers', 'back');
    } finally {
      setBusy(false);
    }
  };

  const last = step === STEPS.length - 1;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start"><IonBackButton defaultHref="/mothers" /></IonButtons>
          <IonTitle>{editing ? S.add.editTitle : S.add.title}</IonTitle>
        </IonToolbar>
        <IonToolbar color="primary">
          <IonText className="ion-padding-start" style={{ fontSize: 14 }}>
            ধাপ {step + 1}/{STEPS.length} — {STEPS[step]}
          </IonText>
          <IonProgressBar value={(step + 1) / STEPS.length} />
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {step === 0 && (
          <IonList inset>
            <IonItem>
              <IonInput label={S.add.motherNameBn + ' *'} labelPlacement="stacked"
                value={f.mother_name_bn ?? ''} onIonInput={(e) => { set('mother_name_bn', e.detail.value ?? ''); setNameError(false); }} />
            </IonItem>
            {nameError && <IonNote color="danger" className="ion-padding-start">{S.add.requiredName}</IonNote>}
            <IonItem>
              <IonInput label={S.add.motherNameEn} labelPlacement="stacked" value={f.mother_name_en ?? ''} onIonInput={(e) => set('mother_name_en', e.detail.value)} />
            </IonItem>
            <IonItem>
              <IonInput label={S.add.husband} labelPlacement="stacked" value={f.husband_name ?? ''} onIonInput={(e) => set('husband_name', e.detail.value)} />
            </IonItem>
            <IonItem>
              <IonInput label={S.add.husbandEn} labelPlacement="stacked" value={f.husband_name_en ?? ''} onIonInput={(e) => set('husband_name_en', e.detail.value)} />
            </IonItem>
            <IonItem>
              <IonInput type="tel" inputmode="numeric" label={S.add.motherNid} labelPlacement="stacked"
                placeholder={S.add.nidHint} value={f.mother_nid ?? ''} onIonInput={(e) => set('mother_nid', e.detail.value)} />
            </IonItem>
            <IonItem>
              <IonInput type="tel" inputmode="numeric" label={S.add.motherBrn} labelPlacement="stacked"
                placeholder={S.add.brnHint} value={f.mother_birth_reg_no ?? ''} onIonInput={(e) => set('mother_birth_reg_no', e.detail.value)} />
            </IonItem>
            <IonItem>
              <IonInput type="tel" inputmode="numeric" label={S.add.fatherNid} labelPlacement="stacked"
                placeholder={S.add.nidHint} value={f.father_nid ?? ''} onIonInput={(e) => set('father_nid', e.detail.value)} />
            </IonItem>
            <IonItem>
              <IonInput type="tel" inputmode="numeric" label={S.add.fatherBrn} labelPlacement="stacked"
                placeholder={S.add.brnHint} value={f.father_birth_reg_no ?? ''} onIonInput={(e) => set('father_birth_reg_no', e.detail.value)} />
            </IonItem>
            <IonItem lines="none">
              <IonNote>{S.add.identityHelp}</IonNote>
            </IonItem>
            <IonItem>
              <IonInput label={S.add.registerNo} labelPlacement="stacked" value={f.register_no ?? ''} onIonInput={(e) => set('register_no', e.detail.value)} />
            </IonItem>
            <IonItem>
              <IonInput type="number" label={S.add.whichChild} labelPlacement="stacked" value={f.which_child ?? ''} onIonInput={(e) => set('which_child', num(e.detail.value ?? ''))} />
            </IonItem>
            <IonItem>
              <IonInput type="number" label={S.add.currentAge} labelPlacement="stacked" value={f.current_age ?? ''} onIonInput={(e) => set('current_age', num(e.detail.value ?? ''))} />
            </IonItem>
            <IonItem>
              <IonSelect label={S.add.bloodGroup} labelPlacement="stacked" value={f.blood_group ?? undefined} onIonChange={(e) => set('blood_group', e.detail.value)}>
                {BLOOD_GROUPS.map((b) => <IonSelectOption key={b} value={b}>{b}</IonSelectOption>)}
              </IonSelect>
            </IonItem>
          </IonList>
        )}

        {step === 1 && (
          <IonList inset>
            <IonItem>
              <IonInput type="number" label={S.add.ward} labelPlacement="stacked" value={f.ward_no ?? ''} onIonInput={(e) => set('ward_no', num(e.detail.value ?? ''))} />
            </IonItem>
            <IonItem>
              <IonInput label={S.add.address} labelPlacement="stacked" value={f.address ?? ''} onIonInput={(e) => set('address', e.detail.value)} />
            </IonItem>
            <IonItem>
              <IonInput type="tel" inputmode="tel" label={S.add.mobile} labelPlacement="stacked" placeholder="01XXXXXXXXX" value={f.mobile ?? ''} onIonInput={(e) => set('mobile', e.detail.value)} />
            </IonItem>
            <IonItem lines="none">
              <IonLabel>
                <p>{S.add.gps}</p>
                {f.latitude != null && f.longitude != null && (
                  <IonNote color="success">
                    <IonIcon icon={checkmarkCircle} /> {S.add.gpsCaptured}: {f.latitude.toFixed(5)}, {f.longitude.toFixed(5)}
                  </IonNote>
                )}
              </IonLabel>
              <IonButton slot="end" fill="outline" onClick={captureGps} disabled={gpsBusy}>
                <IonIcon slot="start" icon={locateOutline} />
                {S.add.captureGps}
              </IonButton>
            </IonItem>
          </IonList>
        )}

        {step === 2 && (
          <IonList inset>
            <IonItem>
              <IonInput type="number" label={S.add.ttCount} labelPlacement="stacked" value={f.tt_vaccine_count ?? ''} onIonInput={(e) => set('tt_vaccine_count', num(e.detail.value ?? ''))} />
            </IonItem>
            <IonItem>
              <IonInput type="date" label={S.add.lmp} labelPlacement="stacked" value={f.last_menstruation_date ?? ''} onIonInput={(e) => set('last_menstruation_date', e.detail.value)} />
            </IonItem>
            <IonItem>
              <IonInput type="number" label={S.add.gravida} labelPlacement="stacked" value={f.gravida_count ?? ''} onIonInput={(e) => set('gravida_count', num(e.detail.value ?? ''))} />
            </IonItem>
            <IonItem>
              <IonInput type="number" label={S.add.miscarriages} labelPlacement="stacked" value={f.prior_miscarriages ?? ''} onIonInput={(e) => set('prior_miscarriages', num(e.detail.value ?? ''))} />
            </IonItem>
            <IonItem>
              <IonInput type="date" label={S.add.expectedDate} labelPlacement="stacked" value={f.expected_delivery_date ?? ''} onIonInput={(e) => set('expected_delivery_date', e.detail.value)} />
            </IonItem>
            <IonItem>
              <IonSelect label={S.add.deliveryPlan} labelPlacement="stacked" value={f.delivery_plan ?? undefined} onIonChange={(e) => set('delivery_plan', e.detail.value)}>
                {DELIVERY_PLANS.map((p) => <IonSelectOption key={p} value={p}>{p}</IonSelectOption>)}
              </IonSelect>
            </IonItem>
          </IonList>
        )}
      </IonContent>

      <IonToolbar>
        <IonButtons slot="start">
          {step > 0 && <IonButton onClick={() => setStep(step - 1)}>{S.common.back}</IonButton>}
        </IonButtons>
        <IonButtons slot="end">
          {!last && <IonButton fill="solid" color="primary" onClick={() => setStep(step + 1)}>{S.common.next}</IonButton>}
          {last && <IonButton fill="solid" color="primary" disabled={busy} onClick={save}>{S.common.save}</IonButton>}
        </IonButtons>
      </IonToolbar>
    </IonPage>
  );
}
