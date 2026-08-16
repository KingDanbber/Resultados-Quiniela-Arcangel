/* Selector de temas · modal + localStorage */
window.QA = window.QA || {};

QA.theme = (function () {
  var KEY = "qa_theme";
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
  ];

  function current() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function apply(id) {
    var valid = THEMES.some(function (t) { return t.id === id; });
    if (!valid) id = "dark";
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem(KEY, id);
    } catch (_) {}
    // theme-color meta
    try {
      var meta = document.querySelector('meta[name="theme-color"]');
      var t = THEMES.find(function (x) { return x.id === id; });
      if (meta && t) meta.setAttribute("content", t.sw2);
    } catch (_) {}
  }

  function openModal() {
    var existing = document.getElementById("theme-modal");
    if (existing) existing.remove();

    var cur = current();
    var modal = document.createElement("div");
    modal.id = "theme-modal";
    modal.className = "theme-modal-overlay";
    modal.innerHTML =
      '<div class="theme-modal" role="dialog" aria-label="Selector de temas">' +
      '<div class="theme-modal-head"><h3>Temas</h3>' +
      '<button type="button" class="theme-modal-close" id="theme-close">✕</button></div>' +
      '<div class="theme-grid" id="theme-grid"></div>' +
      '<p class="theme-modal-note">Tu elección se guarda en este dispositivo</p></div>';

    document.body.appendChild(modal);
    var grid = document.getElementById("theme-grid");
    THEMES.forEach(function (t) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-option" + (t.id === cur ? " active" : "");
      btn.setAttribute("data-theme-id", t.id);
      btn.innerHTML =
        '<div class="theme-swatch" style="--sw1:' +
        t.sw1 +
        ";--sw2:" +
        t.sw2 +
        '"></div>' +
        '<div class="theme-option-name">' +
        t.name +
        "</div>" +
        '<div class="theme-option-desc">' +
        t.desc +
        "</div>";
      btn.addEventListener("click", function () {
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
    var saved = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch (_) {}
    if (saved) apply(saved);

    var btn = document.getElementById("btn-theme");
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        openModal();
      });
    }
  }

  return {
    init: init,
    apply: apply,
    open: openModal,
    list: THEMES,
  };
})();

document.addEventListener("DOMContentLoaded", function () {
  if (QA.theme) QA.theme.init();
});
