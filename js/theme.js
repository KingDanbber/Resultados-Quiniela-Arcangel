/* Temas + temporadas (Halloween octubre, etc.) */
window.QA = window.QA || {};

QA.theme = (function () {
  var KEY = "qa_theme";
  var KEY_BEFORE = "qa_theme_before_season";
  var KEY_SEASON_TAG = "qa_theme_season_tag"; // id de temporada con la que se guardó KEY_BEFORE
  var KEY_MANUAL_PREFIX = "qa_season_manual_"; // + seasonId
  var KEY_NOTICE_PREFIX = "qa_season_notice_"; // + seasonId

  var THEMES = [
    { id: "dark", name: "Oscuro", desc: "Clásico de la app", sw1: "#06090f", sw2: "#1d4ed8" },
    { id: "light", name: "Claro", desc: "Fondo luminoso", sw1: "#eef2fb", sw2: "#2563eb" },
    { id: "oro", name: "Oro Arcángel", desc: "Ámbar y negro", sw1: "#0c0a06", sw2: "#f59e0b" },
    { id: "midnight", name: "Medianoche", desc: "Violeta profundo", sw1: "#07060f", sw2: "#8b5cf6" },
    { id: "estadio", name: "Estadio", desc: "Verde césped", sw1: "#0a1f12", sw2: "#22c55e" },
    { id: "carbon", name: "Carbon", desc: "Antracita F1", sw1: "#0a0a0b", sw2: "#a1a1aa" },
    { id: "ligamx", name: "Liga MX", desc: "Azul y rojo", sw1: "#0a1628", sw2: "#dc2626" },
    { id: "neon", name: "Neón", desc: "Cyan y magenta", sw1: "#050510", sw2: "#22d3ee" },
    { id: "contraste", name: "Alto contraste", desc: "Máxima legibilidad", sw1: "#000000", sw2: "#ffff00" },
    {
      id: "halloween",
      name: "Halloween",
      desc: "Temporada · Octubre",
      sw1: "#1a0a1f",
      sw2: "#f97316",
      seasonal: true,
    },
  ];

  /** Temporadas recurrentes cada año (mes 1–12, día 1–31) */
  var SEASONS = [
    {
      id: "halloween-oct",
      themeId: "halloween",
      name: "Halloween",
      label: "octubre",
      startMonth: 10,
      startDay: 1,
      endMonth: 10,
      endDay: 31,
      message:
        "Tema Halloween activo durante octubre. Si prefieres tu tema de siempre, puedes cambiarlo cuando quieras en el botón de Temas.",
    },
  ];

  function lsGet(k) {
    try {
      return localStorage.getItem(k);
    } catch (_) {
      return null;
    }
  }
  function lsSet(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (_) {}
  }
  function lsDel(k) {
    try {
      localStorage.removeItem(k);
    } catch (_) {}
  }

  function current() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function isValidTheme(id) {
    return THEMES.some(function (t) {
      return t.id === id;
    });
  }

  function apply(id, opts) {
    opts = opts || {};
    if (!isValidTheme(id)) id = "dark";
    document.documentElement.setAttribute("data-theme", id);
    if (!opts.skipSave) {
      lsSet(KEY, id);
    }
    try {
      var meta = document.querySelector('meta[name="theme-color"]');
      var t = THEMES.find(function (x) {
        return x.id === id;
      });
      if (meta && t) meta.setAttribute("content", t.sw2);
    } catch (_) {}
    try {
      if (window.QA && QA.icons && QA.icons.applyNavTheme) {
        QA.icons.applyNavTheme(id);
      }
    } catch (_) {}
  }

  /** Temporada activa hoy, o null */
  function getActiveSeason(now) {
    now = now || new Date();
    var m = now.getMonth() + 1;
    var d = now.getDate();
    for (var i = 0; i < SEASONS.length; i++) {
      var s = SEASONS[i];
      var afterStart =
        m > s.startMonth || (m === s.startMonth && d >= s.startDay);
      var beforeEnd = m < s.endMonth || (m === s.endMonth && d <= s.endDay);
      // misma ventana dentro del año (no cruza año por ahora)
      if (s.startMonth <= s.endMonth) {
        if (afterStart && beforeEnd) return s;
      } else {
        // ej. 15 dic – 6 ene
        if (afterStart || beforeEnd) return s;
      }
    }
    return null;
  }

  function wasManual(seasonId) {
    return lsGet(KEY_MANUAL_PREFIX + seasonId) === "1";
  }

  function markManual(seasonId) {
    lsSet(KEY_MANUAL_PREFIX + seasonId, "1");
  }

  function noticeSeen(seasonId) {
    return lsGet(KEY_NOTICE_PREFIX + seasonId) === "1";
  }

  function markNoticeSeen(seasonId) {
    lsSet(KEY_NOTICE_PREFIX + seasonId, "1");
  }

  /**
   * Auto-aplica temporada o restaura tema previo.
   * No pisa Alto contraste ni elección manual de esta temporada.
   */
  function resolveSeasonal() {
    var season = getActiveSeason();
    var saved = lsGet(KEY) || "dark";

    if (season) {
      // No forzar si el usuario eligió otro tema en esta temporada
      if (wasManual(season.id)) {
        apply(saved, { skipSave: true });
        return { season: season, applied: false, reason: "manual" };
      }
      // Respetar alto contraste
      if (saved === "contraste") {
        apply("contraste", { skipSave: true });
        return { season: season, applied: false, reason: "a11y" };
      }
      // Guardar tema previo una sola vez por temporada
      var tag = lsGet(KEY_SEASON_TAG);
      if (tag !== season.id) {
        var prev = saved;
        if (prev === season.themeId) prev = "dark";
        lsSet(KEY_BEFORE, prev);
        lsSet(KEY_SEASON_TAG, season.id);
      }
      apply(season.themeId, { skipSave: false });
      return { season: season, applied: true, reason: "auto" };
    }

    // Fuera de temporada: si el tema guardado es solo de temporada, restaurar
    var before = lsGet(KEY_BEFORE);
    var lastTag = lsGet(KEY_SEASON_TAG);
    if (lastTag && before) {
      var seasonalTheme = THEMES.find(function (t) {
        return t.seasonal && t.id === saved;
      });
      if (seasonalTheme || saved === "halloween") {
        apply(before);
      } else {
        apply(saved, { skipSave: true });
      }
      lsDel(KEY_BEFORE);
      lsDel(KEY_SEASON_TAG);
      return { season: null, applied: false, reason: "restored" };
    }

    apply(saved, { skipSave: true });
    return { season: null, applied: false, reason: "saved" };
  }

  function showSeasonNotice(season) {
    if (!season || noticeSeen(season.id)) return;
    var existing = document.getElementById("season-notice");
    if (existing) existing.remove();

    var prevLabel = lsGet(KEY_BEFORE) || "dark";
    var prevTheme = THEMES.find(function (t) {
      return t.id === prevLabel;
    });
    var prevName = prevTheme ? prevTheme.name : "Oscuro";

    var el = document.createElement("div");
    el.id = "season-notice";
    el.className = "season-notice-overlay";
    el.innerHTML =
      '<div class="season-notice" role="dialog" aria-label="Tema de temporada">' +
      '<div class="season-notice-icon">🎃</div>' +
      "<h3>Tema " +
      escapeHtml(season.name) +
      "</h3>" +
      '<p class="season-notice-msg">' +
      escapeHtml(season.message) +
      "</p>" +
      '<div class="season-notice-actions">' +
      '<button type="button" class="season-btn primary" id="season-keep">Quedarme con ' +
      escapeHtml(season.name) +
      "</button>" +
      '<button type="button" class="season-btn" id="season-revert">Volver a ' +
      escapeHtml(prevName) +
      "</button>" +
      "</div>" +
      '<p class="season-notice-hint">También puedes cambiarlo cuando quieras en el botón de Temas</p>' +
      "</div>";

    document.body.appendChild(el);

    function close() {
      markNoticeSeen(season.id);
      el.remove();
    }

    document.getElementById("season-keep").onclick = function () {
      apply(season.themeId);
      // no marcar manual: sigue siendo temporada
      close();
    };
    document.getElementById("season-revert").onclick = function () {
      markManual(season.id);
      apply(prevLabel === season.themeId ? "dark" : prevLabel);
      close();
    };
    el.addEventListener("click", function (e) {
      if (e.target === el) close();
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openModal() {
    var existing = document.getElementById("theme-modal");
    if (existing) existing.remove();

    var cur = current();
    var season = getActiveSeason();
    var modal = document.createElement("div");
    modal.id = "theme-modal";
    modal.className = "theme-modal-overlay";
    modal.innerHTML =
      '<div class="theme-modal" role="dialog" aria-label="Selector de temas">' +
      '<div class="theme-modal-head"><h3>Temas</h3>' +
      '<button type="button" class="theme-modal-close" id="theme-close">✕</button></div>' +
      (season
        ? '<p class="theme-season-banner">🎃 Temporada ' +
          escapeHtml(season.name) +
          " · " +
          escapeHtml(season.label) +
          "</p>"
        : "") +
      '<div class="theme-grid" id="theme-grid"></div>' +
      '<p class="theme-modal-note">Tu elección se guarda en este dispositivo</p></div>';

    document.body.appendChild(modal);
    var grid = document.getElementById("theme-grid");

    // Temporada primero si aplica
    var list = THEMES.slice();
    if (season) {
      list.sort(function (a, b) {
        if (a.id === season.themeId) return -1;
        if (b.id === season.themeId) return 1;
        return 0;
      });
    }

    list.forEach(function (t) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-option" + (t.id === cur ? " active" : "");
      btn.setAttribute("data-theme-id", t.id);
      var isSeason =
        season && t.id === season.themeId
          ? '<span class="theme-chip-season">Temporada</span>'
          : "";
      btn.innerHTML =
        '<div class="theme-swatch" style="--sw1:' +
        t.sw1 +
        ";--sw2:" +
        t.sw2 +
        '"></div>' +
        '<div class="theme-option-name">' +
        escapeHtml(t.name) +
        isSeason +
        "</div>" +
        '<div class="theme-option-desc">' +
        escapeHtml(t.desc) +
        "</div>";
      btn.addEventListener("click", function () {
        var active = getActiveSeason();
        if (active) {
          if (t.id === active.themeId) {
            // vuelve a temporada: quita override manual
            lsDel(KEY_MANUAL_PREFIX + active.id);
          } else {
            markManual(active.id);
          }
        }
        apply(t.id);
        modal.remove();
      });
      grid.appendChild(btn);
    });

    document.getElementById("theme-close").onclick = function () {
      modal.remove();
    };
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.remove();
    });
  }

  function init() {
    var result = resolveSeasonal();

    var btn = document.getElementById("btn-theme");
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        openModal();
      });
    }

    // Aviso 1ª vez en la temporada (tras pintar UI)
    if (result.season && result.applied && !noticeSeen(result.season.id)) {
      setTimeout(function () {
        showSeasonNotice(result.season);
      }, 600);
    }
  }

  return {
    init: init,
    apply: apply,
    open: openModal,
    list: THEMES,
    getActiveSeason: getActiveSeason,
    resolveSeasonal: resolveSeasonal,
  };
})();

document.addEventListener("DOMContentLoaded", function () {
  if (QA.theme) QA.theme.init();
});
