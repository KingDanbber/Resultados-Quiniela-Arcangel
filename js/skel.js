/* Skeleton loaders premium · compartidos */
window.QA = window.QA || {};

QA.skel = {
  shimmer: function (cls, style) {
    return (
      '<div class="skel-p-block ' +
      (cls || "") +
      '"' +
      (style ? ' style="' + style + '"' : "") +
      "></div>"
    );
  },

  page: function (kind) {
    kind = kind || "list";
    if (kind === "home") {
      return (
        '<div class="skel-premium">' +
        '<div class="skel-p-title" style="width:70%"></div>' +
        '<div class="skel-p-sub"></div>' +
        '<div class="skel-p-block" style="height:120px"></div>' +
        '<div class="skel-p-block" style="height:120px"></div>' +
        '<div class="skel-p-line w70"></div>' +
        '<div class="skel-p-grid"><div class="skel-p-card"></div><div class="skel-p-card"></div><div class="skel-p-card"></div><div class="skel-p-card"></div></div>' +
        "</div>"
      );
    }
    if (kind === "cards") {
      return (
        '<div class="skel-premium">' +
        '<div class="skel-p-title"></div>' +
        '<div class="skel-p-block"></div><div class="skel-p-block"></div><div class="skel-p-block short"></div>' +
        "</div>"
      );
    }
    if (kind === "table") {
      return (
        '<div class="skel-premium">' +
        '<div class="skel-p-title"></div>' +
        '<div class="skel-p-row"></div><div class="skel-p-row"></div><div class="skel-p-row"></div>' +
        '<div class="skel-p-row"></div><div class="skel-p-row"></div><div class="skel-p-row"></div>' +
        '<div class="skel-p-row"></div><div class="skel-p-row"></div>' +
        "</div>"
      );
    }
    if (kind === "stats") {
      return (
        '<div class="skel-premium">' +
        '<div class="skel-p-title"></div>' +
        '<div class="skel-p-grid">' +
        '<div class="skel-p-card"></div><div class="skel-p-card"></div>' +
        '<div class="skel-p-card"></div><div class="skel-p-card"></div>' +
        "</div>" +
        '<div class="skel-p-line"></div><div class="skel-p-row"></div><div class="skel-p-row"></div>' +
        "</div>"
      );
    }
    if (kind === "detalle") {
      return (
        '<div class="skel-premium">' +
        '<div class="skel-p-line w40"></div>' +
        '<div class="skel-p-title"></div>' +
        '<div class="skel-p-sub"></div>' +
        '<div class="skel-p-block" style="height:70px"></div>' +
        '<div class="skel-p-block" style="height:100px"></div>' +
        '<div class="skel-p-row"></div><div class="skel-p-row"></div><div class="skel-p-row"></div>' +
        "</div>"
      );
    }
    // list default
    return (
      '<div class="skel-premium">' +
      '<div class="skel-p-title"></div>' +
      '<div class="skel-p-row"></div><div class="skel-p-row"></div>' +
      '<div class="skel-p-row"></div><div class="skel-p-row"></div>' +
      '<div class="skel-p-row"></div><div class="skel-p-row"></div>' +
      "</div>"
    );
  },
};
