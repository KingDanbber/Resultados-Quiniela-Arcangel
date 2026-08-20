/* Logros · catálogo, cálculo y Nuestro 11 */
window.QA = window.QA || {};

QA.logros = (function () {
  var CACHE = null;
  var CACHE_AT = 0;
  var TTL = 120000;

  var CATALOG = [
    {
      id: "primer_sencilla",
      name: "Primer campeón Sencilla",
      desc: "El primer ganador oficial de una quiniela Sencilla en la historia del grupo.",
      icon: "1️⃣",
      slot: "cap", // Nuestro 11 role hint
    },
    {
      id: "primer_goleo",
      name: "Primer campeón de Goleo",
      desc: "Quien clavó primero el total de goles en Campeón de Goleo.",
      icon: "🎯",
      slot: "st",
    },
    {
      id: "pleno9",
      name: "Pleno perfecto",
      desc: "9 aciertos en una sola jornada Sencilla.",
      icon: "9️⃣",
      slot: "st",
    },
    {
      id: "ocho",
      name: "Casi leyenda",
      desc: "8 aciertos en una jornada Sencilla.",
      icon: "8️⃣",
      slot: "lw",
    },
    {
      id: "siete",
      name: "Francotirador",
      desc: "7 aciertos en una jornada Sencilla.",
      icon: "7️⃣",
      slot: "rw",
    },
    {
      id: "seis",
      name: "Buena racha",
      desc: "6 aciertos en una jornada Sencilla.",
      icon: "6️⃣",
      slot: "cm",
    },
    {
      id: "wins3",
      name: "Tricampeón",
      desc: "3 o más quinielas Sencilla ganadas (1.er lugar).",
      icon: "🏆",
      slot: "cam",
    },
    {
      id: "wins2",
      name: "Bicampeón",
      desc: "2 o más quinielas Sencilla ganadas.",
      icon: "🥈",
      slot: "cm",
    },
    {
      id: "seconds2",
      name: "Eterno segundo",
      desc: "Al menos 2 veces en el 2.º lugar de una jornada.",
      icon: "🥈",
      slot: "cb",
    },
    {
      id: "local_king",
      name: "Rey de local",
      desc: "Más aciertos históricos predicando al equipo local.",
      icon: "🏠",
      slot: "lb",
    },
    {
      id: "visit_king",
      name: "Rey visitante",
      desc: "Más aciertos históricos predicando al visitante.",
      icon: "✈️",
      slot: "rb",
    },
    {
      id: "draw_king",
      name: "Rey del empate",
      desc: "Más aciertos históricos en empates.",
      icon: "🤝",
      slot: "cdm",
    },
    {
      id: "money",
      name: "El que más se llevó",
      desc: "Mayor dinero acumulado en bolsas de Sencilla (pagados).",
      icon: "💰",
      slot: "st",
    },
    {
      id: "goleo_master",
      name: "Amo del Goleo",
      desc: "Más títulos de Campeón de Goleo (total exacto).",
      icon: "⚽",
      slot: "st",
    },
    {
      id: "participacion",
      name: "El más constante",
      desc: "Más jornadas Sencilla jugadas (boletas).",
      icon: "📅",
      slot: "gk",
    },
  ];

  function keyName(name, area) {
    return String(name || "").trim().toLowerCase() + "|" + String(area || "").trim().toLowerCase();
  }

  function person(name, area, id) {
    return {
      id: id || null,
      name: name || "Sin nombre",
      area: area || "",
      key: keyName(name, area),
    };
  }

  async function gatherRaw() {
    var dbAll = QA.data.dbAll;
    var getResult = QA.data.getResult;
    var normalizePick = QA.data.normalizePick;

    var packs = await Promise.all([
      dbAll("pools?select=*&order=created_at.asc"),
      dbAll("matches?select=id,pool_id,home_goals,away_goals,match_no"),
      dbAll("entries?select=*"),
      dbAll("predictions_1x2?select=entry_id,match_id,pick"),
      dbAll("pool_results?select=*").catch(function () {
        return [];
      }),
      dbAll("predictions_goals_total?select=*").catch(function () {
        return [];
      }),
    ]);

    var pools = packs[0] || [];
    var matches = packs[1] || [];
    var entries = packs[2] || [];
    var preds = packs[3] || [];
    var poolResults = packs[4] || [];
    var predGoals = packs[5] || [];
    if (!predGoals.length) {
      try {
        predGoals = await dbAll("predictions_total_goals?select=*");
      } catch (_) {
        predGoals = [];
      }
    }

    var partIds = [];
    entries.forEach(function (e) {
      if (e.participant_id) partIds.push(e.participant_id);
    });
    partIds = Array.from(new Set(partIds));
    var participants = {};
    if (partIds.length) {
      try {
        var parts = await dbAll(
          "participants?id=in.(" + partIds.join(",") + ")&select=id,name,area"
        );
        (parts || []).forEach(function (p) {
          participants[p.id] = p;
        });
      } catch (_) {}
    }

    var mBy = {};
    matches.forEach(function (m) {
      if (!mBy[m.pool_id]) mBy[m.pool_id] = [];
      mBy[m.pool_id].push(m);
    });
    var eBy = {};
    entries.forEach(function (e) {
      if (!eBy[e.pool_id]) eBy[e.pool_id] = [];
      eBy[e.pool_id].push(e);
    });
    var predByEntry = {};
    preds.forEach(function (p) {
      if (!predByEntry[p.entry_id]) predByEntry[p.entry_id] = [];
      predByEntry[p.entry_id].push(p);
    });
    var goalByEntry = {};
    predGoals.forEach(function (g) {
      var val =
        g.predicted_total_goals != null
          ? g.predicted_total_goals
          : g.total_goals != null
          ? g.total_goals
          : g.goals_total != null
          ? g.goals_total
          : g.predicted_goals != null
          ? g.predicted_goals
          : null;
      if (val != null) goalByEntry[g.entry_id] = Number(val);
    });
    var prBy = {};
    poolResults.forEach(function (r) {
      prBy[r.pool_id] = r;
    });

    return {
      pools: pools,
      mBy: mBy,
      eBy: eBy,
      predByEntry: predByEntry,
      goalByEntry: goalByEntry,
      prBy: prBy,
      participants: participants,
      getResult: getResult,
      normalizePick: normalizePick,
    };
  }

  function isClosed(pool, pMatches) {
    var STATUS_CLOSED = ["closed", "cerrada", "finished", "finalizada"];
    var allDone =
      pMatches.length > 0 &&
      pMatches.every(function (m) {
        return m.home_goals != null && m.away_goals != null;
      });
    var st = String(pool.status || "").toLowerCase();
    return allDone || STATUS_CLOSED.indexOf(st) !== -1;
  }

  function isGoleo(pool) {
    return String(pool.mode_code || "").toUpperCase().indexOf("GOLE") !== -1;
  }

  async function compute(force) {
    if (!force && CACHE && Date.now() - CACHE_AT < TTL) return CACHE;

    var raw = await gatherRaw();
    var byKey = {}; // aggregate per person

    function ensure(p) {
      var k = p.key;
      if (!byKey[k]) {
        byKey[k] = {
          person: p,
          wins: 0,
          seconds: 0,
          maxHits: 0,
          hitCounts: {}, // hits -> times
          earned: 0,
          localHits: 0,
          visitHits: 0,
          drawHits: 0,
          jornadas: 0,
          goleoWins: 0,
          firstWinOrder: null,
          firstGoleoOrder: null,
          detailWins: [],
        };
      }
      return byKey[k];
    }

    var sencillaOrder = 0;
    var goleoOrder = 0;
    var firstSencillaWinner = null;
    var firstGoleoWinner = null;

    raw.pools.forEach(function (pool) {
      var pMatches = raw.mBy[pool.id] || [];
      if (!isClosed(pool, pMatches)) return;
      var paid = (raw.eBy[pool.id] || []).filter(function (e) {
        return e.paid;
      });
      if (!paid.length) return;

      if (isGoleo(pool)) {
        // total goals real
        var totalG = 0;
        var allG = true;
        pMatches.forEach(function (m) {
          if (m.home_goals == null || m.away_goals == null) allG = false;
          else totalG += Number(m.home_goals) + Number(m.away_goals);
        });
        if (!allG || !pMatches.length) return;
        goleoOrder++;
        var exacts = [];
        paid.forEach(function (entry) {
          var fb = raw.participants[entry.participant_id] || {};
          var name = entry.participant_name_snapshot || fb.name || "?";
          var area = entry.participant_area_snapshot || fb.area || "";
          var pred = raw.goalByEntry[entry.id];
          if (pred != null && Number(pred) === totalG) {
            exacts.push(person(name, area, entry.participant_id));
          }
        });
        exacts.forEach(function (p) {
          var row = ensure(p);
          row.goleoWins++;
          if (row.firstGoleoOrder == null) row.firstGoleoOrder = goleoOrder;
        });
        if (!firstGoleoWinner && exacts.length) {
          firstGoleoWinner = exacts[0];
        }
        return;
      }

      // Sencilla
      sencillaOrder++;
      var scored = paid.map(function (entry) {
        var fb = raw.participants[entry.participant_id] || {};
        var name = entry.participant_name_snapshot || fb.name || "?";
        var area = entry.participant_area_snapshot || fb.area || "";
        var myPreds = raw.predByEntry[entry.id] || [];
        var hits = 0;
        var loc = 0,
          vis = 0,
          drw = 0;
        pMatches.forEach(function (match) {
          var result = raw.getResult(match.home_goals, match.away_goals);
          var pred = myPreds.find(function (p) {
            return p.match_id === match.id;
          });
          var pick = raw.normalizePick(pred && pred.pick);
          if (result !== null && pick === result) {
            hits++;
            if (result === "1") loc++;
            else if (result === "2") vis++;
            else if (result === "X") drw++;
          }
        });
        return {
          person: person(name, area, entry.participant_id),
          hits: hits,
          loc: loc,
          vis: vis,
          drw: drw,
          entry: entry,
        };
      });

      scored.forEach(function (s) {
        var row = ensure(s.person);
        row.jornadas++;
        row.localHits += s.loc;
        row.visitHits += s.vis;
        row.drawHits += s.drw;
        if (s.hits > row.maxHits) row.maxHits = s.hits;
        row.hitCounts[s.hits] = (row.hitCounts[s.hits] || 0) + 1;
      });

      var maxH = Math.max.apply(
        null,
        scored.map(function (s) {
          return s.hits;
        }).concat([0])
      );
      if (!maxH) return;

      var winners = scored.filter(function (s) {
        return s.hits === maxH;
      });
      var secondHits = Math.max.apply(
        null,
        scored
          .filter(function (s) {
            return s.hits < maxH;
          })
          .map(function (s) {
            return s.hits;
          })
          .concat([-1])
      );
      var seconds =
        secondHits >= 0
          ? scored.filter(function (s) {
              return s.hits === secondHits;
            })
          : [];

      var price = pool.price != null ? Number(pool.price) : 0;
      var commission =
        pool.commission_pct != null ? Number(pool.commission_pct) : 0;
      var gross = paid.length * price;
      var pr = raw.prBy[pool.id];
      var net =
        pr && pr.net_pot != null
          ? Number(pr.net_pot)
          : gross * (1 - commission / 100);
      var prize = winners.length ? net / winners.length : 0;

      winners.forEach(function (s) {
        var row = ensure(s.person);
        row.wins++;
        row.earned += prize;
        if (row.firstWinOrder == null) row.firstWinOrder = sencillaOrder;
        row.detailWins.push({
          label:
            pool.round != null ? "Jornada " + pool.round : pool.name || "Jornada",
          hits: s.hits,
          prize: prize,
        });
      });
      seconds.forEach(function (s) {
        ensure(s.person).seconds++;
      });

      if (!firstSencillaWinner && winners.length) {
        firstSencillaWinner = winners[0].person;
      }
    });

    var all = Object.values(byKey);

    function holdersFor(filterFn, metaFn) {
      var list = all.filter(filterFn).map(function (row) {
        var base = {
          name: row.person.name,
          area: row.person.area,
          id: row.person.id,
          key: row.person.key,
        };
        if (metaFn) Object.assign(base, metaFn(row));
        return base;
      });
      return list;
    }

    var achievements = CATALOG.map(function (def) {
      var holders = [];
      switch (def.id) {
        case "primer_sencilla":
          if (firstSencillaWinner) {
            holders = [
              {
                name: firstSencillaWinner.name,
                area: firstSencillaWinner.area,
                id: firstSencillaWinner.id,
                meta: "Primer título Sencilla",
              },
            ];
          }
          break;
        case "primer_goleo":
          if (firstGoleoWinner) {
            holders = [
              {
                name: firstGoleoWinner.name,
                area: firstGoleoWinner.area,
                id: firstGoleoWinner.id,
                meta: "Primer título Goleo",
              },
            ];
          }
          break;
        case "pleno9":
          holders = holdersFor(
            function (r) {
              return (r.hitCounts[9] || 0) > 0;
            },
            function (r) {
              return { meta: (r.hitCounts[9] || 0) + "× pleno" };
            }
          );
          break;
        case "ocho":
          holders = holdersFor(
            function (r) {
              return (r.hitCounts[8] || 0) > 0;
            },
            function (r) {
              return { meta: (r.hitCounts[8] || 0) + "× con 8" };
            }
          );
          break;
        case "siete":
          holders = holdersFor(
            function (r) {
              return (r.hitCounts[7] || 0) > 0;
            },
            function (r) {
              return { meta: (r.hitCounts[7] || 0) + "× con 7" };
            }
          );
          break;
        case "seis":
          holders = holdersFor(
            function (r) {
              return (r.hitCounts[6] || 0) > 0;
            },
            function (r) {
              return { meta: (r.hitCounts[6] || 0) + "× con 6" };
            }
          );
          break;
        case "wins3":
          holders = holdersFor(
            function (r) {
              return r.wins >= 3;
            },
            function (r) {
              return { meta: r.wins + " títulos" };
            }
          ).sort(function (a, b) {
            return 0;
          });
          holders.sort(function (a, b) {
            var ra = byKey[keyName(a.name, a.area)];
            var rb = byKey[keyName(b.name, b.area)];
            return (rb && rb.wins) - (ra && ra.wins);
          });
          break;
        case "wins2":
          holders = holdersFor(
            function (r) {
              return r.wins >= 2;
            },
            function (r) {
              return { meta: r.wins + " títulos" };
            }
          );
          holders.sort(function (a, b) {
            var ra = byKey[keyName(a.name, a.area)];
            var rb = byKey[keyName(b.name, b.area)];
            return (rb && rb.wins) - (ra && ra.wins);
          });
          break;
        case "seconds2":
          holders = holdersFor(
            function (r) {
              return r.seconds >= 2;
            },
            function (r) {
              return { meta: r.seconds + "× segundo" };
            }
          );
          break;
        case "local_king": {
          var maxL = Math.max.apply(
            null,
            all.map(function (r) {
              return r.localHits;
            }).concat([0])
          );
          if (maxL > 0) {
            holders = holdersFor(
              function (r) {
                return r.localHits === maxL;
              },
              function (r) {
                return { meta: r.localHits + " aciertos L" };
              }
            );
          }
          break;
        }
        case "visit_king": {
          var maxV = Math.max.apply(
            null,
            all.map(function (r) {
              return r.visitHits;
            }).concat([0])
          );
          if (maxV > 0) {
            holders = holdersFor(
              function (r) {
                return r.visitHits === maxV;
              },
              function (r) {
                return { meta: r.visitHits + " aciertos V" };
              }
            );
          }
          break;
        }
        case "draw_king": {
          var maxD = Math.max.apply(
            null,
            all.map(function (r) {
              return r.drawHits;
            }).concat([0])
          );
          if (maxD > 0) {
            holders = holdersFor(
              function (r) {
                return r.drawHits === maxD;
              },
              function (r) {
                return { meta: r.drawHits + " aciertos E" };
              }
            );
          }
          break;
        }
        case "money": {
          var maxM = Math.max.apply(
            null,
            all.map(function (r) {
              return r.earned;
            }).concat([0])
          );
          if (maxM > 0) {
            holders = holdersFor(
              function (r) {
                return r.earned === maxM;
              },
              function (r) {
                return {
                  meta: QA.utils.money(r.earned),
                };
              }
            );
          }
          break;
        }
        case "goleo_master": {
          var maxG = Math.max.apply(
            null,
            all.map(function (r) {
              return r.goleoWins;
            }).concat([0])
          );
          if (maxG > 0) {
            holders = holdersFor(
              function (r) {
                return r.goleoWins === maxG;
              },
              function (r) {
                return { meta: r.goleoWins + " Goleo(s)" };
              }
            );
          }
          break;
        }
        case "participacion": {
          var maxJ = Math.max.apply(
            null,
            all.map(function (r) {
              return r.jornadas;
            }).concat([0])
          );
          if (maxJ > 0) {
            holders = holdersFor(
              function (r) {
                return r.jornadas === maxJ;
              },
              function (r) {
                return { meta: r.jornadas + " jornadas" };
              }
            );
          }
          break;
        }
      }
      return {
        id: def.id,
        name: def.name,
        desc: def.desc,
        icon: def.icon,
        slot: def.slot,
        holders: holders,
        count: holders.length,
      };
    });

    // Nuestro 11: pick unique people for formation slots
    var once = buildOnce(achievements, all);

    CACHE = {
      achievements: achievements,
      once: once,
      byKey: byKey,
      stats: {
        people: all.length,
        unlocked: achievements.filter(function (a) {
          return a.count > 0;
        }).length,
        total: achievements.length,
      },
    };
    CACHE_AT = Date.now();
    return CACHE;
  }

  function buildOnce(achievements, all) {
    // Formation 4-3-3 labels
    var slots = [
      { id: "gk", label: "POR", x: 50, y: 88 },
      { id: "lb", label: "LI", x: 12, y: 68 },
      { id: "cb1", label: "DFC", x: 35, y: 72 },
      { id: "cb2", label: "DFC", x: 65, y: 72 },
      { id: "rb", label: "LD", x: 88, y: 68 },
      { id: "cm1", label: "MC", x: 28, y: 48 },
      { id: "cam", label: "MCO", x: 50, y: 42 },
      { id: "cm2", label: "MC", x: 72, y: 48 },
      { id: "lw", label: "EI", x: 15, y: 22 },
      { id: "st", label: "DC", x: 50, y: 14 },
      { id: "rw", label: "ED", x: 85, y: 22 },
    ];

    var used = {};
    var pick = function (preferIds, fallbackSort) {
      for (var i = 0; i < preferIds.length; i++) {
        var ach = achievements.find(function (a) {
          return a.id === preferIds[i];
        });
        if (!ach || !ach.holders.length) continue;
        for (var h = 0; h < ach.holders.length; h++) {
          var k = keyName(ach.holders[h].name, ach.holders[h].area);
          if (used[k]) continue;
          used[k] = true;
          return {
            name: ach.holders[h].name,
            area: ach.holders[h].area,
            badge: ach.name,
            icon: ach.icon,
          };
        }
      }
      // fallback: top by wins then jornadas
      var sorted = all.slice().sort(fallbackSort || function (a, b) {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.jornadas - a.jornadas;
      });
      for (var j = 0; j < sorted.length; j++) {
        var kk = sorted[j].person.key;
        if (used[kk]) continue;
        used[kk] = true;
        return {
          name: sorted[j].person.name,
          area: sorted[j].person.area,
          badge: "Destacado",
          icon: "⭐",
        };
      }
      return null;
    };

    return slots.map(function (s) {
      var player = null;
      if (s.id === "gk") player = pick(["participacion"]);
      else if (s.id === "lb") player = pick(["local_king"]);
      else if (s.id === "rb") player = pick(["visit_king"]);
      else if (s.id === "cb1") player = pick(["seconds2", "wins2"]);
      else if (s.id === "cb2") player = pick(["draw_king", "seis"]);
      else if (s.id === "cm1") player = pick(["seis", "siete"]);
      else if (s.id === "cam") player = pick(["wins3", "wins2", "primer_sencilla"]);
      else if (s.id === "cm2") player = pick(["money", "siete"]);
      else if (s.id === "lw") player = pick(["ocho", "siete"]);
      else if (s.id === "rw") player = pick(["goleo_master", "primer_goleo"]);
      else if (s.id === "st") player = pick(["pleno9", "wins3", "money"]);

      return {
        id: s.id,
        label: s.label,
        x: s.x,
        y: s.y,
        player: player,
      };
    });
  }

  function badgesForPerson(name, area) {
    if (!CACHE) return [];
    var k = keyName(name, area);
    return CACHE.achievements
      .filter(function (a) {
        return a.holders.some(function (h) {
          return keyName(h.name, h.area) === k;
        });
      })
      .map(function (a) {
        return { id: a.id, name: a.name, icon: a.icon, desc: a.desc };
      });
  }

  return {
    catalog: CATALOG,
    compute: compute,
    badgesForPerson: badgesForPerson,
    getCache: function () {
      return CACHE;
    },
  };
})();
