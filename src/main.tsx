import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n/config";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";

// Store captured deep link URLs - accessed by useDeepLink hook
export let pendingDeepLinkUrls: string[] | null = null;

// Export function to clear pending URLs (called on logout)
export function clearPendingDeepLinkUrls() {
  console.log("[Main] Clearing pending deep link URLs");
  pendingDeepLinkUrls = null;
}

// Set up early listener BEFORE React mounts to catch cold start URLs
const setupEarlyCapture = async () => {
  try {
    // Set up the ongoing listener
    await onOpenUrl((urls) => {
      if (urls && urls.length > 0) {
        console.log("[Main] Early capture via onOpenUrl:", urls);
        pendingDeepLinkUrls = urls;
        // Dispatch event for useDeepLink to catch
        window.dispatchEvent(
          new CustomEvent("deep-link-early-capture", { detail: urls })
        );
      }
    });

    // Then check if we were opened with a URL
    const delays = [0, 100, 300, 500]; // Try multiple times
    for (const delay of delays) {
      if (pendingDeepLinkUrls) break; // Stop if we already got it
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const urls = await getCurrent();
      if (urls && urls.length > 0) {
        console.log("[Main] getCurrent captured URL:", urls);
        pendingDeepLinkUrls = urls;
        window.dispatchEvent(
          new CustomEvent("deep-link-early-capture", { detail: urls })
        );
        break;
      }
    }
  } catch (err) {
    console.error("[Main] Deep link setup failed:", err);
  }
};

// Start capture BEFORE React mounts
setupEarlyCapture();

// Small delay to let deep link capture complete
setTimeout(() => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}, 50); // Give deep link capture a head start