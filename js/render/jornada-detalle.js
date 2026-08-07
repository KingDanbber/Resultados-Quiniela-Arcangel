/* ═══════════════════════════════════════════
   Render · Detalle de Jornada
   Partidos · Clasificación · Podio · Confeti · Auto-refresh
   ═══════════════════════════════════════════ */

window.QA = window.QA || {};
QA.render = QA.render || {};

QA.render._jdExpanded = {};
QA.render._jdSearch = "";
QA.render._jdTab = "matches";
QA.render._jdCache = null;
QA.render._jdPoolId = null;
QA.render._jdRefreshTimer = null;
QA.render._jdRefreshSecs = 60;
QA.render._jdConfettiDone = {};

QA.render.jornadaDetalle = async function (poolId) {
  const el = document.getElementById("view-jornada-detalle");
  if (!el) return;

  QA.render._stopJdRefresh();
  el.innerHTML = '<div class="empty-state"><p>Cargando jornada…</p></div>';
  QA.render._jdExpanded = {};
  QA.render._jdSearch = "";
  QA.render._jdTab = "matches";
  QA.render._jdPoolId = poolId;

  let data;
  try {
    data = await QA.data.loadPoolDetail(poolId);
    QA.render._jdCache = data;
    try {
      var _raw0 = localStorage.getItem("qa_lb_snap_" + poolId);
      QA.render._jdPrevSnap = _raw0 ? JSON.parse(_raw0) : null;
    } catch (e0) {
      QA.render._jdPrevSnap = null;
    }
  } catch (err) {
    console.error(err);
    el.innerHTML =
      '<div class="empty-state"><div class="empty-icon">' +
      QA.icons.alert +
      "</div><p>No se pudo cargar la jornada</p>" +
      '<button type="button" class="jd-back" id="jd-back">← Volver</button></div>';
    var b = document.getElementById("jd-back");
    if (b)
      b.addEventListener("click", function () {
        QA.app.showView(QA.app._prevView || "jornadas");
      });
    return;
  }

  QA.render._paintJornadaDetalle(el, data, false);
  QA.render._startJdRefresh(poolId);
  if (data.jornadaDone && QA.resumen) {
    setTimeout(function () {
      QA.resumen.maybeShow(data, false);
    }, 600);
  }
};

QA.render._stopJdRefresh = function () {
  if (QA.render._jdRefreshTimer) {
    clearInterval(QA.render._jdRefreshTimer);
    QA.render._jdRefreshTimer = null;
  }
};

QA.render._startJdRefresh = function (poolId) {
  QA.render._stopJdRefresh();
  QA.render._jdRefreshSecs = 60;
  QA.render._jdRefreshTimer = setInterval(async function () {
    if (QA.app.currentView !== "jornada-detalle") {
      QA.render._stopJdRefresh();
      return;
    }
    QA.render._jdRefreshSecs--;
    var fill = document.getElementById("jd-refresh-fill");
    var txt = document.getElementById("jd-refresh-text");
    if (fill) fill.style.width = (QA.render._jdRefreshSecs / 60) * 100 + "%";
    if (txt) txt.textContent = "Auto-refresh: " + QA.render._jdRefreshSecs + "s";

    if (QA.render._jdRefreshSecs <= 0) {
      QA.render._jdRefreshSecs = 60;
      try {
        var data = await QA.data.loadPoolDetail(poolId);
        QA.render._jdCache = data;
        try {
          var _r = localStorage.getItem("qa_lb_snap_" + poolId);
          QA.render._jdPrevSnap = _r ? JSON.parse(_r) : null;
        } catch (e2) {
          QA.render._jdPrevSnap = null;
        }
        var el = document.getElementById("view-jornada-detalle");
        if (el && QA.app.currentView === "jornada-detalle") {
          QA.render._paintJornadaDetalle(el, data, true);
        }
      } catch (e) {
        console.warn("auto-refresh failed", e);
      }
    }
  }, 1000);
};

