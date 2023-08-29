import { create } from "zustand";

const api = (() => {
  return {
    sync: () => {
      const lastSyncReq = localStorage.getItem(lastSyncReqKey) || "";
      const lastUpdated = localStorage.getItem(lastUpdatedKey) || null;
      if (
        lastSyncReq &&
        new Date().getTime() - new Date(lastSyncReq).getTime() <=
          1000 * 60 * (lastUpdated ? 10 : 1)
      ) {
        return;
      }

      localStorage.setItem(lastSyncReqKey, new Date().toString());
      useStore.setState({ syncing: true });
      window.webxdc.sendUpdate(
        {
          payload: {
            id: "sync",
            method: "Sync",
            params: [lastUpdated],
          },
        },
        "",
      );
    },
  };
})();
const lastSyncKey = "LastSyncKey";
const lastSyncReqKey = "LastSyncReqKey";
const lastUpdatedKey = "LastUpdatedKey";
const botsKey = "BotsKey";
const maxSerialKey = "MaxSerialKey";

type Response = {
  id: string;
  result?: any;
  error?: Error;
};
type Error = { code: number; message: string; data: any };
type Admin = { name: string; url: string };
type Lang = { label: string; code: string };
export type Bot = {
  addr: string;
  url: string;
  description: string;
  lang: Lang;
  admin: Admin;
};
interface State {
  lastSync?: Date;
  lastUpdated?: string;
  bots: Bot[];
  error?: Error;
  syncing: boolean;
  applyWebxdcUpdate: (update: Response) => void;
}

export const useStore = create<State>()((set) => ({
  syncing: false,
  bots: [],
  applyWebxdcUpdate: (update: Response) =>
    set((state) => {
      state = { ...state, syncing: false };
      if (update.error) {
        return {
          ...state,
          error: update.error,
        };
      }
      const result = update.result;
      if (result) {
        localStorage.setItem(lastSyncKey, new Date().toString());
        localStorage.setItem(lastUpdatedKey, result.lastUpdated);
        const data = result.data;
        data.bots.map((bot: any) => {
          bot.admin = { ...data.admins[bot.admin], name: bot.admin };
          bot.lang = { code: bot.lang, label: data.langs[bot.lang] };
        });
        data.bots.sort((a: Bot, b: Bot) => {
          if (a.addr < b.addr) {
            return -1;
          }
          return 1;
        });
        localStorage.setItem(botsKey, JSON.stringify(data.bots));
        return {
          ...state,
          lastUpdated: result.lastUpdated,
          bots: data.bots,
        };
      }
      return state;
    }),
}));

export async function init() {
  await window.webxdc.setUpdateListener(
    (message) => {
      if (message.serial === message.max_serial) {
        localStorage.setItem(maxSerialKey, String(message.max_serial));
      }
      // ignore self-updates
      if (!message.payload.method) {
        useStore.getState().applyWebxdcUpdate(message.payload);
      }
    },
    parseInt(localStorage.getItem(maxSerialKey) || "0"),
  );

  const lastUpdated = localStorage.getItem(lastUpdatedKey);
  if (lastUpdated) {
    const lastSync = new Date(localStorage.getItem(lastSyncKey) || "");
    const bots = JSON.parse(localStorage.getItem(botsKey) || "");
    useStore.setState({
      ...useStore.getState(),
      lastSync: lastSync,
      lastUpdated: lastUpdated,
      bots: bots,
    });
  }

  // The first time the bot sends the state so no need to request
  if (!localStorage.getItem(lastSyncReqKey)) {
    localStorage.setItem(lastSyncReqKey, new Date().toString());
  }
  api.sync();
  setInterval(() => {
    api.sync();
  }, 5000);
}
