/* Sección Equipos Liga MX · lista + ficha + plantilla API */
window.QA = window.QA || {};
QA.render = QA.render || {};

var POS_MAP = {
  G: "POR",
  GK: "POR",
  Goalkeeper: "POR",
  D: "DEF",
  DF: "DEF",
  Defender: "DEF",
  M: "MED",
  MF: "MED",
  Midfielder: "MED",
  F: "DEL",
  FW: "DEL",
  Forward: "DEL",
  Attacker: "DEL",
};

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNum(n) {
  try {
    return Number(n).toLocaleString("es-MX");
  } catch (_) {
    return String(n);
  }
}

function normTeamKey(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchStandingRow(club, rows) {
  if (!club || !rows || !rows.length) return null;
  var keys = [club.short, club.name, club.id].map(normTeamKey);
  var aliases = {
    america: ["america", "club america"],
    chivas: ["guadalajara", "chivas"],
    "cruz-azul": ["cruz azul"],
    tigres: ["tigres", "tigres uanl"],
    monterrey: ["monterrey", "rayados"],
    pumas: ["pumas", "pumas unam", "unam"],
    santos: ["santos", "santos laguna"],
    "san-luis": ["atletico de san luis", "atletico san luis", "san luis"],
    juarez: ["fc juarez", "juarez"],
    tijuana: ["tijuana", "xolos"],
    atlante: ["atlante"],
  };
  var extra = aliases[club.id] || [];
  var all = keys.concat(extra);
  for (var i = 0; i < rows.length; i++) {
    var rt = normTeamKey(rows[i].team || rows[i].name || "");
    for (var j = 0; j < all.length; j++) {
      if (!all[j]) continue;
      if (rt === all[j] || rt.indexOf(all[j]) !== -1 || all[j].indexOf(rt) !== -1) {
        return rows[i];
      }
    }
  }
  return null;
}

/** Extrae goles de temporada del bloque statistics de ESPN */
function extractGoalsFromAthlete(a) {
  var goals = 0;
  try {
    var cats =
      (a.statistics &&
        a.statistics.splits &&
        a.statistics.splits.categories) ||
      [];
    for (var i = 0; i < cats.length; i++) {
      var stats = cats[i].stats || [];
      for (var j = 0; j < stats.length; j++) {
        var s = stats[j];
        var n = String(s.name || "").toLowerCase();
        if (
          n === "totalgoals" ||
          n === "goals" ||
          n === "goalsscored" ||
          n === "goalscoring"
        ) {
          var v =
            s.value != null ? Number(s.value) : parseInt(s.displayValue, 10);
          if (!isNaN(v) && v > goals) goals = v;
        }
      }
    }
  } catch (_) {}
  return goals;
}

/** Plantilla ESPN (principal) + goleadores de temporada */
async function fetchRosterEspn(espnId) {
  if (!espnId) return null;
  var url =
    "https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/teams/" +
    espnId +
    "/roster";
  var r = await fetch(url);
  if (!r.ok) throw new Error("espn roster " + r.status);
  var data = await r.json();
  var athletes = data.athletes || [];
  var season = data.season || {};
  var squad = [];
  var scorers = [];
  athletes.forEach(function (a) {
    var pos = a.position || {};
    var abbr = pos.abbreviation || pos.name || "";
    var posMx = POS_MAP[abbr] || POS_MAP[pos.name] || abbr || "—";
    var name = a.displayName || a.fullName || "—";
    var goals = extractGoalsFromAthlete(a);
    squad.push({
      n: a.jersey != null && a.jersey !== "" ? Number(a.jersey) : null,
      name: name,
      pos: posMx,
      nat: a.citizenship || a.citizenshipCountry || "—",
      goals: goals,
    });
    if (goals > 0) {
      scorers.push({ name: name, pos: posMx, goals: goals });
    }
  });
  squad.sort(function (a, b) {
    var order = { POR: 0, DEF: 1, MED: 2, DEL: 3 };
    var pa = order[a.pos] != null ? order[a.pos] : 9;
    var pb = order[b.pos] != null ? order[b.pos] : 9;
    if (pa !== pb) return pa - pb;
    var na = a.n != null ? a.n : 999;
    var nb = b.n != null ? b.n : 999;
    return na - nb;
  });
  scorers.sort(function (a, b) {
    if (b.goals !== a.goals) return b.goals - a.goals;
    return String(a.name).localeCompare(String(b.name), "es");
  });
  return {
    squad: squad,
    scorers: scorers,
    source: "ESPN",
    seasonLabel: season.displayName || season.name || null,
    seasonYear: season.year || null,
  };
}

/** Fallback TheSportsDB */
async function fetchRosterTsdb(club) {
  var q = encodeURIComponent(club.short || club.name);
  var r = await fetch(
    "https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=" + q
  );
  if (!r.ok) throw new Error("tsdb search");
  var data = await r.json();
  var teams = data.teams || [];
  if (!teams.length) throw new Error("tsdb no team");
  var idTeam = teams[0].idTeam;
  var r2 = await fetch(
    "https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=" +
      idTeam
  );
  if (!r2.ok) throw new Error("tsdb players");
  var data2 = await r2.json();
  var players = data2.player || [];
  var squad = players.map(function (p) {
    var pos = p.strPosition || "";
    var posMx = "—";
    var pl = pos.toLowerCase();
    if (pl.indexOf("goal") !== -1) posMx = "POR";
    else if (pl.indexOf("def") !== -1 || pl.indexOf("back") !== -1) posMx = "DEF";
    else if (pl.indexOf("mid") !== -1) posMx = "MED";
    else if (
      pl.indexOf("forward") !== -1 ||
      pl.indexOf("attack") !== -1 ||
      pl.indexOf("wing") !== -1 ||
      pl.indexOf("strik") !== -1
    )
      posMx = "DEL";
    return {
      n: p.strNumber ? Number(p.strNumber) : null,
      name: p.strPlayer || "—",
      pos: posMx,
      nat: p.strNationality || "—",
    };
  });
  // TheSportsDB suele traer goles de carrera, no de temporada → no listar goleadores engañosos
  return {
    squad: squad,
    scorers: [],
    source: "TheSportsDB",
    seasonLabel: null,
    seasonYear: null,
  };
}

/** Fallback estático del JSON local */
function rosterStatic(club) {
  return {
    squad: (club.squad || []).slice(),
    scorers: [],
    source: "Referencia local",
    seasonLabel: null,
    seasonYear: null,
  };
}

async function loadRoster(club) {
  // 1 ESPN  2 TheSportsDB  3 estático
  try {
    if (club.espnId) {
      var a = await fetchRosterEspn(club.espnId);
      if (a && a.squad && a.squad.length) return a;
    }
  } catch (e) {
    console.warn("roster ESPN", e);
  }
  try {
    var b = await fetchRosterTsdb(club);
    if (b && b.squad && b.squad.length) return b;
  } catch (e2) {
    console.warn("roster TSDB", e2);
  }
  return rosterStatic(club);
}


/** Mapa espnId → nombre corto de club */
function teamNameByEspnId(espnId) {
  espnId = Number(espnId);
  if (QA.equiposData && QA.equiposData.all) {
    var c = QA.equiposData.all.find(function (x) {
      return Number(x.espnId) === espnId;
    });
    if (c) return c.short || c.name;
  }
  return null;
}

/**
 * Goleadores Liga MX temporada actual (ESPN core leaders).
 * Fallback: agrega goles desde roster de cada equipo.
 */
QA.data = QA.data || {};
QA.data.getLigaMxScorersAsync = async function (limit) {
  limit = limit || 10;
  var year = new Date().getFullYear();
  // Apertura suele usar type=1 en ESPN
  var urls = [
    "https://sports.core.api.espn.com/v2/sports/soccer/leagues/mex.1/seasons/" +
      year +
      "/types/1/leaders",
    "https://sports.core.api.espn.com/v2/sports/soccer/leagues/mex.1/seasons/" +
      (year - 1) +
      "/types/1/leaders",
    "https://sports.core.api.espn.com/v2/sports/soccer/leagues/mex.1/seasons/" +
      year +
      "/types/2/leaders",
  ];
  var data = null;
  for (var i = 0; i < urls.length; i++) {
    try {
      var r = await fetch(urls[i], {
        headers: { Accept: "application/json" },
      });
      if (!r.ok) continue;
      data = await r.json();
      if (data && data.categories && data.categories.length) break;
    } catch (_) {}
  }
  if (!data) {
    // Fallback: sumar rosters
    return await aggregateScorersFromRosters(limit);
  }

  var gcat = null;
  (data.categories || []).forEach(function (c) {
    var n = String(c.name || "").toLowerCase();
    if (!gcat && (n === "goalsleaders" || n === "goals")) gcat = c;
  });
  if (!gcat) gcat = (data.categories || [])[0];
  var leaders = (gcat && gcat.leaders) || [];
  leaders = leaders.slice(0, limit);

  async function resolveRef(url) {
    if (!url) return null;
    // core API a veces devuelve http:// — forzar https
    url = String(url).replace(/^http:\/\//i, "https://");
    var rr = await fetch(url, { headers: { Accept: "application/json" } });
    if (!rr.ok) return null;
    return rr.json();
  }

  var out = [];
  for (var li = 0; li < leaders.length; li++) {
    var L = leaders[li];
    var goals = L.value != null ? Number(L.value) : 0;
    if (!goals && L.displayValue) {
      var m = String(L.displayValue).match(/Goals?:\s*(\d+)/i);
      if (m) goals = parseInt(m[1], 10);
    }
    var athlete = null;
    try {
      athlete = await resolveRef(L.athlete && L.athlete.$ref);
    } catch (_) {}
    var teamId = null;
    var teamRef = (L.team && L.team.$ref) || (athlete && athlete.team && athlete.team.$ref) || "";
    var tm = String(teamRef).match(/\/teams\/(\d+)/);
    if (tm) teamId = parseInt(tm[1], 10);
    var teamName = teamNameByEspnId(teamId) || "—";
    if (teamName === "—" && teamRef) {
      try {
        var td = await resolveRef(teamRef);
        if (td) teamName = td.displayName || td.name || teamName;
      } catch (_) {}
    }
    var pos = "—";
    if (athlete && athlete.position) {
      var abbr = athlete.position.abbreviation || athlete.position.name || "";
      pos = POS_MAP[abbr] || POS_MAP[athlete.position.name] || abbr || "—";
    }
    out.push({
      rank: li + 1,
      name: (athlete && (athlete.displayName || athlete.fullName)) || "—",
      pos: pos,
      nat: (athlete && (athlete.citizenship || athlete.citizenshipCountry)) || "—",
      team: teamName,
      teamId: teamId,
      goals: goals,
    });
  }

  var seasonLabel = "Apertura " + year;
  try {
    var st = QA.data.getStandings && QA.data.getStandings();
    if (st && st.season) seasonLabel = st.season;
    else if (st && st.tournament) seasonLabel = st.tournament;
  } catch (_) {}

  return {
    season: seasonLabel,
    source: "ESPN",
    rows: out,
  };
};

async function aggregateScorersFromRosters(limit) {
  limit = limit || 10;
  var clubs = (QA.equiposData && QA.equiposData.all) || [];
  var all = [];
  for (var i = 0; i < clubs.length; i++) {
    var club = clubs[i];
    if (!club.espnId) continue;
    try {
      var info = await fetchRosterEspn(club.espnId);
      (info.scorers || []).forEach(function (s) {
        all.push({
          name: s.name,
          pos: s.pos,
          nat: "—",
          team: club.short || club.name,
          goals: s.goals,
        });
      });
    } catch (_) {}
  }
  all.sort(function (a, b) {
    return b.goals - a.goals;
  });
  all = all.slice(0, limit).map(function (r, idx) {
    r.rank = idx + 1;
    return r;
  });
  return {
    season: "Liga MX",
    source: "ESPN (rosters)",
    rows: all,
  };
}

QA.render.equiposHomeSection = function () {
  if (!QA.equiposData) return "";
  var clubs = QA.equiposData.list();
  var cards = clubs
    .map(function (c) {
      var logo =
        QA.data && QA.data.teamLogo ? QA.data.teamLogo(c.short || c.name) : null;
      var logoHtml = logo
        ? '<img class="eq-logo" src="' +
          logo +
          '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
        : '<div class="eq-logo-ph">' +
          (c.short || c.name).slice(0, 2).toUpperCase() +
          "</div>";
      return (
        '<button type="button" class="eq-card" data-equipo="' +
        c.id +
        '">' +
        logoHtml +
        '<span class="eq-card-name">' +
        escapeHtml(c.name) +
        "</span>" +
        '<span class="eq-card-city">' +
        escapeHtml(c.city) +
        "</span>" +
        "</button>"
      );
    })
    .join("");
  return (
    '<h3 class="section-title">Equipos Liga MX</h3>' +
    '<div class="eq-grid">' +
    cards +
    "</div>"
  );
};

QA.render.bindEquiposHome = function (root) {
  if (!root) return;
  root.querySelectorAll("[data-equipo]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-equipo");
      if (QA.app && QA.app.openEquipo) QA.app.openEquipo(id);
    });
  });
};

