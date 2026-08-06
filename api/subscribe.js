/**
 * POST /api/subscribe
 * Body: { endpoint, keys: { p256dh, auth }, userAgent? }
 * Guarda suscripción Web Push en Supabase.
 */
const { sb } = require("./_supabase");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const endpoint = body.endpoint;
    const p256dh = body.keys && body.keys.p256dh;
    const auth = body.keys && body.keys.auth;
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: "endpoint + keys.p256dh + keys.auth required" });
    }

    // upsert by endpoint
    await sb("push_subscriptions?on_conflict=endpoint", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: JSON.stringify({
        endpoint,
        p256dh,
        auth,
        user_agent: body.userAgent || null,
        last_seen: new Date().toISOString(),
      }),
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "subscribe failed" });
  }
};
