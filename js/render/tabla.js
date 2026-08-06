/* Tabla General + Calendario Liga MX */
window.QA = window.QA || {};
QA.render = QA.render || {};

QA.render.tabla = async function (sub) {
  const el = document.getElementById("view-tabla");
  if (!el) return;

  const escape = QA.utils.escape;
  const timeAgo = QA.utils.timeAgo;
  sub = sub || QA.render._tablaSub || "clasificacion";
  QA.render._tablaSub = sub;

  el.innerHTML =
    '<div class="tabla-tabs">' +
    '<button type="button" class="tabla-tab' +
    (sub === "clasificacion" ? " active" : "") +
    '" data-sub="clasificacion">Clasificación</button>' +
    '<button type="button" class="tabla-tab' +
    (sub === "calendario" ? " active" : "") +
    '" data-sub="calendario">Calendario</button>' +
    "</div>" +
    '<div id="tabla-panel" class="lazy-skel"><div class="skel-line w40"></div><div class="skel-card" style="height:200px"></div><p class="skel-msg">Cargando…</p></div>';

  el.querySelectorAll(".tabla-tab").forEach(function (btn) {
    btn.addEventListener("click", function () {
      QA.render.tabla(btn.getAttribute("data-sub"));
    });
  });

  const panel = document.getElementById("tabla-panel");
  if (sub === "calendario") {
    await renderCalendario(panel);
  } else {
    await renderClasificacion(panel);
  }

  async function renderClasificacion(panel) {
    let data;
    try {
      data = await QA.data.getStandingsAsync();
    } catch (err) {
      console.error(err);
      panel.innerHTML =
        '<div class="empty-state"><div class="empty-icon">⚠️</div><p>No se pudo cargar la tabla</p></div>';
      return;
    }
    if (!data.rows || !data.rows.length) {
      panel.innerHTML =
        '<div class="empty-state"><div class="empty-icon">📊</div><p>Sin datos de tabla aún</p></div>';
      return;
    }
    panel.innerHTML =
      '<div class="tabla-header"><div>' +
      '<h2 class="pool-name">Tabla General</h2>' +
      '<p class="pool-meta">' +
      escape(data.tournament) +
      (data.source ? " · " + escape(data.source) : "") +
      "</p></div>" +
      '<div class="tabla-updated"><span class="live-dot"></span> ' +
      timeAgo(data.updatedAt) +
      "</div></div>" +
      '<div class="tabla-legend">' +
      '<span class="leg leg-directo">Liguilla directa</span>' +
      '<span class="leg leg-playin">Play-in</span></div>' +
      '<div class="tabla-wrap"><table class="standings-table"><thead><tr>' +
      "<th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>Pts</th>" +
      "</tr></thead><tbody>" +
      data.rows
        .map(function (r) {
          return (
            '<tr class="' +
            (r.zone ? "zone-" + r.zone : "") +
            '"><td>' +
            r.pos +
            '</td><td><div class="team-cell"><img src="' +
            escape(r.logo) +
            '" alt="" loading="lazy" decoding="async" onerror="this.style.display=\'none\'"><span>' +
            escape(r.team) +
            "</span></div></td><td>" +
            r.pj +
            "</td><td>" +
            r.g +
            "</td><td>" +
            r.e +
            "</td><td>" +
            r.p +
            "</td><td>" +
            (r.dg > 0 ? "+" : "") +
            r.dg +
            '</td><td class="pts-cell">' +
            r.pts +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div>" +
      '<p class="tabla-source-note">Fuente: ' +
      escape(data.source || "—") +
      ". Si ESPN no responde, se usan marcadores de la quiniela (solo temporada actual).</p>";
  }

  async function renderCalendario(panel) {
    let cal;
    try {
      cal = await QA.data.getLigaMxCalendar();
    } catch (err) {
      console.error(err);
      panel.innerHTML =
        '<div class="empty-state"><div class="empty-icon">⚠️</div><p>No se pudo cargar el calendario</p></div>';
      return;
    }

    var season = cal.season || QA.data.detectLigaMxSeason();
    var byJ = cal.byJornada || {};
    var jKeys = Object.keys(byJ)
      .map(Number)
      .filter(function (n) {
        return !isNaN(n);
      })
      .sort(function (a, b) {
        return a - b;
      });

    if (!jKeys.length && cal.matches && cal.matches.length) {
      byJ = { 0: cal.matches };
      jKeys = [0];
    }

    if (!jKeys.length) {
      panel.innerHTML =
        '<div class="empty-state"><div class="empty-icon">📅</div><p>Sin partidos para ' +
        escape(season.label) +
        "</p></div>";
      return;
    }

    function fmtDate(iso, fallback) {
      if (!iso) return fallback || "Fecha por definir";
      var d = new Date(iso);
      if (isNaN(d.getTime())) return fallback || iso;
      return d.toLocaleDateString("es-MX", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    }
    function fmtTime(iso) {
      if (!iso) return "—";
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    var now = Date.now();
    // Chips de jornada
    var chips =
      '<div class="cal-chips">' +
      '<button type="button" class="cal-chip" data-j="all">Todos</button>' +
      jKeys
        .map(function (j, idx) {
          return (
            '<button type="button" class="cal-chip' +
            (idx === 0 ? " active" : "") +
            '" data-j="' +
            j +
            '">J' +
            j +
            "</button>"
          );
        })
        .join("") +
      "</div>";

    function matchCard(m) {
      var done = m.status === "FT" || (m.homeGoals != null && m.awayGoals != null);
      var live = m.status === "LIVE";
      var score = done
        ? '<span class="cal-score">' +
          m.homeGoals +
          " - " +
          m.awayGoals +
          "</span>"
        : '<span class="cal-vs">vs</span>';
      var badge = live
        ? '<span class="cal-badge live">EN VIVO</span>'
        : done
        ? '<span class="cal-badge done">Final</span>'
        : '<span class="cal-badge ns">Por jugar</span>';

      return (
        '<div class="cal-match' +
        (done ? " is-done" : "") +
        (live ? " is-live" : "") +
        '">' +
        '<div class="cal-match-top">' +
        '<span class="cal-datetime">' +
        escape(fmtDate(m.date, m.dateLabel)) +
        " · " +
        escape(fmtTime(m.date)) +
        "</span>" +
        badge +
        "</div>" +
        '<div class="cal-match-teams">' +
        '<div class="cal-team home"><span>' +
        escape(m.home) +
        "</span></div>" +
        score +
        '<div class="cal-team away"><span>' +
        escape(m.away) +
        "</span></div>" +
        "</div>" +
        '<div class="cal-match-meta">' +
        (m.venue
          ? '<span class="cal-venue">' + escape(m.venue) + "</span>"
          : "") +
        '<span class="cal-tv" title="Transmisión (puede variar)">' +
        escape(m.tv || "Consultar guía local") +
        "</span>" +
        "</div></div>"
      );
    }

    function blockFor(j) {
      var list = byJ[j] || [];
      var title = j === 0 ? "Partidos" : "Jornada " + j;
      return (
        '<div class="cal-jornada" data-jornada="' +
        j +
        '">' +
        '<h3 class="cal-j-title">' +
        title +
        " · " +
        list.length +
        " partidos</h3>" +
        list.map(matchCard).join("") +
        "</div>"
      );
    }

    panel.innerHTML =
      '<div class="tabla-header"><div>' +
      '<h2 class="pool-name">Calendario</h2>' +
      '<p class="pool-meta">Liga MX · ' +
      escape(season.label) +
      " · " +
      escape(cal.source || "") +
      "</p></div>" +
      '<div class="tabla-updated"><span class="live-dot"></span> ' +
      timeAgo(cal.updatedAt) +
      "</div></div>" +
      chips +
      '<div id="cal-list">' +
      jKeys.map(blockFor).join("") +
      "</div>" +
      '<p class="tabla-source-note">Horarios en hora local del dispositivo. Canales estimados (TUDN/ESPN/Fox u otros); verifica la guía oficial. Fuentes: ' +
      escape(cal.source || "—") +
      ".</p>";

    panel.querySelectorAll(".cal-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        panel.querySelectorAll(".cal-chip").forEach(function (c) {
          c.classList.remove("active");
        });
        chip.classList.add("active");
        var j = chip.getAttribute("data-j");
        panel.querySelectorAll(".cal-jornada").forEach(function (block) {
          if (j === "all") {
            block.style.display = "";
          } else {
            block.style.display =
              block.getAttribute("data-jornada") === j ? "" : "none";
          }
        });
      });
    });
    // mostrar primera jornada al entrar
    if (jKeys.length) {
      var first = String(jKeys[0]);
      panel.querySelectorAll(".cal-jornada").forEach(function (block) {
        block.style.display =
          block.getAttribute("data-jornada") === first ? "" : "none";
      });
    }
  }
};
