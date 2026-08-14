import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList,
  IonListHeader, IonNote, IonPage, IonTitle, IonToolbar, useIonRouter,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { pendingCount } from '../lib/mothers';
import { syncNow } from '../lib/sync';
import { useOnline } from '../lib/net';
import { S } from '../i18n';

export default function Settings() {
  const router = useIonRouter();
  const { upazila, user, logout, changeUpazila } = useAuth();
  const online = useOnline();
  const [pending, setPending] = useState(0);

  useEffect(() => { pendingCount().then(setPending); }, []);

  const doLogout = async () => { await logout(); router.push('/login', 'root'); };
  const doChangeUpazila = async () => { await changeUpazila(); router.push('/select-upazila', 'root'); };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start"><IonBackButton defaultHref="/mothers" /></IonButtons>
          <IonTitle>{S.settings.title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonListHeader>{S.settings.account}</IonListHeader>
          <IonItem>
            <IonLabel>
              <p>{user?.role_label_bn}</p>
              <h3 style={{ fontWeight: 600 }}>{user?.name}</h3>
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel><p>{S.settings.upazila}</p><h3 style={{ fontWeight: 600 }}>{upazila?.name_bn}</h3></IonLabel>
          </IonItem>

          <IonListHeader>{S.settings.sync}</IonListHeader>
          <IonItem>
            <IonLabel>{online ? S.net.online : S.net.offline}</IonLabel>
            <IonNote slot="end">{S.sync.pendingCount(String(pending))}</IonNote>
          </IonItem>
          <IonItem button disabled={!online} onClick={() => syncNow()}>
            <IonLabel color="primary">{S.sync.syncNow}</IonLabel>
          </IonItem>
        </IonList>

        <div className="ion-padding">
          <IonButton expand="block" fill="outline" onClick={doChangeUpazila}>{S.auth.changeUpazila}</IonButton>
          <IonButton expand="block" color="danger" onClick={doLogout}>{S.auth.logout}</IonButton>
          {pending > 0 && <IonNote color="warning"><p>{S.auth.logoutWarnUnsynced}</p></IonNote>}
        </div>
      </IonContent>
    </IonPage>
  );
}
