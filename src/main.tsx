import { WorkspaceProvider } from "./data/workspace/WorkspaceProvider";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WorkspaceProvider>
      <App />
    </WorkspaceProvider>
  </React.StrictMode>,
);

import "./polish.css";

import "./explorer.css";

import "./desktop.css";

import "./actions.css";

import "./vendors.css";

import "./insights.css";
