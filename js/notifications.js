/* Notificaciones in-app · toasts de resultados + opt-in sistema */
window.QA = window.QA || {};
QA.notifications = (function () {
  var STORAGE_SCORES = "qa_match_scores_v1";
  var STORAGE_PREF = "qa_notif_enabled";
  var STORAGE_BOOT = "qa_notif_bootstrapped_v1";
  var enabled = localStorage.getItem(STORAGE_PREF) === "1";
  var pollTimer = null;
  var POLL_MS = 30000;

  function ensureUI() {
    if (!document.getElementById("match-result-toasts")) {
      var stack = document.createElement("div");
      stack.id = "match-result-toasts";
      document.body.appendChild(stack);
    }
    if (!document.getElementById("notif-toast")) {
      var t = document.createElement("div");
      t.id = "notif-toast";
      document.body.appendChild(t);
    }
    var btn = document.getElementById("notif-btn");
    if (btn) {
      btn.innerHTML = (QA.icons && QA.icons.bell) || "🔔";
      btn.classList.toggle("notif-on", enabled);
      btn.title = enabled
        ? "Notificaciones activadas"
        : "Activar notificaciones";
      btn.onclick = toggle;
    }
  }

  function showAppToast(msg) {
    var t = document.getElementById("notif-toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function () {
      t.classList.remove("show");
    }, 3200);
  }

  function showMatchToast(payload) {
    var container = document.getElementById("match-result-toasts");
    if (!container) return;
    while (container.children.length >= 4) {
      container.removeChild(container.firstChild);
    }
    var RESULT_LBL = {
      "1": "Local gana",
      X: "Empate",
      "2": "Visita gana",
      fin: "Jornada finalizada",
    };
    var iconSvg =
      payload.result === "1"
        ? (QA.icons && QA.icons.home) || "🏠"
        : payload.result === "2"
        ? (QA.icons && QA.icons.plane) || "✈️"
        : payload.result === "X"
        ? (QA.icons && QA.icons.handshake) || "🤝"
        : (QA.icons && QA.icons.trophy) || "🏆";

    var div = document.createElement("div");
    div.className = "mr-toast";
    div.innerHTML =
      '<div class="mr-toast-icon">' +
      iconSvg +
      '</div><div class="mr-toast-body">' +
      '<div class="mr-toast-title">' +
      QA.utils.escape(payload.headline) +
      "</div>" +
      (payload.result !== "fin"
        ? '<div class="mr-toast-score">' +
          payload.hg +
          " - " +
          payload.ag +
          '</div><div class="mr-toast-result">' +
          (RESULT_LBL[payload.result] || "") +
          "</div>"
        : "") +
      '</div><button type="button" class="mr-toast-x" aria-label="Cerrar">×</button>';

    div.querySelector(".mr-toast-x").onclick = function () {
      div.classList.add("fade-out");
      setTimeout(function () {
        if (div.parentNode) div.parentNode.removeChild(div);
      }, 280);
    };
    container.appendChild(div);
    setTimeout(function () {
      div.classList.add("fade-out");
      setTimeout(function () {
        if (div.parentNode) div.parentNode.removeChild(div);
      }, 280);
    }, 8000);
  }

  function loadScores() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_SCORES) || "{}") || {};
    } catch (_) {
      return {};
    }
  }

  function saveScores(map) {
    try {
      localStorage.setItem(STORAGE_SCORES, JSON.stringify(map));
    } catch (_) {}
  }

  function headlineFor(m, result) {
    var H = (m.home_team || "Local").toUpperCase();
    var A = (m.away_team || "Visita").toUpperCase();
    var hg = m.home_goals;
    var ag = m.away_goals;
    if (result === "X") return H + " empata " + hg + "-" + ag + " con " + A;
    if (result === "1") {
      if (Number(hg) - Number(ag) >= 3)
        return H + " aplasta " + hg + "-" + ag + " a " + A;
      return H + " derrota " + hg + "-" + ag + " a " + A;
    }
    if (result === "2") {
      return A + " vence " + hg + "-" + ag + " a " + H + " de visitante";
    }
    return H + " " + hg + "-" + ag + " " + A;
  }

  function matchKey(jornadaId, m) {
    return String(m.id || jornadaId + "_" + m.match_no);
  }

  async function getWatchList() {
    var jornadas = await QA.data.getJornadas(true);
    var activas = (jornadas || []).filter(function (j) {
      return j.estado === "activa";
    });
    var recentDone = (jornadas || [])
      .filter(function (j) {
        return j.estado === "finalizada";
      })
      .slice(0, 4);
    return activas.concat(recentDone);
  }

  /**
   * Compara marcadores guardados vs Supabase y muestra toasts.
   * - Primera vez (sin bootstrap): guarda baseline sin toasts
   * - Replay (qa_notif_replay=1): toasts de todos los finales actuales
   * - Normal: toasts si pasó de pendiente→final o cambió el marcador
   */
  async function scan() {
    try {
      if (!QA.data || !QA.data.getJornadas) return;
      var watch = await getWatchList();
      if (!watch.length) return;

      var prev = loadScores();
      var next = {};
      var events = [];
      var replay = localStorage.getItem("qa_notif_replay") === "1";
      var booted = localStorage.getItem(STORAGE_BOOT) === "1";

      for (var i = 0; i < watch.length; i++) {
        var j = watch[i];
        var detail;
        try {
          detail = await QA.data.loadPoolDetail(j.id);
        } catch (_) {
          continue;
        }
        (detail.matches || []).forEach(function (m) {
          var key = matchKey(j.id, m);
          var hasScore = m.home_goals != null && m.away_goals != null;
          if (!hasScore) {
            next[key] = "pending";
            return;
          }
          var val = String(m.home_goals) + "-" + String(m.away_goals);
          next[key] = val;
          var before = prev[key];
          var becameFinal = before === "pending" || before == null;
          var changed =
            before != null && before !== "pending" && before !== val;
          if (replay || becameFinal || changed) {
            var result = QA.data.getResult(m.home_goals, m.away_goals);
            events.push({
              headline: headlineFor(m, result),
              hg: m.home_goals,
              ag: m.away_goals,
              result: result,
              key: key,
              val: val,
            });
          }
        });
      }

      // Primera vez en este dispositivo: no spamear historial
      if (!booted && !replay) {
        saveScores(next);
        localStorage.setItem(STORAGE_BOOT, "1");
        return;
      }

      if (replay) localStorage.removeItem("qa_notif_replay");

      // Deduplicar por key
      var seen = {};
      events.forEach(function (ev) {
        if (seen[ev.key]) return;
        seen[ev.key] = true;
        // En modo normal, si ya teníamos el mismo marcador no avisar
        if (!replay && prev[ev.key] === ev.val) return;
        showMatchToast(ev);
        pushSystem(
          "Resultado final",
          ev.headline + " · " + ev.hg + "-" + ev.ag
        );
      });

      saveScores(next);
      localStorage.setItem(STORAGE_BOOT, "1");

      // Cierre de jornada
      for (var k = 0; k < watch.length; k++) {
        try {
          var doneKey = "qa_pool_done_" + watch[k].id;
          var wasDone = localStorage.getItem(doneKey) === "1";
          if (wasDone && watch[k].estado === "finalizada") continue;
          var det = await QA.data.loadPoolDetail(watch[k].id);
          if (det.jornadaDone && !wasDone) {
            localStorage.setItem(doneKey, "1");
            var maxH = 0;
            (det.leaderboard || []).forEach(function (x) {
              if ((x.aciertos || 0) > maxH) maxH = x.aciertos || 0;
            });
            var winners = (det.leaderboard || []).filter(function (p) {
              if (det.isGoleo) return !!p.exactGoals;
              return maxH > 0 && p.aciertos === maxH;
            });
            var names = winners
              .slice(0, 3)
              .map(function (w) {
                return w.displayName;
              })
              .join(", ");
            var body =
              (det.meta && det.meta.nombre ? det.meta.nombre + " · " : "") +
              (names
                ? "Ganador(es): " + names
                : det.isGoleo
                ? "Nadie acertó el total · bolsa se acumula"
                : "Jornada cerrada");
            pushSystem("Jornada finalizada", body);
            showAppToast(body);
          } else if (!det.jornadaDone && wasDone) {
            localStorage.removeItem(doneKey);
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn("notif scan", err);
    }
  }

  function pushSystem(title, body) {
    try {
      if (
        enabled &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(title || "Quiniela Arcángel", {
          body: body || "",
          icon: "img/logo-arcangel.png",
          badge: "img/logo-arcangel.png",
          tag: "qa-" + String(title || "x").slice(0, 24),
        });
      }
    } catch (_) {}
  }

  function toggle() {
    if (!("Notification" in window)) {
      showAppToast("Tu navegador no soporta notificaciones");
      return;
    }
    if (enabled) {
      enabled = false;
      localStorage.setItem(STORAGE_PREF, "0");
      ensureUI();
      showAppToast("Notificaciones desactivadas");
      return;
    }
    Notification.requestPermission().then(function (perm) {
      if (perm === "granted") {
        enabled = true;
        localStorage.setItem(STORAGE_PREF, "1");
        ensureUI();
        showAppToast("Alertas en app activadas");
        try {
          new Notification("Quiniela Arcángel", {
            body: "Avisos listos. Pasión x Ganar ⚽",
            icon: "img/logo-arcangel.png",
            silent: true,
          });
        } catch (_) {}
      } else {
        showAppToast("Permiso denegado · igual verás avisos en la app");
      }
    });
  }

  function start() {
    ensureUI();
    // Escaneo inmediato al abrir
    scan();
    // Y de nuevo a los 3s (por si Supabase tarda)
    setTimeout(function () {
      scan();
    }, 3000);
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(scan, POLL_MS);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") scan();
    });
  }

  return {
    init: start,
    toggle: toggle,
    showMatchToast: showMatchToast,
    poll: scan,
    /** Reinicia y vuelve a mostrar toasts de resultados actuales (prueba) */
    resetAndReplay: function () {
      localStorage.removeItem(STORAGE_SCORES);
      localStorage.setItem(STORAGE_BOOT, "1");
      localStorage.setItem("qa_notif_replay", "1");
      showAppToast("Reproduciendo avisos de resultados…");
      return scan();
    },
    resetScores: function () {
      localStorage.removeItem(STORAGE_SCORES);
      localStorage.removeItem(STORAGE_BOOT);
      localStorage.removeItem("qa_notif_replay");
      showAppToast("Historial de marcadores borrado");
    },
  };
})();
