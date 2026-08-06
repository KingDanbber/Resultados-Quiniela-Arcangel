/* PWA · registro SW + instalar */
window.QA = window.QA || {};

QA.pwa = {
  deferredPrompt: null,
  installed: false,

  init: function () {
    var self = this;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./sw.js")
        .then(function (reg) {
          console.log("[PWA] SW ok", reg.scope);
        })
        .catch(function (err) {
          console.warn("[PWA] SW fail", err);
        });
    }

    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      self.deferredPrompt = e;
      self.showInstallUI(true);
      self.maybeFirstVisitPrompt();
    });

    window.addEventListener("appinstalled", function () {
      self.installed = true;
      self.deferredPrompt = null;
      self.showInstallUI(false);
      try {
        localStorage.setItem("qa_pwa_installed", "1");
      } catch (_) {}
      self.toast("App instalada. ¡Listo para usar!");
    });

    // Si ya está en modo standalone
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      self.installed = true;
      self.showInstallUI(false);
    } else {
      // Mostrar botón si no instalada (iOS / fallback)
      var already = false;
      try {
        already = localStorage.getItem("qa_pwa_installed") === "1";
      } catch (_) {}
      if (!already) {
        // botón visible; prompt nativo solo si hay deferredPrompt
        setTimeout(function () {
          self.showInstallUI(true);
          self.maybeFirstVisitPrompt();
        }, 2500);
      }
    }

    var btn = document.getElementById("btn-install");
    if (btn) {
      btn.addEventListener("click", function () {
        self.install();
      });
    }
  },

  showInstallUI: function (show) {
    var btn = document.getElementById("btn-install");
    if (btn) btn.style.display = show && !this.installed ? "inline-flex" : "none";
  },

  maybeFirstVisitPrompt: function () {
    var key = "qa_pwa_prompt_seen";
    try {
      if (localStorage.getItem(key) === "1") return;
      if (localStorage.getItem("qa_pwa_installed") === "1") return;
    } catch (_) {
      return;
    }
    // No invasivo: banner inferior dismissible
    if (document.getElementById("pwa-banner")) return;
    var banner = document.createElement("div");
    banner.id = "pwa-banner";
    banner.className = "pwa-banner";
    banner.innerHTML =
      '<div class="pwa-banner-text">' +
      "<strong>Instala Quiniela Arcángel</strong>" +
      "<span>Acceso rápido desde tu pantalla de inicio. Sin ocupar casi espacio.</span>" +
      "</div>" +
      '<div class="pwa-banner-actions">' +
      '<button type="button" class="pwa-btn-primary" id="pwa-banner-install">Instalar</button>' +
      '<button type="button" class="pwa-btn-ghost" id="pwa-banner-later">Ahora no</button>' +
      "</div>";
    document.body.appendChild(banner);
    requestAnimationFrame(function () {
      banner.classList.add("show");
    });
    var self = this;
    document.getElementById("pwa-banner-install").addEventListener("click", function () {
      self.dismissBanner(true);
      self.install();
    });
    document.getElementById("pwa-banner-later").addEventListener("click", function () {
      self.dismissBanner(true);
    });
  },

  dismissBanner: function (remember) {
    var banner = document.getElementById("pwa-banner");
    if (banner) {
      banner.classList.remove("show");
      setTimeout(function () {
        if (banner.parentNode) banner.parentNode.removeChild(banner);
      }, 280);
    }
    if (remember) {
      try {
        localStorage.setItem("qa_pwa_prompt_seen", "1");
      } catch (_) {}
    }
  },

  install: async function () {
    var self = this;
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      try {
        var choice = await this.deferredPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          self.toast("Instalando…");
        }
      } catch (_) {}
      this.deferredPrompt = null;
      this.showInstallUI(false);
      return;
    }
    // iOS / sin beforeinstallprompt
    var isIOS =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS) {
      this.toast(
        "En iPhone: tocar Compartir → “Añadir a pantalla de inicio”"
      );
    } else {
      this.toast(
        "Usa el menú del navegador → “Instalar aplicación” o “Añadir a la pantalla de inicio”"
      );
    }
  },

  toast: function (msg) {
    var el = document.createElement("div");
    el.className = "pwa-toast";
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add("show");
    });
    setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 280);
    }, 3200);
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    QA.pwa.init();
  });
} else {
  QA.pwa.init();
}
