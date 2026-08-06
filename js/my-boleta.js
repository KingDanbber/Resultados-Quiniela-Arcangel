/* Mi boleta · preferencia por jornada */
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
};
