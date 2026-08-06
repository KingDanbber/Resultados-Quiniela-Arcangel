/* Búsqueda global · participantes, jornadas, partidos */
window.QA = window.QA || {};
QA.search = (function () {
  var debounceTimer = null;

  function ensureUI() {
    if (document.getElementById("global-search-fab")) return;
    var fab = document.createElement("button");
    fab.id = "global-search-fab";
    fab.type = "button";
    fab.title = "Búsqueda global";
    fab.innerHTML =
      (QA.icons && QA.icons.search) ||
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
    document.body.appendChild(fab);
    fab.addEventListener("click", open);

    var overlay = document.createElement("div");
    overlay.id = "global-search-overlay";
    overlay.innerHTML =
      '<div id="global-search-topbar">' +
      '<input id="global-search-field" type="search" placeholder="Buscar participante, jornada, equipo…" autocomplete="off" enterkeyhint="search"/>' +
      '<button type="button" id="global-search-close" aria-label="Cerrar">×</button>' +
      "</div>" +
      '<div id="global-search-results"></div>';
    document.body.appendChild(overlay);

    document
      .getElementById("global-search-close")
      .addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target.id === "global-search-overlay") close();
    });
    document
      .getElementById("global-search-field")
      .addEventListener("input", function (e) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          run(e.target.value);
        }, 220);
      });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  function open() {
    ensureUI();
    var overlay = document.getElementById("global-search-overlay");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    var field = document.getElementById("global-search-field");
    setTimeout(function () {
      field.focus();
    }, 60);
    run(field.value || "");
  }

  function close() {
    var overlay = document.getElementById("global-search-overlay");
    if (overlay) overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  function highlight(text, q) {
    var safe = QA.utils.escape(text || "");
    if (!q) return safe;
    try {
      var re = new RegExp(
        "(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")",
        "gi"
      );
      return safe.replace(re, '<span class="gs-highlight">$1</span>');
    } catch (_) {
      return safe;
    }
  }

  async function run(raw) {
    var el = document.getElementById("global-search-results");
    if (!el) return;
    var q = (raw || "").trim().toLowerCase();
    if (q.length < 2) {
      el.innerHTML =
        '<div class="gs-empty">Escribe al menos 2 caracteres<br><span class="gs-hint">Participantes, jornadas o equipos</span></div>';
      return;
    }
    el.innerHTML = '<div class="gs-empty">Buscando…</div>';

    var results = [];
    try {
      var jornadas = await QA.data.getJornadas();
      var ranking = [];
      try {
        ranking = await QA.data.getCumulativeRanking();
      } catch (_) {}

      // Participantes (ranking acumulado)
      ranking.forEach(function (p) {
        var name = (p.name || "").toLowerCase();
        var area = (p.area || "").toLowerCase();
        if (name.indexOf(q) !== -1 || area.indexOf(q) !== -1) {
          results.push({
            type: "participante",
            title: p.name,
            sub:
              (p.area || "Sin área") +
              " · " +
              p.total +
              " aciertos acum. · " +
              p.jornadas +
              " jornadas",
            tag: "Jugador",
            score: name.indexOf(q) === 0 ? 3 : 2,
            action: function () {
              close();
              QA.app.showView("historial");
            },
          });
        }
      });

      // Jornadas
      jornadas.forEach(function (j) {
        var hay =
          (j.nombre || "").toLowerCase() +
          " " +
          (j.competencia || "").toLowerCase() +
          " " +
          (j.season || "").toLowerCase() +
          " " +
          (j.modeLabel || j.mode || "").toLowerCase();
        if (hay.indexOf(q) !== -1) {
          results.push({
            type: "jornada",
            title: j.nombre + (j.competencia ? " · " + j.competencia : ""),
            sub: [
              j.season,
              j.modeLabel || j.mode,
              j.estado,
              j.participantes + " boletas",
            ]
              .filter(Boolean)
              .join(" · "),
            tag: j.estado === "activa" ? "En vivo" : "Jornada",
            score: 2,
            action: function () {
              close();
              QA.app.openJornada(j.id);
            },
          });
        }
      });

      // Partidos de jornadas activas
      var activas = jornadas.filter(function (j) {
        return j.estado === "activa";
      });
      for (var i = 0; i < Math.min(activas.length, 3); i++) {
        try {
          var detail = await QA.data.loadPoolDetail(activas[i].id);
          (detail.matches || []).forEach(function (m) {
            var home = (m.home_team || "").toLowerCase();
            var away = (m.away_team || "").toLowerCase();
            if (home.indexOf(q) !== -1 || away.indexOf(q) !== -1) {
              var has =
                m.home_goals != null && m.away_goals != null;
              results.push({
                type: "partido",
                title:
                  (m.home_team || "?") + " vs " + (m.away_team || "?"),
                sub:
                  activas[i].nombre +
                  (has
                    ? " · " + m.home_goals + "-" + m.away_goals
                    : " · Pendiente"),
                tag: "Partido",
                score: 1,
                poolId: activas[i].id,
                action: function () {
                  close();
                  QA.app.openJornada(activas[i].id);
                },
              });
            }
          });
          // Participantes de la jornada activa
          (detail.leaderboard || []).forEach(function (p) {
            var n = (p.displayName || "").toLowerCase();
            var a = (p.displayArea || "").toLowerCase();
            if (n.indexOf(q) !== -1 || a.indexOf(q) !== -1) {
              // evitar duplicados de ranking si mismo nombre
              results.push({
                type: "participante-jornada",
                title: p.displayName,
                sub:
                  (p.displayArea || "") +
                  " · " +
                  activas[i].nombre +
                  (detail.isGoleo
                    ? p.goalPred != null
                      ? " · " + p.goalPred + " goles"
                      : ""
                    : " · " + p.aciertos + " aciertos") +
                  (p.paid ? " · Pagado" : " · Pendiente"),
                tag: "Boleta",
                score: n.indexOf(q) === 0 ? 4 : 3,
                action: function () {
                  close();
                  QA.app.openJornada(activas[i].id);
                },
              });
            }
          });
        } catch (_) {}
      }
    } catch (err) {
      console.error(err);
      el.innerHTML =
        '<div class="gs-empty">Error al buscar. Intenta de nuevo.</div>';
      return;
    }

    results.sort(function (a, b) {
      return (b.score || 0) - (a.score || 0);
    });
    results = results.slice(0, 40);

    if (!results.length) {
      el.innerHTML =
        '<div class="gs-empty">Sin resultados para “' +
        QA.utils.escape(raw) +
        '”</div>';
      return;
    }

    var groups = {};
    results.forEach(function (r) {
      var k =
        r.type.indexOf("participante") === 0
          ? "Participantes"
          : r.type === "jornada"
          ? "Jornadas"
          : "Partidos";
      if (!groups[k]) groups[k] = [];
      groups[k].push(r);
    });

    window._gsActions = results.map(function (r) {
      return r.action;
    });

    var html = "";
    Object.keys(groups).forEach(function (g) {
      html += '<div class="gs-section-title">' + g + "</div>";
      groups[g].forEach(function (r) {
        var idx = results.indexOf(r);
        html +=
          '<div class="gs-result" data-gs-idx="' +
          idx +
          '">' +
          '<div class="gs-result-main">' +
          '<div class="gs-result-title">' +
          highlight(r.title, q) +
          '</div><div class="gs-result-sub">' +
          QA.utils.escape(r.sub) +
          '</div></div><div class="gs-result-tag">' +
          QA.utils.escape(r.tag) +
          "</div></div>";
      });
    });
    el.innerHTML = html;
    el.querySelectorAll(".gs-result").forEach(function (node) {
      node.addEventListener("click", function () {
        var i = parseInt(node.getAttribute("data-gs-idx"), 10);
        if (window._gsActions && window._gsActions[i]) window._gsActions[i]();
      });
    });
  }

  return { init: ensureUI, open: open, close: close };
})();
