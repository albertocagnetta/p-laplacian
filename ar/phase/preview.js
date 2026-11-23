(async () => {
  const message = document.querySelector('#status');
  try {
    const response = await fetch('model/torri.json');
    if (!response.ok) throw new Error('The tower data could not be loaded.');
    const model = PhaseTowers.make(await response.json());
    const ui = PhaseUI(model, 1);
    const T = window.THREE;
    const scene = new T.Scene();
    scene.add(
      PhaseTowers.mountOnVerticalPoster(model.group),
      OrbitViewer.makePoster('assets/phase-target.png', 538 / 900, .60)
    );

    ui.reset();
    OrbitViewer.mount({
      stage: document.querySelector('#stage'),
      scene,
      label: 'Rotatable model of the two phase towers',
      center: new T.Vector3(-.015, 0, .12),
      initialAzimuth: .42,
      initialElevation: .37,
      advance: ui.advance,
      resetButton: document.querySelector('#reset-view')
    });
    message.textContent = 'Drag to rotate';
  } catch (error) {
    message.textContent = 'The 3D preview could not start. Check that WebGL is enabled in your browser.';
    console.error(error);
  }
})();