QA.render.equipoDetalle = async function (id) {
  var el = document.getElementById("view-equipo");
  if (!el) return;
  var c = QA.equiposData && QA.equiposData.byId(id);
  if (!c) {
    el.innerHTML =
      '<div class="empty-state"><p>Equipo no encontrado</p>' +
      '<button type="button" class="jd-back" id="eq-back">← Volver</button></div>';
    document.getElementById("eq-back").onclick = function () {
      QA.app.showView("inicio");
    };
    return;
  }

  el.innerHTML =
    '<div class="eqd"><button type="button" class="jd-back" id="eq-back">← Volver</button>' +
    '<p class="skel-msg" style="padding:24px 8px">Cargando ficha del equipo…</p></div>';
  document.getElementById("eq-back").onclick = function () {
    if (QA.app && QA.app._prevView) QA.app.showView(QA.app._prevView);
    else QA.app.showView("inicio");
  };

  var logo =
    QA.data && QA.data.teamLogo ? QA.data.teamLogo(c.short || c.name) : null;
  var years = new Date().getFullYear() - c.founded;
  var logoBig = logo
    ? '<img class="eqd-logo" src="' + logo + '" alt="">'
    : '<div class="eqd-logo-ph">' +
      (c.short || "?").slice(0, 3).toUpperCase() +
      "</div>";

  // Temporada + posición desde tabla (ESPN vía getStandingsAsync)
  var tablePos = null;
  var tablePts = null;
  var seasonText = "Liga MX";
  try {
    var st =
      QA.data && QA.data.getStandingsAsync
        ? await QA.data.getStandingsAsync()
        : null;
    if (st) {
      if (st.season) seasonText = st.season;
      else if (st.label) seasonText = st.label;
      var row = matchStandingRow(c, st.rows || []);
      if (row) {
        tablePos = row.pos;
        tablePts = row.pts;
      }
    }
  } catch (e) {
    console.warn("standings equipo", e);
  }

  // Si no hay season en standings, intentar meta ESPN rápida
  if (seasonText === "Liga MX") {
    try {
      var rs = await fetch(
        "https://site.api.espn.com/apis/v2/sports/soccer/mex.1/standings"
      );
      if (rs.ok) {
        var jd = await rs.json();
        var child = (jd.children && jd.children[0]) || {};
        var sn = child.name || (jd.season && jd.season.displayName) || "";
        if (sn) seasonText = sn;
        else if (jd.season && jd.season.year)
          seasonText = "Liga MX " + jd.season.year;
      }
    } catch (_) {}
  }

  var rosterInfo = await loadRoster(c);
  var squad = rosterInfo.squad || [];
  var source = rosterInfo.source || "";

  var scorers = rosterInfo.scorers || [];
  var scorersHtml = "";
  if (scorers.length) {
    var scRows = scorers
      .map(function (s, idx) {
        return (
          "<tr><td>" +
          (idx + 1) +
          "</td><td>" +
          escapeHtml(s.name) +
          "</td><td>" +
          escapeHtml(s.pos) +
          "</td><td class=\"eqd-goals\">" +
          s.goals +
          "</td></tr>"
        );
      })
      .join("");
    scorersHtml =
      '<h3 class="section-title">Goleadores temporada</h3>' +
      '<p class="eqd-note">Goles en la temporada actual · Fuente: ' +
      escapeHtml(source) +
      "</p>" +
      '<div class="eqd-table-wrap"><table class="eqd-table"><thead><tr><th>#</th><th>Jugador</th><th>Pos</th><th>Goles</th></tr></thead><tbody>' +
      scRows +
      "</tbody></table></div>";
  } else {
    scorersHtml =
      '<h3 class="section-title">Goleadores temporada</h3>' +
      '<p class="eqd-note">Aún no hay goles registrados en la fuente (' +
      escapeHtml(source || "—") +
      ") o la temporada recién comienza.</p>";
  }



  var legends = (c.legends || [])
    .map(function (l) {
      return (
        '<div class="eqd-legend"><strong>' +
        escapeHtml(l.name) +
        "</strong><span>" +
        escapeHtml(l.note || "") +
        "</span></div>"
      );
    })
    .join("");

  var squadRows = squad
    .map(function (p) {
      return (
        "<tr><td>" +
        (p.n != null && !isNaN(p.n) ? p.n : "—") +
        "</td><td>" +
        escapeHtml(p.name) +
        "</td><td>" +
        escapeHtml(p.pos) +
        "</td><td>" +
        escapeHtml(p.nat) +
        "</td></tr>"
      );
    })
    .join("");

  function stat(label, val) {
    return (
      '<div class="eqd-stat"><div class="eqd-stat-val">' +
      escapeHtml(val) +
      '</div><div class="eqd-stat-lbl">' +
      escapeHtml(label) +
      "</div></div>"
    );
  }

  var posBlock =
    '<div class="eqd-season-bar">' +
    '<div class="eqd-season-main">' +
    '<span class="eqd-season-lbl">Temporada</span>' +
    '<span class="eqd-season-val">' +
    escapeHtml(seasonText) +
    "</span></div>" +
    '<div class="eqd-season-pos">' +
    (tablePos != null
      ? '<span class="eqd-pos-num">' +
        tablePos +
        "°</span>" +
        '<span class="eqd-pos-lbl">en la tabla general' +
        (tablePts != null ? " · " + tablePts + " pts" : "") +
        "</span>"
      : '<span class="eqd-pos-lbl">Posición no disponible</span>') +
    "</div></div>";

  el.innerHTML =
    '<div class="eqd">' +
    '<button type="button" class="jd-back" id="eq-back">← Volver</button>' +
    '<div class="eqd-hero">' +
    logoBig +
    '<div class="eqd-hero-text">' +
    '<h1 class="eqd-name">' +
    escapeHtml(c.name) +
    "</h1>" +
    '<p class="eqd-nicks">' +
    escapeHtml((c.nicknames || []).join(" · ")) +
    "</p>" +
    "</div></div>" +
    posBlock +
    '<div class="eqd-stats">' +
    stat("Fundación", String(c.founded)) +
    stat("Años", String(years)) +
    stat("Campeonatos", String(c.titles)) +
    stat("Subcampeonatos", String(c.runnersUp)) +
    stat("Último título", c.lastTitle || "—") +
    stat("Ciudad", c.city) +
    stat("Estadio", c.stadium) +
    stat("Capacidad", c.capacity ? formatNum(c.capacity) : "—") +
    stat("Colores", c.colors || "—") +
    "</div>" +
    '<h3 class="section-title">Historia</h3>' +
    '<p class="eqd-history">' +
    escapeHtml(c.history || "") +
    "</p>" +
    scorersHtml +
    '<h3 class="section-title">Plantilla</h3>' +
    '<p class="eqd-note">Fuente: ' +
    escapeHtml(source) +
    (squad.length ? " · " + squad.length + " jugadores" : "") +
    "</p>" +
    '<div class="eqd-table-wrap"><table class="eqd-table"><thead><tr><th>#</th><th>Jugador</th><th>Pos</th><th>Nac.</th></tr></thead><tbody>' +
    (squadRows ||
      '<tr><td colspan="4">No hay plantilla disponible</td></tr>') +
    "</tbody></table></div>" +
    '<h3 class="section-title">Leyendas del club</h3>' +
    '<div class="eqd-legends">' +
    legends +
    "</div>" +
    "</div>";

  document.getElementById("eq-back").onclick = function () {
    if (QA.app && QA.app._prevView) QA.app.showView(QA.app._prevView);
    else QA.app.showView("inicio");
  };
};
