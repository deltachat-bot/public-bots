import {
  IonContent,
  IonPage,
  IonIcon,
  IonItem,
  IonList,
  IonSpinner,
  IonSearchbar,
  IonToast,
  IonProgressBar,
  IonFooter,
  IonToolbar,
} from "@ionic/react";
import Fuse from "fuse.js";
import { create } from "zustand";
import { useState } from "react";
import { warningOutline, refreshOutline } from "ionicons/icons";

import { useStore, Bot, api } from "../store";
import BotItem from "../components/BotItem";
import { getText as _, format } from "../i18n";
import "./Home.css";

const fuseOptions = {
  keys: ["addr", "description", "admin.name", "lang.label"],
  threshold: 0.4,
};

interface HomeState {
  query: string;
  results: Bot[];
}

const homeStore = create<HomeState>()((set) => ({
  query: "",
  results: [],
}));

const Home: React.FC = () => {
  const state = useStore();
  const query = homeStore((state) => state.query);
  let results = homeStore((state) => state.results);
  if (!query) {
    results = state.bots;
  }
  const fuse = new Fuse(state.bots, fuseOptions);
  const handleInput = (ev: Event) => {
    const target = ev.target as HTMLIonSearchbarElement;
    const query = target ? target.value!.toLowerCase() : "";
    if (query) {
      homeStore.setState({
        query: query,
        results: fuse.search(query).map((result) => result.item),
      });
    } else {
      homeStore.setState({ query: query });
    }
  };

  return (
    <IonPage>
      {state.bots.length > 0 && (
        <IonToolbar>
          <br />
          <IonSearchbar
            debounce={200}
            onIonInput={(ev) => handleInput(ev)}
            placeholder={format(_("search-placeholder"), state.bots.length)}
          ></IonSearchbar>
        </IonToolbar>
      )}
      <IonContent fullscreen>
        {state.hash ? (
          <IonList>
            {results.map((bot) => (
              <BotItem bot={bot} lastSync={state.lastSync || new Date()} />
            ))}
          </IonList>
        ) : (
          <div id="loading">
            <IonSpinner name="dots"></IonSpinner>
          </div>
        )}
        {state.error && (
          <IonToast
            isOpen={true}
            message={"[" + state.error.code + "] " + state.error.message}
            icon={warningOutline}
            color="danger"
            onDidDismiss={() => useStore.setState({ error: undefined })}
            duration={5000}
          ></IonToast>
        )}
      </IonContent>
      {state.lastSync && (
        <IonFooter collapse="fade" class="footer">
          <IonToolbar onClick={() => api.sync(true)}>
            <IonIcon slot="start" icon={refreshOutline} />
            {format(_("last-updated"), state.lastSync.toLocaleString())}
            {state.syncing && state.hash && (
              <IonProgressBar type="indeterminate"></IonProgressBar>
            )}
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
};

export default Home;
