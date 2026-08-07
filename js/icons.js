/* Premium SVG icons (stroke, 24px viewBox) */
window.QA = window.QA || {};
QA.icons = (function () {
  function svg(path, extra) {
    return (
      '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
      (extra || "") +
      ">" +
      path +
      "</svg>"
    );
  }
  return {
    home: svg(
      '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9"/>'
    ),
    calendar: svg(
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>'
    ),
    scroll: svg(
      '<path d="M8 4h9a2 2 0 0 1 2 2v13a1 1 0 0 1-1.5.85L15 18l-2.5 1.85A1 1 0 0 1 11 19V6a2 2 0 0 0-2-2H5"/><path d="M5 4v14"/>'
    ),
    trophy: svg(
      '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H5a2 2 0 0 0 2 4M17 6h2a2 2 0 0 1-2 4"/>'
    ),
    table: svg(
      '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>'
    ),
    ball: svg(
      '<circle cx="12" cy="12" r="9"/><path d="M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9z"/><path d="M3.5 9.5h17M3.5 14.5h17"/>'
    ),
    arrowLeft: svg('<path d="M19 12H5M11 18l-6-6 6-6"/>'),
    arrowRight: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    palette: svg(
      '<circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/><path d="M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 0-5H14a3 3 0 0 1 0-6h.5"/>'
    ),
    alert: svg(
      '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'
    ),
    crown: svg(
      '<path d="M3 17h18l-1.5-9-4.5 3.5L12 5l-3 6.5L4.5 8 3 17z"/><path d="M5 17h14v2H5z"/>'
    ),
    live: svg('<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/>'),
    handshake: svg(
      '<path d="M8 13l3 3 6-6"/><path d="M3 11l3-3a2 2 0 0 1 3 0l1 1"/><path d="M21 11l-3-3a2 2 0 0 0-3 0l-1 1"/><path d="M12 15l-2 2a2 2 0 0 1-3 0l-1-1"/><path d="M12 15l2 2a2 2 0 0 0 3 0l1-1"/>'
    ),
    medal: svg(
      '<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 21l5-2 5 2-1.5-7.5"/><path d="M12 7v2"/>'
    ),
    seed: svg(
      '<path d="M12 22c4-4 6-8 6-12a6 6 0 0 0-12 0c0 4 2 8 6 12z"/><path d="M12 10v8"/>'
    ),
    bell: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 18a2 2 0 0 0 4 0"/>'),
    plane: svg('<path d="M10 17l-4 4v-6l9-7 2 2-7 9z"/><path d="M14.5 6.5L18 3l3 3-3.5 3.5"/>'),
    refresh: svg(
      '<path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/>'
    ),
    rules: svg(
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
      + '<path d="M14 2v6h6"/>'
      + '<path d="M8 13h8M8 17h8M8 9h2"/>'
    ),
  };
})();
