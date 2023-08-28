import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { init } from "./store";
import { setupIonicReact } from "@ionic/react";

setupIonicReact({
  mode: "ios",
});

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
init();
