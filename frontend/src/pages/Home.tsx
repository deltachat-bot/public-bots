import {
  IonContent,
  IonPage,
  IonItem,
  IonList,
  IonSpinner,
  IonSearchbar,
  IonToast,
  IonProgressBar,
} from "@ionic/react";
import Fuse from "fuse.js";
import { create } from "zustand";
import { useState } from "react";
import { warningOutline } from "ionicons/icons";

import { useStore, Bot } from "../store";
import BotItem from "../components/BotItem";
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
      <IonContent fullscreen>
        {state.syncing && state.hash && (
          <IonProgressBar type="indeterminate"></IonProgressBar>
        )}
        {state.bots.length > 0 && (
          <>
            <br />
            <IonSearchbar
              debounce={200}
              onIonInput={(ev) => handleInput(ev)}
              placeholder={"Search among " + state.bots.length + " bots"}
            ></IonSearchbar>
          </>
        )}
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
        {state.lastSync && (
          <p id="footer">Last updated: {state.lastSync.toLocaleString()}</p>
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
    </IonPage>
  );
};

export default Home;
