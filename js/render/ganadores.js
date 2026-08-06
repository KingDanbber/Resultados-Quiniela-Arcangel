/* Hall of Fame · ganadores por jornada + trofeo 3D */
window.QA = window.QA || {};
QA.render = QA.render || {};

QA.render.ganadores = async function () {
  const el = document.getElementById("view-ganadores");
  if (!el) return;
  const escape = QA.utils.escape;
  const ico = QA.icons || {};

  if (QA.trophy3d) QA.trophy3d.dispose();
  el.innerHTML =
    '<div class="lazy-skel"><div class="skel-line w40"></div><div class="skel-trophy"></div><p class="skel-msg">Cargando Hall of Fame…</p></div>';

  let cards = [];
  try {
    cards = await QA.data.getHallOfFame();
  } catch (err) {
    console.error(err);
    el.innerHTML =
      '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error al cargar ganadores</p></div>';
    return;
  }

  function fmxn(n) {
    return QA.utils.money(n);
  }

  var listHtml = "";
  if (!cards.length) {
    listHtml =
      '<div class="empty-state"><div class="empty-icon">' +
      (ico.trophy || "") +
      '</div><p>Aún no hay jornadas finalizadas con ganadores</p></div>';
  } else {
    listHtml = cards
      .map(function (c) {
        var trophySvg = c.isSplit
          ? ico.handshake || ""
          : ico.trophy || "";
        var wins = c.winners
          .map(function (w) {
            return (
              '<div class="hof-card' +
              (c.isSplit ? " split" : "") +
              '">' +
              '<div class="hof-trophy-svg' +
              (c.isSplit ? " split" : "") +
              '">' +
              trophySvg +
              "</div>" +
              '<div class="hof-info"><div class="hof-name">' +
              escape(w.name) +
              '</div><div class="hof-area">' +
              escape(w.area || "") +
              "</div>" +
              (c.isSplit
                ? '<div class="hof-split">Premio compartido · ' +
                  c.winners.length +
                  " ganadores</div>"
                : "") +
              '</div><div class="hof-stat"><div class="hof-stat-val">' +
              w.hits +
              '</div><div class="hof-stat-lbl">aciertos</div><div class="hof-prize">' +
              fmxn(c.prize) +
              "</div></div></div>"
            );
          })
          .join("");
        return (
          '<div class="hof-pool" data-jornada-id="' +
          escape(c.poolId) +
          '">' +
          '<div class="hof-pool-title"><span class="hof-pool-left">' +
          '<span class="hof-pool-ico">' +
          trophySvg +
          "</span> " +
          escape(c.label) +
          (c.competition ? " · " + escape(c.competition) : "") +
          (c.season ? " · " + escape(c.season) : "") +
          '</span><span class="hof-pool-meta">Bolsa ' +
          fmxn(c.net) +
          " · " +
          c.paidCount +
          " pagados</span></div>" +
          wins +
          "</div>"
        );
      })
      .join("");
  }

  el.innerHTML =
    '<h2 class="pool-name">Hall of Fame</h2>' +
    '<p class="pool-meta">Histórico de ganadores · Quiniela Sencilla</p>' +
    '<div id="trophy-3d-wrap">' +
    '<canvas id="trophy-3d-canvas"></canvas>' +
    '<div class="trophy-3d-label">HALL OF FAME · QUINIELA ARCÁNGEL</div>' +
    "</div>" +
    '<p class="hof-count">' +
    cards.length +
    " jornada" +
    (cards.length !== 1 ? "s" : "") +
    " con ganador</p>" +
    '<div id="hof-list">' +
    listHtml +
    "</div>";

  el.querySelectorAll(".hof-pool").forEach(function (row) {
    row.addEventListener("click", function () {
      var id = row.getAttribute("data-jornada-id");
      if (id) QA.app.openJornada(id);
    });
  });

  requestAnimationFrame(function () {
    var canvas = document.getElementById("trophy-3d-canvas");
    if (canvas && QA.trophy3d) QA.trophy3d.init(canvas);
  });
};
