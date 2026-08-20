/* Historial · Resumen + Participantes A-Z */
window.QA = window.QA || {};
QA.render = QA.render || {};

QA.render._histTab = QA.render._histTab || "resumen";
QA.render._histCache = null;

QA.render.historial = async function (tab) {
  const el = document.getElementById("view-historial");
  if (!el) return;
  const escape = QA.utils.escape;
  const ico = QA.icons || {};
  tab = tab || QA.render._histTab || "resumen";
  QA.render._histTab = tab;

  el.innerHTML =
    '<div class="hist-tabs">' +
    '<button type="button" class="hist-tab' +
    (tab === "resumen" ? " active" : "") +
    '" data-histtab="resumen">Resumen</button>' +
    '<button type="button" class="hist-tab' +
    (tab === "participantes" ? " active" : "") +
    '" data-histtab="participantes">Participantes</button>' +
    "</div>" +
    '<div id="hist-panel">' +
    (QA.skel
      ? QA.skel.page(tab === "participantes" ? "list" : "stats")
      : '<p class="skel-msg">Cargando…</p>') +
    "</div>";

  el.querySelectorAll("[data-histtab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      QA.render.historial(btn.getAttribute("data-histtab"));
    });
  });

  const panel = document.getElementById("hist-panel");

  // Load data once
  if (!QA.render._histCache) {
    try {
      const allJ = await QA.data.getJornadas();
      const finalizadas = allJ.filter(function (j) {
        return j.estado === "finalizada";
      });
      const heavy = await Promise.all([
        QA.data.getCumulativeRanking().catch(function () {
          return [];
        }),
        QA.data.getGeneralStats().catch(function () {
          return null;
        }),
        QA.data.getHallOfFame().catch(function () {
          return [];
        }),
      ]);
      QA.render._histCache = {
        finalizadas: finalizadas,
        ranking: heavy[0] || [],
        gstat: heavy[1],
        hof: heavy[2] || [],
      };
    } catch (err) {
      console.error(err);
      panel.innerHTML =
        '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error al cargar historial</p></div>';
      return;
    }
  }

  const cache = QA.render._histCache;
  if (tab === "participantes") {
    renderParticipantes(panel, cache);
  } else {
    renderResumen(panel, cache);
  }

  function fmxn(n) {
    return QA.utils.money(n);
  }

  function renderResumen(panel, cache) {
    var gstat = cache.gstat;
    var ranking = cache.ranking || [];
    var finalizadas = cache.finalizadas || [];
    var gstatHtml = "";
    if (gstat) {
      var kpis = [
        [gstat.totalJornadas, "Jornadas"],
        [fmxn(gstat.totalBolsa), "Total acumulado"],
        [fmxn(gstat.avgBolsa), "Bolsa promedio"],
        [fmxn(gstat.maxBolsa), "Mayor bolsa"],
        [gstat.totalPagos, "Boletas pagadas"],
        [gstat.uniqueParticipants, "Jugadores únicos"],
      ];
      gstatHtml =
        '<div class="gstat-block"><div class="st-section-title">' +
        (ico.table || "") +
        " Estadísticas generales</div>" +
        '<div class="gstat-kpis">' +
        kpis
          .map(function (k) {
            return (
              '<div class="gstat-kpi"><div class="gstat-kpi-val">' +
              k[0] +
              '</div><div class="gstat-kpi-lbl">' +
              k[1] +
              "</div></div>"
            );
          })
          .join("") +
        "</div></div>";
    }

    var top = ranking.slice(0, 10);
    var maxTotal = top.length ? top[0].total : 1;
    var bars = top.length
      ? top
          .map(function (p, i) {
            var pct = Math.round((p.total / maxTotal) * 100);
            return (
              '<div class="st-bar-row' +
              (i === 0 ? " is-top" : "") +
              '"><div class="st-bar-name" title="' +
              escape(p.name) +
              '">' +
              escape(p.name) +
              '</div><div class="st-bar-track"><div class="st-bar-fill' +
              (i === 0 ? " top" : "") +
              '" style="width:' +
              pct +
              '%"></div></div><div class="st-bar-val">' +
              p.total +
              "</div></div>"
            );
          })
          .join("")
      : '<div class="empty-state"><p>Sin datos aún</p></div>';

    var listHtml = "";
    if (!finalizadas.length) {
      listHtml =
        '<div class="empty-state"><p>Aún no hay jornadas finalizadas</p></div>';
    } else {
      finalizadas.forEach(function (j) {
        var modeLabel = j.modeLabel || j.mode || "";
        var sub = [
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

    panel.innerHTML =
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

    panel.querySelectorAll(".hist-item").forEach(function (item) {
      item.addEventListener("click", function () {
        QA.app.openJornada(item.getAttribute("data-jornada-id"));
      });
    });
  }

  function buildParticipantProfiles(cache) {
    var ranking = cache.ranking || [];
    var gstat = cache.gstat || {};
    var hof = cache.hof || [];
    var winByName = {};
    (gstat.winnerRanking || []).forEach(function (w) {
      var key = String(w.name || "").toLowerCase();
      winByName[key] = w;
    });
    // Also scan HoF cards for per-jornada wins
    var winsByPid = {};
    hof.forEach(function (c) {
      (c.winners || []).forEach(function (w) {
        var key = String(w.name || "").toLowerCase();
        if (!winsByPid[key]) winsByPid[key] = [];
        winsByPid[key].push({
          label: c.label,
          competition: c.competition,
          season: c.season,
          hits: w.hits,
          prize: c.prize,
          poolId: c.poolId,
          isSplit: c.isSplit,
        });
      });
    });

    return ranking
      .map(function (p) {
        var key = String(p.name || "").toLowerCase();
        var wr = winByName[key] || {};
        var wins = winsByPid[key] || wr.wins || [];
        var totalWins = wr.totalWins != null ? wr.totalWins : wins.length;
        var earned = wr.totalEarned != null ? wr.totalEarned : 0;
        if (!earned && wins.length) {
          earned = wins.reduce(function (s, x) {
            return s + (Number(x.prize) || 0);
          }, 0);
        }
        var avg =
          p.jornadas > 0 ? Math.round((p.total / p.jornadas) * 10) / 10 : 0;
        return {
          id: p.id,
          name: p.name,
          area: p.area || "",
          totalHits: p.total,
          jornadas: p.jornadas,
          avgHits: avg,
          totalWins: totalWins,
          earned: earned,
          wins: wins,
        };
      })
      .sort(function (a, b) {
        return String(a.name || "").localeCompare(
          String(b.name || ""),
          "es",
          { sensitivity: "base" }
        );
      });
  }

  function renderParticipantes(panel, cache) {
    if (QA.logros) {
      QA.logros.compute().catch(function () {});
    }
    var list = buildParticipantProfiles(cache);
    if (!list.length) {
      panel.innerHTML =
        '<div class="empty-state"><p>Aún no hay participantes registrados</p></div>';
      return;
    }

    panel.innerHTML =
      '<h2 class="pool-name">Participantes</h2>' +
      '<p class="pool-meta">' +
      list.length +
      " jugadores · orden alfabético</p>" +
      '<input type="search" class="jd-search part-search" id="part-search" placeholder="Buscar por nombre o zona…"/>' +
      '<div class="part-list" id="part-list"></div>';

    var box = document.getElementById("part-list");

    function paint(q) {
      q = (q || "").toLowerCase().trim();
      var filtered = list.filter(function (p) {
        if (!q) return true;
        return (
          String(p.name).toLowerCase().indexOf(q) !== -1 ||
          String(p.area).toLowerCase().indexOf(q) !== -1
        );
      });

      var lastLetter = "";
      var html = "";
      filtered.forEach(function (p) {
        var letter = String(p.name || "?")
          .charAt(0)
          .toUpperCase();
        if (letter !== lastLetter) {
          lastLetter = letter;
          html += '<div class="part-letter">' + escape(letter) + "</div>";
        }
        html +=
          '<button type="button" class="part-card" data-id="' +
          escape(p.id) +
          '">' +
          '<div class="part-card-main">' +
          '<div class="part-name">' +
          escape(p.name) +
          "</div>" +
          '<div class="part-area">' +
          escape(p.area || "Sin zona") +
          "</div></div>" +
          '<div class="part-stats">' +
          '<span title="Aciertos acumulados"><strong>' +
          p.totalHits +
          "</strong> aciertos</span>" +
          '<span title="Jornadas"><strong>' +
          p.jornadas +
          "</strong> jorn.</span>" +
          (p.totalWins
            ? '<span title="Victorias"><strong>' +
              p.totalWins +
              "</strong> 🏆</span>"
            : "") +
          "</div>" +
          '<span class="part-chevron">›</span></button>';
      });

      box.innerHTML =
        html ||
        '<div class="empty-state"><p>Sin resultados para esa búsqueda</p></div>';

      box.querySelectorAll(".part-card").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-id");
          var person = list.find(function (x) {
            return String(x.id) === String(id);
          });
          if (person) openParticipantModal(person);
        });
      });
    }

    paint("");
    document.getElementById("part-search").addEventListener("input", function (e) {
      paint(e.target.value);
    });
  }

  function openParticipantModal(p) {
    var existing = document.getElementById("part-modal");
    if (existing) existing.remove();

    var winsHtml = "";
    if (p.wins && p.wins.length) {
      winsHtml =
        '<div class="part-m-section"><div class="part-m-title">Victorias</div>' +
        p.wins
          .map(function (w) {
            return (
              '<button type="button" class="part-win-row" data-pool="' +
              escape(w.poolId || "") +
              '">' +
              "<div><strong>" +
              escape(w.label || "Jornada") +
              "</strong>" +
              (w.isSplit
                ? ' <span class="mode-chip mode-chip-sm">Empate</span>'
                : "") +
              '<div class="part-win-sub">' +
              escape(
                [w.competition, w.season].filter(Boolean).join(" · ")
              ) +
              "</div></div>" +
              '<div class="part-win-right">' +
              (w.hits != null ? w.hits + " aciertos" : "") +
              "<br/><strong>" +
              fmxn(w.prize) +
              "</strong></div></button>"
            );
          })
          .join("") +
        "</div>";
    } else {
      winsHtml =
        '<div class="part-m-section"><div class="part-m-title">Victorias</div>' +
        '<p class="qa-modal-note">Aún sin jornadas ganadas en Sencilla</p></div>';
    }

    var modal = document.createElement("div");
    modal.id = "part-modal";
    modal.className = "qa-modal-overlay";
    modal.innerHTML =
      '<div class="qa-modal part-modal">' +
      '<div class="qa-modal-head"><h3>' +
      escape(p.name) +
      '</h3><button type="button" class="qa-modal-close" id="part-m-close">✕</button></div>' +
      '<div class="part-m-body">' +
      '<div class="part-m-area">' +
      escape(p.area || "Sin zona") +
      "</div>" +
      (function () {
        if (!QA.logros) return "";
        try {
          var badges = QA.logros.badgesForPerson(p.name, p.area);
          if (!badges.length) {
            // trigger compute async first time
            QA.logros.compute().then(function () {
              /* next open will show */
            });
            return "";
          }
          return (
            '<div class="part-m-badges">' +
            badges
              .map(function (b) {
                return (
                  '<span class="part-badge" title="' +
                  escape(b.desc) +
                  '">' +
                  b.icon +
                  " " +
                  escape(b.name) +
                  "</span>"
                );
              })
              .join("") +
            "</div>"
          );
        } catch (_) {
          return "";
        }
      })() +
      '<div class="part-m-kpis">' +
      '<div class="part-m-kpi"><div class="part-m-kpi-val">' +
      p.totalHits +
      '</div><div class="part-m-kpi-lbl">Aciertos</div></div>' +
      '<div class="part-m-kpi"><div class="part-m-kpi-val">' +
      p.jornadas +
      '</div><div class="part-m-kpi-lbl">Jornadas</div></div>' +
      '<div class="part-m-kpi"><div class="part-m-kpi-val">' +
      p.avgHits +
      '</div><div class="part-m-kpi-lbl">Promedio</div></div>' +
      '<div class="part-m-kpi"><div class="part-m-kpi-val">' +
      p.totalWins +
      '</div><div class="part-m-kpi-lbl">Victorias</div></div>' +
      '<div class="part-m-kpi wide"><div class="part-m-kpi-val">' +
      fmxn(p.earned) +
      '</div><div class="part-m-kpi-lbl">Ganado (estimado)</div></div>' +
      "</div>" +
      winsHtml +
      "</div></div>";

    document.body.appendChild(modal);
    document.getElementById("part-m-close").onclick = function () {
      modal.remove();
    };
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.remove();
    });
    modal.querySelectorAll(".part-win-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var id = row.getAttribute("data-pool");
        if (id) {
          modal.remove();
          QA.app.openJornada(id);
        }
      });
    });
  }
};
