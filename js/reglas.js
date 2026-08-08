/* Reglas / Términos y Condiciones */
window.QA = window.QA || {};

QA.reglas = {
  open: function () {
    var existing = document.getElementById("reglas-modal");
    if (existing) existing.remove();

    var modal = document.createElement("div");
    modal.id = "reglas-modal";
    modal.className = "qa-modal-overlay";
    modal.innerHTML =
      '<div class="qa-modal reglas-modal">' +
      '<div class="qa-modal-head">' +
      "<h3>Reglas / Términos</h3>" +
      '<button type="button" class="qa-modal-close" id="reglas-close">✕</button>' +
      "</div>" +
      '<div class="reglas-body">' +
      this._content() +
      "</div>" +
      '<div class="reglas-footer">' +
      '<button type="button" class="res-btn primary" id="reglas-ok">Entendido</button>' +
      "</div></div>";

    document.body.appendChild(modal);

    function close() {
      modal.remove();
    }
    document.getElementById("reglas-close").onclick = close;
    document.getElementById("reglas-ok").onclick = close;
    modal.addEventListener("click", function (e) {
      if (e.target === modal) close();
    });
  },

  _content: function () {
    return (
      '<section class="reglas-sec">' +
      "<h4>1. Naturaleza del juego</h4>" +
      "<p>Quiniela Arcángel es una actividad de entretenimiento recreativo entre conocidos, basada en el pronóstico de resultados de partidos de fútbol. La participación es voluntaria y los resultados dependen en gran medida del azar.</p>" +
      "</section>" +
      '<section class="reglas-sec">' +
      "<h4>2. Modalidades</h4>" +
      "<ul>" +
      "<li><strong>Sencilla:</strong> se pronostica el resultado de cada partido (Local / Empate / Visitante). Gana quien tenga más aciertos.</li>" +
      "<li><strong>Campeón de Goleo:</strong> se pronostica el total de goles de la jornada. Gana quien acierte el número exacto. Si nadie acierta, la bolsa puede acumularse.</li>" +
      "</ul></section>" +
      '<section class="reglas-sec">' +
      "<h4>3. Participación</h4>" +
      "<p>Cada boleta tiene un costo definido por jornada. El organizador registra participantes, captura pronósticos y publica resultados en esta plataforma.</p>" +
      "</section>" +
      '<section class="reglas-sec">' +
      "<h4>4. Resultados</h4>" +
      "<p>Los marcadores se actualizan conforme avanzan los partidos. El resultado oficial de cada encuentro es el del tiempo reglamentario (no incluye prórroga ni penales, salvo indicación expresa del organizador).</p>" +
      "</section>" +
      '<section class="reglas-sec">' +
      "<h4>5. Privacidad</h4>" +
      "<p>Los datos de participantes se usan solo para la organización de la quiniela y la consulta de resultados. No se comparten con terceros ni se utilizan con fines comerciales ajenos a la actividad.</p>" +
      "</section>" +
      '<section class="reglas-sec">' +
      "<h4>6. Premios, distribución y comisión</h4>" +
      "<p>La <strong>bolsa bruta</strong> se calcula a partir del total de boletas pagadas. Sobre dicho monto se descuenta un porcentaje de <strong>comisión de administración</strong>, el cual cubre:</p>" +
      "<ul>" +
      "<li>Administración y organización de la quiniela (registro, captura de pronósticos y resultados, resolución de dudas).</li>" +
      "<li>Mantenimiento de la plataforma de resultados en línea.</li>" +
      "</ul>" +
      "<p>El monto restante constituye la <strong>bolsa neta</strong>, que se distribuye íntegramente al o los ganadores.</p>" +
      "<p><strong>Criterio de reparto (Sencilla):</strong> mayor número de aciertos gana la bolsa íntegra. En caso de empate entre dos o más participantes, la bolsa neta se divide en partes iguales entre los empatados.</p>" +
      "<p><strong>Campeón de Goleo:</strong> gana quien acierte el total exacto de goles. Si nadie acierta, la bolsa puede acumularse para la siguiente jornada de Goleo, según criterio del organizador.</p>" +
      "</section>" +
      '<section class="reglas-sec">' +
      "<h4>7. Modificaciones</h4>" +
      "<p>El organizador se reserva el derecho de modificar, suspender o cancelar cualquier jornada en caso de fuerza mayor, sin generar obligación de reembolso total o parcial, salvo criterio discrecional del organizador.</p>" +
      "</section>" +
      '<section class="reglas-sec">' +
      "<h4>8. Aceptación</h4>" +
      "<p>Al participar en Quiniela Arcángel se entienden aceptadas estas reglas y términos. Ante cualquier duda, contacta al organizador.</p>" +
      "</section>" +
      '<p class="reglas-note">Resultados Quiniela Arcángel®<br/>Desarrollado por Luis Arturo<br/>con ayuda de IA: Grok (xAI) · ChatGPT (OpenAI) · Claude (Anthropic)<br/>Actividad recreativa entre conocidos</p>'
    );
  },

  bindTriggers: function (root) {
    root = root || document;
    root.querySelectorAll("[data-open-reglas]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        QA.reglas.open();
      });
    });
  },
};

document.addEventListener("DOMContentLoaded", function () {
  // Botón en header si existe
  var headerBtn = document.getElementById("btn-reglas");
  if (headerBtn) {
    headerBtn.addEventListener("click", function () {
      QA.reglas.open();
    });
  }
  QA.reglas.bindTriggers(document);
});
