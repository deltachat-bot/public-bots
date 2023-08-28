import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonLabel,
  IonList,
  IonChip,
  IonBadge,
  IonIcon,
  IonSpinner,
} from "@ionic/react";
import { languageOutline, openOutline } from "ionicons/icons";
import { useStore } from "../store";
import "./Home.css";

const Home: React.FC = () => {
  const state = useStore();
  const data = state.data || { bots: [], admins: {}, langs: {} };
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            Public Bots
            {state.lastSync && (
              <IonChip>{state.lastSync.toLocaleString()}</IonChip>
            )}
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {state.lastUpdated ? (
          <IonList>
            {data.bots.map((bot) => (
              <IonItem>
                <IonLabel>
                  <h2>
                    <a target="_blank" rel="noopener noreferrer" href={bot.url}>
                      {bot.addr}
                      <IonIcon icon={openOutline} />
                    </a>
                  </h2>
                  <IonBadge color="light">
                    <IonIcon icon={languageOutline} /> {data.langs[bot.lang]}
                  </IonBadge>
                  <p className="ion-text-wrap">{bot.description}</p>
                  <p>
                    <strong>Admin: </strong>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={data.admins[bot.admin].url}
                    >
                      {bot.admin}
                      <IonIcon icon={openOutline} />
                    </a>
                  </p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        ) : (
          <div id="loading">
            <IonSpinner name="dots"></IonSpinner>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Home;
