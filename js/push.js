/* Web Push · suscripción real (Vercel + VAPID) */
window.QA = window.QA || {};

QA.push = {
  async getPublicKey() {
    var r = await fetch("/api/vapid-public");
    if (!r.ok) throw new Error("VAPID no configurado en el servidor");
    var j = await r.json();
    return j.publicKey;
  },

  urlBase64ToUint8Array: function (base64String) {
    var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  },

  async subscribe() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Web Push no soportado en este navegador");
    }
    var perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Permiso de notificaciones denegado");

    var reg = await navigator.serviceWorker.ready;
    var key = await this.getPublicKey();
    var sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(key),
    });
    var json = sub.toJSON();
    var r = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent,
      }),
    });
    if (!r.ok) {
      var err = await r.json().catch(function () {
        return {};
      });
      throw new Error(err.error || "No se pudo registrar la suscripción");
    }
    try {
      localStorage.setItem("qa_web_push", "1");
    } catch (_) {}
    return sub;
  },

  async unsubscribe() {
    try {
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (sub) {
        try {
          await fetch("/api/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        } catch (_) {}
        await sub.unsubscribe();
      }
    } catch (_) {}
    try {
      localStorage.setItem("qa_web_push", "0");
    } catch (_) {}
  },

  isSupported: function () {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  },
};
