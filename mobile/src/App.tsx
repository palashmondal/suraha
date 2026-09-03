import { Redirect, Route } from 'react-router-dom';
import {
  IonApp, IonContent, IonPage, IonRouterOutlet, IonSpinner, setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import SelectUpazila from './pages/SelectUpazila';
import Login from './pages/Login';
import MothersList from './pages/MothersList';
import AddMother from './pages/AddMother';
import MotherDetail from './pages/MotherDetail';
import Settings from './pages/Settings';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';
import './theme/variables.css';

setupIonicReact();

function Splash() {
  return (
    <IonPage>
      <IonContent className="ion-text-center" style={{ display: 'grid', placeItems: 'center' }}>
        <IonSpinner />
      </IonContent>
    </IonPage>
  );
}

// Guard the internal app: need a selected upazila, then a login.
function Guard({ children }: { children: ReactNode }) {
  const { upazila, user } = useAuth();
  if (!upazila) return <Redirect to="/select-upazila" />;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function Routes() {
  const { booting, upazila, user } = useAuth();
  if (booting) return <Splash />;

  return (
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/select-upazila">
          {upazila ? <Redirect to="/mothers" /> : <SelectUpazila />}
        </Route>
        <Route exact path="/login">
          {!upazila ? <Redirect to="/select-upazila" /> : user ? <Redirect to="/mothers" /> : <Login />}
        </Route>

        <Route exact path="/mothers"><Guard><MothersList /></Guard></Route>
        <Route exact path="/mother/new"><Guard><AddMother /></Guard></Route>
        <Route exact path="/mother/:id/edit"><Guard><AddMother /></Guard></Route>
        <Route exact path="/mother/:id"><Guard><MotherDetail /></Guard></Route>
        <Route exact path="/settings"><Guard><Settings /></Guard></Route>

        <Route exact path="/"><Redirect to="/mothers" /></Route>
      </IonRouterOutlet>
    </IonReactRouter>
  );
}

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <Routes />
    </AuthProvider>
  </IonApp>
);

export default App;
