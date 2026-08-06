/* Trofeo 3D · Hall of Fame (Three.js lazy) */
window.QA = window.QA || {};
QA.trophy3d = (function () {
  var loaded = false;
  var loading = false;
  var cbs = [];
  var sceneState = null;

  function loadThree(cb) {
    if (loaded && window.THREE) {
      cb(window.THREE);
      return;
    }
    cbs.push(cb);
    if (loading) return;
    loading = true;
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = function () {
      loaded = true;
      loading = false;
      cbs.forEach(function (fn) {
        fn(window.THREE);
      });
      cbs = [];
    };
    s.onerror = function () {
      loading = false;
      console.warn("Three.js no cargó");
    };
    document.head.appendChild(s);
  }

  function dispose() {
    if (!sceneState) return;
    if (sceneState.animId) cancelAnimationFrame(sceneState.animId);
    if (sceneState.renderer) sceneState.renderer.dispose();
    sceneState = null;
  }

  function init(canvas) {
    if (!canvas) return;
    dispose();
    loadThree(function (THREE) {
      var W = Math.min(canvas.clientWidth || 300, 340);
      var H = 200;
      canvas.width = W;
      canvas.height = H;
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 50);
      camera.position.set(0, 0.3, 4.2);
      var renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0, 0);

      scene.add(new THREE.AmbientLight(0xffd700, 0.5));
      var d1 = new THREE.DirectionalLight(0xffe066, 1.4);
      d1.position.set(3, 5, 4);
      scene.add(d1);
      var d2 = new THREE.DirectionalLight(0xffaa00, 0.6);
      d2.position.set(-3, 2, -3);
      scene.add(d2);
      var pt = new THREE.PointLight(0xf59e0b, 2.5, 10);
      pt.position.set(0, 3, 2);
      scene.add(pt);

      var gold = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        metalness: 0.92,
        roughness: 0.08,
      });
      var group = new THREE.Group();
      var profile = [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.5, 0.08),
        new THREE.Vector2(0.65, 0.25),
        new THREE.Vector2(0.7, 0.5),
        new THREE.Vector2(0.65, 0.8),
        new THREE.Vector2(0.52, 1.0),
        new THREE.Vector2(0.38, 1.2),
        new THREE.Vector2(0.28, 1.4),
        new THREE.Vector2(0.22, 1.5),
        new THREE.Vector2(0.26, 1.58),
        new THREE.Vector2(0.55, 1.64),
        new THREE.Vector2(0.6, 1.7),
        new THREE.Vector2(0.55, 1.74),
        new THREE.Vector2(0.24, 1.78),
        new THREE.Vector2(0.18, 1.82),
      ];
      var cup = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), gold);
      cup.scale.set(0.58, 0.58, 0.58);
      cup.position.y = -0.85;
      group.add(cup);
      [-1, 1].forEach(function (s) {
        var h = new THREE.Mesh(
          new THREE.TorusGeometry(0.26, 0.055, 10, 24, Math.PI),
          gold
        );
        h.position.set(s * 0.38, 0.08, 0);
        h.rotation.z = (s * Math.PI) / 2;
        group.add(h);
      });
      var base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.42, 0.12, 32),
        gold
      );
      base.position.y = -1.05;
      group.add(base);
      scene.add(group);

      var dragging = false;
      var prevX = 0;
      canvas.addEventListener("pointerdown", function (e) {
        dragging = true;
        prevX = e.clientX;
      });
      window.addEventListener("pointerup", function () {
        dragging = false;
      });
      canvas.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        group.rotation.y += (e.clientX - prevX) * 0.01;
        prevX = e.clientX;
      });

      function animate() {
        sceneState.animId = requestAnimationFrame(animate);
        if (!dragging) group.rotation.y += 0.008;
        renderer.render(scene, camera);
      }
      sceneState = { renderer: renderer, animId: null };
      animate();
    });
  }

  return { init: init, dispose: dispose };
})();
