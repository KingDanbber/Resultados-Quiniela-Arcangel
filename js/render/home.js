/* ═══════════════════════════════════════════
   Render · Inicio
   ═══════════════════════════════════════════ */

window.QA = window.QA || {};
QA.render = QA.render || {};

QA.render.home = async function () {
  const el = document.getElementById("view-inicio");
  if (!el) return;

  el.innerHTML = '<div class="empty-state"><p>Cargando…</p></div>';

  let activas = [];
  try {
    activas = await QA.data.getActiveJornadas();
  } catch (err) {
    console.error(err);
    el.innerHTML =
      '<div class="empty-state"><div class="empty-icon">⚠️</div><p>No se pudieron cargar las jornadas</p></div>';
    return;
  }

  if (!activas || !activas.length) {
    el.innerHTML =
      '<div class="empty-state"><div class="empty-icon">📅</div><p>No hay jornadas aún</p></div>';
    return;
  }

  const escape = QA.utils.escape;

  function greetingBlock() {
    var now = new Date();
    var h = now.getHours();
    var saludo =
      h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
    var fecha = now.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    // Capitalizar primera letra del weekday
    fecha = fecha.charAt(0).toUpperCase() + fecha.slice(1);
    return (
      '<div class="home-welcome">' +
      '<p class="home-greet">' +
      saludo +
      ". <span>Bienvenido</span></p>" +
      '<p class="home-date">' +
      fecha +
      "</p></div>"
    );
  }


  const tvLinks = [
    {
      name: "Planeta Play",
      url: "https://planetaplay.com/",
      note: "Transmisiones deportivas",
    },
    {
      name: "NoVePartidos",
      url: "https://www.noveopartidos.xyz/index.html",
      note: "Partidos en vivo",
    },
    {
      name: "LaCancha.TV",
      url: "https://lacancha.tv/es",
      note: "Se recomienda Brave (menos publicidad)",
    },
  ];

  function tvSection() {
    return (
      '<h3 class="section-title">TV Deportes en vivo</h3>' +
      '<div class="tv-block">' +
      '<p class="tv-intro">Enlaces externos para seguir partidos. Ábrelos en el navegador o copia el link.</p>' +
      tvLinks
        .map(function (t, i) {
          return (
            '<div class="tv-card" data-tv-idx="' +
            i +
            '">' +
            '<div class="tv-card-main">' +
            '<div class="tv-name">' +
            escape(t.name) +
            '</div><div class="tv-note">' +
            escape(t.note) +
            '</div></div>' +
            '<div class="tv-actions">' +
            '<a class="tv-btn tv-open" href="' +
            escape(t.url) +
            '" target="_blank" rel="noopener noreferrer">Abrir</a>' +
            '<button type="button" class="tv-btn tv-copy" data-copy="' +
            escape(t.url) +
            '">Copiar</button>' +
            "</div></div>"
          );
        })
        .join("") +
      '<div class="tv-disclaimer">' +
      "<strong>Aviso:</strong> Quiniela Arcángel <em>no opera ni controla</em> estas plataformas. " +
      "Son sitios de terceros: pueden cambiar, fallar, mostrar publicidad o contenido no verificado. " +
      "Úsalas bajo tu propio criterio; no nos hacemos responsables de su disponibilidad, " +
      "seguridad ni del material que publiquen." +
      "</div></div>"
    );
  }


  function heroCard(j) {
    const isLive = j.estado === "activa";
    const badge = isLive
      ? '<span class="live-badge"><span class="live-dot"></span> EN VIVO</span>'
      : '<span class="date-badge date-done">Finalizada</span>';
    const seasonTag = j.season ? " · " + escape(j.season) : "";
    const mode = j.modeLabel || j.mode || "Sencilla";
    const isGoleo = String(j.mode || "").toUpperCase().indexOf("GOLE") !== -1;
    return (
      '<div class="home-hero-card' +
      (isGoleo ? " home-hero-goleo" : "") +
      '" data-jornada-id="' +
      escape(j.id) +
      '">' +
      '<div class="home-hero-top">' +
      '<span class="comp-badge">' +
      escape(j.competencia) +
      seasonTag +
      "</span>" +
      badge +
      "</div>" +
      '<h2 class="home-hero-title">' +
      escape(j.nombre) +
      "</h2>" +
      '<div class="home-mode-row">' +
      '<span class="mode-chip' +
      (isGoleo ? " mode-goleo" : " mode-sencilla") +
      '">' +
      escape(mode) +
      "</span>" +
      (j.price != null
        ? '<span class="mode-price">' + QA.utils.money(j.price) + "</span>"
        : "") +
      "</div>" +
      '<p class="home-hero-meta">' +
      j.partidosJugados +
      " de " +
      j.partidosTotal +
      " partidos · " +
      j.participantes +
      " participantes" +
      (j.dateLabel ? " · " + escape(j.dateLabel) : "") +
      "</p>" +
      '<div class="home-hero-cta">Ver jornada →</div>' +
      "</div>"
    );
  }

  const heroes =
    activas.length > 1
      ? '<h3 class="section-title">Jornadas activas</h3>' +
        '<div class="home-heroes">' +
        activas.map(heroCard).join("") +
        "</div>"
      : heroCard(activas[0]);

  el.innerHTML =
    greetingBlock() +
    heroes +
    '<h3 class="section-title">Accesos rápidos</h3>' +
    '<div class="quick-links">' +
    '<button type="button" class="quick-btn" data-view="jornadas">' + (QA.icons && QA.icons.calendar ? QA.icons.calendar : '') + ' Jornadas</button>' +
    '<button type="button" class="quick-btn" data-view="historial">' + (QA.icons && QA.icons.scroll ? QA.icons.scroll : '') + ' Historial</button>' +
    '<button type="button" class="quick-btn" data-view="tabla">' + (QA.icons && QA.icons.table ? QA.icons.table : '') + ' Tabla</button>' +
    '<button type="button" class="quick-btn" data-cal="1">' + (QA.icons && QA.icons.calendar ? QA.icons.calendar : '') + ' Calendario MX</button>' +
    "</div>" +
    tvSection() +
    '<h3 class="section-title">Tabla Liga MX · Top 6</h3>' +
    '<div id="home-mini-tabla"></div>';

  const box = el.querySelector("#home-mini-tabla");
  if (box) box.innerHTML = '<p class="skel-msg">Cargando tabla…</p>';
  let standings = { rows: [] };
  try {
    standings = await QA.data.getStandingsAsync();
  } catch (_) {}
  const mini = (standings.rows || []).slice(0, 6);
  if (box) {
    if (!mini.length) {
      box.innerHTML = '<p class="st-note">Sin datos de tabla</p>';
    } else box.innerHTML =
      '<div class="tabla-wrap"><table class="standings-table"><thead><tr>' +
      "<th>#</th><th>Equipo</th><th>PJ</th><th>Pts</th></tr></thead><tbody>" +
      mini
        .map(function (r) {
          return (
            '<tr class="' +
            (r.zone ? "zone-" + r.zone : "") +
            '"><td>' +
            r.pos +
            '</td><td><div class="team-cell"><img src="' +
            escape(r.logo) +
            '" alt="" onerror="this.style.display=\'none\'"><span>' +
            escape(r.team) +
            "</span></div></td><td>" +
            r.pj +
            '</td><td class="pts-cell">' +
            r.pts +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div>" +
      '<p style="margin-top:10px;text-align:right">' +
      '<button type="button" class="quick-btn" data-view="tabla" style="display:inline-block;padding:8px 14px">Ver tabla completa →</button></p>';
  }

  el.querySelectorAll(".quick-btn[data-cal]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      QA.render._tablaSub = "calendario";
      QA.app.showView("tabla");
    });
  });

  el.querySelectorAll(".home-hero-card").forEach(function (hero) {
    hero.addEventListener("click", function () {
      QA.app.openJornada(hero.getAttribute("data-jornada-id"));
    });
  });

  el.querySelectorAll(".tv-copy").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var url = btn.getAttribute("data-copy") || "";
      function ok() {
        var prev = btn.textContent;
        btn.textContent = "Copiado";
        btn.classList.add("copied");
        setTimeout(function () {
          btn.textContent = prev;
          btn.classList.remove("copied");
        }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(ok).catch(function () {
          window.prompt("Copia el enlace:", url);
        });
      } else {
        window.prompt("Copia el enlace:", url);
      }
    });
  });
};
