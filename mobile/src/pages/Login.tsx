import { useState } from 'react';
import {
  IonButton, IonContent, IonHeader, IonInput, IonItem, IonList, IonPage, IonTitle, IonToolbar,
  IonText, IonNote, IonButtons, IonBackButton,
} from '@ionic/react';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { S } from '../i18n';

export default function Login() {
  const { upazila, login, changeUpazila } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? S.auth.invalid) : S.auth.invalid);
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>{S.auth.loginTitle}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="ion-text-center" style={{ margin: '12px 0 20px' }}>
          <h1 style={{ fontWeight: 800, marginBottom: 4 }}>{S.appName}</h1>
          <IonText color="medium">{upazila?.name_bn} উপজেলা</IonText>
        </div>

        {error && <IonNote color="danger" className="ion-margin-bottom" style={{ display: 'block' }}>{error}</IonNote>}

        <IonList inset>
          <IonItem>
            <IonInput
              label={S.auth.username}
              labelPlacement="floating"
              value={username}
              onIonInput={(e) => setUsername(e.detail.value ?? '')}
              autocapitalize="off"
            />
          </IonItem>
          <IonItem>
            <IonInput
              label={S.auth.password}
              labelPlacement="floating"
              type="password"
              value={password}
              onIonInput={(e) => setPassword(e.detail.value ?? '')}
            />
          </IonItem>
        </IonList>

        <IonButton expand="block" className="ion-margin-top" disabled={busy || !username || !password} onClick={submit}>
          {busy ? S.auth.loggingIn : S.auth.login}
        </IonButton>

        <IonButton expand="block" fill="clear" color="medium" onClick={changeUpazila}>
          {S.auth.changeUpazila}
        </IonButton>
      </IonContent>
    </IonPage>
  );
}
