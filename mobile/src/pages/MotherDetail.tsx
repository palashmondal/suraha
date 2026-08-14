import { useEffect, useState } from 'react';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel,
  IonList, IonListHeader, IonNote, IonPage, IonTitle, IonToolbar, useIonRouter, IonAlert,
} from '@ionic/react';
import { createOutline, checkmarkDoneOutline, cloudUploadOutline, warningOutline, cloudDoneOutline } from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import { getMother, markDelivery } from '../lib/mothers';
import { syncNow } from '../lib/sync';
import { isOnline } from '../lib/net';
import type { MotherRecord } from '../data/mother';
import { S } from '../i18n';

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <IonItem>
      <IonLabel>
        <p>{label}</p>
        <h3 style={{ fontWeight: 600 }}>{value}</h3>
      </IonLabel>
    </IonItem>
  );
}

export default function MotherDetail() {
  const router = useIonRouter();
  const { id } = useParams<{ id: string }>();
  const [m, setM] = useState<MotherRecord | null>(null);
  const [askDelivery, setAskDelivery] = useState(false);

  const load = () => getMother(id).then((x) => setM(x ?? null));
  useEffect(() => { load(); }, [id]);

  if (!m) return null;

  const syncInfo =
    m.sync_status === 'synced' ? { icon: cloudDoneOutline, color: 'success', text: S.sync.synced }
    : m.sync_status === 'error' ? { icon: warningOutline, color: 'danger', text: m.sync_error ?? S.sync.error }
    : { icon: cloudUploadOutline, color: 'warning', text: S.sync.pending };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start"><IonBackButton defaultHref="/mothers" /></IonButtons>
          <IonTitle>{S.detail.title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => router.push(`/mother/${m.local_id}/edit`)}>
              <IonIcon slot="icon-only" icon={createOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="ion-padding">
          <h1 style={{ fontWeight: 800, marginBottom: 6 }}>{m.mother_name_bn}</h1>
          <IonNote color={syncInfo.color}>
            <IonIcon icon={syncInfo.icon} /> {syncInfo.text}
          </IonNote>
        </div>

        <IonList>
          <IonListHeader>{S.detail.general}</IonListHeader>
          <Row label={S.add.motherNameEn} value={m.mother_name_en} />
          <Row label={S.add.husband} value={m.husband_name} />
          <Row label={S.add.registerNo} value={m.register_no} />
          <Row label={S.add.whichChild} value={m.which_child} />
          <Row label={S.add.currentAge} value={m.current_age} />
          <Row label={S.add.bloodGroup} value={m.blood_group} />

          <IonListHeader>{S.detail.address}</IonListHeader>
          <Row label={S.add.ward} value={m.ward_no} />
          <Row label={S.add.address} value={m.address} />
          <Row label={S.add.mobile} value={m.mobile} />
          <Row label={S.add.gps} value={m.latitude != null ? `${m.latitude}, ${m.longitude}` : null} />

          <IonListHeader>{S.detail.health}</IonListHeader>
          <Row label={S.add.ttCount} value={m.tt_vaccine_count} />
          <Row label={S.add.lmp} value={m.last_menstruation_date} />
          <Row label={S.add.gravida} value={m.gravida_count} />
          <Row label={S.add.expectedDate} value={m.expected_delivery_date} />
          <Row label={S.add.deliveryPlan} value={m.delivery_plan} />
        </IonList>

        <div className="ion-padding">
          <IonButton expand="block" color="success" onClick={() => setAskDelivery(true)}>
            <IonIcon slot="start" icon={checkmarkDoneOutline} />
            {S.detail.markDelivery}
          </IonButton>
        </div>

        <IonAlert
          isOpen={askDelivery}
          onDidDismiss={() => setAskDelivery(false)}
          header={S.detail.markDelivery}
          inputs={[{ name: 'date', type: 'date', value: new Date().toISOString().slice(0, 10) }]}
          buttons={[
            { text: S.common.cancel, role: 'cancel' },
            {
              text: S.common.ok,
              handler: async (data) => {
                await markDelivery(m.local_id, data.date);
                if (await isOnline()) syncNow();
                load();
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
}
