/* ═══════════════════════════════════════════
   Render · Vista Jornadas (datos reales Supabase)
   ═══════════════════════════════════════════ */

window.QA = window.QA || {};
QA.render = QA.render || {};

QA.render.jornadas = async function (filter) {
  filter = filter || "all";
  const el = document.getElementById("view-jornadas");
  if (!el) return;

  const escape = QA.utils.escape;
  el.innerHTML = (QA.skel ? QA.skel.page('cards') : '<div class="empty-state"><p>Cargando jornadas…</p></div>');

  let list = [];
  try {
    list = await QA.data.getJornadas();
  } catch (err) {
    console.error(err);
    el.innerHTML =
      '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error al cargar jornadas</p></div>';
    return;
  }

  if (filter !== "all") {
    list = list.filter(function (j) {
      return j.estado === filter;
    });
  }

  const groups = {};
  list.forEach(function (j) {
    const key = j.competencia || "Otras";
    if (!groups[key]) groups[key] = [];
    groups[key].push(j);
  });

  const chips = [
    { id: "all", label: "Todas" },
    { id: "activa", label: "Activas" },
    { id: "borrador", label: "Borrador" },
    { id: "finalizada", label: "Finalizadas" },
  ];

  let html =
    '<div class="filter-chips">' +
    chips
      .map(function (c) {
        return (
          '<button type="button" class="chip ' +
          (c.id === filter ? "active" : "") +
          '" data-filter="' +
          c.id +
          '">' +
          c.label +
          "</button>"
        );
      })
      .join("") +
    '</div><div id="jornadas-list">';

  const keys = Object.keys(groups);
  if (!keys.length) {
    html +=
      '<div class="empty-state"><div class="empty-icon">📅</div><p>No hay jornadas en este filtro</p></div>';
  } else {
    keys.forEach(function (comp) {
      const items = groups[comp];
      html +=
        '<div class="comp-group"><h3 class="comp-group-title">' +
        escape(comp) +
        '</h3><div class="jornada-grid">';
      items.forEach(function (j) {
        const modeLabel = j.modeLabel || j.mode || "";
        const mode =
          modeLabel && modeLabel !== "Sencilla" && modeLabel !== "SENCILLA"
            ? ' <span class="mode-chip mode-chip-sm' +
              (String(j.mode || "").toUpperCase().indexOf("GOLE") !== -1
                ? " mode-goleo"
                : "") +
              '">' +
              escape(modeLabel) +
              "</span>"
            : ' <span class="mode-chip mode-chip-sm mode-sencilla">Sencilla</span>';
        const season = j.season ? escape(j.season) : "";
        html +=
          '<article class="jornada-card" data-jornada-id="' +
          escape(j.id) +
          '">' +
          '<div class="jc-status ' +
          escape(j.estado) +
          '">' +
          escape(j.estado) +
          "</div>" +
          '<h4 class="jc-title">' +
          escape(j.nombre) +
          mode +
          "</h4>" +
          '<p class="jc-meta">' +
          (season ? season + " · " : "") +
          j.partidosJugados +
          "/" +
          j.partidosTotal +
          " partidos · " +
          j.participantes +
          " part." +
          (j.dateLabel ? "<br>" + escape(j.dateLabel) : "") +
          "</p>" +
          '<div class="jc-footer">Ver resultados →</div></article>';
      });
      html += "</div></div>";
    });
  }
  html += "</div>";
  el.innerHTML = html;

  el.querySelectorAll(".chip").forEach(function (btn) {
    btn.addEventListener("click", function () {
      QA.render.jornadas(btn.dataset.filter);
    });
  });
  el.querySelectorAll(".jornada-card").forEach(function (card) {
    card.addEventListener("click", function () {
      QA.app.openJornada(card.dataset.jornadaId);
    });
  });
};
