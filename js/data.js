/* ═══════════════════════════════════════════
   Data · Supabase (misma fuente que la app actual)
   Pools = jornadas reales de Quiniela Arcángel
   ═══════════════════════════════════════════ */

window.QA = window.QA || {};

QA.data = (function () {
  const SUPABASE_URL = "https://zapoxyrmeoqukshjzgki.supabase.co";
  const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphcG94eXJtZW9xdWtzaGp6Z2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDU0OTcsImV4cCI6MjA4NzcyMTQ5N30.AUSCK_2DG_eJ4u33q2ZeZuHQGRqiJ2BbXsH3fGRtP-M";

  const STATUS_ACTIVE = ["active", "activa", "open", "abierta", "published"];
  const STATUS_DRAFT = ["draft", "borrador", "pending"];

  let _cache = {
    jornadas: null,
    loadedAt: null,
    standings: null,
    standingsAt: null,
  };

  async function db(path) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
        Prefer: "count=exact",
        Range: "0-999",
      },
    });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${path}`);
    return r.json();
  }

  /** Todas las filas (paginación 1000) — usar en rankings / HoF */
  async function dbAll(path) {
    var all = [];
    var page = 0;
    var pageSize = 1000;
    while (page < 40) {
      var from = page * pageSize;
      var to = from + pageSize - 1;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: "application/json",
          Prefer: "count=exact",
          Range: from + "-" + to,
        },
      });
      if (!r.ok) throw new Error(`Supabase ${r.status}: ${path}`);
      var chunk = await r.json();
      if (!chunk || !chunk.length) break;
      all = all.concat(chunk);
      if (chunk.length < pageSize) break;
      var cr = r.headers.get("content-range") || "";
      var m = cr.match(/\/(\d+)/);
      if (m && all.length >= parseInt(m[1], 10)) break;
      page++;
    }
    return all;
  }


  function mapEstado(status) {
    const s = String(status || "").toLowerCase();
    if (STATUS_ACTIVE.includes(s)) return "activa";
    if (STATUS_DRAFT.includes(s)) return "borrador";
    if (s === "closed" || s === "cerrada" || s === "finished" || s === "finalizada")
      return "finalizada";
    return s || "finalizada";
  }

  function mapPool(p, stats) {
    stats = stats || {};
    const nombreCorto =
      p.round != null
        ? "Jornada " + p.round
        : p.name || p.date_label || "Jornada";

    return {
      id: p.id,
      nombre: nombreCorto,
      nombreCompleto: p.name || nombreCorto,
      competencia: p.competition || "Sin competencia",
      season: p.season || "",
      round: p.round,
      estado: mapEstado(p.status),
      statusRaw: p.status,
      dateLabel: p.date_label || "",
      mode: p.mode_code || "SENCILLA",
      modeLabel: (function (m) {
        m = String(m || "SENCILLA").toUpperCase();
        if (m.indexOf("GOLE") !== -1) return "Campeón de Goleo";
        if (m === "SENCILLA") return "Sencilla";
        return m;
      })(p.mode_code),
      price: p.price != null ? Number(p.price) : null,
      commissionPct: p.commission_pct != null ? Number(p.commission_pct) : 0,
      createdAt: p.created_at,
      partidosTotal: stats.partidosTotal != null ? stats.partidosTotal : 0,
      partidosJugados: stats.partidosJugados != null ? stats.partidosJugados : 0,
      participantes: stats.participantes != null ? stats.participantes : 0,
      pagados: stats.pagados != null ? stats.pagados : 0,
      ganador: null,
      aciertos: null,
    };
  }

  async function loadJornadas(force) {
    if (
      !force &&
      _cache.jornadas &&
      _cache.loadedAt &&
      Date.now() - _cache.loadedAt < 60000
    ) {
      return _cache.jornadas;
    }

    const [pools, matches, entries] = await Promise.all([
      db("pools?select=*&order=created_at.desc"),
      db("matches?select=id,pool_id,home_goals,away_goals"),
      db("entries?select=id,pool_id,paid"),
    ]);

    const mBy = {};
    matches.forEach(function (m) {
      if (!mBy[m.pool_id]) mBy[m.pool_id] = [];
      mBy[m.pool_id].push(m);
    });
    const eBy = {};
    entries.forEach(function (e) {
      if (!eBy[e.pool_id]) eBy[e.pool_id] = [];
      eBy[e.pool_id].push(e);
    });

    const jornadas = pools.map(function (p) {
      const ms = mBy[p.id] || [];
      const es = eBy[p.id] || [];
      const played = ms.filter(function (m) {
        return m.home_goals != null && m.away_goals != null;
      }).length;
      return mapPool(p, {
        partidosTotal: ms.length,
        partidosJugados: played,
        participantes: es.length,
        pagados: es.filter(function (e) {
          return e.paid;
        }).length,
      });
    });

    _cache.jornadas = jornadas;
    _cache.loadedAt = Date.now();
    return jornadas;
  }

  async function getJornadas(force) {
    return loadJornadas(!!force);
  }

  async function getActiveJornadas() {
    const list = await loadJornadas();
    const activas = list.filter(function (j) {
      return j.estado === "activa";
    });
    if (!activas.length) return list[0] ? [list[0]] : [];
    // Preferir las que tienen participantes; orden: SENCILLA primero, luego GOLEO, luego fecha
    return activas.slice().sort(function (a, b) {
      var ma = String(a.mode || "").toUpperCase();
      var mb = String(b.mode || "").toUpperCase();
      var pa = ma.indexOf("GOLE") !== -1 ? 1 : 0;
      var pb = mb.indexOf("GOLE") !== -1 ? 1 : 0;
      if (pa !== pb) return pa - pb;
      if ((b.participantes || 0) !== (a.participantes || 0))
        return (b.participantes || 0) - (a.participantes || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  async function getActiveJornada() {
    const activas = await getActiveJornadas();
    return activas[0] || null;
  }

  function getStandings() {
    return (
      _cache.standings || {
        updatedAt: null,
        tournament: "Liga MX",
        source: "cache",
        rows: [],
      }
    );
  }

  async function getStandingsAsync(force) {
    if (
      !force &&
      _cache.standings &&
      _cache.standingsAt &&
      Date.now() - _cache.standingsAt < 180000
    ) {
      return _cache.standings;
    }

    // 1) ESPN (tabla oficial actual)
    var fromEspn = null;
    try {
      fromEspn = await fetchStandingsFromEspn();
    } catch (e) {
      console.warn("Standings ESPN", e);
    }

    // 2) BD filtrada a temporada Apertura actual (misma lógica de puntos)
    var fromDb = null;
    try {
      fromDb = await computeStandingsFromDb();
    } catch (e) {
      console.warn("Standings BD", e);
    }

    // 3) TheSportsDB (a menudo incompleto)
    var fromApi = null;
    try {
      fromApi = await fetchStandingsFromApi();
    } catch (e) {
      console.warn("Standings TheSportsDB", e);
    }

    var result = null;
    if (fromEspn && fromEspn.rows && fromEspn.rows.length >= 10) {
      result = fromEspn;
    } else if (fromDb && fromDb.rows && fromDb.rows.length >= 10) {
      result = fromDb;
    } else if (fromApi && fromApi.rows && fromApi.rows.length >= 10) {
      result = fromApi;
    } else if (fromDb && fromDb.rows && fromDb.rows.length) {
      result = fromDb;
    } else if (fromEspn && fromEspn.rows && fromEspn.rows.length) {
      result = fromEspn;
    } else if (fromApi && fromApi.rows && fromApi.rows.length) {
      result = fromApi;
    } else {
      result = {
        updatedAt: new Date().toISOString(),
        tournament: "Liga MX · Apertura 2026",
        source: "sin datos",
        rows: [],
      };
    }

    _cache.standings = result;
    _cache.standingsAt = Date.now();
    return result;
  }

  async function fetchStandingsFromEspn() {
    var urls = [
      "https://site.api.espn.com/apis/v2/sports/soccer/mex.1/standings",
      "https://site.api.espn.com/apis/v2/sports/soccer/mex.1/standings?season=2026",
    ];
    var data = null;
    for (var i = 0; i < urls.length; i++) {
      try {
        var r = await fetch(urls[i], {
          headers: {
            Accept: "application/json",
          },
        });
        if (!r.ok) continue;
        data = await r.json();
        if (data && (data.children || data.standings)) break;
      } catch (_) {}
    }
    if (!data) return null;

    var entries = [];
    var children = data.children || [];
    if (children.length) {
      // Prefer group that looks like full league / apertura
      for (var c = 0; c < children.length; c++) {
        var st = children[c].standings || {};
        var en = st.entries || [];
        if (en.length > entries.length) entries = en;
      }
    }
    if (!entries.length && data.standings && data.standings.entries) {
      entries = data.standings.entries;
    }
    if (!entries.length) return null;

    function stat(e, names) {
      var stats = e.stats || [];
      for (var i = 0; i < names.length; i++) {
        var want = String(names[i]).toLowerCase();
        for (var j = 0; j < stats.length; j++) {
          var s = stats[j];
          var n = String(s.name || "").toLowerCase();
          var ab = String(s.abbreviation || "").toLowerCase();
          var dn = String(s.displayName || "").toLowerCase();
          if (n === want || ab === want || dn === want) {
            var v = s.displayValue != null ? s.displayValue : s.value;
            return v;
          }
        }
      }
      return 0;
    }

    var rows = entries.map(function (e) {
      var team = (e.team && (e.team.displayName || e.team.shortDisplayName)) || "?";
      var logo =
        (e.team &&
          e.team.logos &&
          e.team.logos[0] &&
          e.team.logos[0].href) ||
        teamLogoUrl(team);
      var pos = parseInt(stat(e, ["rank", "Rank"]), 10) || 0;
      var pj = parseInt(stat(e, ["gamesPlayed", "gamesplayed", "GP", "played", "JJ"]), 10) || 0;
      var g = parseInt(stat(e, ["wins", "Wins", "W", "ganados"]), 10) || 0;
      var d = parseInt(stat(e, ["ties", "draws", "Ties", "D", "empates"]), 10) || 0;
      var l = parseInt(stat(e, ["losses", "Losses", "L", "perdidos"]), 10) || 0;
      var pts = parseInt(stat(e, ["points", "Points", "PTS"]), 10) || 0;
      var gd =
        parseInt(stat(e, ["pointDifferential", "differential", "GD"]), 10) ||
        0;
      // sometimes GD is in "pointDifferential" for soccer as goal diff
      var gf = parseInt(stat(e, ["pointsFor", "goalsFor", "GF"]), 10);
      var ga = parseInt(stat(e, ["pointsAgainst", "goalsAgainst", "GA"]), 10);
      if (!isNaN(gf) && !isNaN(ga)) gd = gf - ga;
      return {
        pos: pos,
        team: team,
        logo: logo,
        pj: pj,
        g: g,
        e: d,
        p: l,
        dg: gd,
        pts: pts,
        zone: "",
      };
    });

    rows.sort(function (a, b) {
      if (a.pos && b.pos) return a.pos - b.pos;
      if (b.pts !== a.pts) return b.pts - a.pts;
      return b.dg - a.dg;
    });
    rows.forEach(function (r, i) {
      if (!r.pos) r.pos = i + 1;
      r.zone = r.pos <= 6 ? "directo" : r.pos <= 10 ? "playin" : "";
    });

    return {
      updatedAt: new Date().toISOString(),
      tournament: "Liga MX · Apertura 2026-27",
      source: "ESPN",
      rows: rows,
    };
  }

  function teamLogoUrl(name) {
    var n = String(name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    var map = {
      america: "img/america.png",
      toluca: "img/toluca.png",
      "cruz azul": "img/cruz-azul.png",
      tigres: "img/tigres.png",
      monterrey: "img/monterrey.png",
      chivas: "img/chivas.png",
      guadalajara: "img/chivas.png",
      pumas: "img/pumas.png",
      santos: "img/santos.png",
      pachuca: "img/pachuca.png",
      leon: "img/leon.png",
      necaxa: "img/necaxa.png",
      atlas: "img/atlas.png",
      queretaro: "img/queretaro.png",
      juarez: "img/juarez.png",
      tijuana: "img/tijuana.png",
      puebla: "img/puebla.png",
      mazatlan: "img/mazatlan.png",
      "san luis": "img/san-luis.png",
    };
    for (var k in map) {
      if (n.indexOf(k) !== -1) return map[k];
    }
    return "img/logo-arcangel.png";
  }

  function titleTeam(s) {
    return String(s || "")
      .toLowerCase()
      .split(" ")
      .map(function (w) {
        return w ? w.charAt(0).toUpperCase() + w.slice(1) : "";
      })
      .join(" ");
  }

  async function fetchStandingsFromApi() {
    var seasons = ["2026-2027", "2025-2026", "2024-2025"];
    for (var i = 0; i < seasons.length; i++) {
      var s = seasons[i];
      var url =
        "https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=4350&s=" +
        encodeURIComponent(s);
      var r = await fetch(url);
      if (!r.ok) continue;
      var data = await r.json();
      var table = data.table || [];
      if (!table.length) continue;
      var rows = table
        .map(function (row) {
          var pos = parseInt(row.intRank || 0, 10);
          var gf = parseInt(row.intGoalsFor || 0, 10);
          var ga = parseInt(row.intGoalsAgainst || 0, 10);
          return {
            pos: pos,
            team: row.strTeam || "?",
            logo: row.strBadge || teamLogoUrl(row.strTeam),
            pj: parseInt(row.intPlayed || 0, 10),
            g: parseInt(row.intWin || 0, 10),
            e: parseInt(row.intDraw || 0, 10),
            p: parseInt(row.intLoss || 0, 10),
            dg: gf - ga,
            pts: parseInt(row.intPoints || 0, 10),
            zone: pos <= 6 ? "directo" : pos <= 10 ? "playin" : "",
          };
        })
        .sort(function (a, b) {
          return a.pos - b.pos;
        });
      return {
        updatedAt: new Date().toISOString(),
        tournament: "Liga MX · " + s,
        source: "TheSportsDB",
        rows: rows,
      };
    }
    return null;
  }

  async function computeStandingsFromDb() {
    const [pools, matches] = await Promise.all([
      dbAll(
        "pools?select=id,competition,season,mode_code,round&competition=eq." +
          encodeURIComponent("Liga MX")
      ),
      dbAll(
        "matches?select=pool_id,home_team,away_team,home_goals,away_goals"
      ),
    ]);
    // Solo temporada Apertura vigente (no mezclar Clausura ni mundiales)
    var targetSeason = "Apertura 2026";
    var aperturaPools = (pools || []).filter(function (p) {
      return String(p.season || "").toLowerCase().indexOf("apertura") !== -1;
    });
    if (aperturaPools.length) {
      // la más reciente por nombre/año
      aperturaPools.sort(function (a, b) {
        return String(b.season).localeCompare(String(a.season));
      });
      targetSeason = aperturaPools[0].season || targetSeason;
    }

    var sencillaIds = {};
    var season = targetSeason;
    (pools || []).forEach(function (p) {
      var m = String(p.mode_code || "").toUpperCase();
      if (m.indexOf("GOLE") !== -1) return;
      if (String(p.season || "") !== targetSeason) return;
      sencillaIds[p.id] = true;
      if (p.season) season = p.season;
    });
    var table = {};
    function ensure(team) {
      var key = String(team || "").trim().toUpperCase();
      if (!key) return null;
      if (!table[key]) {
        table[key] = {
          team: key,
          pj: 0,
          g: 0,
          e: 0,
          p: 0,
          gf: 0,
          ga: 0,
          pts: 0,
        };
      }
      return table[key];
    }
    (matches || []).forEach(function (m) {
      if (!sencillaIds[m.pool_id]) return;
      if (m.home_goals == null || m.away_goals == null) return;
      var H = ensure(m.home_team);
      var A = ensure(m.away_team);
      if (!H || !A) return;
      var hg = Number(m.home_goals);
      var ag = Number(m.away_goals);
      H.pj++;
      A.pj++;
      H.gf += hg;
      H.ga += ag;
      A.gf += ag;
      A.ga += hg;
      if (hg > ag) {
        H.g++;
        H.pts += 3;
        A.p++;
      } else if (hg < ag) {
        A.g++;
        A.pts += 3;
        H.p++;
      } else {
        H.e++;
        A.e++;
        H.pts += 1;
        A.pts += 1;
      }
    });
    var rows = Object.keys(table)
      .map(function (k) {
        return table[k];
      })
      .map(function (r) {
        return {
          pos: 0,
          team: titleTeam(r.team),
          logo: teamLogoUrl(r.team),
          pj: r.pj,
          g: r.g,
          e: r.e,
          p: r.p,
          dg: r.gf - r.ga,
          pts: r.pts,
          zone: "",
        };
      })
      .sort(function (a, b) {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.dg !== a.dg) return b.dg - a.dg;
        return a.team.localeCompare(b.team);
      });
    rows.forEach(function (r, i) {
      r.pos = i + 1;
      r.zone = r.pos <= 6 ? "directo" : r.pos <= 10 ? "playin" : "";
    });
    return {
      updatedAt: new Date().toISOString(),
      tournament: "Liga MX · " + season,
      source: "Quiniela · solo " + season + " (sin Clausura)",
      rows: rows,
    };
  }

  return {
    db: db,
    dbAll: dbAll,
    getJornadas: getJornadas,
    getActiveJornada: getActiveJornada,
    getActiveJornadas: getActiveJornadas,
    getStandings: getStandings,
    getStandingsAsync: getStandingsAsync,
    mapEstado: mapEstado,
    invalidate: function () {
      _cache.jornadas = null;
      _cache.loadedAt = null;
    },
  };
})();

QA.data._heavyCache = { ranking: null, rankingAt: 0, hof: null, hofAt: 0, gstat: null, gstatAt: 0 };

/* ── Team logos + pool detail ── */
QA.data.TEAM_LOGO_MAP = {
  america: "img/america.png", aguilas: "img/america.png", "club america": "img/america.png",
  atlas: "img/atlas.png", atlante: "img/atlante.png",
  chivas: "img/chivas.png", guadalajara: "img/chivas.png",
  "cruz azul": "img/cruz-azul.png", cruzazul: "img/cruz-azul.png",
  juarez: "img/juarez.png", "juárez": "img/juarez.png", "fc juarez": "img/juarez.png",
  leon: "img/leon.png", "león": "img/leon.png",
  mazatlan: "img/mazatlan.png", "mazatlán": "img/mazatlan.png",
  monterrey: "img/monterrey.png", rayados: "img/monterrey.png",
  necaxa: "img/necaxa.png", pachuca: "img/pachuca.png", tuzos: "img/pachuca.png",
  puebla: "img/puebla.png", pumas: "img/pumas.png", unam: "img/pumas.png",
  queretaro: "img/queretaro.png", "querétaro": "img/queretaro.png",
  "san luis": "img/san-luis.png", "atletico san luis": "img/san-luis.png",
  santos: "img/santos.png", "santos laguna": "img/santos.png",
  tigres: "img/tigres.png", "tigres uanl": "img/tigres.png",
  tijuana: "img/tijuana.png", xolos: "img/tijuana.png",
  toluca: "img/toluca.png",
};

QA.data.teamLogo = function (name) {
  if (!name) return null;
  const key = String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const map = QA.data.TEAM_LOGO_MAP;
  if (map[key]) return map[key];
  for (const k in map) {
    if (key.indexOf(k) !== -1 || k.indexOf(key) !== -1) return map[k];
  }
  return null;
};

QA.data.getResult = function (h, a) {
  if (h == null || a == null) return null;
  return h > a ? "1" : h === a ? "X" : "2";
};

QA.data.RLABEL = { "1": "L", "X": "E", "2": "V" };
QA.data.RLABEL_FULL = { "1": "Local", "X": "Empate", "2": "Visita" };
QA.data.pickLabel = function (n) {
  return QA.data.RLABEL[n] || n || "—";
};
QA.data.pickLabelFull = function (n) {
  return QA.data.RLABEL_FULL[n] || n || "—";
};

QA.data.normalizePick = function (raw) {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase();
  return { H: "1", D: "X", A: "2" }[s] || s;
};

/** Carga detalle completo de una jornada (matches, entries, preds, participants) */
QA.data.loadPoolDetail = async function (poolId) {
  const db = QA.data.db;
  const [pools, matchesRaw, entries, poolResults] = await Promise.all([
    db("pools?id=eq." + poolId + "&select=*"),
    db("matches?pool_id=eq." + poolId + "&select=*&order=match_no.asc"),
    db("entries?pool_id=eq." + poolId + "&select=*&order=created_at.asc"),
    db("pool_results?pool_id=eq." + poolId + "&select=*&limit=1"),
  ]);

  const pool = pools[0];
  if (!pool) throw new Error("Jornada no encontrada");

  let matches = matchesRaw || [];
  const modeUp = String(pool.mode_code || "SENCILLA").toUpperCase();
  const isGoleo = modeUp.indexOf("GOLE") !== -1;
  var totalGoalsReal = null;
  var totalGoalsPartial = 0;
  var goalsMatchesDone = 0;
  var siblingSencillaId = null;

  // GOLEO: sincronizar marcadores desde quiniela SENCILLA (misma jornada)
  if (isGoleo) {
    try {
      var q =
        "pools?select=id,mode_code,round,competition,season&competition=eq." +
        encodeURIComponent(pool.competition || "") +
        "&round=eq." +
        pool.round;
      var siblings = await db(q);
      var senc = (siblings || []).find(function (s) {
        var m = String(s.mode_code || "").toUpperCase();
        return (
          s.id !== pool.id &&
          (m === "SENCILLA" || m.indexOf("GOLE") === -1) &&
          String(s.season || "") === String(pool.season || "")
        );
      });
      if (!senc) {
        senc = (siblings || []).find(function (s) {
          var m = String(s.mode_code || "").toUpperCase();
          return s.id !== pool.id && (m === "SENCILLA" || m.indexOf("GOLE") === -1);
        });
      }
      if (senc) {
        siblingSencillaId = senc.id;
        var sm = await db(
          "matches?pool_id=eq." + senc.id + "&select=*&order=match_no.asc"
        );
        var byNo = {};
        (sm || []).forEach(function (m) {
          byNo[m.match_no] = m;
        });
        matches = matches.map(function (m) {
          var src = byNo[m.match_no];
          if (!src) {
            src = (sm || []).find(function (x) {
              return (
                String(x.home_team || "").toUpperCase() ===
                  String(m.home_team || "").toUpperCase() &&
                String(x.away_team || "").toUpperCase() ===
                  String(m.away_team || "").toUpperCase()
              );
            });
          }
          if (src && src.home_goals != null && src.away_goals != null) {
            return Object.assign({}, m, {
              home_goals: src.home_goals,
              away_goals: src.away_goals,
              _syncedFromSencilla: true,
            });
          }
          return m;
        });
      }
    } catch (syncErr) {
      console.warn("GOLEO sync scores failed", syncErr);
    }
  }

  matches.forEach(function (m) {
    if (m.home_goals != null && m.away_goals != null) {
      totalGoalsPartial += Number(m.home_goals) + Number(m.away_goals);
      goalsMatchesDone++;
    }
  });
  if (matches.length > 0 && goalsMatchesDone === matches.length) {
    totalGoalsReal = totalGoalsPartial;
  }

  let participantsMap = {};
  const partIds = [
    ...new Set(entries.map(function (e) { return e.participant_id; }).filter(Boolean)),
  ];
  if (partIds.length) {
    try {
      const parts = await QA.data.dbAll(
        "participants?id=in.(" + partIds.join(",") + ")&select=id,name,area"
      );
      participantsMap = Object.fromEntries(
        (parts || []).map(function (p) {
          return [p.id, p];
        })
      );
    } catch (err) {
      console.warn("participants lookup", err);
      // fallback: uno por uno con db simple
      try {
        for (var i = 0; i < partIds.length; i++) {
          var rows = await QA.data.db(
            "participants?id=eq." + partIds[i] + "&select=id,name,area"
          );
          if (rows && rows[0]) participantsMap[rows[0].id] = rows[0];
        }
      } catch (e2) {
        console.warn("participants fallback", e2);
      }
    }
  }

  let preds = [];
  let predGoals = [];
  if (entries.length) {
    const ids = entries.map(function (e) { return e.id; }).join(",");
    try {
      const pair = await Promise.all([
        db("predictions_1x2?entry_id=in.(" + ids + ")&select=*"),
        db("predictions_total_goals?entry_id=in.(" + ids + ")&select=*"),
      ]);
      preds = pair[0];
      predGoals = pair[1];
    } catch (_) {}
  }

  const getResult = QA.data.getResult;
  const normalizePick = QA.data.normalizePick;

  // boleta numbers
  const partGroups = {};
  entries.forEach(function (e) {
    const key = e.participant_id || e.participant_name_snapshot || e.id;
    if (!partGroups[key]) partGroups[key] = [];
    partGroups[key].push(e);
  });
  const entryBoletaMap = {};
  Object.values(partGroups).forEach(function (group) {
    const sorted = group.slice().sort(function (a, b) {
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
    sorted.forEach(function (e, i) {
      entryBoletaMap[e.id] = sorted.length > 1 ? i + 1 : 0;
    });
  });

  const completed = matches.filter(function (m) {
    return m.home_goals != null && m.away_goals != null;
  }).length;
  const jornadaDone = matches.length > 0 && completed === matches.length;

  const leaderboard = entries
    .map(function (entry) {
      const myPreds = preds.filter(function (p) { return p.entry_id === entry.id; });
      const myGoalPred = predGoals.find(function (p) { return p.entry_id === entry.id; });
      let aciertos = 0;
      const details = matches.map(function (match) {
        const result = getResult(match.home_goals, match.away_goals);
        const pred = myPreds.find(function (p) { return p.match_id === match.id; });
        const pick = normalizePick(pred && pred.pick);
        const correct = result !== null && pick === result;
        if (correct) aciertos++;
        return { match: match, pick: pick, result: result, correct: correct };
      });
      const goalPred =
        myGoalPred && myGoalPred.predicted_total_goals != null
          ? Number(myGoalPred.predicted_total_goals)
          : null;
      // Exacto al total real (solo si jornada completa)
      const exactGoals =
        isGoleo &&
        totalGoalsReal != null &&
        goalPred != null &&
        goalPred === totalGoalsReal;
      const goalsDiff =
        isGoleo && goalPred != null && totalGoalsPartial != null
          ? Math.abs(goalPred - totalGoalsPartial)
          : null;
      const partFb = participantsMap[entry.participant_id] || {};
      return {
        id: entry.id,
        participantId: entry.participant_id,
        displayName:
          entry.participant_name_snapshot || partFb.name || "Sin nombre",
        displayArea: entry.participant_area_snapshot || partFb.area || "",
        paid: !!entry.paid,
        aciertos: aciertos,
        details: details,
        goalPred: goalPred,
        exactGoals: !!exactGoals,
        goalsDiff: goalsDiff,
        boletaNo: entryBoletaMap[entry.id] || 0,
      };
    })
    .sort(function (a, b) {
      if (jornadaDone && a.paid !== b.paid) return a.paid ? -1 : 1;
      if (isGoleo) {
        // Exactos primero, luego más cercanos al total, luego mayor pronóstico
        if (a.exactGoals !== b.exactGoals) return a.exactGoals ? -1 : 1;
        var da = a.goalsDiff != null ? a.goalsDiff : 9999;
        var db = b.goalsDiff != null ? b.goalsDiff : 9999;
        if (da !== db) return da - db;
        if ((b.goalPred || 0) !== (a.goalPred || 0))
          return (b.goalPred || 0) - (a.goalPred || 0);
        return (a.displayName || "").localeCompare(b.displayName || "");
      }
      if (b.aciertos !== a.aciertos) return b.aciertos - a.aciertos;
      return (a.displayName || "").localeCompare(b.displayName || "");
    });

  return {
    pool: pool,
    matches: matches,
    entries: entries,
    leaderboard: leaderboard,
    poolResult: poolResults[0] || null,
    completed: completed,
    jornadaDone: jornadaDone,
    isGoleo: isGoleo,
    totalGoalsReal: totalGoalsReal,
    totalGoalsPartial: totalGoalsPartial,
    goalsMatchesDone: goalsMatchesDone,
    siblingSencillaId: siblingSencillaId,
    exactWinners: isGoleo
      ? leaderboard.filter(function (p) {
          return p.exactGoals && p.paid;
        })
      : [],
    meta: {
      id: pool.id,
      nombre:
        pool.round != null
          ? "Jornada " + pool.round
          : pool.name || "Jornada",
      nombreCompleto: pool.name,
      competencia: pool.competition || "",
      season: pool.season || "",
      dateLabel: pool.date_label || "",
      mode: pool.mode_code || "SENCILLA",
      modeLabel: (function (m) {
        m = String(m || "SENCILLA").toUpperCase();
        if (m.indexOf("GOLE") !== -1) return "Campeón de Goleo";
        if (m === "SENCILLA") return "Sencilla";
        return m;
      })(pool.mode_code),
      price: pool.price,
      estado: (function () {
        const s = String(pool.status || "").toLowerCase();
        if (["active", "activa", "open", "abierta", "published"].indexOf(s) !== -1)
          return "activa";
        if (["draft", "borrador", "pending"].indexOf(s) !== -1) return "borrador";
        return "finalizada";
      })(),
    },
  };
};

/** Ranking acumulado de aciertos (todas las jornadas Sencilla) */
QA.data.getCumulativeRanking = async function (force) {
  var c = QA.data._heavyCache;
  if (!force && c.ranking && Date.now() - c.rankingAt < 120000) return c.ranking;
  const dbAll = QA.data.dbAll;
  const getResult = QA.data.getResult;
  const normalizePick = QA.data.normalizePick;

  const [pools, matches, entries, preds] = await Promise.all([
    dbAll("pools?select=id,name,round,status,mode_code,competition,season&order=created_at.asc"),
    dbAll("matches?select=id,pool_id,home_goals,away_goals"),
    dbAll("entries?select=id,pool_id,participant_id,participant_name_snapshot,participant_area_snapshot,paid"),
    dbAll("predictions_1x2?select=entry_id,match_id,pick"),
  ]);

  const partIds = [
    ...new Set(entries.map(function (e) { return e.participant_id; }).filter(Boolean)),
  ];
  let participants = {};
  if (partIds.length) {
    try {
      const parts = await dbAll(
        "participants?id=in.(" + partIds.join(",") + ")&select=id,name,area"
      );
      participants = Object.fromEntries(parts.map(function (p) { return [p.id, p]; }));
    } catch (_) {}
  }

  const mBy = {};
  matches.forEach(function (m) {
    if (!mBy[m.pool_id]) mBy[m.pool_id] = [];
    mBy[m.pool_id].push(m);
  });
  const eBy = {};
  entries.forEach(function (e) {
    if (!eBy[e.pool_id]) eBy[e.pool_id] = [];
    eBy[e.pool_id].push(e);
  });
  const predByEntry = {};
  preds.forEach(function (p) {
    if (!predByEntry[p.entry_id]) predByEntry[p.entry_id] = [];
    predByEntry[p.entry_id].push(p);
  });

  const cumul = {};
  pools.forEach(function (pool) {
    const mode = String(pool.mode_code || "").toUpperCase();
    if (mode.indexOf("GOLE") !== -1) return; // solo sencilla en ranking de aciertos
    const pMatches = mBy[pool.id] || [];
    const pEntries = eBy[pool.id] || [];
    pEntries.forEach(function (entry) {
      const fb = participants[entry.participant_id] || {};
      const name = entry.participant_name_snapshot || fb.name || "Sin nombre";
      const area = entry.participant_area_snapshot || fb.area || "";
      const pid = entry.participant_id || entry.id;
      if (!cumul[pid]) cumul[pid] = { id: pid, name: name, area: area, total: 0, jornadas: 0 };
      const myPreds = predByEntry[entry.id] || [];
      let hits = 0;
      pMatches.forEach(function (match) {
        const result = getResult(match.home_goals, match.away_goals);
        const pred = myPreds.find(function (p) { return p.match_id === match.id; });
        const pick = normalizePick(pred && pred.pick);
        if (result !== null && pick === result) hits++;
      });
      cumul[pid].total += hits;
      cumul[pid].jornadas += 1;
    });
  });

  var ranking = Object.values(cumul).sort(function (a, b) {
    return b.total - a.total;
  });
  c.ranking = ranking;
  c.rankingAt = Date.now();
  return ranking;
};

/** Hall of Fame: ganadores por jornada finalizada (Sencilla) */
QA.data.getHallOfFame = async function (force) {
  var c = QA.data._heavyCache;
  if (!force && c.hof && Date.now() - c.hofAt < 120000) return c.hof;
  const dbAll = QA.data.dbAll;
  const getResult = QA.data.getResult;
  const normalizePick = QA.data.normalizePick;

  const [pools, matches, entries, preds, poolResults] = await Promise.all([
    dbAll("pools?select=*&order=created_at.desc"),
    dbAll("matches?select=id,pool_id,home_goals,away_goals"),
    dbAll("entries?select=*"),
    dbAll("predictions_1x2?select=entry_id,match_id,pick"),
    dbAll("pool_results?select=*").catch(function () { return []; }),
  ]);

  const prBy = {};
  (poolResults || []).forEach(function (r) {
    prBy[r.pool_id] = r;
  });

  const partIds = [
    ...new Set(entries.map(function (e) { return e.participant_id; }).filter(Boolean)),
  ];
  let participants = {};
  if (partIds.length) {
    try {
      const parts = await dbAll(
        "participants?id=in.(" + partIds.join(",") + ")&select=id,name,area"
      );
      participants = Object.fromEntries(parts.map(function (p) { return [p.id, p]; }));
    } catch (_) {}
  }

  const mBy = {};
  matches.forEach(function (m) {
    if (!mBy[m.pool_id]) mBy[m.pool_id] = [];
    mBy[m.pool_id].push(m);
  });
  const eBy = {};
  entries.forEach(function (e) {
    if (!eBy[e.pool_id]) eBy[e.pool_id] = [];
    eBy[e.pool_id].push(e);
  });
  const predByEntry = {};
  preds.forEach(function (p) {
    if (!predByEntry[p.entry_id]) predByEntry[p.entry_id] = [];
    predByEntry[p.entry_id].push(p);
  });

  const STATUS_CLOSED = ["closed", "cerrada", "finished", "finalizada"];
  const cards = [];

  pools.forEach(function (pool) {
    const mode = String(pool.mode_code || "").toUpperCase();
    if (mode.indexOf("GOLE") !== -1) return;

    const pMatches = mBy[pool.id] || [];
    if (!pMatches.length) return;
    const allDone = pMatches.every(function (m) {
      return m.home_goals != null && m.away_goals != null;
    });
    const st = String(pool.status || "").toLowerCase();
    if (!allDone && STATUS_CLOSED.indexOf(st) === -1) return;

    const paidEntries = (eBy[pool.id] || []).filter(function (e) { return e.paid; });
    if (!paidEntries.length) return;

    const entryHits = paidEntries.map(function (entry) {
      const fb = participants[entry.participant_id] || {};
      const myPreds = predByEntry[entry.id] || [];
      let hits = 0;
      pMatches.forEach(function (match) {
        const result = getResult(match.home_goals, match.away_goals);
        const pred = myPreds.find(function (p) { return p.match_id === match.id; });
        const pick = normalizePick(pred && pred.pick);
        if (result !== null && pick === result) hits++;
      });
      return {
        name: entry.participant_name_snapshot || fb.name || "?",
        area: entry.participant_area_snapshot || fb.area || "",
        hits: hits,
        paid: true,
      };
    });

    const maxH = Math.max.apply(
      null,
      entryHits.map(function (e) { return e.hits; })
    );
    if (!maxH) return;
    const winners = entryHits.filter(function (e) { return e.hits === maxH; });

    const price = pool.price != null ? Number(pool.price) : 0;
    const commission = pool.commission_pct != null ? Number(pool.commission_pct) : 0;
    const gross = paidEntries.length * price;
    const pr = prBy[pool.id];
    const net =
      pr && pr.net_pot != null
        ? Number(pr.net_pot)
        : gross * (1 - commission / 100);
    const prize = winners.length ? net / winners.length : 0;

    cards.push({
      poolId: pool.id,
      label: pool.round != null ? "Jornada " + pool.round : pool.name || "Jornada",
      name: pool.name,
      competition: pool.competition || "",
      season: pool.season || "",
      mode: pool.mode_code || "SENCILLA",
      net: net,
      gross: gross,
      maxH: maxH,
      winners: winners,
      prize: prize,
      isSplit: winners.length > 1,
      paidCount: paidEntries.length,
      dateLabel: pool.date_label || "",
    });
  });

  c.hof = cards;
  c.hofAt = Date.now();
  return cards;
};

/** Estadísticas generales de toda la quiniela */
QA.data.getGeneralStats = async function (force) {
  var c = QA.data._heavyCache;
  if (!force && c.gstat && Date.now() - c.gstatAt < 120000) return c.gstat;
  const dbAll = QA.data.dbAll;
  const getResult = QA.data.getResult;
  const normalizePick = QA.data.normalizePick;

  const [pools, matches, entries, preds] = await Promise.all([
    dbAll("pools?select=*&order=created_at.asc"),
    dbAll("matches?select=id,pool_id,home_goals,away_goals"),
    dbAll("entries?select=*"),
    dbAll("predictions_1x2?select=entry_id,match_id,pick"),
  ]);

  const partIds = [
    ...new Set(entries.map(function (e) { return e.participant_id; }).filter(Boolean)),
  ];
  var participants = {};
  if (partIds.length) {
    try {
      var parts = await dbAll(
        "participants?id=in.(" + partIds.join(",") + ")&select=id,name,area"
      );
      participants = Object.fromEntries(parts.map(function (p) { return [p.id, p]; }));
    } catch (_) {}
  }

  const mBy = {};
  matches.forEach(function (m) {
    if (!mBy[m.pool_id]) mBy[m.pool_id] = [];
    mBy[m.pool_id].push(m);
  });
  const eBy = {};
  entries.forEach(function (e) {
    if (!eBy[e.pool_id]) eBy[e.pool_id] = [];
    eBy[e.pool_id].push(e);
  });
  const predByEntry = {};
  preds.forEach(function (p) {
    if (!predByEntry[p.entry_id]) predByEntry[p.entry_id] = [];
    predByEntry[p.entry_id].push(p);
  });

  const bolsaHistory = [];
  const winnerMap = {};

  pools.forEach(function (pool) {
    const mode = String(pool.mode_code || "").toUpperCase();
    if (mode.indexOf("GOLE") !== -1) return;

    const pMatches = mBy[pool.id] || [];
    const paidEntries = (eBy[pool.id] || []).filter(function (e) {
      return e.paid;
    });
    if (!paidEntries.length) return;

    const allDone =
      pMatches.length > 0 &&
      pMatches.every(function (m) {
        return m.home_goals != null && m.away_goals != null;
      });

    const price = pool.price != null ? Number(pool.price) : 0;
    const commission =
      pool.commission_pct != null ? Number(pool.commission_pct) : 0;
    const gross = paidEntries.length * price;
    const net = gross * (1 - commission / 100);

    const label =
      (pool.round != null ? "Jornada " + pool.round : pool.name || "Jornada") +
      (pool.competition ? " · " + pool.competition : "");

    bolsaHistory.push({
      poolId: pool.id,
      label: label,
      shortLabel:
        pool.round != null
          ? "J" + pool.round
          : (pool.name || "").slice(0, 12),
      net: net,
      paid: paidEntries.length,
      season: pool.season || "",
      competition: pool.competition || "",
    });

    if (!allDone) return;

    const entryHits = paidEntries.map(function (entry) {
      const fb = participants[entry.participant_id] || {};
      const myPreds = predByEntry[entry.id] || [];
      let hits = 0;
      pMatches.forEach(function (match) {
        const result = getResult(match.home_goals, match.away_goals);
        const pred = myPreds.find(function (p) {
          return p.match_id === match.id;
        });
        const pick = normalizePick(pred && pred.pick);
        if (result !== null && pick === result) hits++;
      });
      return {
        pid: entry.participant_id || entry.id,
        name: entry.participant_name_snapshot || fb.name || "?",
        area: entry.participant_area_snapshot || fb.area || "",
        hits: hits,
      };
    });
    const maxHits = Math.max.apply(
      null,
      entryHits.map(function (e) {
        return e.hits;
      }).concat([0])
    );
    if (!maxHits) return;
    const winners = entryHits.filter(function (e) {
      return e.hits === maxHits;
    });
    const prize = winners.length ? net / winners.length : 0;
    winners.forEach(function (w) {
      if (!winnerMap[w.pid]) {
        winnerMap[w.pid] = {
          name: w.name,
          area: w.area,
          totalWins: 0,
          totalEarned: 0,
          wins: [],
        };
      }
      winnerMap[w.pid].totalWins++;
      winnerMap[w.pid].totalEarned += prize;
      winnerMap[w.pid].wins.push({
        label: label,
        hits: maxHits,
        prize: prize,
        competition: pool.competition || "",
        season: pool.season || "",
        mode: pool.mode_code || "SENCILLA",
        modeLabel: (function (m) {
          m = String(m || "SENCILLA").toUpperCase();
          if (m.indexOf("GOLE") !== -1) return "Campeón de Goleo";
          if (m === "SENCILLA") return "Sencilla";
          return m;
        })(pool.mode_code),
        round: pool.round,
        poolId: pool.id,
        dateLabel: pool.date_label || "",
      });
    });
  });

  const totalBolsa = bolsaHistory.reduce(function (s, b) {
    return s + b.net;
  }, 0);
  const avgBolsa = bolsaHistory.length ? totalBolsa / bolsaHistory.length : 0;
  const maxBolsa = bolsaHistory.length
    ? Math.max.apply(
        null,
        bolsaHistory.map(function (b) {
          return b.net;
        })
      )
    : 0;

  const winnerRanking = Object.values(winnerMap).sort(function (a, b) {
    if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
    return b.totalEarned - a.totalEarned;
  });

  var out = {
    totalJornadas: bolsaHistory.length,
    totalBolsa: totalBolsa,
    avgBolsa: avgBolsa,
    maxBolsa: maxBolsa,
    totalPagos: entries.filter(function (e) {
      return e.paid;
    }).length,
    uniqueParticipants: new Set(
      entries.map(function (e) {
        return e.participant_id || e.id;
      })
    ).size,
    bolsaHistory: bolsaHistory,
    winnerRanking: winnerRanking,
  };
  c.gstat = out;
  c.gstatAt = Date.now();
  return out;
};


/** Calendario Liga MX · temporada actual (Apertura/Clausura) */

/** Calendario Liga MX · temporada actual (Apertura/Clausura) */
QA.data.detectLigaMxSeason = function () {
  var now = new Date();
  var m = now.getMonth() + 1;
  var y = now.getFullYear();
  if (m >= 7 && m <= 12) {
    return {
      label: "Apertura " + y,
      tsdb: y + "-" + (y + 1),
      type: "apertura",
      year: y,
    };
  }
  return {
    label: "Clausura " + y,
    tsdb: y - 1 + "-" + y,
    type: "clausura",
    year: y,
  };
};

QA.data.getLigaMxCalendar = async function (force) {
  var c = QA.data._heavyCache;
  if (!c.calendar) c.calendar = null;
  if (!c.calendarAt) c.calendarAt = 0;
  if (!force && c.calendar && Date.now() - c.calendarAt < 180000) {
    return c.calendar;
  }

  var season = QA.data.detectLigaMxSeason();
  var fromFevm = null;
  var fromEspn = null;
  var fromTsdb = null;
  var fromDb = null;

  try {
    fromFevm = await QA.data.fetchCalendarFutbolEnVivoMexico(season);
  } catch (e) {
    console.warn("Calendar FutbolEnVivoMX", e);
  }
  try {
    fromEspn = await QA.data.fetchCalendarEspn(season);
  } catch (e) {
    console.warn("Calendar ESPN", e);
  }
  try {
    fromTsdb = await QA.data.fetchCalendarTheSportsDB(season);
  } catch (e) {
    console.warn("Calendar TSDB", e);
  }
  try {
    fromDb = await QA.data.fetchCalendarFromDb(season);
  } catch (e) {
    console.warn("Calendar BD", e);
  }

  var merged = QA.data.mergeCalendars(fromFevm, fromEspn, fromTsdb, fromDb, season);
  c.calendar = merged;
  c.calendarAt = Date.now();
  return merged;
};

QA.data.guessTvChannel = function (home, away, dateStr) {
  var pairs = [
    ["america", "chivas", "TUDN / ViX"],
    ["america", "guadalajara", "TUDN / ViX"],
    ["tigres", "monterrey", "TUDN / ESPN"],
    ["monterrey", "tigres", "TUDN / ESPN"],
  ];
  var h = String(home || "").toLowerCase();
  var a = String(away || "").toLowerCase();
  for (var i = 0; i < pairs.length; i++) {
    var p = pairs[i];
    if (
      (h.indexOf(p[0]) !== -1 && a.indexOf(p[1]) !== -1) ||
      (h.indexOf(p[1]) !== -1 && a.indexOf(p[0]) !== -1)
    ) {
      return p[2];
    }
  }
  return "Consultar guía local";
};

/** Proxy CORS para scrapers externos */
QA.data.fetchViaProxy = async function (url) {
  var proxies = [
    "https://corsproxy.io/?" + encodeURIComponent(url),
    "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(url),
  ];
  // intento directo primero
  try {
    var r0 = await fetch(url, {
      headers: { Accept: "text/html,application/json" },
    });
    if (r0.ok) {
      var t0 = await r0.text();
      if (t0 && t0.length > 500) return t0;
    }
  } catch (_) {}
  for (var i = 0; i < proxies.length; i++) {
    try {
      var r = await fetch(proxies[i]);
      if (!r.ok) continue;
      var t = await r.text();
      if (t && t.length > 500) return t;
    } catch (_) {}
  }
  return null;
};

/**
 * Fuente principal calendario + TV:
 * https://www.futbolenvivomexico.com/competicion/liga-mexico
 */
QA.data.fetchCalendarFutbolEnVivoMexico = async function (season) {
  var html = await QA.data.fetchViaProxy(
    "https://www.futbolenvivomexico.com/competicion/liga-mexico"
  );
  if (!html) return null;

  var matches = [];
  // name + startDate + venue + listaCanales
  var re =
    /itemprop="name" content="([^"]+)"\s*\/>\s*<meta itemprop="description" content="([^"]*)"\s*\/>\s*<meta itemprop="url" content="([^"]*)"\s*\/>\s*<meta itemprop="startDate" content="([^"]+)"[\s\S]*?<meta itemprop="name" content="([^"]*)"[\s\S]*?<ul class="listaCanales">([\s\S]*?)<\/ul>/g;
  var m;
  while ((m = re.exec(html)) !== null) {
    var title = m[1] || "";
    var parts = title.split(" - ");
    if (parts.length < 2) parts = title.split(" vs ");
    if (parts.length < 2) continue;
    var home = parts[0].trim();
    var away = parts.slice(1).join(" - ").trim();
    var start = m[4];
    var venue = m[5] || "";
    var canalBlock = m[6] || "";
    var channels = [];
    var cr = /title="([^"]+)"/g;
    var cm;
    while ((cm = cr.exec(canalBlock)) !== null) {
      if (cm[1] && channels.indexOf(cm[1]) === -1) channels.push(cm[1]);
    }
    // Filtrar solo Liga MX masculina (la URL de competicion ya es liga-mexico)
    matches.push({
      id: "fevm-" + start + "-" + home + "-" + away,
      jornada: null,
      home: home,
      away: away,
      homeLogo: null,
      awayLogo: null,
      date: start,
      homeGoals: null,
      awayGoals: null,
      status: "NS",
      tv: channels.length
        ? channels.slice(0, 5).join(" · ")
        : QA.data.guessTvChannel(home, away, start),
      venue: venue,
      source: "FutbolEnVivoMX",
    });
  }

  if (!matches.length) return null;

  // Inferir jornadas (~9 partidos): ventanas de matchday
  matches = QA.data.assignJornadas(matches);

  return {
    season: season,
    source: "FutbolEnVivoMX",
    matches: matches,
  };
};

QA.data.fetchCalendarEspn = async function (season) {
  var urls = [
    "https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard",
    "https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?limit=100",
  ];
  if (season.type === "apertura") {
    urls.push(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?dates=" +
        season.year +
        "0701-" +
        season.year +
        "1231"
    );
  } else {
    urls.push(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?dates=" +
        season.year +
        "0101-" +
        season.year +
        "0531"
    );
  }

  var allEvents = [];
  for (var i = 0; i < urls.length; i++) {
    try {
      var r = await fetch(urls[i], { headers: { Accept: "application/json" } });
      if (!r.ok) continue;
      var data = await r.json();
      var ev = data.events || [];
      if (ev.length) allEvents = allEvents.concat(ev);
    } catch (_) {}
  }
  if (!allEvents.length) return null;

  var seen = {};
  var matches = [];
  allEvents.forEach(function (e) {
    if (seen[e.id]) return;
    seen[e.id] = true;
    var comp = (e.competitions && e.competitions[0]) || {};
    var competitors = comp.competitors || [];
    var home = competitors.find(function (c) {
      return c.homeAway === "home";
    });
    var away = competitors.find(function (c) {
      return c.homeAway === "away";
    });
    var homeName = (home && home.team && home.team.displayName) || "?";
    var awayName = (away && away.team && away.team.displayName) || "?";
    var hg =
      home && home.score != null && home.score !== ""
        ? Number(home.score)
        : null;
    var ag =
      away && away.score != null && away.score !== ""
        ? Number(away.score)
        : null;
    var jornada = null;
    var week = e.week || comp.week || {};
    if (week && week.number != null) jornada = Number(week.number);

    var broadcasts = [];
    (comp.broadcasts || []).forEach(function (b) {
      (b.names || []).forEach(function (n) {
        if (n) broadcasts.push(n);
      });
    });
    (comp.geoBroadcasts || []).forEach(function (b) {
      var n =
        (b.media && (b.media.shortName || b.media.name)) || b.type || "";
      if (n) broadcasts.push(n);
    });
    var tv = broadcasts.length
      ? broadcasts.filter(Boolean).slice(0, 4).join(" · ")
      : QA.data.guessTvChannel(homeName, awayName, e.date);

    var state = (e.status && e.status.type && e.status.type.state) || "";
    matches.push({
      id: String(e.id),
      jornada: jornada,
      home: homeName,
      away: awayName,
      homeLogo:
        (home &&
          home.team &&
          home.team.logos &&
          home.team.logos[0] &&
          home.team.logos[0].href) ||
        null,
      awayLogo:
        (away &&
          away.team &&
          away.team.logos &&
          away.team.logos[0] &&
          away.team.logos[0].href) ||
        null,
      date: e.date,
      homeGoals: hg,
      awayGoals: ag,
      status:
        state === "post" ? "FT" : state === "in" ? "LIVE" : "NS",
      tv: tv,
      venue: (comp.venue && comp.venue.fullName) || "",
      source: "ESPN",
    });
  });

  return { season: season, source: "ESPN", matches: matches };
};

QA.data.fetchCalendarTheSportsDB = async function (season) {
  var matches = [];
  for (var rnd = 1; rnd <= 17; rnd++) {
    try {
      var url =
        "https://www.thesportsdb.com/api/v1/json/3/eventsround.php?id=4350&r=" +
        rnd +
        "&s=" +
        encodeURIComponent(season.tsdb);
      var r = await fetch(url);
      if (!r.ok) continue;
      var data = await r.json();
      var events = data.events || [];
      events.forEach(function (ev) {
        var dateIso = null;
        if (ev.strTimestamp) dateIso = ev.strTimestamp;
        else if (ev.dateEvent && ev.strTime)
          dateIso = ev.dateEvent + "T" + ev.strTime;
        else if (ev.dateEvent) dateIso = ev.dateEvent + "T12:00:00";

        matches.push({
          id: String(ev.idEvent),
          jornada: parseInt(ev.intRound || rnd, 10),
          home: ev.strHomeTeam || "?",
          away: ev.strAwayTeam || "?",
          homeLogo: ev.strHomeTeamBadge || null,
          awayLogo: ev.strAwayTeamBadge || null,
          date: dateIso,
          homeGoals:
            ev.intHomeScore != null && ev.intHomeScore !== ""
              ? Number(ev.intHomeScore)
              : null,
          awayGoals:
            ev.intAwayScore != null && ev.intAwayScore !== ""
              ? Number(ev.intAwayScore)
              : null,
          status: ev.strStatus || (ev.intHomeScore != null ? "FT" : "NS"),
          tv:
            ev.strTVStation ||
            QA.data.guessTvChannel(ev.strHomeTeam, ev.strAwayTeam, dateIso),
          venue: ev.strVenue || "",
          source: "TheSportsDB",
        });
      });
    } catch (_) {}
  }
  if (!matches.length) return null;
  return { season: season, source: "TheSportsDB", matches: matches };
};

QA.data.fetchCalendarFromDb = async function (season) {
  var dbAll = QA.data.dbAll;
  var pools = await dbAll(
    "pools?select=id,round,season,competition,mode_code,date_label&competition=eq." +
      encodeURIComponent("Liga MX")
  );
  var target = season.label;
  var ids = {};
  (pools || []).forEach(function (p) {
    var m = String(p.mode_code || "").toUpperCase();
    if (m.indexOf("GOLE") !== -1) return;
    if (String(p.season || "") !== target) return;
    ids[p.id] = p;
  });
  if (!Object.keys(ids).length) return null;

  var matchesRaw = await dbAll(
    "matches?select=id,pool_id,match_no,home_team,away_team,home_goals,away_goals,kickoff_at"
  );
  var matches = [];
  (matchesRaw || []).forEach(function (m) {
    var pool = ids[m.pool_id];
    if (!pool) return;
    matches.push({
      id: String(m.id),
      jornada: pool.round != null ? Number(pool.round) : null,
      home: m.home_team || "?",
      away: m.away_team || "?",
      homeLogo: null,
      awayLogo: null,
      date: m.kickoff_at || null,
      dateLabel: pool.date_label || "",
      homeGoals: m.home_goals,
      awayGoals: m.away_goals,
      status:
        m.home_goals != null && m.away_goals != null ? "FT" : "NS",
      tv: QA.data.guessTvChannel(m.home_team, m.away_team, m.kickoff_at),
      venue: "",
      source: "BD",
    });
  });
  if (!matches.length) return null;
  return {
    season: season,
    source: "Quiniela (BD)",
    matches: matches,
  };
};

QA.data.normalizeTeamKey = function (name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|cf|club|de|cd|uanl|unam|atletico|atlético)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
};


/** Agrupa partidos en jornadas de ~9 (Liga MX: 18 equipos) */
QA.data.assignJornadas = function (matches) {
  if (!matches || !matches.length) return matches || [];
  var list = matches.slice().sort(function (a, b) {
    return new Date(a.date || 0) - new Date(b.date || 0);
  });

  // Clustering: max 9 partidos o ventana de 72h desde el primero del grupo
  var jornada = 1;
  var inCurrent = 0;
  var windowStart = null;
  list.forEach(function (mt) {
    // limpiar jornada previa para reasignar limpio
    mt.jornada = null;
    var d = mt.date ? new Date(mt.date) : null;
    if (!d || isNaN(d.getTime())) {
      mt.jornada = jornada;
      inCurrent++;
      return;
    }
    if (windowStart == null) {
      windowStart = d;
      mt.jornada = jornada;
      inCurrent = 1;
      return;
    }
    var diffH = (d.getTime() - windowStart.getTime()) / 36e5;
    if (inCurrent >= 9 || diffH > 72) {
      jornada++;
      windowStart = d;
      inCurrent = 0;
    }
    mt.jornada = jornada;
    inCurrent++;
  });

  return list.sort(function (a, b) {
    if (a.jornada !== b.jornada) return a.jornada - b.jornada;
    return new Date(a.date || 0) - new Date(b.date || 0);
  });
};


QA.data.dedupeCalendarMatches = function (matches) {
  // Segunda pasada: mismo par de equipos en ±36h → un solo partido
  var out = [];
  var used = {};
  matches.forEach(function (m, i) {
    if (used[i]) return;
    var h = QA.data.normalizeTeamKey(m.home);
    var a = QA.data.normalizeTeamKey(m.away);
    var t = m.date ? new Date(m.date).getTime() : 0;
    for (var j = i + 1; j < matches.length; j++) {
      if (used[j]) continue;
      var o = matches[j];
      var oh = QA.data.normalizeTeamKey(o.home);
      var oa = QA.data.normalizeTeamKey(o.away);
      if (!(h === oh && a === oa) && !(h === oa && a === oh)) continue;
      var ot = o.date ? new Date(o.date).getTime() : 0;
      if (t && ot && Math.abs(t - ot) > 36 * 3600000) continue;
      used[j] = true;
      // fusionar campos útiles
      if ((!m.tv || m.tv.indexOf("guía local") !== -1) && o.tv) m.tv = o.tv;
      if (!m.venue && o.venue) m.venue = o.venue;
      if (m.homeGoals == null && o.homeGoals != null) {
        m.homeGoals = o.homeGoals;
        m.awayGoals = o.awayGoals;
      }
      if (o.status === "FT" || o.status === "LIVE") m.status = o.status;
      if (!m.date && o.date) m.date = o.date;
    }
    out.push(m);
  });
  return out;
};

QA.data.mergeCalendars = function (fevm, espn, tsdb, db, season) {
  var byKey = {};

  function softKey(m) {
    return (
      QA.data.normalizeTeamKey(m.home) +
      "|" +
      QA.data.normalizeTeamKey(m.away) +
      "|" +
      String(m.date || "").slice(0, 10)
    );
  }

  function absorb(pack, priority) {
    if (!pack || !pack.matches) return;
    pack.matches.forEach(function (m) {
      var k = softKey(m);
      if (!k || k.indexOf("||") === 0) return;
      if (!byKey[k]) {
        byKey[k] = Object.assign({}, m, { _pri: priority });
        return;
      }
      var cur = byKey[k];
      var better = priority < cur._pri;
      var next = better
        ? Object.assign({}, cur, m, { _pri: priority })
        : cur;
      // TV: preferir listas reales (no "guía local")
      var tvNew = m.tv || "";
      var tvCur = cur.tv || "";
      if (tvNew && tvNew.indexOf("guía local") === -1) {
        if (!tvCur || tvCur.indexOf("guía local") !== -1 || better)
          next.tv = tvNew;
      }
      if (m.jornada != null && (next.jornada == null || better))
        next.jornada = m.jornada;
      if (m.date && (!next.date || better)) next.date = m.date;
      // No contaminar con 0-0 de fuentes que aún no jugaron
      var realScore =
        m.homeGoals != null &&
        m.awayGoals != null &&
        !(m.homeGoals === 0 && m.awayGoals === 0 && m.status !== "FT");
      if (realScore || (m.status === "FT" && m.homeGoals != null)) {
        next.homeGoals = m.homeGoals;
        next.awayGoals = m.awayGoals;
      }
      if (m.status === "FT" || m.status === "LIVE") next.status = m.status;
      else if (!next.status || next.status === "NS") next.status = m.status || "NS";
      if (m.venue && !next.venue) next.venue = m.venue;
      if (m.homeLogo && !next.homeLogo) next.homeLogo = m.homeLogo;
      if (m.awayLogo && !next.awayLogo) next.awayLogo = m.awayLogo;
      byKey[k] = next;
    });
  }

  // Prioridad: FutbolEnVivoMX (TV+horario) 1, ESPN 2, TSDB 3, BD 4
  absorb(fevm, 1);
  absorb(espn, 2);
  absorb(tsdb, 3);
  absorb(db, 4);

  var matches = Object.keys(byKey).map(function (k) {
    var m = byKey[k];
    delete m._pri;
    return m;
  });

  matches = QA.data.dedupeCalendarMatches(matches);
  // Reasignar jornadas de forma consistente (~9 por jornada Liga MX)
  matches = QA.data.assignJornadas(matches);

  // Limpiar 0-0 falsos: si no está realmente finalizado
  matches.forEach(function (m) {
    if (m.homeGoals === 0 && m.awayGoals === 0) {
      var st = String(m.status || "").toUpperCase();
      if (st !== "FT" && st !== "AET" && st !== "PEN") {
        // partido futuro con marcador basura
        if (m.date && new Date(m.date).getTime() > Date.now() - 2 * 3600000) {
          m.homeGoals = null;
          m.awayGoals = null;
          m.status = "NS";
        }
      }
    }
  });

  var sources = [];
  if (fevm && fevm.matches && fevm.matches.length)
    sources.push("FutbolEnVivoMX");
  if (espn && espn.matches && espn.matches.length) sources.push("ESPN");
  if (tsdb && tsdb.matches && tsdb.matches.length) sources.push("TheSportsDB");
  if (db && db.matches && db.matches.length) sources.push("BD");

  var jornadas = {};
  matches.forEach(function (m) {
    var jn = m.jornada != null ? m.jornada : 0;
    if (!jornadas[jn]) jornadas[jn] = [];
    jornadas[jn].push(m);
  });

  return {
    season: season,
    source: sources.join(" + ") || "sin datos",
    matches: matches,
    byJornada: jornadas,
    updatedAt: new Date().toISOString(),
  };
};
