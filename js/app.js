/* ═══════════════════════════════════════════
   App · Navegación y arranque
   ═══════════════════════════════════════════ */

window.QA = window.QA || {};

QA.app = {
  currentView: "inicio",
  _prevView: "jornadas",

  showView: async function (viewId) {
    // Lazy: solo pinta la vista pedida; el resto no se toca

    if (QA.render && QA.render._stopJdRefresh) QA.render._stopJdRefresh();
    const valid = ["inicio", "jornadas", "historial", "ganadores", "tabla"];
    if (valid.indexOf(viewId) === -1) viewId = "inicio";

    this.currentView = viewId;

    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.remove("active");
    });
    const target = document.getElementById("view-" + viewId);
    if (target) target.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.view === viewId);
    });

    const renderers = {
      inicio: function () { return QA.render.home(); },
      jornadas: function () { return QA.render.jornadas("all"); },
      historial: function () { return QA.render.historial(); },
      ganadores: function () { return QA.render.ganadores(); },
      tabla: function () { return QA.render.tabla(); },
    };
    if (renderers[viewId]) await renderers[viewId]();

    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const url = new URL(window.location);
      url.searchParams.set("tab", viewId);
      url.searchParams.delete("jornada");
      history.replaceState(null, "", url);
    } catch (e) {}
  },

  openJornada: async function (poolId) {
    if (!poolId) return;
    this._prevView = this.currentView === "jornada-detalle" ? "jornadas" : this.currentView;
    this.currentView = "jornada-detalle";

    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.remove("active");
    });

    var target = document.getElementById("view-jornada-detalle");
    if (!target) {
      target = document.createElement("section");
      target.id = "view-jornada-detalle";
      target.className = "view";
      var main = document.getElementById("main");
      if (main) main.appendChild(target);
    }
    target.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.classList.remove("active");
    });

    try {
      await QA.render.jornadaDetalle(poolId);
    } catch (err) {
      console.error("openJornada error", err);
      target.innerHTML =
        '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error al abrir la jornada</p>' +
        '<button type="button" class="jd-back" id="jd-back-err">← Volver</button></div>';
      var self = this;
      var b = document.getElementById("jd-back-err");
      if (b) b.addEventListener("click", function () { self.showView(self._prevView || "jornadas"); });
    }

    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const url = new URL(window.location);
      url.searchParams.set("tab", "jornada");
      url.searchParams.set("jornada", poolId);
      history.replaceState(null, "", url);
    } catch (e) {}
  },

  init: function () {
    const self = this;
    document.body.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-view]");
      if (btn && btn.dataset.view) {
        e.preventDefault();
        self.showView(btn.dataset.view);
      }
    });

    const params = new URLSearchParams(window.location.search);
    const jornadaId = params.get("jornada");
    if (jornadaId) {
      self.openJornada(jornadaId);
    } else {
      const tab = params.get("tab") || "inicio";
      if (tab === "jornada") self.showView("jornadas");
      else self.showView(tab);
    }

    console.log("Quiniela Arcángel · detalle de jornada listo");
  },
};

document.addEventListener("DOMContentLoaded", function () {
  QA.app.init();
  if (QA.search) QA.search.init();
  if (QA.notifications) QA.notifications.init();
});
