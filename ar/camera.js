const statusLine = document.getElementById('status');
const startButton = document.getElementById('start');
const pauseButton = document.getElementById('pause');
const cameraFrame = document.getElementById('camera-frame');

function enableCameraZoom(track) {
  const range = track?.getCapabilities?.().zoom;
  const current = track?.getSettings?.().zoom;
  if (!range || !Number.isFinite(current) || range.max <= range.min) return;

  const slider = document.getElementById('zoom');
  const value = document.getElementById('zoom-value');
  const message = document.getElementById('zoom-message');
  slider.min = range.min;
  slider.max = range.max;
  slider.step = range.step > 0 ? range.step : 'any';

  function showZoom() {
    const zoom = track.getSettings().zoom;
    slider.value = zoom;
    value.value = `${Number(zoom.toFixed(2))}×`;
  }

  showZoom();
  document.getElementById('camera-zoom').hidden = false;
  slider.addEventListener('change', async () => {
    slider.disabled = true;
    message.textContent = '';
    const zoom = Number(slider.value);
    const constraints = track.getConstraints();
    try {
      await track.applyConstraints({
        ...constraints,
        advanced: [...(constraints.advanced ?? []).map(({ zoom, ...rest }) => rest), { zoom }],
      });
      if (Math.abs(track.getSettings().zoom - zoom) > 0.01) {
        message.textContent = 'This camera could not apply the selected zoom.';
      }
    } catch {
      message.textContent = 'This camera could not apply the selected zoom.';
    } finally {
      showZoom();
      slider.disabled = false;
    }
  });
}

if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
  statusLine.textContent = 'Open this page over HTTPS or on localhost to use the camera.';
} else if (!window.AFRAME || !window.MINDAR?.IMAGE) {
  statusLine.textContent = 'The AR viewer could not load. Reload the page to try again.';
} else {
  const scene = document.createElement('a-scene');
  scene.setAttribute('embedded', '');
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
  function fitCameraFrame() {
    const system = scene.systems['mindar-image-system'];
    const { videoWidth, videoHeight } = system.video;
    cameraFrame.style.setProperty('--camera-aspect', videoWidth / videoHeight);
    scene.resize();
    // MindAR uses this same frame to size the video and project the 3D model.
    system._resize();
  }

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
    const video = scene.systems['mindar-image-system'].video;
    fitCameraFrame();
    video.addEventListener('resize', fitCameraFrame);
    document.body.classList.add('camera-on');
    statusLine.textContent = 'Point your camera at the whole figure.';
    startButton.hidden = true;
    pauseButton.hidden = false;
    enableCameraZoom(video.srcObject?.getVideoTracks()[0]);
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
  cameraFrame.append(scene);
}
