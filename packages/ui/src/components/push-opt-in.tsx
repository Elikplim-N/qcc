"use client";

import { useEffect, useState } from "react";

type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "idle" | "unsupported" | "unconfigured" | "denied" | "subscribed" | "loading";

/**
 * "Enable notifications" toggle for the daily nudge reminders. Registers
 * /sw.js, subscribes via the Push API, and hands the subscription to a
 * server action to store. Renders nothing if push isn't supported in this
 * browser or the server hasn't set VAPID keys.
 */
export function PushOptIn({
  vapidPublicKey,
  subscribeAction,
  unsubscribeAction,
}: {
  vapidPublicKey: string;
  subscribeAction: (sub: PushSubscriptionJSON) => Promise<void>;
  unsubscribeAction: (endpoint: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vapidPublicKey) {
      setStatus("unconfigured");
      return;
    }
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      if (sub) setStatus("subscribed");
    });
  }, [vapidPublicKey]);

  const enable = async () => {
    setError(null);
    setStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "idle");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
      await subscribeAction(sub.toJSON() as PushSubscriptionJSON);
      setStatus("subscribed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable notifications.");
      setStatus("idle");
    }
  };

  const disable = async () => {
    setError(null);
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribeAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable notifications.");
      setStatus("subscribed");
    }
  };

  if (status === "unsupported" || status === "unconfigured") return null;

  return (
    <div className="card max-w-2xl space-y-2">
      <h2 className="text-sm font-semibold text-zinc-300">Reminders</h2>
      {status === "denied" ? (
        <p className="text-sm text-zinc-500">
          Notifications are blocked in your browser settings. Enable them there to get reminders.
        </p>
      ) : status === "subscribed" ? (
        <>
          <p className="text-sm text-emerald-400">
            Notifications are on. We&apos;ll nudge you if you go quiet.
          </p>
          <button onClick={disable} disabled={status !== "subscribed"} className="btn-secondary text-sm">
            Turn off
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-400">
            Get a nudge on this device if you haven&apos;t checked on your members today.
          </p>
          <button
            onClick={enable}
            disabled={status === "loading"}
            className="btn-secondary text-sm"
          >
            {status === "loading" ? "Enabling…" : "Enable notifications"}
          </button>
        </>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
