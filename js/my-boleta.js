/* Mi boleta · preferencia por jornada + tarjeta destacada */
window.QA = window.QA || {};

QA.myBoleta = {
  KEY: "qa_my_boletas",

  all: function () {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  },

  get: function (poolId) {
    var m = this.all();
    return (poolId && m[poolId]) || null;
  },

  set: function (poolId, entryId, displayName) {
    var m = this.all();
    if (!poolId) return;
    if (!entryId) {
      delete m[poolId];
    } else {
      m[poolId] = { entryId: entryId, name: displayName || "" };
    }
    try {
      localStorage.setItem(this.KEY, JSON.stringify(m));
    } catch (_) {}
  },

  clear: function (poolId) {
    this.set(poolId, null);
  },

  findInLeaderboard: function (poolId, lb) {
    var pref = this.get(poolId);
    if (!pref || !lb) return null;
    var byId = lb.find(function (p) {
      return p.id === pref.entryId;
    });
    if (byId) return byId;
    if (pref.name) {
      var n = String(pref.name).toLowerCase();
      return (
        lb.find(function (p) {
          return String(p.displayName || "").toLowerCase() === n;
        }) || null
      );
    }
    return null;
  },

  /** Rank 1-based + entry o null */
  rankOf: function (poolId, lb) {
    var mine = this.findInLeaderboard(poolId, lb);
    if (!mine || !lb) return null;
    var idx = lb.findIndex(function (p) {
      return p.id === mine.id;
    });
    if (idx < 0) return null;
    return { rank: idx + 1, entry: mine, total: lb.length };
  },

  /**
   * Tarjeta destacada (HTML) para detalle de jornada.
   * Muestra posición, aciertos y acceso rápido a picks.
   */
  stickyCardHtml: function (data) {
    var escape = QA.utils.escape;
    var meta = (data && data.meta) || {};
    var lb = (data && data.leaderboard) || [];
    var isGoleo = !!(data && data.isGoleo);
    var completed = (data && data.completed) || 0;
    var info = this.rankOf(meta.id, lb);

    if (!info) {
      return (
        '<div class="my-sticky empty" id="my-sticky">' +
        '<div class="my-sticky-body">' +
        '<div class="my-sticky-title">Mi boleta</div>' +
        '<div class="my-sticky-sub">Elige tu boleta para ver tu posición en vivo</div>' +
        '</div>' +
        '<button type="button" class="my-sticky-btn" id="my-sticky-pick">Elegir</button>' +
        "</div>"
      );
    }

    var e = info.entry;
    var score = isGoleo
      ? e.goalPred != null
        ? e.goalPred
        : "—"
      : completed > 0
      ? e.aciertos
      : "—";
    var scoreLbl = isGoleo ? "Goles" : "Aciertos";

    return (
      '<div class="my-sticky" id="my-sticky">' +
      '<div class="my-sticky-rank">#' +
      info.rank +
      '<span class="my-sticky-of">/' +
      info.total +
      "</span></div>" +
      '<div class="my-sticky-body">' +
      '<div class="my-sticky-title">' +
      escape(e.displayName) +
      "</div>" +
      '<div class="my-sticky-sub">' +
      scoreLbl +
      ": <strong>" +
      score +
      "</strong>" +
      (e.displayArea ? " · " + escape(e.displayArea) : "") +
      (e.boletaNo ? " · Boleta " + e.boletaNo : "") +
      "</div></div>" +
      '<button type="button" class="my-sticky-btn ghost" id="my-sticky-change">Cambiar</button>' +
      "</div>"
    );
  },

  /** Resumen compacto para la home (necesita loadPoolDetail async por jornada) */
  homeChipHtml: function (poolId, rankInfo, isGoleo) {
    var escape = QA.utils.escape;
    if (!rankInfo) return "";
    var e = rankInfo.entry;
    var score = isGoleo
      ? e.goalPred != null
        ? e.goalPred
        : "—"
      : e.aciertos != null
      ? e.aciertos
      : "—";
    return (
      '<div class="home-my-chip">' +
      '<span class="home-my-rank">#' +
      rankInfo.rank +
      "</span>" +
      '<span class="home-my-name">' +
      escape(e.displayName) +
      "</span>" +
      '<span class="home-my-score">' +
      score +
      (isGoleo ? " goles" : " aciertos") +
      "</span></div>"
    );
  },
};
