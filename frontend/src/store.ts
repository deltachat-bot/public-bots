import { create } from "zustand";

const api = (() => {
  return {
    sync: () => {
      localStorage.setItem(lastSyncReqKey, new Date().toString());
      window.webxdc.sendUpdate(
        { payload: { id: "sync", method: "Sync", params: [null] } },
        "",
      );
    },
  };
})();
const lastSyncKey = "LastSyncKey";
const lastSyncReqKey = "LastSyncReqKey";
const lastUpdatedKey = "LastUpdatedKey";
const dataKey = "DataKey";
const maxSerialKey = "MaxSerialKey";

type Response = {
  id: string;
  result?: any;
  error?: { code: number; message: string; data: any };
};
type Admin = { url: string };
type Bot = {
  addr: string;
  url: string;
  description: string;
  lang: string;
  admin: string;
};
interface State {
  lastSync?: Date;
  lastUpdated?: string;
  data?: {
    bots: Bot[];
    admins: { [key: string]: Admin };
    langs: { [key: string]: string };
  };
  applyWebxdcUpdate: (update: Response) => void;
}

export const useStore = create<State>()((set) => ({
  applyWebxdcUpdate: (update: Response) =>
    set((state) => {
      if (update.error) {
        return; // TODO: display error?
      }
      const result = update.result;
      if (result) {
        localStorage.setItem(lastSyncKey, new Date().toString());
        localStorage.setItem(lastUpdatedKey, result.lastUpdated);
        localStorage.setItem(dataKey, JSON.stringify(result.data));
        const newState = {
          ...state,
          lastUpdated: result.lastUpdated,
          data: result.data,
        };
        return result;
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
    const data = JSON.parse(localStorage.getItem(dataKey) || "");
    useStore.setState({
      ...useStore.getState(),
      lastSync: lastSync,
      lastUpdated: lastUpdated,
      data: data,
    });
  }

  const lastSyncReq = localStorage.getItem(lastSyncReqKey) || "";
  if (
    !lastSyncReq ||
    new Date().getTime() - new Date(lastSyncReq).getTime() > 1000 * 60 * 10
  ) {
    api.sync();
  }
}
