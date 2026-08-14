import { useEffect, useState } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel,
  IonSearchbar, IonSpinner, IonNote, IonText,
} from '@ionic/react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { S } from '../i18n';

interface DirEntry {
  slug: string;
  name_bn: string;
  district_bn: string | null;
}

export default function SelectUpazila() {
  const { chooseUpazila } = useAuth();
  const [all, setAll] = useState<DirEntry[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<{ upazilas: DirEntry[] }>('/upazilas/directory', { auth: false, central: true })
      .then((r) => setAll(r.upazilas))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const rows = q
    ? all.filter((u) => u.name_bn.includes(q) || (u.district_bn ?? '').includes(q))
    : all;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>{S.appName}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <h2 style={{ fontWeight: 800 }}>{S.upazila.title}</h2>
        <IonText color="medium"><p>{S.upazila.help}</p></IonText>

        {loading && <div className="ion-text-center ion-padding"><IonSpinner /></div>}
        {error && <IonNote color="danger">{S.upazila.loadError}</IonNote>}

        {!loading && !error && (
          <>
            <IonSearchbar
              value={q}
              onIonInput={(e) => setQ(e.detail.value ?? '')}
              placeholder={S.common.search}
            />
            <IonList>
              {rows.map((u) => (
                <IonItem key={u.slug} button detail onClick={() => chooseUpazila({ slug: u.slug, name_bn: u.name_bn })}>
                  <IonLabel>
                    <h2>{u.name_bn}</h2>
                    {u.district_bn && <p>{u.district_bn}</p>}
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
