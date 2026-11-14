const statusLine = document.getElementById('status');
const startButton = document.getElementById('start');
const pauseButton = document.getElementById('pause');

if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
  statusLine.textContent = 'Open this page over HTTPS or on localhost to use the camera.';
} else if (!window.AFRAME || !window.MINDAR?.IMAGE) {
  statusLine.textContent = 'The AR viewer could not load. Reload the page to try again.';
} else {
  const scene = document.createElement('a-scene');
  scene.setAttribute('vr-mode-ui', 'enabled: false');
  scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
  scene.setAttribute('renderer', 'colorManagement: true; antialias: true');
  scene.setAttribute('mindar-image', 'imageTargetSrc: targets.mind; autoStart: false; uiScanning: no; uiLoading: no; uiError: no');
  scene.innerHTML = `
    <a-camera position="0 0 0" look-controls="enabled: false" wasd-controls="enabled: false"></a-camera>
    <a-entity id="anchor" mindar-image-target="targetIndex: 0">
      <a-entity flux-model scale=".133333 .136364 .15" position=".02 -.062455 .1725"></a-entity>
    </a-entity>
    <a-entity light="type: ambient; intensity: 1.3"></a-entity>
    <a-entity light="type: directional; intensity: 1" position="1 4 3"></a-entity>
  `;
  const anchor = scene.querySelector('#anchor');
  let started = false;

  function cameraError() {
    statusLine.textContent = 'Camera unavailable. Check the camera permission and reload this page to try again.';
  }

  scene.addEventListener('loaded', () => { startButton.disabled = false; }, { once: true });
  startButton.addEventListener('click', async () => {
    startButton.disabled = true;
    statusLine.textContent = 'Starting camera…';
    started = true;
    try {
      await scene.systems['mindar-image-system'].start();
    } catch {
      cameraError();
    }
  });
  scene.addEventListener('arReady', () => {
    document.body.classList.add('camera-on');
    statusLine.textContent = 'Point your camera at the whole figure.';
    startButton.hidden = true;
    pauseButton.hidden = false;
  });
  scene.addEventListener('arError', cameraError);
  anchor.addEventListener('targetFound', () => {
    statusLine.textContent = 'Figure found. Move slightly to the side to see the model in depth.';
  });
  anchor.addEventListener('targetLost', () => {
    statusLine.textContent = 'Point your camera at the whole figure again.';
  });
  // Keep the camera active only while this page is in use.
  window.addEventListener('pagehide', () => {
    if (started) scene.systems['mindar-image-system'].video?.srcObject?.getTracks().forEach(track => track.stop());
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && started) window.location.reload();
  });
  document.body.append(scene);
}
