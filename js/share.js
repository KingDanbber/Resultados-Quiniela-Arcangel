/* Compartir resultado como imagen */
window.QA = window.QA || {};

QA.share = {
  async card(opts) {
    opts = opts || {};
    var w = 1080;
    var h = 1920;
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");

    // fondo
    var grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#0a1220");
    grd.addColorStop(0.5, "#0f1c33");
    grd.addColorStop(1, "#06090f");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // acento superior
    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(0, 0, w, 12);

    // título app
    ctx.fillStyle = "#93c5fd";
    ctx.font = "700 36px Barlow Condensed, sans-serif";
    ctx.fillText("QUINIELA ARCÁNGEL", 64, 100);
    ctx.fillStyle = "#f59e0b";
    ctx.font = "800 28px Barlow Condensed, sans-serif";
    ctx.fillText("PASIÓN X GANAR", 64, 140);

    // jornada
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "700 64px Bebas Neue, sans-serif";
    ctx.fillText(String(opts.title || "Jornada").toUpperCase(), 64, 260);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 32px Barlow Condensed, sans-serif";
    ctx.fillText(String(opts.subtitle || ""), 64, 310);

    var y = 380;

    if (opts.mode === "mine" && opts.me) {
      ctx.fillStyle = "rgba(37,99,235,0.2)";
      roundRect(ctx, 48, y, w - 96, 280, 28);
      ctx.fill();
      ctx.strokeStyle = "rgba(37,99,235,0.5)";
      ctx.lineWidth = 2;
      roundRect(ctx, 48, y, w - 96, 280, 28);
      ctx.stroke();

      ctx.fillStyle = "#60a5fa";
      ctx.font = "800 28px Barlow Condensed, sans-serif";
      ctx.fillText("MI BOLETA", 80, y + 50);

      ctx.fillStyle = "#fff";
      ctx.font = "700 52px Bebas Neue, sans-serif";
      ctx.fillText(String(opts.me.name || ""), 80, y + 120);

      ctx.fillStyle = "#f59e0b";
      ctx.font = "700 72px Bebas Neue, sans-serif";
      var scoreLabel = opts.isGoleo ? "GOLES" : "ACIERTOS";
      ctx.fillText(
        String(opts.me.score != null ? opts.me.score : "—") + " " + scoreLabel,
        80,
        y + 210
      );
      if (opts.me.rank) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "700 32px Barlow Condensed, sans-serif";
        ctx.fillText("Posición #" + opts.me.rank, 80, y + 255);
      }
      y += 320;
    }

    // podio / tops
    var tops = opts.tops || [];
    if (tops.length) {
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "700 36px Bebas Neue, sans-serif";
      ctx.fillText(opts.jornadaDone ? "PODIO" : "CLASIFICACIÓN", 64, y);
      y += 30;
      tops.slice(0, 5).forEach(function (t, i) {
        y += 100;
        ctx.fillStyle = i === 0 ? "rgba(245,158,11,0.15)" : "rgba(15,23,42,0.6)";
        roundRect(ctx, 48, y - 60, w - 96, 88, 20);
        ctx.fill();
        ctx.fillStyle = i === 0 ? "#f59e0b" : "#94a3b8";
        ctx.font = "700 40px Bebas Neue, sans-serif";
        ctx.fillText(String(i + 1), 80, y);
        ctx.fillStyle = "#f1f5f9";
        ctx.font = "700 36px Barlow Condensed, sans-serif";
        ctx.fillText(String(t.name || "").slice(0, 28), 160, y);
        ctx.fillStyle = "#60a5fa";
        ctx.font = "700 40px Bebas Neue, sans-serif";
        ctx.fillText(String(t.score != null ? t.score : "—"), w - 140, y);
      });
      y += 60;
    }

    if (opts.bolsa != null) {
      y += 40;
      ctx.fillStyle = "rgba(34,197,94,0.12)";
      roundRect(ctx, 48, y, w - 96, 120, 24);
      ctx.fill();
      ctx.fillStyle = "#86efac";
      ctx.font = "800 28px Barlow Condensed, sans-serif";
      ctx.fillText("BOLSA", 80, y + 45);
      ctx.fillStyle = "#4ade80";
      ctx.font = "700 56px Bebas Neue, sans-serif";
      ctx.fillText(String(opts.bolsa), 80, y + 100);
    }

    // footer
    ctx.fillStyle = "#64748b";
    ctx.font = "600 26px Barlow Condensed, sans-serif";
    ctx.fillText("quiniela-arcangel · público", 64, h - 60);

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    return canvas;
  },

  async shareCanvas(canvas, filename) {
    filename = filename || "quiniela-arcangel.png";
    return new Promise(function (resolve) {
      canvas.toBlob(async function (blob) {
        if (!blob) {
          resolve(false);
          return;
        }
        var file = new File([blob], filename, { type: "image/png" });
        try {
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "Quiniela Arcángel",
              text: "Resultados Quiniela Arcángel ⚽",
            });
            resolve(true);
            return;
          }
        } catch (_) {}
        // fallback download
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 2000);
        resolve(true);
      }, "image/png");
    });
  },

  async shareJornada(data, mode) {
    var meta = data.meta || {};
    var lb = data.leaderboard || [];
    var isGoleo = !!data.isGoleo;
    var me = null;
    var mine = QA.myBoleta.findInLeaderboard(meta.id, lb);
    if (mine) {
      var rank = lb.findIndex(function (p) {
        return p.id === mine.id;
      }) + 1;
      me = {
        name: mine.displayName,
        score: isGoleo ? mine.goalPred : mine.aciertos,
        rank: rank,
      };
    }
    var tops = lb.slice(0, 5).map(function (p) {
      return {
        name: p.displayName,
        score: isGoleo ? p.goalPred : p.aciertos,
      };
    });
    var bolsa = null;
    try {
      if (data.bolsaNeta != null) bolsa = QA.utils.money(data.bolsaNeta);
      else if (data.bolsaBruta != null) bolsa = QA.utils.money(data.bolsaBruta);
    } catch (_) {}

    var canvas = await this.card({
      title: meta.nombre || "Jornada",
      subtitle:
        (meta.competencia || "") +
        (meta.season ? " · " + meta.season : "") +
        (meta.modeLabel ? " · " + meta.modeLabel : ""),
      mode: mode || (mine ? "mine" : "podio"),
      me: me,
      tops: tops,
      isGoleo: isGoleo,
      jornadaDone: !!data.jornadaDone,
      bolsa: bolsa,
    });
    var safe = String(meta.nombre || "jornada").replace(/\s+/g, "-").toLowerCase();
    return this.shareCanvas(canvas, "arcangel-" + safe + ".png");
  },
};
