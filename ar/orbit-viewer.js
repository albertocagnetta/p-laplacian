window.OrbitViewer = (() => {
  const T = window.THREE;

  function makePoster(imageUrl, aspect, opacity) {
    const texture = new T.TextureLoader().load(imageUrl);
    texture.colorSpace = T.SRGBColorSpace;
    return new T.Mesh(
      new T.PlaneGeometry(1, aspect),
      new T.MeshBasicMaterial({ map: texture, transparent: true, opacity, side: T.FrontSide, toneMapped: false })
    );
  }

  function mount({ stage, scene, label, center, initialAzimuth, initialElevation, minimumHeight = .43, advance, resetButton }) {
    const renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0, 0);
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-label', label);
    stage.prepend(canvas);

    const camera = new T.OrthographicCamera(-1, 1, 1, -1, .01, 10);
    let azimuth = initialAzimuth;
    let elevation = initialElevation;
    let zoom = 1;

    function frame() {
      const aspect = stage.clientWidth / stage.clientHeight;
      const vertical = Math.max(minimumHeight, .58 / aspect) / zoom;
      camera.left = -vertical * aspect;
      camera.right = vertical * aspect;
      camera.top = vertical;
      camera.bottom = -vertical;
      camera.position.set(
        2 * Math.sin(azimuth) * Math.cos(elevation),
        2 * Math.sin(elevation),
        2 * Math.cos(azimuth) * Math.cos(elevation)
      ).add(center);
      camera.lookAt(center);
      camera.updateProjectionMatrix();
    }
    function resize() {
      renderer.setSize(stage.clientWidth, stage.clientHeight);
      frame();
    }
    new ResizeObserver(resize).observe(stage);
    resize();

    let drag;
    canvas.addEventListener('pointerdown', event => {
      if (drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (event.pointerId !== drag?.id) return;
      azimuth -= (event.clientX - drag.x) * .009;
      elevation = T.MathUtils.clamp(elevation + (event.clientY - drag.y) * .008, -.65, 1.45);
      drag.x = event.clientX;
      drag.y = event.clientY;
      frame();
    });
    canvas.addEventListener('lostpointercapture', event => {
      if (event.pointerId === drag?.id) drag = null;
    });
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      zoom = T.MathUtils.clamp(zoom * Math.exp(-.001 * event.deltaY), .7, 1.8);
      frame();
    }, { passive: false });
    resetButton.addEventListener('click', () => {
      azimuth = initialAzimuth;
      elevation = initialElevation;
      zoom = 1;
      frame();
    });

    const clock = new T.Clock();
    renderer.setAnimationLoop(() => {
      advance(clock.getDelta());
      renderer.render(scene, camera);
    });
  }

  return { mount, makePoster };
})();
