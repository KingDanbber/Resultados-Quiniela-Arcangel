/* Notificaciones no invasivas · toasts de resultados + opt-in sistema */
window.QA = window.QA || {};
QA.notifications = (function () {
  var STORAGE_SCORES = "qa_match_scores_v1";
  var STORAGE_PREF = "qa_notif_enabled";
  var enabled = localStorage.getItem(STORAGE_PREF) === "1";
  var pollTimer = null;
  var POLL_MS = 45000;

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
      btn.innerHTML =
        (QA.icons && QA.icons.bell) || "🔔";
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
    }, 2800);
  }

  function showMatchToast(payload) {
    var container = document.getElementById("match-result-toasts");
    if (!container) return;
    // max 4 visible
    while (container.children.length >= 4) {
      container.removeChild(container.firstChild);
    }
    var RESULT_COLOR = {
      "1": "var(--green)",
      X: "var(--amber)",
      "2": "#ef4444",
      fin: "var(--amber)",
    };
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
        ? '<div class="mr-toast-score" style="color:' +
          (RESULT_COLOR[payload.result] || "var(--text)") +
          '">' +
          payload.hg +
          " - " +
          payload.ag +
          "</div>"
        : "") +
      '<div class="mr-toast-result" style="color:' +
      (RESULT_COLOR[payload.result] || "var(--text-m)") +
      '">' +
      (RESULT_LBL[payload.result] || "") +
      "</div></div>" +
      '<button type="button" class="mr-toast-x" aria-label="Cerrar">×</button>';

    div.querySelector(".mr-toast-x").addEventListener("click", function () {
      div.remove();
    });
    container.appendChild(div);
    setTimeout(function () {
      div.classList.add("fade-out");
      setTimeout(function () {
        div.remove();
      }, 400);
    }, 7000);

    // Sistema (solo si el usuario activó y dio permiso)
    if (
      enabled &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification("Quiniela Arcángel", {
          body: payload.headline,
          icon: "img/logo-arcangel.png",
          silent: true,
        });
      } catch (_) {}
    }
  }

  function loadScores() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_SCORES) || "{}");
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
      if (hg - ag >= 3) return H + " aplasta " + hg + "-" + ag + " a " + A;
      return H + " derrota " + hg + "-" + ag + " a " + A;
    }
    if (result === "2") {
      return A + " vence " + hg + "-" + ag + " a " + H + " de visitante";
    }
    return H + " " + hg + "-" + ag + " " + A;
  }

  async function poll() {
    try {
      var jornadas = await QA.data.getJornadas(true);
      var activas = jornadas.filter(function (j) {
        return j.estado === "activa";
      });
      if (!activas.length) return;

      var prev = loadScores();
      var next = Object.assign({}, prev);

      for (var i = 0; i < activas.length; i++) {
        var j = activas[i];
        // Prefer sibling sencilla scores for goleo too via loadPoolDetail
        var detail = await QA.data.loadPoolDetail(j.id);
        (detail.matches || []).forEach(function (m) {
          if (m.home_goals == null || m.away_goals == null) return;
          var key = m.id || j.id + "_" + m.match_no;
          var val = m.home_goals + "-" + m.away_goals;
          if (prev[key] === val) {
            next[key] = val;
            return;
          }
          // First time seeing score: if prev empty for this key, only notify if we had a snapshot already for the pool
          var isNew = prev[key] && prev[key] !== val;
          var isFirstAfterInit = !prev[key] && Object.keys(prev).length > 0;
          next[key] = val;
          if (isNew || isFirstAfterInit) {
            var result = QA.data.getResult(m.home_goals, m.away_goals);
            var hl = headlineFor(m, result);
            showMatchToast({
              headline: hl,
              hg: m.home_goals,
              ag: m.away_goals,
              result: result,
            });
            pushSystem(
              "Resultado final",
              hl + " · " + m.home_goals + "-" + m.away_goals
            );
          }
        });
      }
      saveScores(next);

      // Cierre de jornada / ganadores (activas + recién finalizadas)
      var allJ = await QA.data.getJornadas();
      var watch = (allJ || []).filter(function (j) {
        return j.estado === "activa" || j.estado === "finalizada";
      });
      for (var j = 0; j < watch.length; j++) {
        try {
          var doneKey = "qa_pool_done_" + watch[j].id;
          var wasDone = localStorage.getItem(doneKey) === "1";
          if (wasDone && watch[j].estado === "finalizada") continue;
          var det = await QA.data.loadPoolDetail(watch[j].id);
          if (det.jornadaDone && !wasDone) {
            localStorage.setItem(doneKey, "1");
            var winners = (det.leaderboard || []).filter(function (p) {
              if (det.isGoleo) return !!p.exactGoals;
              var maxH = 0;
              (det.leaderboard || []).forEach(function (x) {
                if ((x.aciertos || 0) > maxH) maxH = x.aciertos || 0;
              });
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
      console.warn("notif poll", err);
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
      if (QA.push && QA.push.unsubscribe) {
        QA.push.unsubscribe().catch(function () {});
      }
      return;
    }
    // Preferir Web Push real (segundo plano) si está disponible
    var doLocal = function () {
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
    };

    if (QA.push && QA.push.isSupported()) {
      QA.push
        .subscribe()
        .then(function () {
          enabled = true;
          localStorage.setItem(STORAGE_PREF, "1");
          ensureUI();
          showAppToast("Push activado · avisos con la app cerrada");
          try {
            new Notification("Quiniela Arcángel", {
              body: "Push en segundo plano listo ⚽",
              icon: "img/logo-arcangel.png",
            });
          } catch (_) {}
        })
        .catch(function (err) {
          console.warn("Web Push", err);
          showAppToast(
            (err && err.message) || "Push no disponible · usando avisos locales"
          );
          doLocal();
        });
    } else {
      doLocal();
    }
  }

  function start() {
    ensureUI();
    // Build baseline scores without toasting everything
    (async function () {
      try {
        var prev = loadScores();
        if (Object.keys(prev).length) return;
        var jornadas = await QA.data.getJornadas();
        var activas = jornadas.filter(function (j) {
          return j.estado === "activa";
        });
        var map = {};
        for (var i = 0; i < activas.length; i++) {
          var detail = await QA.data.loadPoolDetail(activas[i].id);
          (detail.matches || []).forEach(function (m) {
            if (m.home_goals == null || m.away_goals == null) return;
            var key = m.id || activas[i].id + "_" + m.match_no;
            map[key] = m.home_goals + "-" + m.away_goals;
          });
        }
        saveScores(map);
      } catch (_) {}
    })();

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(poll, POLL_MS);
  }

  return {
    init: start,
    toggle: toggle,
    showMatchToast: showMatchToast,
    poll: poll,
  };
})();
