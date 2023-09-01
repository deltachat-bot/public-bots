import { create } from "zustand";

export const recently = 1000 * 60 * 15;

function isOnline(lastSync: Date, lastSeen?: Date): boolean {
  if (!lastSeen) return false;
  let timeAgo = lastSync.getTime() - lastSeen.getTime();
  return timeAgo <= recently;
}

const api = (() => {
  return {
    sync: () => {
      const lastSyncReq = localStorage.getItem(lastSyncReqKey) || "";
      const hash = localStorage.getItem(hashKey) || null;
      if (
        lastSyncReq &&
        new Date().getTime() - new Date(lastSyncReq).getTime() <=
          1000 * 60 * (hash ? 10 : 1)
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
            params: [hash],
          },
        },
        "",
      );
    },
  };
})();
const lastSyncKey = "lastSyncKey";
const lastSyncReqKey = "lastSyncReqKey";
const hashKey = "hashKey";
const botsKey = "botsKey";
const maxSerialKey = "maxSerialKey";

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
  lastSeen: Date;
};
interface State {
  lastSync?: Date;
  hash?: string;
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
        state.error = update.error;
        return state;
      }
      let [syncTime, botsData, statusData] = update.result || ["", null, null];
      localStorage.setItem(lastSyncKey, syncTime);
      state.lastSync = syncTime = new Date(syncTime);
      if (statusData) {
        state.bots.map((bot: Bot) => {
          if (statusData[bot.addr]) {
            bot.lastSeen = new Date(statusData[bot.addr]);
          }
        });
      } else if (botsData) {
        localStorage.setItem(hashKey, botsData.hash);
        botsData.bots.map((bot: any) => {
          if (bot.lastSeen) {
            bot.lastSeen = new Date(bot.lastSeen);
          }
        });
        state.hash = botsData.hash;
        state.bots = botsData.bots;
      }
      state.bots.sort((b1: Bot, b2: Bot) => {
        let online1 = isOnline(syncTime, b1.lastSeen);
        let online2 = isOnline(syncTime, b2.lastSeen);
        if (online1 < online2) {
          return 1;
        }
        if (online1 > online2) {
          return -1;
        }
        if (b1.addr < b2.addr) {
          return -1;
        }
        return 1;
      });
      localStorage.setItem(botsKey, JSON.stringify(state.bots));
      return state;
    }),
}));

export async function init() {
  // The first time the bot sends the state so no need to request
  if (!localStorage.getItem(lastSyncReqKey)) {
    localStorage.setItem(lastSyncReqKey, new Date().toString());
  }
  const hash = localStorage.getItem(hashKey);
  if (hash) {
    const lastSync = new Date(localStorage.getItem(lastSyncKey) || "");
    const bots = JSON.parse(localStorage.getItem(botsKey) || "");
    bots.map((bot: any) => {
      if (bot.lastSeen) {
        bot.lastSeen = new Date(bot.lastSeen);
      }
    });
    useStore.setState({
      ...useStore.getState(),
      lastSync: lastSync,
      hash: hash,
      bots: bots,
    });
  }

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

  api.sync();
  setInterval(() => {
    api.sync();
  }, 5000);
}
