/* Pull-to-refresh · Inicio y Detalle de jornada */
window.QA = window.QA || {};

QA.pullRefresh = {
  _bound: false,
  _startY: 0,
  _pulling: false,
  _armed: false,
  THRESHOLD: 72,

  init: function () {
    if (this._bound) return;
    this._bound = true;

    var self = this;
    var indicator = document.createElement("div");
    indicator.id = "ptr-indicator";
    indicator.className = "ptr-indicator";
    indicator.innerHTML = '<div class="ptr-spinner"></div><span class="ptr-text">Suelta para actualizar</span>';
    document.body.appendChild(indicator);

    function canPull() {
      return window.scrollY <= 2;
    }

    function viewOk() {
      var v = QA.app && QA.app.currentView;
      return v === "inicio" || v === "jornada-detalle" || v === "jornadas" || v === "tabla";
    }

    document.addEventListener(
      "touchstart",
      function (e) {
        if (!viewOk() || !canPull()) {
          self._armed = false;
          return;
        }
        self._startY = e.touches[0].clientY;
        self._armed = true;
        self._pulling = false;
      },
      { passive: true }
    );

    document.addEventListener(
      "touchmove",
      function (e) {
        if (!self._armed || !viewOk()) return;
        var dy = e.touches[0].clientY - self._startY;
        if (dy < 8 || !canPull()) {
          indicator.classList.remove("visible", "ready");
          self._pulling = false;
          return;
        }
        self._pulling = true;
        var p = Math.min(dy, 120);
        indicator.style.transform = "translateY(" + (p - 60) + "px)";
        indicator.classList.add("visible");
        if (dy >= self.THRESHOLD) indicator.classList.add("ready");
        else indicator.classList.remove("ready");
      },
      { passive: true }
    );

    document.addEventListener(
      "touchend",
      function () {
        if (!self._pulling) {
          indicator.classList.remove("visible", "ready");
          self._armed = false;
          return;
        }
        var ready = indicator.classList.contains("ready");
        indicator.classList.remove("ready");
        if (ready) {
          indicator.classList.add("loading");
          indicator.querySelector(".ptr-text").textContent = "Actualizando…";
          self.refresh().finally(function () {
            indicator.classList.remove("visible", "loading");
            indicator.style.transform = "";
            indicator.querySelector(".ptr-text").textContent = "Suelta para actualizar";
          });
        } else {
          indicator.classList.remove("visible");
          indicator.style.transform = "";
        }
        self._pulling = false;
        self._armed = false;
      },
      { passive: true }
    );
  },

  refresh: async function () {
    var view = QA.app && QA.app.currentView;
    try {
      if (view === "jornada-detalle" && QA.render._jdPoolId) {
        var pid = QA.render._jdPoolId;
        QA.render._stopJdRefresh && QA.render._stopJdRefresh();
        var data = await QA.data.loadPoolDetail(pid);
        QA.render._jdCache = data;
        var el = document.getElementById("view-jornada-detalle");
        if (el) QA.render._paintJornadaDetalle(el, data, false);
        QA.render._startJdRefresh && QA.render._startJdRefresh(pid);
      } else if (view === "inicio") {
        await QA.render.home();
      } else if (view === "jornadas") {
        await QA.render.jornadas("all");
      } else if (view === "tabla") {
        await QA.render.tabla();
      } else if (view === "historial") {
        await QA.render.historial();
      } else if (view === "ganadores") {
        await QA.render.ganadores();
      }
    } catch (err) {
      console.error("pull-refresh", err);
    }
  },
};

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    if (QA.pullRefresh) QA.pullRefresh.init();
  }, 400);
});
