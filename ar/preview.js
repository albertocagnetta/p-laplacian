(() => {
  const message = document.querySelector('#status');
  try {
    const T = window.THREE;
    const scene = new T.Scene();
    const model = FlowScene.createModel();
    model.group.scale.set(...FlowScene.placement.scale);
    model.group.position.set(...FlowScene.placement.position);
    scene.add(model.group, OrbitViewer.makePoster('target.png', 1120 / 1600, .72));

    const ambient = new T.AmbientLight(0xffffff, 1.3);
    const key = new T.DirectionalLight(0xffffff, 1);
    key.position.set(1, 4, 3);
    scene.add(ambient, key);

    const pause = FlowScene.connectPauseButton(document.querySelector('#pause'));
    OrbitViewer.mount({
      stage: document.querySelector('#stage'),
      scene,
      label: 'Rotatable model of the flow and concentration profile in front of the upright poster figure',
      center: new T.Vector3(.01, 0, .12),
      initialAzimuth: -.48,
      initialElevation: .45,
      minimumHeight: .47,
      advance: delta => { if (!pause.isPaused()) model.advance(delta); },
      resetButton: document.querySelector('#reset-view')
    });
    message.textContent = 'Drag to rotate';
  } catch (error) {
    message.textContent = 'The 3D preview could not start. Check that WebGL is enabled in your browser.';
    console.error(error);
  }
})();
