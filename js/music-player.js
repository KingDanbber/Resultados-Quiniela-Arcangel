/* Mini reproductor · lista + prev/next · localStorage */
window.QA = window.QA || {};

QA.music = (function () {
  var KEY = "qa_music_v1";
  var TRACKS = [
    {
      id: "sabado",
      title: "Sábado a las cuatro",
      artist: "Quiniela Arcángel",
      src: "audio/01%20S%C3%A1bado%20a%20las%20cuatro%20-%20Quiniela%20Arc%C3%A1ngel.mp3",
    },
    {
      id: "final-tally",
      title: "Final Tally",
      artist: "Quiniela Arcángel",
      src: "audio/02%20Final%20Tally.mp3",
    },
    {
      id: "whistle",
      title: "After The Final Whistle",
      artist: "Quiniela Arcángel",
      src: "audio/03%20After%20The%20Final%20Whistle.mp3",
    },
    {
      id: "drill",
      title: "Two Minute Drill",
      artist: "Quiniela Arcángel",
      src: "audio/04%20Two%20Minute%20Drill.mp3",
    }
  ];

  var audio = null;
  var index = 0;
  var expanded = false;
  var state = {
    volume: 0.28,
    muted: false,
    trackId: TRACKS[0].id,
  };

  function loadState() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (typeof s.volume === "number") state.volume = Math.min(1, Math.max(0, s.volume));
      if (typeof s.muted === "boolean") state.muted = s.muted;
      if (s.trackId) {
        var i = TRACKS.findIndex(function (t) {
          return t.id === s.trackId;
        });
        if (i >= 0) {
          index = i;
          state.trackId = s.trackId;
        }
      }
    } catch (_) {}
  }

  function saveState() {
    try {
      state.trackId = TRACKS[index].id;
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = "metadata";
    audio.loop = false;
    audio.volume = state.muted ? 0 : state.volume;
    audio.addEventListener("ended", function () {
      next(true);
    });
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("play", syncUI);
    audio.addEventListener("pause", syncUI);
    audio.addEventListener("error", function () {
      var el = document.getElementById("qm-error");
      if (el) {
        el.textContent = "No se pudo cargar el audio · revisa /audio/";
        el.hidden = false;
      }
    });
    return audio;
  }

  function current() {
    return TRACKS[index];
  }

  function setTrack(i, autoplay) {
    index = (i + TRACKS.length) % TRACKS.length;
    var t = current();
    var a = ensureAudio();
    var wasPlaying = autoplay || (!a.paused && a.src);
    a.src = t.src;
    a.load();
    a.volume = state.muted ? 0 : state.volume;
    saveState();
    renderList();
    syncUI();
    if (wasPlaying) {
      a.play().catch(function () {
        /* necesita gesto del usuario */
      });
    }
  }

  function play() {
    var a = ensureAudio();
    if (!a.src || a.src.indexOf(current().src.split("/").pop()) === -1) {
      setTrack(index, true);
      return;
    }
    a.volume = state.muted ? 0 : state.volume;
    a.play().catch(function () {});
    syncUI();
  }

  function pause() {
    if (audio) audio.pause();
    syncUI();
  }

  function toggle() {
    var a = ensureAudio();
    if (a.paused) play();
    else pause();
  }

  function next(fromEnded) {
    setTrack(index + 1, fromEnded || (audio && !audio.paused));
  }

  function prev() {
    var a = ensureAudio();
    if (a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    setTrack(index - 1, audio && !audio.paused);
  }

  function toggleMute() {
    state.muted = !state.muted;
    if (audio) audio.volume = state.muted ? 0 : state.volume;
    saveState();
    syncUI();
  }

  function setVolume(v) {
    state.volume = Math.min(1, Math.max(0, Number(v) || 0));
    if (state.volume > 0) state.muted = false;
    if (audio) audio.volume = state.muted ? 0 : state.volume;
    saveState();
    syncUI();
  }

  function updateProgress() {
    if (!audio) return;
    var fill = document.getElementById("qm-fill");
    var time = document.getElementById("qm-time");
    if (!fill) return;
    var p = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    fill.style.width = p + "%";
    if (time) {
      time.textContent =
        fmt(audio.currentTime) +
        " / " +
        (audio.duration && isFinite(audio.duration) ? fmt(audio.duration) : "—");
    }
  }

  function fmt(sec) {
    sec = Math.floor(sec || 0);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function syncUI() {
    var t = current();
    var title = document.getElementById("qm-title");
    var sub = document.getElementById("qm-sub");
    var playBtn = document.getElementById("qm-play");
    var muteBtn = document.getElementById("qm-mute");
    var vol = document.getElementById("qm-vol");
    var fab = document.getElementById("qm-fab");
    if (title) title.textContent = t.title;
    if (sub) sub.textContent = t.artist;
    var playing = audio && !audio.paused;
    if (playBtn) {
      playBtn.innerHTML = playing ? iconPause() : iconPlay();
      playBtn.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
    }
    if (muteBtn) {
      muteBtn.innerHTML = state.muted || state.volume === 0 ? iconMuted() : iconVol();
    }
    if (vol) vol.value = String(Math.round(state.volume * 100));
    if (fab) fab.classList.toggle("playing", !!playing);
    document.querySelectorAll(".qm-track").forEach(function (row, i) {
      row.classList.toggle("active", i === index);
      row.classList.toggle("playing", i === index && playing);
    });
  }

  function renderList() {
    var list = document.getElementById("qm-list");
    if (!list) return;
    list.innerHTML = TRACKS.map(function (t, i) {
      return (
        '<button type="button" class="qm-track' +
        (i === index ? " active" : "") +
        '" data-i="' +
        i +
        '">' +
        '<span class="qm-track-num">' +
        (i + 1) +
        "</span>" +
        '<span class="qm-track-meta"><span class="qm-track-title">' +
        escapeHtml(t.title) +
        '</span><span class="qm-track-artist">' +
        escapeHtml(t.artist) +
        "</span></span>" +
        '<span class="qm-track-eq" aria-hidden="true"></span>' +
        "</button>"
      );
    }).join("");
    list.querySelectorAll(".qm-track").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setTrack(Number(btn.getAttribute("data-i")), true);
      });
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function iconPlay() {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  }
  function iconPause() {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
  }
  function iconPrev() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>';
  }
  function iconNext() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>';
  }
  function iconVol() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.3-3.9v7.8A4.5 4.5 0 0 0 16.5 12z"/></svg>';
  }
  function iconMuted() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16.5 12a4.5 4.5 0 0 0-2.3-3.9v2.2l2.3 2.3V12zm3.5 0c0 .9-.2 1.8-.5 2.6l1.5 1.5c.6-1.3 1-2.7 1-4.1 0-3.3-1.8-6.1-4.5-7.5v2.2A5.5 5.5 0 0 1 20 12zM3 10v4h4l5 5V5L7 10H3zm13.1 7.1-1.4-1.4-1.2 1.2v.3l1.1 1.1 1.5-1.2zM4.3 3 3 4.3 7.7 9H3v4h4l5 5v-6.7l5.7 5.7 1.3-1.3L4.3 3z"/></svg>';
  }
  function iconMusic() {
    return '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>';
  }
  function iconClose() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"/></svg>';
  }

  function mount() {
    if (document.getElementById("qa-music")) return;
    loadState();

    var root = document.createElement("div");
    root.id = "qa-music";
    root.innerHTML =
      '<button type="button" id="qm-fab" class="qm-fab" title="Música" aria-label="Abrir reproductor">' +
      iconMusic() +
      "</button>" +
      '<div id="qm-panel" class="qm-panel" hidden>' +
      '<div class="qm-panel-head">' +
      '<div class="qm-now">' +
      '<div id="qm-title" class="qm-title">—</div>' +
      '<div id="qm-sub" class="qm-sub">—</div></div>' +
      '<button type="button" id="qm-collapse" class="qm-icon-btn" aria-label="Cerrar">' +
      iconClose() +
      "</button></div>" +
      '<div class="qm-progress" id="qm-progress"><div id="qm-fill" class="qm-fill"></div></div>' +
      '<div class="qm-time-row"><span id="qm-time">0:00 / —</span>' +
      '<span id="qm-error" class="qm-error" hidden></span></div>' +
      '<div class="qm-controls">' +
      '<button type="button" id="qm-prev" class="qm-icon-btn" aria-label="Anterior">' +
      iconPrev() +
      "</button>" +
      '<button type="button" id="qm-play" class="qm-play" aria-label="Reproducir">' +
      iconPlay() +
      "</button>" +
      '<button type="button" id="qm-next" class="qm-icon-btn" aria-label="Siguiente">' +
      iconNext() +
      "</button>" +
      '<button type="button" id="qm-mute" class="qm-icon-btn" aria-label="Silenciar">' +
      iconVol() +
      "</button>" +
      '<input type="range" id="qm-vol" class="qm-vol" min="0" max="100" value="28" aria-label="Volumen"/>' +
      "</div>" +
      '<div class="qm-list-label">Lista</div>' +
      '<div id="qm-list" class="qm-list"></div>' +
      "</div>";

    document.body.appendChild(root);

    document.getElementById("qm-fab").onclick = function () {
      expanded = !expanded;
      document.getElementById("qm-panel").hidden = !expanded;
      document.getElementById("qm-fab").classList.toggle("open", expanded);
    };
    document.getElementById("qm-collapse").onclick = function () {
      expanded = false;
      document.getElementById("qm-panel").hidden = true;
      document.getElementById("qm-fab").classList.remove("open");
    };
    document.getElementById("qm-play").onclick = toggle;
    document.getElementById("qm-prev").onclick = prev;
    document.getElementById("qm-next").onclick = function () {
      next(false);
    };
    document.getElementById("qm-mute").onclick = toggleMute;
    document.getElementById("qm-vol").oninput = function (e) {
      setVolume(Number(e.target.value) / 100);
    };
    document.getElementById("qm-progress").onclick = function (e) {
      var a = ensureAudio();
      if (!a.duration) return;
      var rect = e.currentTarget.getBoundingClientRect();
      var ratio = (e.clientX - rect.left) / rect.width;
      a.currentTime = Math.max(0, Math.min(1, ratio)) * a.duration;
    };

    // Preparar pista sin autoplay
    ensureAudio().src = current().src;
    renderList();
    syncUI();
  }

  return {
    init: mount,
    play: play,
    pause: pause,
    tracks: TRACKS,
  };
})();

document.addEventListener("DOMContentLoaded", function () {
  if (QA.music) QA.music.init();
});
