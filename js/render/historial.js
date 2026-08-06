/* Historial global · stats generales + ranking + jornadas */
window.QA = window.QA || {};
QA.render = QA.render || {};

QA.render.historial = async function () {
  const el = document.getElementById("view-historial");
  if (!el) return;
  const escape = QA.utils.escape;
  const ico = QA.icons || {};
  el.innerHTML =
    '<div class="lazy-skel">' +
    '<div class="skel-line w60"></div>' +
    '<div class="skel-grid">' +
    '<div class="skel-card"></div><div class="skel-card"></div>' +
    '<div class="skel-card"></div><div class="skel-card"></div>' +
    "</div>" +
    '<p class="skel-msg">Cargando historial…</p></div>';

  let ranking = [];
  let finalizadas = [];
  let gstat = null;
  try {
    // Lazy / staged: jornadas primero (rápido), luego stats pesadas
    const allJ = await QA.data.getJornadas();
    finalizadas = allJ.filter(function (j) {
      return j.estado === "finalizada";
    });
    // parallel heavy with timeout soft
    var heavy = await Promise.all([
      QA.data.getCumulativeRanking().catch(function (e) {
        console.warn(e);
        return [];
      }),
      QA.data.getGeneralStats().catch(function (e) {
        console.warn(e);
        return null;
      }),
    ]);
    ranking = heavy[0] || [];
    gstat = heavy[1];
  } catch (err) {
    console.error(err);
    el.innerHTML =
      '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error al cargar historial</p></div>';
    return;
  }

  function fmxn(n) {
    return QA.utils.money(n);
  }

  // ── General stats KPIs ──
  var gstatHtml = "";
  if (gstat) {
    var kpis = [
      [gstat.totalJornadas, "Jornadas", "var(--text)"],
      [fmxn(gstat.totalBolsa), "Total acumulado", "var(--amber)"],
      [fmxn(gstat.avgBolsa), "Bolsa promedio", "#60a5fa"],
      [fmxn(gstat.maxBolsa), "Mayor bolsa", "var(--green)"],
      [gstat.totalPagos, "Boletas pagadas", "var(--text)"],
      [gstat.uniqueParticipants, "Jugadores únicos", "var(--text)"],
    ];
    gstatHtml =
      '<div class="gstat-block">' +
      '<div class="st-section-title">' +
      (ico.table || "") +
      " Estadísticas generales</div>" +
      '<div class="gstat-kpis">' +
      kpis
        .map(function (k) {
          return (
            '<div class="gstat-kpi"><div class="gstat-kpi-val" style="color:' +
            k[2] +
            '">' +
            k[0] +
            '</div><div class="gstat-kpi-lbl">' +
            k[1] +
            "</div></div>"
          );
        })
        .join("") +
      "</div>";

    // Bolsa history chart (CSS bars)
    if (gstat.bolsaHistory && gstat.bolsaHistory.length) {
      var maxNet = Math.max.apply(
        null,
        gstat.bolsaHistory.map(function (b) {
          return b.net;
        })
      );
      var maxPaid = Math.max.apply(
        null,
        gstat.bolsaHistory.map(function (b) {
          return b.paid;
        })
      );
      // show last 8 for readability
      var hist = gstat.bolsaHistory.slice(-8);
      gstatHtml +=
        '<div class="st-section-title" style="margin-top:18px">' +
        (ico.trophy || "") +
        " Histórico de bolsas</div>" +
        '<div class="bolsa-legend"><span class="leg-net">Bolsa neta</span><span class="leg-paid">Boletas pagadas</span></div>' +
        '<div class="bolsa-bars">' +
        hist
          .map(function (b) {
            var h1 = maxNet ? Math.round((b.net / maxNet) * 100) : 0;
            var h2 = maxPaid ? Math.round((b.paid / maxPaid) * 100) : 0;
            return (
              '<div class="bolsa-col" title="' +
              escape(b.label) +
              " · " +
              fmxn(b.net) +
              " · " +
              b.paid +
              ' pagados">' +
              '<div class="bolsa-col-bars">' +
              '<div class="bolsa-bar net" style="height:' +
              h1 +
              '%"></div>' +
              '<div class="bolsa-bar paid" style="height:' +
              h2 +
              '%"></div>' +
              '</div><div class="bolsa-col-lbl">' +
              escape(b.shortLabel) +
              "</div></div>"
            );
          })
          .join("") +
        "</div>";
    }

    // Most winners
    if (gstat.winnerRanking && gstat.winnerRanking.length) {
      gstatHtml +=
        '<div class="st-section-title" style="margin-top:18px">' +
        (ico.crown || ico.trophy || "") +
        " Más veces ganador</div>" +
        '<div class="winner-list">' +
        gstat.winnerRanking
          .slice(0, 8)
          .map(function (w, i) {
            return (
              '<div class="winner-row" data-winner-idx="' +
              i +
              '" role="button" tabindex="0">' +
              '<div class="winner-rank">' +
              (i < 3
                ? '<span class="winner-medal m' + (i + 1) + '">' + (i + 1) + "</span>"
                : i + 1) +
              '</div><div class="winner-info"><div class="winner-name">' +
              escape(w.name) +
              '</div><div class="winner-area">' +
              escape(w.area || "") +
              '</div></div><div class="winner-stats"><div class="winner-wins">' +
              w.totalWins +
              '</div><div class="winner-wins-lbl">victorias</div><div class="winner-earned">' +
              fmxn(w.totalEarned) +
              "</div></div></div>"
            );
          })
          .join("") +
        "</div>";
    }
    gstatHtml += "</div>";
  }

  const top = ranking.slice(0, 10);
  const maxTotal = top.length ? top[0].total : 1;
  const bars = top.length
    ? top
        .map(function (p, i) {
          const pct = Math.round((p.total / maxTotal) * 100);
          return (
            '<div class="st-bar-row' +
            (i === 0 ? " is-top" : "") +
            '">' +
            '<div class="st-bar-name" title="' +
            escape(p.name) +
            '">' +
            escape(p.name) +
            "</div>" +
            '<div class="st-bar-track"><div class="st-bar-fill' +
            (i === 0 ? " top" : "") +
            '" style="width:' +
            pct +
            '%"></div></div>' +
            '<div class="st-bar-val">' +
            p.total +
            "</div></div>"
          );
        })
        .join("")
    : '<div class="empty-state"><p>Sin datos aún</p></div>';

  let listHtml = "";
  if (!finalizadas.length) {
    listHtml =
      '<div class="empty-state"><p>Aún no hay jornadas finalizadas</p></div>';
  } else {
    finalizadas.forEach(function (j) {
      const modeLabel = j.modeLabel || j.mode || "";
      const sub = [
        j.season,
        j.dateLabel,
        j.partidosJugados + "/" + j.partidosTotal + " partidos",
        j.participantes + " boletas",
      ]
        .filter(Boolean)
        .join(" · ");
      listHtml +=
        '<div class="hist-item" data-jornada-id="' +
        escape(j.id) +
        '"><div class="hist-left"><h4>' +
        escape(j.nombre) +
        " · " +
        escape(j.competencia) +
        (modeLabel
          ? ' <span class="mode-chip mode-chip-sm' +
            (String(j.mode || "").toUpperCase().indexOf("GOLE") !== -1
              ? " mode-goleo"
              : " mode-sencilla") +
            '">' +
            escape(modeLabel) +
            "</span>"
          : "") +
        "</h4><p>" +
        escape(sub) +
        '</p></div><div class="hist-right">Ver →</div></div>';
    });
  }

  el.innerHTML =
    '<h2 class="pool-name">Historial</h2>' +
    '<p class="pool-meta">Estadísticas globales y jornadas cerradas</p>' +
    gstatHtml +
    '<div class="st-section" style="margin-top:16px">' +
    '<div class="st-section-title">' +
    (ico.trophy || "") +
    " Aciertos acumulados · Top 10</div>" +
    '<p class="st-note">Varias boletas en la misma jornada suman aciertos por cada una.</p>' +
    '<div class="st-hits-chart">' +
    bars +
    "</div></div>" +
    '<h3 class="section-title">Jornadas finalizadas</h3>' +
    '<div class="historial-timeline">' +
    listHtml +
    "</div>";

  el.querySelectorAll(".hist-item").forEach(function (item) {
    item.addEventListener("click", function () {
      QA.app.openJornada(item.dataset.jornadaId);
    });
  });

  // Modal participante · más veces ganador
  if (!document.getElementById("winner-modal-root")) {
    var root = document.createElement("div");
    root.id = "winner-modal-root";
    document.body.appendChild(root);
  }

  el.querySelectorAll(".winner-row[data-winner-idx]").forEach(function (row) {
    row.addEventListener("click", function () {
      var idx = parseInt(row.getAttribute("data-winner-idx"), 10);
      var w = gstat.winnerRanking[idx];
      if (w) openWinnerModal(w);
    });
  });

  function openWinnerModal(w) {
    var root = document.getElementById("winner-modal-root");
    if (!root) return;
    var wins = (w.wins || []).slice().sort(function (a, b) {
      return (b.prize || 0) - (a.prize || 0);
    });
    var rows = wins
      .map(function (win) {
        return (
          '<div class="wm-win' +
          (win.poolId ? '" data-jornada-id="' + escape(win.poolId) : "") +
          '">' +
          '<div class="wm-win-main">' +
          '<div class="wm-win-title">' +
          escape(win.label || "Jornada") +
          "</div>" +
          '<div class="wm-win-meta">' +
          [
            win.competition,
            win.season,
            win.modeLabel || win.mode,
            win.dateLabel,
          ]
            .filter(Boolean)
            .map(function (x) {
              return escape(x);
            })
            .join(" · ") +
          "</div></div>" +
          '<div class="wm-win-stats">' +
          '<div class="wm-win-hits"><span class="wm-num">' +
          win.hits +
          '</span><span class="wm-lbl">aciertos</span></div>' +
          '<div class="wm-win-prize">' +
          fmxn(win.prize) +
          "</div></div></div>"
        );
      })
      .join("");

    root.innerHTML =
      '<div class="jd-modal-backdrop" id="wm-backdrop">' +
      '<div class="jd-modal wm-modal" role="dialog" aria-modal="true">' +
      '<div class="jd-modal-head">' +
      '<div><div class="jd-modal-kicker">Perfil de ganador</div>' +
      '<div class="jd-modal-title">' +
      escape(w.name) +
      '</div><div class="jd-modal-score">' +
      escape(w.area || "") +
      "</div></div>" +
      '<button type="button" class="jd-modal-close" id="wm-close" aria-label="Cerrar">×</button>' +
      "</div>" +
      '<div class="jd-modal-body">' +
      '<div class="wm-summary">' +
      '<div class="wm-sum-item"><div class="wm-sum-val">' +
      w.totalWins +
      '</div><div class="wm-sum-lbl">Victorias</div></div>' +
      '<div class="wm-sum-item"><div class="wm-sum-val green">' +
      fmxn(w.totalEarned) +
      '</div><div class="wm-sum-lbl">Total ganado</div></div>' +
      '<div class="wm-sum-item"><div class="wm-sum-val">' +
      wins.length +
      '</div><div class="wm-sum-lbl">Jornadas</div></div>' +
      "</div>" +
      '<div class="mm-section-title">Detalle por jornada</div>' +
      '<div class="wm-wins">' +
      (rows || '<p class="st-note">Sin detalle</p>') +
      "</div></div></div></div>";

    function close() {
      root.innerHTML = "";
    }
    document.getElementById("wm-close").addEventListener("click", close);
    document.getElementById("wm-backdrop").addEventListener("click", function (e) {
      if (e.target.id === "wm-backdrop") close();
    });
    root.querySelectorAll(".wm-win[data-jornada-id]").forEach(function (item) {
      item.style.cursor = "pointer";
      item.addEventListener("click", function () {
        close();
        QA.app.openJornada(item.getAttribute("data-jornada-id"));
      });
    });
  }
};