QA.render._paintJornadaDetalle = function (el, data, silent) {
  var escape = QA.utils.escape;
  var meta = data.meta;
  var matches = data.matches;
  var lb = data.leaderboard;
  var completed = data.completed;
  var total = matches.length;
  var isGoleo = !!data.isGoleo;
  var totalGoals =
    data.totalGoalsReal != null
      ? data.totalGoalsReal
      : data.totalGoalsPartial != null
      ? data.totalGoalsPartial
      : 0;
  var goalsComplete = data.totalGoalsReal != null;
  var maxH = lb.length
    ? Math.max.apply(
        null,
        lb.map(function (p) {
          return isGoleo ? p.goalPred || 0 : p.aciertos;
        })
      )
    : 0;
  var exactCount = isGoleo
    ? lb.filter(function (p) {
        return p.exactGoals;
      }).length
    : 0;
  var pickLabel = QA.data.pickLabel;
  // _jdPrevSnap se fija en load/refresh; no se resetea al cambiar de tab

  var statusClass =
    data.jornadaDone
      ? "date-done"
      : meta.estado === "activa"
      ? "date-open"
      : meta.estado === "borrador"
      ? "date-closed"
      : "date-done";
  var statusLabel = data.jornadaDone
    ? "Finalizada"
    : meta.estado === "activa"
    ? "Activa"
    : meta.estado;

  var podioHtml = renderPodio(lb, completed, data.jornadaDone, maxH);

  el.innerHTML =
    '<button type="button" class="jd-back" id="jd-back">' +
    QA.icons.arrowLeft +
    " Volver</button>" +
    '<div class="jd-header">' +
    '<div class="jd-header-top">' +
    '<span class="comp-badge">' +
    escape(meta.competencia) +
    (meta.season ? " · " + escape(meta.season) : "") +
    "</span>" +
    '<span class="date-badge ' +
    statusClass +
    '">' +
    escape(statusLabel) +
    "</span>" +
    "</div>" +
    '<h2 class="pool-name">' +
    escape(meta.nombre) +
    (meta.modeLabel && meta.modeLabel !== "Sencilla"
      ? ' <span class="mode-chip' +
        (String(meta.mode || "").toUpperCase().indexOf("GOLE") !== -1
          ? " mode-goleo"
          : " mode-sencilla") +
        '">' +
        escape(meta.modeLabel) +
        "</span>"
      : ' <span class="mode-chip mode-sencilla">Sencilla</span>') +
    "</h2>" +
    '<p class="pool-meta">' +
    (meta.dateLabel ? escape(meta.dateLabel) + " · " : "") +
    completed +
    "/" +
    total +
    " partidos · " +
    lb.length +
    " boletas</p>" +
    "</div>" +
    '<div class="jd-tools">' +
    '<button type="button" class="jd-tool-btn" id="jd-my-boleta">Mi boleta</button>' +
    '<button type="button" class="jd-tool-btn" id="jd-compare">Comparar</button>' +
    '<button type="button" class="jd-tool-btn" id="jd-share">Compartir</button>' +
    '<span class="jd-my-label" id="jd-my-label"></span>' +
    "</div>" +
    (QA.myBoleta ? QA.myBoleta.stickyCardHtml(data) : "") +
    '<div class="jd-refresh" id="jd-refresh">' +
    '<div class="jd-refresh-bar"><div class="jd-refresh-fill" id="jd-refresh-fill" style="width:' +
    (QA.render._jdRefreshSecs / 60) * 100 +
    '%"></div></div>' +
    '<span class="jd-refresh-text" id="jd-refresh-text">Auto-refresh: ' +
    QA.render._jdRefreshSecs +
    "s</span>" +
    "</div>" +
    renderBolsaCard(data, lb) +
    renderTotalGolesCard(data) +
    (maxH > 0
      ? '<div class="jd-stats-strip">' +
        '<div class="jd-stat"><span class="jd-stat-val">' +
        completed +
        "/" +
        total +
        '</span><span class="jd-stat-lbl">Partidos</span></div>' +
        '<div class="jd-stat"><span class="jd-stat-val">' +
        maxH +
        '</span><span class="jd-stat-lbl">Máx. aciertos</span></div>' +
        '<div class="jd-stat"><span class="jd-stat-val">' +
        lb.filter(function (p) {
          return p.aciertos === maxH && completed > 0;
        }).length +
        '</span><span class="jd-stat-lbl">En la cima</span></div>' +
        "</div>"
      : '<div class="jd-stats-strip">' +
        '<div class="jd-stat"><span class="jd-stat-val">' +
        completed +
        "/" +
        total +
        '</span><span class="jd-stat-lbl">Partidos</span></div>' +
        '<div class="jd-stat"><span class="jd-stat-val">' +
        lb.length +
        '</span><span class="jd-stat-lbl">Boletas</span></div></div>') +
    podioHtml +
    '<div id="jd-modal-root"></div>' +
    '<div class="jd-tabs" id="jd-tabs">' +
    '<button type="button" class="tab-btn ' +
    (QA.render._jdTab === "matches" ? "active" : "") +
    '" data-jdtab="matches">' +
    QA.icons.ball +
    " Partidos</button>" +
    '<button type="button" class="tab-btn ' +
    (QA.render._jdTab === "leaderboard" ? "active" : "") +
    '" data-jdtab="leaderboard">' +
    QA.icons.trophy +
    " Clasificación</button>" +
    '<button type="button" class="tab-btn ' +
    (QA.render._jdTab === "stats" ? "active" : "") +
    '" data-jdtab="stats">' +
    QA.icons.table +
    " Estadísticas</button>" +
    "</div>" +
    '<div id="jd-panel-matches" style="display:' +
    (QA.render._jdTab === "matches" ? "block" : "none") +
    '">' +
    renderMatches(matches) +
    "</div>" +
    '<div id="jd-panel-lb" style="display:' +
    (QA.render._jdTab === "leaderboard" ? "block" : "none") +
    '">' +
    renderLeaderboardPanel(lb, completed, data.jornadaDone, maxH) +
    "</div>" +
    '<div id="jd-panel-stats" style="display:' +
    (QA.render._jdTab === "stats" ? "block" : "none") +
    '">' +
    renderStatsPanel(lb, matches, completed, maxH) +
    "</div>";

  document.getElementById("jd-back").addEventListener("click", function () {
    QA.render._stopJdRefresh();
    QA.app.showView(QA.app._prevView || "jornadas");
  });

  (function bindTools() {
    var myBtn = document.getElementById("jd-my-boleta");
    var shareBtn = document.getElementById("jd-share");
    var label = document.getElementById("jd-my-label");
    function refreshLabel() {
      if (!label) return;
      var mine =
        QA.myBoleta && QA.myBoleta.findInLeaderboard(meta.id, lb);
      if (mine) {
        label.innerHTML =
          "Boleta: <strong>" +
          QA.utils.escape(mine.displayName) +
          '</strong> <button type="button" class="jd-clear-mine" id="jd-clear-mine">✕</button>';
        var clr = document.getElementById("jd-clear-mine");
        if (clr)
          clr.onclick = function (e) {
            e.stopPropagation();
            QA.myBoleta.clear(meta.id);
            QA.render._paintJornadaDetalle(el, data, true);
          };
      } else {
        label.textContent = "Sin boleta elegida";
      }
    }
    refreshLabel();
    if (myBtn) {
      myBtn.onclick = function () {
        QA.render.openMyBoletaPicker(el, data);
      };
    }
    var cmpBtn = document.getElementById("jd-compare");
    if (cmpBtn) {
      cmpBtn.onclick = function () {
        if (QA.compare) QA.compare.open(data);
      };
    }
    var stickyPick = document.getElementById("my-sticky-pick");
    var stickyChange = document.getElementById("my-sticky-change");
    if (stickyPick) {
      stickyPick.onclick = function () {
        QA.render.openMyBoletaPicker(el, data);
      };
    }
    if (stickyChange) {
      stickyChange.onclick = function () {
        QA.render.openMyBoletaPicker(el, data);
      };
    }
    if (shareBtn) {
      shareBtn.onclick = function () {
        shareBtn.disabled = true;
        var prev = shareBtn.textContent;
        shareBtn.textContent = "…";
        QA.share
          .shareJornada(data, "mine")
          .then(function () {
            shareBtn.disabled = false;
            shareBtn.textContent = prev || "Compartir";
          })
          .catch(function () {
            shareBtn.disabled = false;
            shareBtn.textContent = prev || "Compartir";
          });
      };
    }
  })();

  el.querySelectorAll("[data-jdtab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      QA.render._jdTab = btn.dataset.jdtab;
      QA.render._paintJornadaDetalle(el, data, true);
      if (
        QA.render._jdTab === "leaderboard" &&
        data.jornadaDone &&
        maxH > 0
      ) {
        maybeConfetti(data.meta.id);
      }
    });
  });

  var search = el.querySelector("#jd-search");
  if (search) {
    search.value = QA.render._jdSearch;
    search.addEventListener("input", function () {
      QA.render._jdSearch = search.value;
      var wrap = el.querySelector("#jd-lb-body");
      if (wrap) {
        wrap.innerHTML = renderLbRows(
          filterLb(lb),
          completed,
          data.jornadaDone,
          maxH
        );
        bindLbRows(el, data);
      }
    });
  }

  bindLbRows(el, data);
  bindMatchCards(el, data);
  bindNotices(el);

  // Guardar snapshot actual DESPUÉS de mostrar deltas (para el próximo refresh)
  try {
    var snap = lb.map(function (p, i) {
      return { id: p.id, rank: i + 1, aciertos: p.aciertos };
    });
    localStorage.setItem("qa_lb_snap_" + data.meta.id, JSON.stringify(snap));
    // No actualizar _jdPrevSnap aquí: los deltas deben verse hasta el siguiente load real
  } catch (e) {}

  if (data.jornadaDone && maxH > 0 && !silent) {
    maybeConfetti(data.meta.id);
  }

  function kpi(lbl, val) {
    return (
      '<div class="kpi-card"><div class="kpi-val">' +
      val +
      '</div><div class="kpi-lbl">' +
      lbl +
      "</div></div>"
    );
  }

  function resultChip(r) {
    if (!r) return "";
    var cls = r === "1" ? "rL" : r === "X" ? "rE" : "rV";
    return (
      '<span class="result-chip ' +
      cls +
      '" title="' +
      (QA.data.pickLabelFull(r) || "") +
      '">' +
      pickLabel(r) +
      "</span>"
    );
  }

  function renderMatches(list) {
    if (!list.length) {
      return '<div class="empty-state"><p>Sin partidos</p></div>';
    }
    return (
      '<div class="match-grid">' +
      list
        .map(function (m) {
          var result = QA.data.getResult(m.home_goals, m.away_goals);
          var hasScore = result !== null;
          var hLogo = QA.data.teamLogo(m.home_team);
          var aLogo = QA.data.teamLogo(m.away_team);
          return (
            '<div class="match-card' +
            (hasScore ? " has-score" : "") +
            '" data-match-id="' +
            escape(m.id) +
            '" role="button" tabindex="0">' +
            '<div class="match-head"><span class="match-no">Partido ' +
            (m.match_no || "") +
            "</span>" +
            (hasScore
              ? resultChip(result)
              : '<span class="match-time">Pendiente</span>') +
            "</div>" +
            '<div class="match-body">' +
            teamCol(hLogo, m.home_team) +
            '<div class="score-col">' +
            (hasScore
              ? '<div class="score-nums"><span class="score-num">' +
                m.home_goals +
                '</span><span class="score-sep">-</span><span class="score-num">' +
                m.away_goals +
                "</span></div>"
              : '<div class="score-vs">VS</div>') +
            "</div>" +
            teamCol(aLogo, m.away_team) +
            '</div><div class="match-hint">Ver pronósticos</div></div>'
          );

        })
        .join("") +
      "</div>"
    );
  }

  function teamCol(logo, name) {
    var ini = initials(name);
    var logoHtml;
    if (logo) {
      logoHtml =
        '<img class="team-logo" src="' +
        logo +
        '" alt="" onerror="this.style.display=\'none\'">';
    } else {
      logoHtml = '<div class="team-logo-ph">' + ini + "</div>";
    }
    return (
      '<div class="team-col">' +
      logoHtml +
      '<div class="team-name">' +
      escape(name || "") +
      "</div></div>"
    );
  }

  function initials(name) {
    return (name || "?").trim().slice(0, 3).toUpperCase();
  }

  function filterLb(list) {
    var q = (QA.render._jdSearch || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter(function (p) {
      return (
        (p.displayName || "").toLowerCase().indexOf(q) !== -1 ||
        (p.displayArea || "").toLowerCase().indexOf(q) !== -1
      );
    });
  }

  function renderLeaderboardPanel(list, completed, jornadaDone, maxH) {
    return (
      renderNarratorBox(list, completed, jornadaDone, maxH) +
      renderInfoNotices(list, jornadaDone) +
      '<div class="jd-search-wrap">' +
      '<input id="jd-search" class="jd-search" type="search" placeholder="Buscar participante…"/>' +
      "</div>" +
      '<div class="lb-wrap">' +
      '<div class="lb-header-row"><span>#</span><span>Participante</span><span>' +
      (isGoleo ? "Total Goles" : "Aciertos") +
      '</span><span>Pago</span></div>' +
      '<div id="jd-lb-body">' +
      renderLbRows(filterLb(list), completed, jornadaDone, maxH) +
      "</div></div>"
    );
  }

  function noticeDismissed(key) {
    try {
      return localStorage.getItem("qa_notice_" + key) === "1";
    } catch (e) {
      return false;
    }
  }

  function renderInfoNotices(list, jornadaDone) {
    var pending = list.filter(function (p) {
      return !p.paid;
    }).length;
    var html = '<div class="jd-notices" id="jd-notices">';

    // Cómo se gana — colapsado por defecto, no invasivo
    if (!noticeDismissed("como_gana")) {
      html +=
        '<details class="jd-notice jd-notice-rules">' +
        "<summary>" +
        '<span class="jd-notice-ico">🏅</span>' +
        '<span class="jd-notice-sum">¿Cómo se gana?</span>' +
        '<button type="button" class="jd-notice-x" data-dismiss="como_gana" aria-label="Cerrar">×</button>' +
        "</summary>" +
        '<div class="jd-notice-body">' +
        (isGoleo
          ? "Gana quien acierte <strong>exactamente el total de goles</strong> de la jornada (suma de todos los partidos). " +
            "Si nadie acierta el número exacto, la <strong>bolsa se acumula</strong> para la siguiente jornada. " +
            "Si varios aciertan, se <strong>reparte</strong> entre ellos. Solo boletos <strong>pagados</strong>."
          : "El participante con el <strong>mayor número de aciertos</strong> se lleva la bolsa neta. " +
            "Si dos o más empatan, la bolsa se <strong>reparte en partes iguales</strong> entre ellos. " +
            "Solo cuentan boletos <strong>pagados</strong>.") +
        "</div></details>";
    }

    // Advertencia de pago — solo si hay pendientes
    if (pending > 0 && !noticeDismissed("pago_" + (data.meta && data.meta.id))) {
      html +=
        '<div class="jd-notice jd-notice-pay">' +
        '<div class="jd-notice-row">' +
        '<span class="jd-notice-ico">⚠️</span>' +
        '<div class="jd-notice-text">' +
        '<div class="jd-notice-title">Boleto sin pagar no juega</div>' +
        '<div class="jd-notice-sub">' +
        pending +
        " boleto" +
        (pending > 1 ? "s" : "") +
        " pendiente" +
        (pending > 1 ? "s" : "") +
        ". Los pronósticos se ven, pero <strong>solo los pagados</strong> valen para el premio." +
        (jornadaDone
          ? ""
          : " Límite orientativo: <strong>sábado 4:00 PM</strong>.") +
        "</div></div>" +
        '<button type="button" class="jd-notice-x" data-dismiss="pago_' +
        escape(data.meta.id) +
        '" aria-label="Cerrar">×</button>' +
        "</div></div>";
    }

    html += "</div>";
    return html;
  }

  function renderLbRows(list, completed, jornadaDone, maxH) {
    if (!list.length) {
      return (
        '<div class="empty-state" style="padding:24px"><p>Sin resultados</p></div>'
      );
    }
    return list
      .map(function (p, i) {
        var rank = i + 1;
        var pct = maxH > 0 ? Math.round((p.aciertos / maxH) * 100) : 0;
        var expanded = !!QA.render._jdExpanded[p.id];
        var paidCls = p.paid ? "paid-yes" : "paid-no";
        var paidTxt = p.paid
          ? "Pagado"
          : jornadaDone
          ? "No pagado"
          : "Pendiente";
        var picks = "";
        if (expanded) {
          picks =
            '<div class="picks-panel open"><div class="picks-grid">' +
            p.details
              .map(function (d) {
                var cls =
                  d.result == null ? "" : d.correct ? "correct" : "wrong";
                return (
                  '<div class="pick-card ' +
                  cls +
                  '"><div class="pick-match-no">P' +
                  (d.match.match_no || "") +
                  "</div>" +
                  '<div class="pick-teams">' +
                  escape((d.match.home_team || "").slice(0, 10)) +
                  " vs " +
                  escape((d.match.away_team || "").slice(0, 10)) +
                  "</div>" +
                  '<div class="pick-row"><span>Pick: <strong>' +
                  pickLabel(d.pick) +
                  "</strong></span>" +
                  (d.result != null
                    ? ' <span>Real: <strong>' +
                      pickLabel(d.result) +
                      "</strong></span>"
                    : "") +
                  (d.result != null
                    ? d.correct
                      ? ' <span class="pick-ok">✓</span>'
                      : ' <span class="pick-no">✗</span>'
                    : "") +
                  "</div></div>"
                );
              })
              .join("") +
            "</div></div>";
        }
        var isTop = isGoleo
          ? !!p.exactGoals
          : completed > 0 && maxH > 0 && p.aciertos === maxH;
        var deltaHtml = rankDeltaHtml(p.id, rank);
        return (
          '<div class="lb-row' +
          (expanded ? " expanded" : "") +
          (rank <= 3 && jornadaDone ? " rank-" + rank : "") +
          (isTop ? " is-winner" : "") +
          (QA.myBoleta &&
          QA.myBoleta.get(meta.id) &&
          QA.myBoleta.get(meta.id).entryId === p.id
            ? " is-mine"
            : "") +
          '" data-entry="' +
          escape(p.id) +
          '">' +
          '<div class="lb-rank">' +
          (isTop
            ? '<span class="lb-crown" title="Máximo de aciertos">' +
              (QA.icons.crown || "👑") +
              "</span>"
            : rank) +
          deltaHtml +
          "</div>" +
          '<div class="lb-name-col"><div class="lb-name">' +
          escape(p.displayName) +
          (isTop
            ? ' <span class="winner-tag">' +
              (isGoleo ? "Exacto" : "Ganador") +
              "</span>"
            : "") +
          (p.boletaNo
            ? ' <span class="boleta-tag">Boleta ' + p.boletaNo + "</span>"
            : "") +
          '</div><div class="lb-area">' +
          escape(p.displayArea || "") +
          ' <span class="lb-hint-txt">· ver picks</span></div></div>' +
          '<div class="lb-hits"><div class="lb-hits-val' +
          (isGoleo && p.exactGoals ? " exact-goal" : "") +
          '">' +
          (isGoleo
            ? p.goalPred != null
              ? p.goalPred
              : "—"
            : completed > 0
            ? p.aciertos
            : "—") +
          "</div>" +
          (isGoleo && goalsComplete && p.goalPred != null
            ? '<div class="lb-goal-diff">' +
              (p.exactGoals
                ? "✓ exacto"
                : (p.goalPred > totalGoals ? "+" : "") +
                  (p.goalPred - totalGoals) +
                  " vs real") +
              "</div>"
            : completed > 0 && !isGoleo
            ? '<div class="lb-bar-wrap"><div class="lb-bar" style="width:' +
              pct +
              '%"></div></div>'
            : "") +
          "</div>" +
          '<div class="lb-paid"><span class="paid-chip ' +
          paidCls +
          '">' +
          paidTxt +
          "</span></div>" +
          "</div>" +
          picks
        );
      })
      .join("");
  }

  function bindLbRows(root, dataRef) {
    root.querySelectorAll(".lb-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var id = row.dataset.entry;
        QA.render._jdExpanded[id] = !QA.render._jdExpanded[id];
        QA.render._paintJornadaDetalle(root, dataRef, true);
      });
    });
  }

  function renderPodio(list, completed, jornadaDone, maxH) {
    var paidTop = list
      .filter(function (p) {
        return p.paid && completed > 0;
      })
      .slice(0, 3);
    if (!jornadaDone || paidTop.length < 2 || maxH === 0) return "";
    var ord = [paidTop[1], paidTop[0], paidTop[2]].filter(Boolean);
    var trophies = ["🥈", "🥇", "🥉"];
    var classes = ["podio-2", "podio-1", "podio-3"];
    var ranks = [2, 1, 3];
    return (
      '<div id="podio-3d" class="podio-3d visible">' +
      '<div class="podio-title">' +
      QA.icons.trophy +
      " PODIO JORNADA</div>" +
      '<div class="podio-wrap">' +
      ord
        .map(function (p, i) {
          var isWin = i === 1;
          return (
            '<div class="podio-col">' +
            (isWin
              ? '<div class="podio-crown">' + QA.icons.crown + "</div>"
              : "") +
            '<div class="podio-trophy">' +
            trophies[i] +
            "</div>" +
            '<div class="podio-name" title="' +
            escape(p.displayName) +
            '">' +
            escape((p.displayName || "").split(" ")[0]) +
            "</div>" +
            '<div class="podio-hits"' +
            (isWin ? ' style="color:var(--amber)"' : "") +
            ">" +
            p.aciertos +
            " aciertos</div>" +
            '<div class="podio-block ' +
            classes[i] +
            '">' +
            ranks[i] +
            "</div>" +
            '<div class="podio-floor"></div>' +
            "</div>"
          );
        })
        .join("") +
      "</div></div>"
    );
  }



  function renderStatsPanel(list, matchList, completed, maxH) {
    if (!list.length) {
      return '<div class="empty-state"><p>Sin datos para estadísticas</p></div>';
    }

    var sorted = list.slice().sort(function (a, b) {
      return b.aciertos - a.aciertos;
    });
    var maxHits = Math.max(matchList.length, maxH, 1);

    var hitsBars = sorted
      .map(function (p, i) {
        var pct = Math.round((p.aciertos / maxHits) * 100);
        var isTop = completed > 0 && maxH > 0 && p.aciertos === maxH;
        return (
          '<div class="st-bar-row' +
          (isTop ? " is-top" : "") +
          '">' +
          '<div class="st-bar-name" title="' +
          escape(p.displayName) +
          '">' +
          escape(p.displayName) +
          "</div>" +
          '<div class="st-bar-track"><div class="st-bar-fill' +
          (isTop ? " top" : "") +
          '" style="width:' +
          pct +
          '%"></div></div>' +
          '<div class="st-bar-val">' +
          (completed > 0 ? p.aciertos : "—") +
          "</div></div>"
        );
      })
      .join("");

    // Global pick distribution
    var counts = { "1": 0, X: 0, "2": 0 };
    var totalPicks = 0;
    list.forEach(function (p) {
      (p.details || []).forEach(function (d) {
        if (d.pick === "1" || d.pick === "X" || d.pick === "2") {
          counts[d.pick]++;
          totalPicks++;
        }
      });
    });
    var pctG = function (n) {
      return totalPicks ? Math.round((n / totalPicks) * 100) : 0;
    };
    var distHtml = ["1", "X", "2"]
      .map(function (k) {
        var p = pctG(counts[k]);
        var cls = k === "1" ? "rL" : k === "X" ? "rE" : "rV";
        var col = k === "1" ? "#3b82f6" : k === "X" ? "#f59e0b" : "#ef4444";
        return (
          '<div class="st-dist-item">' +
          '<div class="st-dist-head"><span class="result-chip ' +
          cls +
          '">' +
          pickLabel(k) +
          "</span><span>" +
          escape(QA.data.pickLabelFull(k)) +
          '</span><span class="st-dist-pct">' +
          p +
          "%</span></div>" +
          '<div class="st-bar-track"><div class="st-bar-fill" style="width:' +
          p +
          "%;background:" +
          col +
          '"></div></div>' +
          '<div class="st-dist-n">' +
          counts[k] +
          " picks</div></div>"
        );
      })
      .join("");

    // Match difficulty: % correct picks
    var matchDiff = matchList
      .map(function (m) {
        var result = QA.data.getResult(m.home_goals, m.away_goals);
        var ok = 0;
        var total = 0;
        list.forEach(function (p) {
          var d = (p.details || []).find(function (x) {
            return x.match && x.match.id === m.id;
          });
          if (d && d.pick) {
            total++;
            if (d.correct) ok++;
          }
        });
        var pct = total ? Math.round((ok / total) * 100) : null;
        return {
          match: m,
          result: result,
          pct: pct,
          ok: ok,
          total: total,
        };
      })
      .sort(function (a, b) {
        if (a.pct == null && b.pct == null) return 0;
        if (a.pct == null) return 1;
        if (b.pct == null) return -1;
        return a.pct - b.pct;
      });

    var diffHtml = matchDiff
      .map(function (row) {
        var hard =
          row.pct != null && row.pct < 35
            ? " hard"
            : row.pct != null && row.pct > 65
            ? " easy"
            : "";
        return (
          '<div class="st-match-row' +
          hard +
          '">' +
          '<div class="st-match-info"><span class="st-match-no">P' +
          (row.match.match_no || "") +
          "</span> " +
          escape((row.match.home_team || "").slice(0, 12)) +
          " vs " +
          escape((row.match.away_team || "").slice(0, 12)) +
          (row.result
            ? ' <span class="result-chip ' +
              (row.result === "1" ? "rL" : row.result === "X" ? "rE" : "rV") +
              '">' +
              pickLabel(row.result) +
              "</span>"
            : "") +
          '</div><div class="st-match-pct">' +
          (row.pct != null ? row.pct + "%" : "—") +
          '<span class="st-match-n"> ' +
          row.ok +
          "/" +
          row.total +
          "</span></div></div>"
        );
      })
      .join("");

    return (
      '<div class="st-section">' +
      '<div class="st-section-title">' +
      QA.icons.trophy +
      " Aciertos por participante</div>" +
      '<div class="st-hits-chart">' +
      hitsBars +
      "</div></div>" +
      '<div class="st-section">' +
      '<div class="st-section-title">' +
      QA.icons.ball +
      " Distribución de picks (L / E / V)</div>" +
      '<div class="st-dist">' +
      distHtml +
      "</div></div>" +
      '<div class="st-section">' +
      '<div class="st-section-title">' +
      QA.icons.table +
      " Dificultad por partido</div>" +
      '<p class="st-note">% de boletas que acertaron cada partido (menor = más difícil)</p>' +
      '<div class="st-match-list">' +
      diffHtml +
      "</div></div>"
    );
  }


  function snapKey() {
    return "qa_lb_snap_" + (data.meta && data.meta.id ? data.meta.id : "x");
  }

  function loadRankSnapshot() {
    try {
      var raw = localStorage.getItem(snapKey());
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveRankSnapshot(list) {
    try {
      var snap = list.map(function (p, i) {
        return { id: p.id, rank: i + 1, aciertos: p.aciertos };
      });
      localStorage.setItem(snapKey(), JSON.stringify(snap));
    } catch (e) {}
  }

  function rankDeltaHtml(entryId, currentRank) {
    var prev = QA.render._jdPrevSnap;
    if (!prev || !prev.length) return "";
    var found = prev.find(function (x) {
      return x.id === entryId;
    });
    if (!found) return '<span class="rank-delta rank-new" title="Nuevo">NEW</span>';
    var diff = found.rank - currentRank;
    if (diff === 0) {
      return '<span class="rank-delta rank-same" title="Sin cambios">≈</span>';
    }
    if (diff > 0) {
      return (
        '<span class="rank-delta rank-up" title="Subió ' +
        diff +
        '">↑' +
        diff +
        "</span>"
      );
    }
    return (
      '<span class="rank-delta rank-down" title="Bajó ' +
      Math.abs(diff) +
      '">↓' +
      Math.abs(diff) +
      "</span>"
    );
  }

  function firstName(n) {
    return (n || "").split(" ")[0] || n || "";
  }

  function renderNarratorBox(list, completed, jornadaDone, maxH) {
    if (!list.length) return "";
    var paid = list.filter(function (p) {
      return p.paid;
    });
    var pending = list.filter(function (p) {
      return !p.paid;
    });
    var totalM = matches.length || 0;
    var msgs = [];
    var prev = QA.render._jdPrevSnap;

    if (jornadaDone) {
      if (!paid.length) {
        msgs.push({
          t: "⚠️ ¡JORNADA FINALIZADA!",
          h: true,
        });
        msgs.push({
          t: "No hay ganador válido: ningún boleto fue pagado.",
          warn: true,
        });
      } else if (isGoleo) {
        var exactPaid = paid.filter(function (p) {
          return p.exactGoals;
        });
        if (exactPaid.length === 1) {
          msgs.push({ t: "⚽ ¡¡CAMPEÓN DE GOLEO!!", h: true });
          msgs.push({
            t:
              "¡" +
              firstName(exactPaid[0].displayName) +
              " acertó los " +
              totalGoals +
              " goles exactos!",
          });
        } else if (exactPaid.length > 1) {
          msgs.push({ t: "⚽ ¡¡EMPATE EN GOLEO!!", h: true });
          msgs.push({
            t:
              exactPaid
                .slice(0, 3)
                .map(function (w) {
                  return firstName(w.displayName);
                })
                .join(", ") +
              " acertaron " +
              totalGoals +
              " goles. ¡Se reparte la bolsa!",
          });
        } else {
          msgs.push({ t: "⚽ Nadie acertó el total exacto", h: true });
          msgs.push({
            t:
              "El total fue " +
              totalGoals +
              " goles. La bolsa se acumula para la siguiente jornada.",
            warn: true,
          });
        }
      } else {
        var paidMax = paid.reduce(function (mx, p) {
          return Math.max(mx, p.aciertos);
        }, 0);
        var winners = paid.filter(function (p) {
          return p.aciertos === paidMax && paidMax > 0;
        });
        if (winners.length === 1) {
          msgs.push({ t: "🏆 ¡¡CAMPEÓN DE LA JORNADA!!", h: true });
          msgs.push({
            t:
              "¡¡" +
              firstName(winners[0].displayName) +
              " LO LOGRÓ!! " +
              paidMax +
              " aciertos y se lleva TODO.",
          });
        } else if (winners.length === 2) {
          msgs.push({ t: "🤝 ¡¡EMPATE ÉPICO EN LA CIMA!!", h: true });
          msgs.push({
            t:
              "¡" +
              firstName(winners[0].displayName) +
              " y " +
              firstName(winners[1].displayName) +
              " comparten el primer lugar con " +
              paidMax +
              " aciertos!",
          });
        } else if (winners.length > 2) {
          msgs.push({ t: "🤝 ¡¡EMPATE HISTÓRICO!!", h: true });
          msgs.push({
            t:
              winners
                .slice(0, 3)
                .map(function (w) {
                  return firstName(w.displayName);
                })
                .join(", ") +
              " se dividen la corona con " +
              paidMax +
              " aciertos.",
          });
        }
        if (pending.length) {
          msgs.push({
            t:
              "⚠️ " +
              pending.length +
              " boleto(s) sin pagar no cuentan para el premio.",
            warn: true,
          });
        }
      }
    } else {
      // in progress
      if (prev && completed > 0) {
        var changes = [];
        list.forEach(function (p, newIdx) {
          var old = prev.find(function (x) {
            return x.id === p.id;
          });
          if (old && old.rank !== newIdx + 1) {
            changes.push({
              name: firstName(p.displayName),
              from: old.rank,
              to: newIdx + 1,
              hits: p.aciertos,
              paid: p.paid,
            });
          }
        });
        changes
          .sort(function (a, b) {
            return a.to - b.to;
          })
          .slice(0, 3)
          .forEach(function (c) {
            var pb = c.paid ? "" : " ⚠️";
            if (c.to === 1 && c.from !== 1) {
              msgs.push({
                t:
                  "🔥 ¡¡" +
                  c.name +
                  pb +
                  " SUBE AL LIDERATO!! ¡" +
                  c.hits +
                  " aciertos!",
                h: true,
              });
            } else if (c.to < c.from) {
              msgs.push({
                t:
                  "⚡ ¡" +
                  c.name +
                  pb +
                  " sube del " +
                  c.from +
                  "° al " +
                  c.to +
                  "°!",
              });
            } else if (c.to > c.from && c.from === 1) {
              msgs.push({ t: "😱 ¡" + c.name + " PIERDE el liderato!" });
            }
          });
      }

      if (completed === 0) {
        msgs.push({
          t: "⏳ ¡Jornada activa! Esperando el inicio de los partidos...",
        });
        msgs.push({
          t:
            "👥 " +
            list.length +
            " participantes · " +
            paid.length +
            " pagados. ¡Suerte a todos!",
        });
      } else if (list[0] && list[0].aciertos > 0) {
        var leader = list[0];
        var pb = leader.paid ? "" : " ⚠️";
        var phrases = [
          "🎙️ ¡" +
            firstName(leader.displayName) +
            pb +
            " LIDERA con " +
            leader.aciertos +
            " aciertos!",
          "🔥 ¡" +
            firstName(leader.displayName) +
            pb +
            " está imparable! " +
            leader.aciertos +
            " de " +
            totalM,
          "📢 ¡" +
            firstName(leader.displayName) +
            pb +
            " AL FRENTE con " +
            leader.aciertos +
            " correctas!",
        ];
        msgs.push({
          t: phrases[Math.floor(Date.now() / 8000) % phrases.length],
          h: msgs.length === 0,
        });
        if (list[1] && list[1].aciertos > 0) {
          var diff = leader.aciertos - list[1].aciertos;
          var p2 = firstName(list[1].displayName) + (list[1].paid ? "" : " ⚠️");
          if (diff === 0) {
            msgs.push({
              t: "😤 ¡" + p2 + " EMPATADO en la cima!",
            });
          } else if (diff === 1) {
            msgs.push({
              t: "🎯 ¡" + p2 + " a solo UN ACIERTO del líder!",
            });
          } else {
            msgs.push({
              t:
                "📊 " +
                p2 +
                " acecha desde el 2° con " +
                list[1].aciertos +
                " aciertos.",
            });
          }
        }
        if (list[2] && list[2].aciertos > 0) {
          msgs.push({
            t:
              "🥉 " +
              firstName(list[2].displayName) +
              (list[2].paid ? "" : " ⚠️") +
              " firme en el TOP 3.",
          });
        }
      }

      if (pending.length) {
        msgs.push({
          t:
            "💳 " +
            pending.length +
            " boleto(s) pendientes. ¡Solo los pagados son válidos para el premio!",
          warn: true,
        });
      }
    }

    if (!msgs.length) return "";

    var isLive = !jornadaDone;
    return (
      '<div class="narrator-card" id="lb-narrator">' +
      '<div class="narrator-header">' +
      '<span class="narrator-mic">🎙️</span>' +
      '<span class="narrator-title">Narrador de la Jornada</span>' +
      (isLive
        ? '<span class="narrator-live"><span class="narrator-live-dot"></span>EN VIVO</span>'
        : '<span class="narrator-live narrator-fin">FIN</span>') +
      "</div>" +
      '<div class="narrator-msgs">' +
      msgs
        .map(function (m, i) {
          return (
            (i > 0 ? '<div class="narrator-separator"></div>' : "") +
            '<div class="narrator-msg' +
            (m.h ? " highlight" : "") +
            (m.warn ? " warn" : "") +
            '">' +
            escape(m.t) +
            "</div>"
          );
        })
        .join("") +
      "</div></div>"
    );
  }


  function renderTotalGolesCard(dataRef) {
    if (!dataRef.isGoleo) return "";
    var partial = dataRef.totalGoalsPartial != null ? dataRef.totalGoalsPartial : 0;
    var real = dataRef.totalGoalsReal;
    var done = dataRef.goalsMatchesDone || 0;
    var totalM = (dataRef.matches || []).length;
    var exactN = (dataRef.exactWinners || []).length;
    var statusTxt =
      real != null
        ? exactN > 0
          ? exactN + " acierto" + (exactN > 1 ? "s" : "") + " exacto" + (exactN > 1 ? "s" : "")
          : "Nadie acertó · bolsa se acumula"
        : "En curso · " + done + "/" + totalM + " partidos";
    return (
      '<div class="goles-card">' +
      '<div class="goles-head">' +
      '<div class="goles-icon">⚽</div>' +
      '<div><div class="goles-title">Total de goles</div>' +
      '<div class="goles-sub">Desde quiniela Sencilla · misma jornada</div></div>' +
      "</div>" +
      '<div class="goles-grid">' +
      '<div class="goles-main"><div class="goles-val">' +
      (real != null ? real : partial) +
      '</div><div class="goles-lbl">' +
      (real != null ? "Goles finales" : "Goles parciales") +
      "</div></div>" +
      '<div class="goles-side"><div class="goles-status">' +
      statusTxt +
      "</div>" +
      (real != null && exactN === 0
        ? '<div class="goles-rollover">La bolsa pasa a la siguiente jornada de Goleo</div>'
        : "") +
      "</div></div></div>"
    );
  }

  function renderBolsaCard(dataRef, list) {
    var price = dataRef.meta.price != null ? Number(dataRef.meta.price) : 0;
    var paidN = list.filter(function (p) { return p.paid; }).length;
    var totalN = list.length;
    var pr = dataRef.poolResult;
    var gross = pr && pr.gross_pot != null ? Number(pr.gross_pot) : paidN * price;
    var net = pr && pr.net_pot != null ? Number(pr.net_pot) : null;
    var commission = pr && pr.commission_amount != null ? Number(pr.commission_amount) : null;
    var fmt = function (n) {
      return QA.utils.money(n);
    };
    var pending = totalN - paidN;
    return (
      '<div class="bolsa-card">' +
      '<div class="bolsa-head">' +
      '<div class="bolsa-icon">' + (QA.icons.trophy || "") + '</div>' +
      '<div><div class="bolsa-title">Bolsa acumulada</div>' +
      '<div class="bolsa-sub">' + paidN + ' pagadas' +
      (pending > 0 ? ' · ' + pending + ' pendientes' : '') +
      (price ? ' · ' + QA.utils.money(price) + ' c/u' : '') +
      '</div></div></div>' +
      '<div class="bolsa-grid">' +
      '<div class="bolsa-item"><div class="bolsa-val">' + fmt(gross) + '</div><div class="bolsa-lbl">Bruta</div></div>' +
      (commission != null ? '<div class="bolsa-item"><div class="bolsa-val">' + fmt(commission) + '</div><div class="bolsa-lbl">Comisión</div></div>' : '') +
      (net != null ? '<div class="bolsa-item bolsa-net"><div class="bolsa-val">' + fmt(net) + '</div><div class="bolsa-lbl">Neta</div></div>' : '') +
      '<div class="bolsa-item"><div class="bolsa-val">' + totalN + '</div><div class="bolsa-lbl">Boletas</div></div>' +
      '</div></div>'
    );
  }

  function bindNotices(root) {
    root.querySelectorAll("[data-dismiss]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var key = btn.getAttribute("data-dismiss");
        try {
          localStorage.setItem("qa_notice_" + key, "1");
        } catch (err) {}
        var card = btn.closest(".jd-notice");
        if (card) card.remove();
      });
    });
  }

  function bindMatchCards(root, dataRef) {
    root.querySelectorAll(".match-card[data-match-id]").forEach(function (card) {
      card.addEventListener("click", function () {
        openMatchModal(dataRef, card.getAttribute("data-match-id"));
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openMatchModal(dataRef, card.getAttribute("data-match-id"));
        }
      });
    });
  }

  function openMatchModal(dataRef, matchId) {
    var match = (dataRef.matches || []).find(function (m) { return m.id === matchId; });
    if (!match) return;
    var result = QA.data.getResult(match.home_goals, match.away_goals);
    var counts = { "1": 0, X: 0, "2": 0, none: 0 };
    var rows = [];
    (dataRef.leaderboard || []).forEach(function (p) {
      var d = (p.details || []).find(function (x) { return x.match && x.match.id === matchId; });
      var pick = d ? d.pick : null;
      if (pick === "1" || pick === "X" || pick === "2") counts[pick]++;
      else counts.none++;
      rows.push({
        name: p.displayName,
        area: p.displayArea,
        pick: pick,
        correct: d ? d.correct : false,
        paid: p.paid,
      });
    });
    var totalPicks = counts["1"] + counts.X + counts["2"];
    var pct = function (n) {
      return totalPicks ? Math.round((n / totalPicks) * 100) : 0;
    };
    var order = ["1", "X", "2"];
    var barColors = { "1": "#3b82f6", X: "#f59e0b", "2": "#ef4444" };

    rows.sort(function (a, b) {
      var oa = order.indexOf(a.pick);
      var ob = order.indexOf(b.pick);
      if (oa < 0) oa = 9;
      if (ob < 0) ob = 9;
      if (oa !== ob) return oa - ob;
      return (a.name || "").localeCompare(b.name || "");
    });

    var bars = order
      .map(function (k) {
        var p = pct(counts[k]);
        return (
          '<div class="mm-bar-row">' +
          '<div class="mm-bar-label"><span class="result-chip ' +
          (k === "1" ? "rL" : k === "X" ? "rE" : "rV") +
          '">' +
          pickLabel(k) +
          "</span> " +
          escape(QA.data.pickLabelFull(k)) +
          "</div>" +
          '<div class="mm-bar-track"><div class="mm-bar-fill" style="width:' +
          p +
          "%;background:" +
          barColors[k] +
          '"></div></div>' +
          '<div class="mm-bar-pct">' +
          p +
          '% <span class="mm-bar-n">(' +
          counts[k] +
          ')</span></div></div>'
        );
      })
      .join("");

    var listHtml = rows
      .map(function (r) {
        var cls = r.pick === "1" ? "rL" : r.pick === "X" ? "rE" : r.pick === "2" ? "rV" : "";
        var mark = "";
        if (result != null && r.pick) {
          mark = r.correct
            ? '<span class="pick-ok">✓</span>'
            : '<span class="pick-no">✗</span>';
        }
        return (
          '<div class="mm-person">' +
          '<div class="mm-person-info"><div class="mm-person-name">' +
          escape(r.name) +
          "</div>" +
          (r.area
            ? '<div class="mm-person-area">' + escape(r.area) + "</div>"
            : "") +
          '</div><div class="mm-person-pick">' +
          (r.pick
            ? '<span class="result-chip ' + cls + '">' + pickLabel(r.pick) + "</span> "
            : '<span class="mm-no-pick">—</span> ') +
          mark +
          "</div></div>"
        );
      })
      .join("");

    var scoreTxt =
      result != null
        ? match.home_goals + " - " + match.away_goals + " · " + pickLabel(result)
        : "Sin resultado";

    var root = document.getElementById("jd-modal-root");
    if (!root) return;
    root.innerHTML =
      '<div class="jd-modal-backdrop" id="jd-modal-backdrop">' +
      '<div class="jd-modal" role="dialog" aria-modal="true">' +
      '<div class="jd-modal-head">' +
      '<div><div class="jd-modal-kicker">Partido ' +
      (match.match_no || "") +
      "</div>" +
      '<div class="jd-modal-title">' +
      escape(match.home_team || "") +
      " vs " +
      escape(match.away_team || "") +
      '</div><div class="jd-modal-score">' +
      scoreTxt +
      "</div></div>" +
      '<button type="button" class="jd-modal-close" id="jd-modal-close" aria-label="Cerrar">×</button>' +
      "</div>" +
      '<div class="jd-modal-body">' +
      '<div class="mm-section-title">Distribución de picks</div>' +
      '<div class="mm-bars">' +
      bars +
      "</div>" +
      '<div class="mm-section-title">Participantes (' +
      rows.length +
      ")</div>" +
      '<div class="mm-list">' +
      listHtml +
      "</div></div></div></div>";

    function close() {
      root.innerHTML = "";
    }
    document.getElementById("jd-modal-close").addEventListener("click", close);
    document.getElementById("jd-modal-backdrop").addEventListener("click", function (e) {
      if (e.target.id === "jd-modal-backdrop") close();
    });
  }

  function maybeConfetti(poolId) {
    if (QA.render._jdConfettiDone[poolId]) return;
    try {
      var key = "qa_confetti_" + poolId;
      if (sessionStorage.getItem(key)) {
        QA.render._jdConfettiDone[poolId] = true;
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch (e) {}
    QA.render._jdConfettiDone[poolId] = true;
    setTimeout(function () {
      QA.render.launchFireworks();
    }, 350);
  }
};

QA.render.launchFireworks = function () {
  if (typeof confetti === "undefined") return;
  var GOLD = ["#f59e0b", "#fbbf24", "#fde68a"];
  var BLUE = ["#2563eb", "#60a5fa", "#93c5fd"];
  var GREEN = ["#22c55e", "#4ade80", "#bbf7d0"];
  var ALL = GOLD.concat(BLUE, GREEN);

  var ball = function (count, opts) {
    confetti(
      Object.assign({ particleCount: Math.round(count * 0.7) }, opts)
    );
    confetti(
      Object.assign(
        {
          particleCount: Math.round(count * 0.3),
          shapes: ["circle"],
          scalar: 1.3,
          colors: ["#fff", "#f0f0f0", "#1a1a1a"],
        },
        opts
      )
    );
  };

  ball(120, {
    angle: 90,
    spread: 80,
    origin: { x: 0.5, y: 0.3 },
    colors: ALL,
    startVelocity: 55,
    gravity: 0.9,
    ticks: 200,
  });
  setTimeout(function () {
    ball(90, {
      angle: 60,
      spread: 55,
      origin: { x: 0.1, y: 0.7 },
      colors: GOLD,
      startVelocity: 60,
      gravity: 0.8,
      ticks: 180,
    });
  }, 200);
  setTimeout(function () {
    ball(90, {
      angle: 120,
      spread: 55,
      origin: { x: 0.9, y: 0.7 },
      colors: BLUE,
      startVelocity: 60,
      gravity: 0.8,
      ticks: 180,
    });
  }, 350);
  setTimeout(function () {
    ball(70, {
      angle: 90,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: GREEN,
      startVelocity: 45,
      gravity: 1,
      ticks: 160,
    });
  }, 550);
};


QA.render.openMyBoletaPicker = function (root, data) {
  var escape = QA.utils.escape;
  var lb = data.leaderboard || [];
  var meta = data.meta || {};
  var existing = document.getElementById("my-boleta-modal");
  if (existing) existing.remove();
  var modal = document.createElement("div");
  modal.id = "my-boleta-modal";
  modal.className = "qa-modal-overlay";
  modal.innerHTML =
    '<div class="qa-modal">' +
    '<div class="qa-modal-head"><h3>Elegir mi boleta</h3>' +
    '<button type="button" class="qa-modal-close" id="mb-close">✕</button></div>' +
    '<p class="qa-modal-note">Se guarda en este dispositivo. Sirve para resaltar tus picks y compartir.</p>' +
    '<input type="search" class="jd-search" id="mb-search" placeholder="Buscar nombre…"/>' +
    '<div class="mb-list" id="mb-list"></div></div>';
  document.body.appendChild(modal);

  function renderList(q) {
    q = (q || "").toLowerCase();
    var list = lb.filter(function (p) {
      return !q || String(p.displayName || "").toLowerCase().indexOf(q) !== -1;
    });
    var box = document.getElementById("mb-list");
    box.innerHTML = list
      .map(function (p) {
        return (
          '<button type="button" class="mb-item" data-id="' +
          escape(p.id) +
          '" data-name="' +
          escape(p.displayName) +
          '"><span>' +
          escape(p.displayName) +
          '</span><span class="mb-area">' +
          escape(p.displayArea || "") +
          "</span></button>"
        );
      })
      .join("") || '<p class="qa-modal-note">Sin resultados</p>';
    box.querySelectorAll(".mb-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        QA.myBoleta.set(
          meta.id,
          btn.getAttribute("data-id"),
          btn.getAttribute("data-name")
        );
        modal.remove();
        QA.render._paintJornadaDetalle(root, data, true);
      });
    });
  }
  renderList("");
  document.getElementById("mb-close").onclick = function () {
    modal.remove();
  };
  modal.addEventListener("click", function (e) {
    if (e.target === modal) modal.remove();
  });
  document.getElementById("mb-search").addEventListener("input", function (e) {
    renderList(e.target.value);
  });
};

