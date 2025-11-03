import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

import App from "./app/App";
import "./index.css";
import { initTelegram } from "./lib/telegram";
import { applyTheme } from "./lib/theme";

async function bootstrap() {
  await initTelegram()
    .then((webApp) => {
      if (webApp) {
        applyTheme(webApp);
        webApp.onEvent?.("themeChanged", () => applyTheme(webApp));
      } else {
        applyTheme();
      }
    })
    .catch(() => {
      applyTheme();
    });

  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Root element not found");
  }

  const root = createRoot(container);
  root.render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>
  );
}

bootstrap();
