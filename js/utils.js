/* ═══════════════════════════════════════════
   Utils · Helpers compartidos
   ═══════════════════════════════════════════ */

window.QA = window.QA || {};

QA.utils = {
  /** Formatea fecha relativa simple */
  timeAgo(date) {
    if (!date) return '—';
    const d = date instanceof Date ? date : new Date(date);
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return 'hace un momento';
    if (sec < 3600) return `hace ${Math.floor(sec / 60)} min`;
    if (sec < 86400) return `hace ${Math.floor(sec / 3600)} h`;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  },

  /** Escapa HTML básico */
  /** Dinero en MXN redondeado a enteros (sin centavos) */
  money(n) {
    if (n == null || isNaN(n)) return "—";
    // Truncar hacia abajo: 385.714 → $385 (sin redondear al alza)
    var v = Math.trunc(Number(n));
    return (
      "$" +
      v.toLocaleString("es-MX", {
        maximumFractionDigits: 0,
      })
    );
  },

  escape(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  },

  /** Query corta */
  $(sel, ctx = document) {
    return ctx.querySelector(sel);
  },
  $$(sel, ctx = document) {
    return Array.from(ctx.querySelectorAll(sel));
  },
};
