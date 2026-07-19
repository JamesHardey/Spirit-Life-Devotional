"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// "Add to home screen" banner. Uses the native beforeinstallprompt where
// available (Android/Chrome); on iOS Safari, shows manual instructions.
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("sl-install-dismissed") === "1") {
      setDismissed(true);
      return;
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setDismissed(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS never fires beforeinstallprompt — detect and show manual hint.
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    if (isIos) setShowIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const close = () => {
    localStorage.setItem("sl-install-dismissed", "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    close();
  };

  if (dismissed || (!deferred && !showIosHint)) return null;

  return (
    <div className="mx-5 mb-5 flex items-start gap-3 rounded-2xl border border-brand-purple-700/40 bg-brand-purple-950/60 p-4">
      <span className="text-2xl" aria-hidden>
        📲
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-content-primary">Install SpiritLife</p>
        {deferred ? (
          <p className="mt-0.5 text-xs text-content-secondary">
            Add the app to your home screen for one-tap access.
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-content-secondary">
            Tap the Share icon, then “Add to Home Screen”.
          </p>
        )}
        {deferred && (
          <button
            onClick={install}
            className="mt-2 rounded-lg bg-brand-purple-700 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Install
          </button>
        )}
      </div>
      <button onClick={close} className="text-content-muted" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
