import { useCallback, useEffect, useState } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonButtons,
  IonButton, IonIcon, IonFab, IonFabButton, IonSearchbar, IonBadge, IonNote, IonChip,
  IonRefresher, IonRefresherContent, IonSpinner, useIonRouter,
} from '@ionic/react';
import {
  addOutline, cloudDoneOutline, cloudOfflineOutline, cloudUploadOutline, warningOutline,
  settingsOutline, syncOutline,
} from 'ionicons/icons';
import { listMothers, pendingCount } from '../lib/mothers';
import { onSyncChange, syncNow, isSyncing } from '../lib/sync';
import { useOnline } from '../lib/net';
import type { MotherRecord, SyncStatus } from '../data/mother';
import { S } from '../i18n';

function SyncBadge({ status }: { status: SyncStatus }) {
  if (status === 'synced') return <IonIcon icon={cloudDoneOutline} color="success" title={S.sync.synced} />;
  if (status === 'error') return <IonIcon icon={warningOutline} color="danger" title={S.sync.error} />;
  return <IonIcon icon={cloudUploadOutline} color="warning" title={S.sync.pending} />;
}

export default function MothersList() {
  const router = useIonRouter();
  const online = useOnline();
  const [rows, setRows] = useState<MotherRecord[]>([]);
  const [q, setQ] = useState('');
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  // 'loading' until the first read resolves, so an empty list can't flash before the DB opens.
  // 'error' means the local store or its decryption key is unreadable — not an empty list.
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const refresh = useCallback(async () => {
    try {
      setRows(await listMothers(q));
      setPending(await pendingCount());
      setSyncing(isSyncing());
      setState('ready');
    } catch {
      setState('error');
    }
  }, [q]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => onSyncChange(refresh), [refresh]);

  // Sync on open and whenever connectivity returns.
  useEffect(() => { if (online) syncNow(); }, [online]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>{S.mothers.title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => syncNow()} disabled={!online || syncing} aria-label={S.mothers.syncNowLabel}>
              <IonIcon slot="icon-only" icon={syncOutline} />
            </IonButton>
            <IonButton onClick={() => router.push('/settings')} aria-label={S.mothers.settingsLabel}>
              <IonIcon slot="icon-only" icon={settingsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await syncNow(); await refresh(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        {!online && (
          <IonChip color="warning" style={{ margin: '10px 12px 0' }}>
            <IonIcon icon={cloudOfflineOutline} />
            <IonLabel>{S.net.offline}</IonLabel>
          </IonChip>
        )}
        {pending > 0 && (
          <IonChip color="medium" style={{ margin: '10px 12px 0' }} onClick={() => syncNow()}>
            <IonIcon icon={cloudUploadOutline} />
            <IonLabel>{syncing ? S.sync.syncing : S.sync.pendingCount(String(pending))}</IonLabel>
          </IonChip>
        )}

        <IonSearchbar value={q} onIonInput={(e) => setQ(e.detail.value ?? '')} placeholder={S.mothers.searchPlaceholder} />

        {state === 'loading' ? (
          <div className="ion-text-center ion-padding" style={{ marginTop: 40 }}>
            <IonSpinner aria-label={S.common.loading} />
          </div>
        ) : state === 'error' ? (
          <div className="ion-text-center ion-padding" style={{ marginTop: 40 }}>
            <IonNote color="danger">{S.mothers.loadError}</IonNote>
            <IonButton fill="clear" onClick={refresh}>{S.common.retry}</IonButton>
          </div>
        ) : rows.length === 0 ? (
          <div className="ion-text-center ion-padding" style={{ marginTop: 40 }}>
            <IonNote>{q ? S.mothers.noMatch : S.mothers.empty}</IonNote>
          </div>
        ) : (
          <IonList>
            {rows.map((m) => (
              <IonItem key={m.local_id} button detail onClick={() => router.push(`/mother/${m.local_id}`)}>
                <IonLabel>
                  <h2 style={{ fontWeight: 600 }}>{m.mother_name_bn}</h2>
                  <p>
                    {m.ward_no ? `${S.mothers.ward} ${m.ward_no}` : ''}
                    {m.expected_delivery_date ? `  ·  ${S.mothers.expected} ${m.expected_delivery_date}` : ''}
                  </p>
                </IonLabel>
                <IonBadge slot="end" color="light"><SyncBadge status={m.sync_status} /></IonBadge>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton onClick={() => router.push('/add-mother')} aria-label={S.mothers.addLabel}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
}
