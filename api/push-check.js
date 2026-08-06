/**
 * GET/POST /api/push-check
 * Cron cada 2 min: detecta marcadores nuevos y jornadas cerradas → Web Push
 * Proteger con CRON_SECRET opcional (?secret=)
 */
const webpush = require("web-push");
const { sb } = require("./_supabase");

const STATUS_ACTIVE = ["active", "activa", "open", "abierta", "published"];

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function configureVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@quiniela-arcangel.local";
  if (!pub || !priv) throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing");
  webpush.setVapidDetails(subject, pub, priv);
}

async function getState(key) {
  try {
    const rows = await sb("push_state?key=eq." + encodeURIComponent(key) + "&select=value");
    return rows && rows[0] ? rows[0].value : null;
  } catch (_) {
    return null;
  }
}

async function setState(key, value) {
  await sb("push_state?on_conflict=key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
}

async function getSubscriptions() {
  return (await sb("push_subscriptions?select=endpoint,p256dh,auth")) || [];
}

async function sendAll(subs, payload) {
  const body = JSON.stringify(payload);
  let sent = 0;
  let gone = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        },
        body
      );
      sent++;
    } catch (e) {
      const code = e.statusCode || e.status;
      if (code === 404 || code === 410) {
        gone++;
        try {
          await sb(
            "push_subscriptions?endpoint=eq." + encodeURIComponent(s.endpoint),
            { method: "DELETE", prefer: "return=minimal" }
          );
        } catch (_) {}
      } else {
        console.warn("push fail", code, e.message);
      }
    }
  }
  return { sent, gone };
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const q = req.query || {};
    const auth = req.headers.authorization || "";
    const ok =
      q.secret === secret ||
      auth === `Bearer ${secret}` ||
      req.headers["x-cron-secret"] === secret;
    // Vercel Cron envía header especial en planes pagos; permitir sin secret en dev si no está definido
    if (!ok) {
      // Allow Vercel Cron user-agent loosely if no header match but CRON_SECRET set — still require secret
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  try {
    configureVapid();
    const subs = await getSubscriptions();
    if (!subs.length) {
      return res.status(200).json({ ok: true, message: "no subscribers", sent: 0 });
    }

    const pools =
      (await sb(
        "pools?select=id,name,round,status,mode_code,competition,season&order=created_at.desc&limit=40"
      )) || [];

    const prevScores = (await getState("match_scores")) || {};
    const prevDone = (await getState("pool_done")) || {};
    const nextScores = { ...prevScores };
    const nextDone = { ...prevDone };
    const events = [];

    for (const pool of pools) {
      const st = String(pool.status || "").toLowerCase();
      const isActive = STATUS_ACTIVE.includes(st);
      const isClosed =
        st === "closed" ||
        st === "cerrada" ||
        st === "finished" ||
        st === "finalizada" ||
        st === "complete";

      const matches =
        (await sb(
          `matches?pool_id=eq.${pool.id}&select=id,match_no,home_team,away_team,home_goals,away_goals`
        )) || [];

      let completed = 0;
      for (const m of matches) {
        if (m.home_goals == null || m.away_goals == null) continue;
        completed++;
        const key = m.id || `${pool.id}_${m.match_no}`;
        const val = `${m.home_goals}-${m.away_goals}`;
        if (prevScores[key] !== val) {
          if (prevScores[key] !== undefined || Object.keys(prevScores).length > 0) {
            // solo notificar si ya había baseline (evita flood al primer cron)
            events.push({
              title: "Resultado final",
              body: `${m.home_team} ${m.home_goals}-${m.away_goals} ${m.away_team}`,
              url: `/?tab=jornadas&jornada=${pool.id}`,
            });
          }
          nextScores[key] = val;
        } else {
          nextScores[key] = val;
        }
      }

      const jornadaDone = matches.length > 0 && completed === matches.length;
      const doneKey = pool.id;
      if (jornadaDone && !prevDone[doneKey]) {
        if (Object.keys(prevDone).length > 0 || isClosed || isActive) {
          events.push({
            title: "Jornada finalizada",
            body: `${pool.name || "Jornada " + pool.round} · revisa ganadores`,
            url: `/?tab=jornadas&jornada=${pool.id}`,
          });
        }
        nextDone[doneKey] = true;
      } else if (jornadaDone) {
        nextDone[doneKey] = true;
      }
    }

    await setState("match_scores", nextScores);
    await setState("pool_done", nextDone);

    // Deduplicar por body
    const seen = new Set();
    const unique = [];
    for (const ev of events) {
      const k = ev.title + "|" + ev.body;
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(ev);
    }

    let totalSent = 0;
    for (const ev of unique.slice(0, 8)) {
      const r = await sendAll(subs, {
        title: ev.title,
        body: ev.body,
        url: ev.url || "/",
        icon: "/img/logo-arcangel.png",
      });
      totalSent += r.sent;
    }

    return res.status(200).json({
      ok: true,
      events: unique.length,
      sent: totalSent,
      subscribers: subs.length,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "push-check failed" });
  }
};
