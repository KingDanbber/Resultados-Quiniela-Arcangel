/* Hall of Fame · Goleo · Estadísticas globales */
window.QA = window.QA || {};
QA.render = QA.render || {};

QA.render._ganTab = QA.render._ganTab || "hof";

QA.render.ganadores = async function (tab) {
  const el = document.getElementById("view-ganadores");
  if (!el) return;
  const escape = QA.utils.escape;
  const ico = QA.icons || {};
  tab = tab || QA.render._ganTab || "hof";
  QA.render._ganTab = tab;

  if (QA.trophy3d) QA.trophy3d.dispose();

  el.innerHTML =
    '<div class="gan-tabs">' +
    '<button type="button" class="gan-tab' +
    (tab === "hof" ? " active" : "") +
    '" data-gantab="hof">Hall of Fame</button>' +
    '<button type="button" class="gan-tab' +
    (tab === "goleo" ? " active" : "") +
    '" data-gantab="goleo">Campeón de Goleo</button>' +
    '<button type="button" class="gan-tab' +
    (tab === "stats" ? " active" : "") +
    '" data-gantab="stats">Estadísticas</button>' +
    "</div>" +
    '<div id="gan-panel" class="lazy-skel"><div class="skel-line w40"></div><p class="skel-msg">Cargando…</p></div>';

  el.querySelectorAll("[data-gantab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      QA.render.ganadores(btn.getAttribute("data-gantab"));
    });
  });

  const panel = document.getElementById("gan-panel");
  if (tab === "goleo") await renderGoleo(panel);
  else if (tab === "stats") await renderStats(panel);
  else await renderHof(panel);

  function fmxn(n) {
    return QA.utils.money(n);
  }

  async function renderHof(panel) {
    panel.innerHTML =
      '<div class="lazy-skel"><div class="skel-trophy"></div><p class="skel-msg">Cargando Hall of Fame…</p></div>';
    var cards = [];
    try {
      cards = await QA.data.getHallOfFame();
    } catch (err) {
      console.error(err);
      panel.innerHTML =
        '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error al cargar ganadores</p></div>';
      return;
    }

    var listHtml = "";
    if (!cards.length) {
      listHtml =
        '<div class="empty-state"><div class="empty-icon">' +
        (ico.trophy || "") +
        '</div><p>Aún no hay jornadas finalizadas con ganadores</p></div>';
    } else {
      listHtml = cards
        .map(function (c) {
          var trophySvg = c.isSplit ? ico.handshake || "" : ico.trophy || "";
          var wins = c.winners
            .map(function (w) {
              return (
                '<div class="hof-card' +
                (c.isSplit ? " split" : "") +
                '">' +
                '<div class="hof-trophy-svg' +
                (c.isSplit ? " split" : "") +
                '">' +
                trophySvg +
                '</div><div class="hof-info"><div class="hof-name">' +
                escape(w.name) +
                '</div><div class="hof-area">' +
                escape(w.area || "") +
                "</div>" +
                (c.isSplit
                  ? '<div class="hof-split">Premio compartido · ' +
                    c.winners.length +
                    " ganadores</div>"
                  : "") +
                '</div><div class="hof-stat"><div class="hof-stat-val">' +
                w.hits +
                '</div><div class="hof-stat-lbl">aciertos</div><div class="hof-prize">' +
                fmxn(c.prize) +
                "</div></div></div>"
              );
            })
            .join("");
          return (
            '<div class="hof-pool" data-jornada-id="' +
            escape(c.poolId) +
            '">' +
            '<div class="hof-pool-title"><span class="hof-pool-left">' +
            '<span class="hof-pool-ico">' +
            trophySvg +
            "</span> " +
            escape(c.label) +
            (c.competition ? " · " + escape(c.competition) : "") +
            (c.season ? " · " + escape(c.season) : "") +
            '</span><span class="hof-pool-meta">Bolsa ' +
            fmxn(c.net) +
            " · " +
            c.paidCount +
            " pagados</span></div>" +
            wins +
            "</div>"
          );
        })
        .join("");
    }

    panel.innerHTML =
      '<h2 class="pool-name">Hall of Fame</h2>' +
      '<p class="pool-meta">Histórico de ganadores · Quiniela Sencilla</p>' +
      '<div id="trophy-3d-wrap"><canvas id="trophy-3d-canvas"></canvas>' +
      '<div class="trophy-3d-label">HALL OF FAME · QUINIELA ARCÁNGEL</div></div>' +
      '<p class="hof-count">' +
      cards.length +
      " jornada" +
      (cards.length === 1 ? "" : "s") +
      " con ganador</p>" +
      '<div class="hof-list">' +
      listHtml +
      "</div>";

    panel.querySelectorAll(".hof-pool").forEach(function (row) {
      row.addEventListener("click", function () {
        var id = row.getAttribute("data-jornada-id");
        if (id && QA.app) QA.app.openJornada(id);
      });
    });

    try {
      if (QA.trophy3d && document.getElementById("trophy-3d-canvas")) {
        QA.trophy3d.init("trophy-3d-canvas");
      }
    } catch (_) {}
  }

  async function renderGoleo(panel) {
    panel.innerHTML =
      '<p class="skel-msg">Cargando Campeón de Goleo…</p>';
    try {
      var list = await QA.data.getJornadas();
      var goleo = (list || [])
        .filter(function (j) {
          return String(j.mode || "").toUpperCase().indexOf("GOLE") !== -1;
        })
        .sort(function (a, b) {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

      if (!goleo.length) {
        panel.innerHTML =
          '<div class="empty-state"><div class="empty-icon">⚽</div><p>Aún no hay jornadas de Campeón de Goleo</p></div>';
        return;
      }

      var cards = [];
      // Detalle de las últimas 8 (activas + finalizadas)
      var slice = goleo.slice(0, 8);
      for (var i = 0; i < slice.length; i++) {
        try {
          var d = await QA.data.loadPoolDetail(slice[i].id);
          cards.push({ j: slice[i], d: d });
        } catch (_) {
          cards.push({ j: slice[i], d: null });
        }
      }

      var html =
        '<h2 class="pool-name">Campeón de Goleo</h2>' +
        '<p class="pool-meta">Predice el total de goles de la jornada · Exacto gana</p>';

      cards.forEach(function (item) {
        var j = item.j;
        var d = item.d;
        var isLive = j.estado === "activa";
        var real =
          d && d.totalGoalsReal != null
            ? d.totalGoalsReal
            : d && d.totalGoalsPartial != null
            ? d.totalGoalsPartial
            : null;
        var lb = (d && d.leaderboard) || [];
        var top = lb.slice(0, 5);

        var rows = top
          .map(function (p, idx) {
            var diff =
              real != null && p.goalPred != null
                ? p.goalPred - real
                : null;
            return (
              '<div class="goleo-row' +
              (p.exactGoals ? " exact" : "") +
              '">' +
              '<span class="goleo-pos">#' +
              (idx + 1) +
              "</span>" +
              '<span class="goleo-name">' +
              escape(p.displayName) +
              "</span>" +
              '<span class="goleo-pred">' +
              (p.goalPred != null ? p.goalPred : "—") +
              "</span>" +
              '<span class="goleo-diff">' +
              (p.exactGoals
                ? "✓ exacto"
                : diff != null
                ? (diff > 0 ? "+" : "") + diff
                : "—") +
              "</span></div>"
            );
          })
          .join("");

        html +=
          '<div class="goleo-card' +
          (isLive ? " live" : "") +
          '" data-id="' +
          escape(j.id) +
          '">' +
          '<div class="goleo-card-top">' +
          "<div><div class=\"goleo-card-title\">" +
          escape(j.nombre) +
          '</div><div class="goleo-card-meta">' +
          escape(j.competencia || "") +
          (j.season ? " · " + escape(j.season) : "") +
          "</div></div>" +
          '<div class="goleo-goals">' +
          '<div class="goleo-goals-val">' +
          (real != null ? real : "—") +
          '</div><div class="goleo-goals-lbl">' +
          (d && d.totalGoalsReal != null
            ? "Goles finales"
            : isLive
            ? "Parcial"
            : "Goles") +
          "</div></div></div>" +
          (rows
            ? '<div class="goleo-table"><div class="goleo-head"><span>#</span><span>Participante</span><span>Pred</span><span>Dif</span></div>' +
              rows +
              "</div>"
            : '<p class="qa-modal-note">Sin predicciones aún</p>') +
          '<button type="button" class="goleo-open" data-id="' +
          escape(j.id) +
          '">Ver jornada →</button></div>';
      });

      panel.innerHTML = html;
      panel.querySelectorAll(".goleo-open, .goleo-card").forEach(function (node) {
        node.addEventListener("click", function (e) {
          if (node.classList.contains("goleo-card") && e.target.closest(".goleo-open") === null && e.target.closest("button")) return;
          var id = node.getAttribute("data-id") || (e.currentTarget && e.currentTarget.getAttribute("data-id"));
          if (id) QA.app.openJornada(id);
        });
      });
    } catch (err) {
      console.error(err);
      panel.innerHTML =
        '<div class="empty-state"><p>No se pudo cargar Goleo</p></div>';
    }
  }

  async function renderStats(panel) {
    panel.innerHTML = '<p class="skel-msg">Calculando estadísticas…</p>';
    try {
      var s = await QA.data.getGeneralStats();
      var ranking = s.winnerRanking || [];

      var topWins = ranking
        .slice(0, 10)
        .map(function (w, i) {
          return (
            '<div class="gstat-row">' +
            '<span class="gstat-pos">#' +
            (i + 1) +
            "</span>" +
            '<div class="gstat-info"><div class="gstat-name">' +
            escape(w.name || "—") +
            '</div><div class="gstat-area">' +
            escape(w.area || "") +
            "</div></div>" +
            '<div class="gstat-nums"><span title="Victorias">' +
            w.totalWins +
            ' 🏆</span><span title="Ganado">' +
            fmxn(w.totalEarned) +
            "</span></div></div>"
          );
        })
        .join("");

      var hist = (s.bolsaHistory || [])
        .slice()
        .reverse()
        .slice(0, 8)
        .map(function (b) {
          return (
            '<div class="gstat-bolsa-row"><span>' +
            escape(b.shortLabel || b.label) +
            "</span><strong>" +
            fmxn(b.net) +
            "</strong></div>"
          );
        })
        .join("");

      panel.innerHTML =
        '<h2 class="pool-name">Estadísticas globales</h2>' +
        '<p class="pool-meta">Resumen de toda la quiniela (Sencilla)</p>' +
        '<div class="gstat-grid">' +
        '<div class="gstat-card"><div class="gstat-val">' +
        (s.totalJornadas || 0) +
        '</div><div class="gstat-lbl">Jornadas</div></div>' +
        '<div class="gstat-card"><div class="gstat-val">' +
        (s.uniqueParticipants || 0) +
        '</div><div class="gstat-lbl">Participantes</div></div>' +
        '<div class="gstat-card"><div class="gstat-val">' +
        fmxn(s.totalBolsa || 0) +
        '</div><div class="gstat-lbl">Bolsa total</div></div>' +
        '<div class="gstat-card"><div class="gstat-val">' +
        fmxn(s.avgBolsa || 0) +
        '</div><div class="gstat-lbl">Bolsa promedio</div></div>' +
        '<div class="gstat-card"><div class="gstat-val">' +
        fmxn(s.maxBolsa || 0) +
        '</div><div class="gstat-lbl">Bolsa récord</div></div>' +
        '<div class="gstat-card"><div class="gstat-val">' +
        (s.totalPagos || 0) +
        '</div><div class="gstat-lbl">Boletas pagadas</div></div>' +
        "</div>" +
        '<h3 class="section-title">Ranking de campeones</h3>' +
        '<div class="gstat-ranking">' +
        (topWins || '<p class="qa-modal-note">Sin datos aún</p>') +
        "</div>" +
        '<h3 class="section-title">Últimas bolsas</h3>' +
        '<div class="gstat-bolsas">' +
        (hist || '<p class="qa-modal-note">Sin historial</p>') +
        "</div>";
    } catch (err) {
      console.error(err);
      panel.innerHTML =
        '<div class="empty-state"><p>No se pudieron cargar las estadísticas</p></div>';
    }
  }
};
