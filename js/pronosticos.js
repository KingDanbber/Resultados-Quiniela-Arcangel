/* Pronósticos inteligentes · estadísticos (sin API de pago) */
window.QA = window.QA || {};

QA.pronosticos = {
  /**
   * Genera sugerencia por partido usando:
   * 1) Consenso de boletas de la jornada
   * 2) Tabla Liga MX (posición / puntos) si está disponible
   * 3) Factor localía
   */
  analyze: function (data, standingsRows) {
    var lb = (data && data.leaderboard) || [];
    var matches = (data && data.matches) || [];
    var standings = standingsRows || [];
    var teamIndex = this._indexStandings(standings);

    return matches.map(function (m) {
      return QA.pronosticos._forMatch(m, lb, teamIndex);
    });
  },

  _indexStandings: function (rows) {
    var map = {};
    (rows || []).forEach(function (r) {
      var keys = [r.team, r.abbr, r.name].filter(Boolean);
      keys.forEach(function (k) {
        map[String(k).toLowerCase().trim()] = r;
      });
      // token fuzzy
      var t = String(r.team || "")
        .toLowerCase()
        .replace(/[^a-záéíóúñ\s]/gi, "")
        .trim();
      if (t) map[t] = r;
    });
    return map;
  },

  _findTeam: function (name, index) {
    if (!name) return null;
    var n = String(name).toLowerCase().trim();
    if (index[n]) return index[n];
    // partial match
    var keys = Object.keys(index);
    for (var i = 0; i < keys.length; i++) {
      if (n.indexOf(keys[i]) !== -1 || keys[i].indexOf(n) !== -1) {
        return index[keys[i]];
      }
    }
    // first significant word
    var word = n.split(/\s+/)[0];
    if (word && word.length > 3) {
      for (var j = 0; j < keys.length; j++) {
        if (keys[j].indexOf(word) !== -1) return index[keys[j]];
      }
    }
    return null;
  },

  _forMatch: function (m, lb, teamIndex) {
    var result = QA.data.getResult(m.home_goals, m.away_goals);
    var counts = { "1": 0, X: 0, "2": 0 };
    var total = 0;
    lb.forEach(function (p) {
      var d = (p.details || []).find(function (x) {
        return x.match && String(x.match.id) === String(m.id);
      });
      if (d && (d.pick === "1" || d.pick === "X" || d.pick === "2")) {
        counts[d.pick]++;
        total++;
      }
    });

    var consensus = null;
    var consensusPct = 0;
    ["1", "X", "2"].forEach(function (k) {
      var pct = total ? counts[k] / total : 0;
      if (pct > consensusPct) {
        consensusPct = pct;
        consensus = k;
      }
    });

    var home = this._findTeam(m.home_team, teamIndex);
    var away = this._findTeam(m.away_team, teamIndex);
    var tableHint = null;
    var tablePick = null;

    if (home && away && home.pts != null && away.pts != null) {
      var diff = Number(home.pts) - Number(away.pts);
      // localía: +3 pts equivalentes aproximados
      var adj = diff + 3;
      if (adj >= 8) tablePick = "1";
      else if (adj <= -8) tablePick = "2";
      else if (Math.abs(adj) <= 3) tablePick = "X";
      else tablePick = adj > 0 ? "1" : "2";

      tableHint =
        "Tabla: " +
        (home.team || m.home_team) +
        " #" +
        (home.pos || "?") +
        " (" +
        home.pts +
        " pts) vs " +
        (away.team || m.away_team) +
        " #" +
        (away.pos || "?") +
        " (" +
        away.pts +
        " pts)";
    }

    // Combinar señales
    var score = { "1": 0, X: 0, "2": 0 };
    if (total > 0) {
      score["1"] += (counts["1"] / total) * 60;
      score["X"] += (counts["X"] / total) * 60;
      score["2"] += (counts["2"] / total) * 60;
    }
    if (tablePick) {
      score[tablePick] += 30;
      // localía boost ligero
      score["1"] += 5;
    } else {
      // sin tabla: ligera localía
      score["1"] += 8;
      score["X"] += 4;
      score["2"] += 3;
    }

    var suggested = "1";
    var best = -1;
    ["1", "X", "2"].forEach(function (k) {
      if (score[k] > best) {
        best = score[k];
        suggested = k;
      }
    });

    var conf =
      best >= 55 ? "alta" : best >= 40 ? "media" : "baja";
    if (total < 3 && !tablePick) conf = "baja";

    var reasons = [];
    if (total > 0 && consensus) {
      reasons.push(
        Math.round(consensusPct * 100) +
          "% del grupo va por " +
          this.label(consensus)
      );
    }
    if (tableHint) reasons.push(tableHint);
    if (!tableHint && !total) {
      reasons.push("Poca data aún · sesgo suave a local");
    }
    reasons.push("Solo orientación estadística, no garantiza aciertos");

    return {
      match: m,
      result: result,
      counts: counts,
      totalPicks: total,
      consensus: consensus,
      consensusPct: Math.round(consensusPct * 100),
      suggested: suggested,
      confidence: conf,
      reasons: reasons,
      tablePick: tablePick,
    };
  },

  label: function (k) {
    if (k === "1") return "Local";
    if (k === "X") return "Empate";
    if (k === "2") return "Visitante";
    return k || "—";
  },

  chipClass: function (k) {
    return k === "1" ? "rL" : k === "X" ? "rE" : "rV";
  },

  renderPanel: function (data, standingsRows) {
    var escape = QA.utils.escape;
    var rows = this.analyze(data, standingsRows);
    if (!rows.length) {
      return '<div class="empty-state"><p>Sin partidos para analizar</p></div>';
    }

    var boleta = rows
      .map(function (r) {
        return QA.pronosticos.label(r.suggested).charAt(0);
      })
      .join(" · ");

    // Compact boleta suggestion L/E/V letters
    var boletaShort = rows
      .map(function (r) {
        return r.suggested === "1" ? "L" : r.suggested === "X" ? "E" : "V";
      })
      .join(" ");

    var html =
      '<div class="ia-banner">' +
      '<div class="ia-banner-title">Pronósticos inteligentes</div>' +
      '<p class="ia-banner-sub">Basados en el consenso de boletas de esta jornada y la tabla Liga MX. ' +
      "<strong>No son predicciones mágicas</strong> ni consejo de apuesta: el fútbol es azar.</p>" +
      '<div class="ia-boleta-sug">' +
      '<span class="ia-boleta-lbl">Boleta sugerida</span>' +
      '<span class="ia-boleta-vals">' +
      escape(boletaShort) +
      "</span></div></div>";

    rows.forEach(function (r) {
      var m = r.match;
      var done = r.result != null;
      var ok = done && r.result === r.suggested;
      html +=
        '<div class="ia-card' +
        (done ? (ok ? " ia-ok" : " ia-miss") : "") +
        '">' +
        '<div class="ia-card-top">' +
        '<span class="ia-match-no">P' +
        (m.match_no || "") +
        "</span>" +
        '<span class="ia-match-teams">' +
        escape((m.home_team || "").slice(0, 14)) +
        " vs " +
        escape((m.away_team || "").slice(0, 14)) +
        "</span>" +
        (done
          ? '<span class="result-chip ' +
            QA.pronosticos.chipClass(r.result) +
            '">' +
            (r.result === "1" ? "L" : r.result === "X" ? "E" : "V") +
            "</span>"
          : "") +
        "</div>" +
        '<div class="ia-sug-row">' +
        '<div class="ia-sug">' +
        '<span class="ia-sug-lbl">Sugerencia</span>' +
        '<span class="result-chip ' +
        QA.pronosticos.chipClass(r.suggested) +
        '">' +
        (r.suggested === "1" ? "L" : r.suggested === "X" ? "E" : "V") +
        "</span>" +
        '<span class="ia-conf conf-' +
        r.confidence +
        '">' +
        r.confidence +
        "</span></div>" +
        (r.totalPicks
          ? '<div class="ia-bars">' +
            ["1", "X", "2"]
              .map(function (k) {
                var pct = r.totalPicks
                  ? Math.round((r.counts[k] / r.totalPicks) * 100)
                  : 0;
                var col =
                  k === "1" ? "#3b82f6" : k === "X" ? "#f59e0b" : "#ef4444";
                var lab = k === "1" ? "L" : k === "X" ? "E" : "V";
                return (
                  '<div class="ia-bar-item"><span>' +
                  lab +
                  " " +
                  pct +
                  '%</span><div class="ia-bar-track"><div class="ia-bar-fill" style="width:' +
                  pct +
                  "%;background:" +
                  col +
                  '"></div></div></div>'
                );
              })
              .join("") +
            "</div>"
          : '<p class="ia-nodata">Sin picks del grupo aún · se usa tabla/localía</p>') +
        "</div>" +
        '<ul class="ia-reasons">' +
        r.reasons
          .map(function (x) {
            return "<li>" + escape(x) + "</li>";
          })
          .join("") +
        "</ul></div>";
    });

    html +=
      '<p class="ia-disclaimer">Resultados Quiniela Arcángel® · Módulo estadístico local · ' +
      "No utiliza APIs de IA de pago en este modo.</p>";

    return html;
  },
};
