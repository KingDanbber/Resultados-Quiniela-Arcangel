/* Comparar 2 boletas lado a lado */
window.QA = window.QA || {};

QA.compare = {
  open: function (data) {
    var escape = QA.utils.escape;
    var lb = (data && data.leaderboard) || [];
    var meta = (data && data.meta) || {};
    var isGoleo = !!(data && data.isGoleo);
    if (!lb.length) {
      alert("No hay boletas para comparar");
      return;
    }

    var existing = document.getElementById("compare-modal");
    if (existing) existing.remove();

    var modal = document.createElement("div");
    modal.id = "compare-modal";
    modal.className = "qa-modal-overlay";
    modal.innerHTML =
      '<div class="qa-modal compare-modal">' +
      '<div class="qa-modal-head"><h3>Comparar boletas</h3>' +
      '<button type="button" class="qa-modal-close" id="cmp-close">✕</button></div>' +
      '<div class="cmp-pickers">' +
      '<div class="cmp-col">' +
      '<label>Boleta A</label>' +
      '<input type="search" class="jd-search" id="cmp-search-a" placeholder="Buscar…"/>' +
      '<div class="cmp-list" id="cmp-list-a"></div>' +
      '<div class="cmp-selected" id="cmp-sel-a">Sin elegir</div></div>' +
      '<div class="cmp-col">' +
      '<label>Boleta B</label>' +
      '<input type="search" class="jd-search" id="cmp-search-b" placeholder="Buscar…"/>' +
      '<div class="cmp-list" id="cmp-list-b"></div>' +
      '<div class="cmp-selected" id="cmp-sel-b">Sin elegir</div></div>' +
      "</div>" +
      '<button type="button" class="cmp-go" id="cmp-go" disabled>Comparar</button>' +
      '<div id="cmp-result" class="cmp-result"></div></div>';
    document.body.appendChild(modal);

    var selA = null;
    var selB = null;

    function pickLabel(v) {
      if (v === "1" || v === 1) return "L";
      if (v === "X" || v === "x") return "E";
      if (v === "2" || v === 2) return "V";
      return v != null ? String(v) : "—";
    }

    function renderList(which, q) {
      q = (q || "").toLowerCase();
      var box = document.getElementById("cmp-list-" + which);
      var list = lb.filter(function (p) {
        return !q || String(p.displayName || "").toLowerCase().indexOf(q) !== -1;
      });
      box.innerHTML = list
        .slice(0, 40)
        .map(function (p) {
          var active =
            (which === "a" && selA && selA.id === p.id) ||
            (which === "b" && selB && selB.id === p.id);
          return (
            '<button type="button" class="mb-item' +
            (active ? " active" : "") +
            '" data-id="' +
            escape(p.id) +
            '"><span>' +
            escape(p.displayName) +
            '</span><span class="mb-area">' +
            escape(p.displayArea || "") +
            "</span></button>"
          );
        })
        .join("") || '<p class="qa-modal-note">Sin resultados</p>';

      box.querySelectorAll(".mb-item").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-id");
          var entry = lb.find(function (p) {
            return p.id === id;
          });
          if (which === "a") selA = entry;
          else selB = entry;
          document.getElementById("cmp-sel-" + which).textContent = entry
            ? entry.displayName
            : "Sin elegir";
          document.getElementById("cmp-go").disabled = !(selA && selB);
          renderList("a", document.getElementById("cmp-search-a").value);
          renderList("b", document.getElementById("cmp-search-b").value);
        });
      });
    }

    function doCompare() {
      if (!selA || !selB) return;
      var detailsA = selA.details || [];
      var detailsB = selB.details || [];
      var byMatch = {};
      detailsA.forEach(function (d) {
        if (d.match && d.match.id) byMatch[d.match.id] = { a: d, match: d.match };
      });
      detailsB.forEach(function (d) {
        if (d.match && d.match.id) {
          byMatch[d.match.id] = byMatch[d.match.id] || { match: d.match };
          byMatch[d.match.id].b = d;
        }
      });

      var rows = Object.keys(byMatch)
        .map(function (k) {
          return byMatch[k];
        })
        .sort(function (x, y) {
          return (x.match.match_no || 0) - (y.match.match_no || 0);
        });

      var same = 0;
      var diff = 0;
      var bothOk = 0;

      var html =
        '<div class="cmp-summary">' +
        '<div class="cmp-person"><strong>' +
        escape(selA.displayName) +
        "</strong><span>" +
        (isGoleo ? selA.goalPred : selA.aciertos) +
        (isGoleo ? " goles" : " aciertos") +
        "</span></div>" +
        '<div class="cmp-vs">VS</div>' +
        '<div class="cmp-person"><strong>' +
        escape(selB.displayName) +
        "</strong><span>" +
        (isGoleo ? selB.goalPred : selB.aciertos) +
        (isGoleo ? " goles" : " aciertos") +
        "</span></div></div>" +
        '<div class="cmp-table">';

      rows.forEach(function (row) {
        var a = row.a;
        var b = row.b;
        var pickA = a ? pickLabel(a.pick) : "—";
        var pickB = b ? pickLabel(b.pick) : "—";
        var equal = a && b && String(a.pick) === String(b.pick);
        if (equal) same++;
        else if (a && b) diff++;
        if (a && b && a.correct && b.correct) bothOk++;

        var real =
          a && a.result != null
            ? pickLabel(a.result)
            : b && b.result != null
            ? pickLabel(b.result)
            : "—";

        html +=
          '<div class="cmp-row' +
          (equal ? " same" : " diff") +
          '">' +
          '<div class="cmp-match">P' +
          (row.match.match_no || "") +
          " · " +
          escape((row.match.home_team || "").slice(0, 8)) +
          " vs " +
          escape((row.match.away_team || "").slice(0, 8)) +
          "</div>" +
          '<div class="cmp-picks">' +
          '<span class="' +
          (a && a.correct ? "ok" : a && a.result != null ? "no" : "") +
          '">' +
          pickA +
          "</span>" +
          '<span class="cmp-real">' +
          real +
          "</span>" +
          '<span class="' +
          (b && b.correct ? "ok" : b && b.result != null ? "no" : "") +
          '">' +
          pickB +
          "</span></div></div>";
      });

      html +=
        "</div>" +
        '<div class="cmp-footer">Iguales: <strong>' +
        same +
        "</strong> · Diferentes: <strong>" +
        diff +
        "</strong> · Ambos acertaron: <strong>" +
        bothOk +
        "</strong></div>";

      document.getElementById("cmp-result").innerHTML = html;
    }

    renderList("a", "");
    renderList("b", "");

    document.getElementById("cmp-search-a").addEventListener("input", function (e) {
      renderList("a", e.target.value);
    });
    document.getElementById("cmp-search-b").addEventListener("input", function (e) {
      renderList("b", e.target.value);
    });
    document.getElementById("cmp-go").addEventListener("click", doCompare);
    document.getElementById("cmp-close").onclick = function () {
      modal.remove();
    };
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.remove();
    });

    // Preseleccionar mi boleta en A si existe
    var mine = QA.myBoleta && QA.myBoleta.findInLeaderboard(meta.id, lb);
    if (mine) {
      selA = mine;
      document.getElementById("cmp-sel-a").textContent = mine.displayName;
    }
  },
};
