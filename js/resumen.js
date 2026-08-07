/* Resumen al cerrar jornada · modal con podio, bolsa y compartir */
window.QA = window.QA || {};

QA.resumen = {
  KEY: "qa_resumen_seen",

  seen: function () {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  },

  mark: function (poolId) {
    var m = this.seen();
    m[poolId] = Date.now();
    try {
      localStorage.setItem(this.KEY, JSON.stringify(m));
    } catch (_) {}
  },

  wasShown: function (poolId) {
    return !!this.seen()[poolId];
  },

  /** Muestra el resumen si la jornada está cerrada y aún no se mostró */
  maybeShow: function (data, force) {
    if (!data || !data.jornadaDone) return;
    var meta = data.meta || {};
    if (!meta.id) return;
    if (!force && this.wasShown(meta.id)) return;
    this.show(data);
    this.mark(meta.id);
  },

  show: function (data) {
    var escape = QA.utils.escape;
    var meta = data.meta || {};
    var lb = data.leaderboard || [];
    var isGoleo = !!data.isGoleo;
    var completed = data.completed || 0;
    var maxH = 0;
    lb.forEach(function (p) {
      if ((p.aciertos || 0) > maxH) maxH = p.aciertos || 0;
    });

    var paid = lb.filter(function (p) {
      return p.paid;
    });
    var winners = isGoleo
      ? paid.filter(function (p) {
          return p.exactGoals;
        })
      : paid.filter(function (p) {
          return maxH > 0 && p.aciertos === maxH;
        });
    if (!winners.length) {
      winners = isGoleo
        ? lb.filter(function (p) {
            return p.exactGoals;
          }).slice(0, 3)
        : lb.filter(function (p) {
            return maxH > 0 && p.aciertos === maxH;
          }).slice(0, 5);
    }

    var bolsaTxt = "—";
    try {
      if (data.bolsaNeta != null) bolsaTxt = QA.utils.money(data.bolsaNeta);
      else if (data.bolsaBruta != null) bolsaTxt = QA.utils.money(data.bolsaBruta);
    } catch (_) {}

    var mine = QA.myBoleta && QA.myBoleta.rankOf(meta.id, lb);
    var mineHtml = "";
    if (mine) {
      mineHtml =
        '<div class="res-mine">' +
        '<div class="res-mine-lbl">Tu resultado</div>' +
        '<div class="res-mine-row">' +
        '<span class="res-mine-rank">#' +
        mine.rank +
        "</span>" +
        "<strong>" +
        escape(mine.entry.displayName) +
        "</strong>" +
        "<span>" +
        (isGoleo
          ? mine.entry.goalPred != null
            ? mine.entry.goalPred + " goles"
            : "—"
          : mine.entry.aciertos + " aciertos") +
        "</span></div></div>";
    }

    var podiumHtml = winners
      .slice(0, 5)
      .map(function (p, i) {
        var medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#" + (i + 1);
        return (
          '<div class="res-podio-row">' +
          '<span class="res-medal">' +
          medal +
          "</span>" +
          '<span class="res-name">' +
          escape(p.displayName) +
          "</span>" +
          '<span class="res-hits">' +
          (isGoleo
            ? p.goalPred != null
              ? p.goalPred
              : "—"
            : p.aciertos) +
          "</span></div>"
        );
      })
      .join("");

    var existing = document.getElementById("resumen-modal");
    if (existing) existing.remove();

    var modal = document.createElement("div");
    modal.id = "resumen-modal";
    modal.className = "qa-modal-overlay res-overlay";
    modal.innerHTML =
      '<div class="qa-modal res-modal">' +
      '<div class="res-hero">' +
      '<div class="res-badge">Jornada finalizada</div>' +
      "<h2>" +
      escape(meta.nombre || "Jornada") +
      "</h2>" +
      '<p class="res-sub">' +
      escape(meta.competencia || "") +
      (meta.season ? " · " + escape(meta.season) : "") +
      (meta.modeLabel ? " · " + escape(meta.modeLabel) : "") +
      "</p></div>" +
      '<div class="res-bolsa">' +
      '<div class="res-bolsa-lbl">Bolsa neta</div>' +
      '<div class="res-bolsa-val">' +
      bolsaTxt +
      "</div></div>" +
      '<div class="res-section"><div class="res-section-title">Podio</div>' +
      (podiumHtml || '<p class="qa-modal-note">Sin ganadores aún</p>') +
      "</div>" +
      mineHtml +
      '<div class="res-actions">' +
      '<button type="button" class="res-btn primary" id="res-share">Compartir</button>' +
      '<button type="button" class="res-btn" id="res-close">Cerrar</button>' +
      "</div></div>";

    document.body.appendChild(modal);

    document.getElementById("res-close").onclick = function () {
      modal.remove();
    };
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.remove();
    });
    document.getElementById("res-share").onclick = function () {
      var btn = document.getElementById("res-share");
      btn.disabled = true;
      btn.textContent = "…";
      QA.share
        .shareJornada(data, "podio")
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "Compartir";
        });
    };

    // Confeti suave
    try {
      if (window.confetti) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.35 },
          colors: ["#fbbf24", "#3b82f6", "#22c55e", "#f472b6"],
        });
      }
    } catch (_) {}
  },
};
