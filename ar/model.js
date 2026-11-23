(() => {
  const T = window.AFRAME?.THREE || window.THREE;
  const length = 6;
  const depth = 2.3;
  const thickness = .46;
  const profileWidth = 1.04;

  function fluxAt(x) {
    const position = T.MathUtils.clamp(x, 0, 1) * (PROFILE.j.length - 1);
    const left = Math.min(Math.floor(position), PROFILE.j.length - 2);
    return T.MathUtils.clamp(T.MathUtils.lerp(PROFILE.j[left], PROFILE.j[left + 1], position - left) / PROFILE.max, 0, 1);
  }

  function canvasLayer(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext('2d');
  }

  function textureFrom(ctx, color = true) {
    const texture = new T.CanvasTexture(ctx.canvas);
    if (color) texture.colorSpace = T.SRGBColorSpace;
    return texture;
  }

  function randomSequence(seed) {
    return () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function ceramicMaterial(rgb, seed) {
    const random = randomSequence(seed);
    const size = 512;
    const albedo = canvasLayer(size, size);
    const relief = canvasLayer(size, size);
    const image = albedo.createImageData(size, size);
    const coarse = Array.from({ length: 81 }, () => random());
    for (let y = 0; y < size; y++) {
      const row = y / 64, iy = Math.floor(row);
      for (let x = 0; x < size; x++) {
        const column = x / 64, ix = Math.floor(column);
        const a = iy * 9 + ix;
        const top = T.MathUtils.lerp(coarse[a], coarse[a + 1], column - ix);
        const bottom = T.MathUtils.lerp(coarse[a + 9], coarse[a + 10], column - ix);
        const shade = (T.MathUtils.lerp(top, bottom, row - iy) - .5) * 22 + (random() - .5) * 21;
        const i = 4 * (y * size + x);
        image.data[i] = rgb[0] + shade;
        image.data[i + 1] = rgb[1] + shade;
        image.data[i + 2] = rgb[2] + shade;
        image.data[i + 3] = 255;
      }
    }
    albedo.putImageData(image, 0, 0);
    relief.fillStyle = '#b7b7b7';
    relief.fillRect(0, 0, size, size);

    // Uneven pits and grains create the visible structure of the cut surface.
    for (let i = 0; i < 4200; i++) {
      const radius = .65 + 9.3 * random() ** 3.15;
      const x = 10 + (size - 20) * random(), y = 10 + (size - 20) * random();
      const flatten = .55 + .42 * random(), angle = random() * Math.PI;
      if (i % 8 === 0) {
        albedo.fillStyle = 'rgba(242,224,192,.21)';
        albedo.beginPath();
        albedo.ellipse(x, y, radius, radius * flatten, angle, 0, Math.PI * 2);
        albedo.fill();
        continue;
      }
      for (const ctx of [albedo, relief]) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(1, flatten);
        const pit = ctx.createRadialGradient(-radius * .17, -radius * .23, 0, 0, 0, radius);
        if (ctx === albedo) {
          pit.addColorStop(0, 'rgba(13,23,22,.80)');
          pit.addColorStop(.57, 'rgba(20,25,24,.64)');
          pit.addColorStop(.83, 'rgba(57,43,34,.28)');
          pit.addColorStop(.93, 'rgba(242,217,180,.18)');
          pit.addColorStop(1, 'rgba(230,219,208,0)');
        } else {
          pit.addColorStop(0, '#282828');
          pit.addColorStop(.68, '#626262');
          pit.addColorStop(.91, '#c2c2c2');
          pit.addColorStop(1, '#b7b7b7');
        }
        ctx.fillStyle = pit;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    const map = textureFrom(albedo);
    const bumpMap = textureFrom(relief, false);
    for (const texture of [map, bumpMap]) {
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.anisotropy = 4;
    }
    return new T.MeshStandardMaterial({ map, bumpMap, bumpScale: .012, roughness: .96 });
  }

  function roundedSlab(width, height, breadth) {
    const segments = 7, radius = .046;
    const geometry = new T.BoxGeometry(1, 1, 1, segments, segments, segments);
    const { position, normal, uv } = geometry.attributes;
    const point = new T.Vector3(), roundedNormal = new T.Vector3();
    const flat = new T.Vector3(width / 2 - radius, height / 2 - radius, breadth / 2 - radius);
    const halfStep = .5 / segments;
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i);
      const sx = Math.sign(point.x), sy = Math.sign(point.y), sz = Math.sign(point.z);
      roundedNormal.set(point.x - sx * halfStep, point.y - sy * halfStep, point.z - sz * halfStep).normalize();
      const x = sx * flat.x + radius * roundedNormal.x;
      const y = sy * flat.y + radius * roundedNormal.y;
      const z = sz * flat.z + radius * roundedNormal.z;
      // Map the pores in physical units so the slab's cut faces use the same grain.
      const u = Math.abs(normal.getX(i)) > .5 ? z : x;
      const v = Math.abs(normal.getY(i)) > .5 ? z : y;
      uv.setXY(i, u / 1.28 + .5, v / 1.28 + .5);
      position.setXYZ(i, x, y, z);
      normal.setXYZ(i, roundedNormal.x, roundedNormal.y, roundedNormal.z);
    }
    geometry.clearGroups();
    return geometry;
  }

  function intensityMap() {
    const width = 512, height = 64;
    const ctx = canvasLayer(width, height);
    const image = ctx.createImageData(width, height);
    const blue = new T.Color('#367ba0'), cyan = new T.Color('#73d8d3'), gold = new T.Color('#ffdda2');
    const color = new T.Color();
    const rgb = {};
    for (let x = 0; x < width; x++) {
      const flux = fluxAt(x / (width - 1));
      if (flux <= .66) color.copy(blue).lerp(cyan, flux / .66);
      else color.copy(cyan).lerp(gold, ((flux - .66) / .34) ** 1.3);
      color.getRGB(rgb, T.SRGBColorSpace);
      for (let y = 0; y < height; y++) {
        const crossFade = Math.sin(Math.PI * y / (height - 1)) ** 1.45;
        const i = 4 * (y * width + x);
        image.data[i] = 255 * rgb.r;
        image.data[i + 1] = 255 * rgb.g;
        image.data[i + 2] = 255 * rgb.b;
        image.data[i + 3] = 255 * crossFade * (.13 + .47 * flux);
      }
    }
    ctx.putImageData(image, 0, 0);
    return textureFrom(ctx);
  }

  function streakTexture() {
    const ctx = canvasLayer(256, 48);
    const aura = ctx.createRadialGradient(172, 24, 0, 172, 24, 96);
    aura.addColorStop(0, 'rgba(206,248,242,.48)');
    aura.addColorStop(1, 'rgba(206,248,242,0)');
    ctx.save();
    ctx.translate(0, 24);
    ctx.scale(1, .17);
    ctx.translate(0, -24);
    ctx.fillStyle = aura;
    ctx.fillRect(0, -74, 256, 196);
    ctx.restore();

    const line = ctx.createLinearGradient(7, 0, 239, 0);
    line.addColorStop(0, 'rgba(176,241,233,0)');
    line.addColorStop(.7, 'rgba(209,249,242,.8)');
    line.addColorStop(1, '#fff0c7');
    ctx.fillStyle = line;
    ctx.fillRect(7, 22, 222, 4);
    ctx.beginPath();
    ctx.moveTo(230, 24);
    ctx.lineTo(200, 11);
    ctx.lineTo(206, 24);
    ctx.lineTo(200, 37);
    ctx.closePath();
    ctx.fill();
    return textureFrom(ctx);
  }

  function plotLabel(text) {
    const ctx = canvasLayer(256, 112);
    ctx.font = 'italic 78px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#233839';
    ctx.fillStyle = '#fff5de';
    ctx.strokeText(text, 128, 59);
    ctx.fillText(text, 128, 59);
    const label = new T.Sprite(new T.SpriteMaterial({ map: textureFrom(ctx), depthWrite: false, toneMapped: false }));
    label.scale.set(.61, .267, 1);
    return label;
  }

  const pointOnProfile = (i, z) => new T.Vector3(length * PROFILE.x[i] - length / 2, .15 + 1.65 * PROFILE.u[i], z);

  const placement = {
    scale: [.133333, .136364, .15],
    position: [.02, -.062455, .1725]
  };

  function createModel() {
    const group = new T.Group();
    const streaks = [];
    let elapsed = 0;

    const add = (geometry, material, x = 0, y = 0, z = 0) => {
      const mesh = new T.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };
    const slab = roundedSlab(length / 2, thickness, depth);
    add(slab, ceramicMaterial([165, 110, 88], 12317), -length / 4, -thickness / 2);
    add(slab, ceramicMaterial([76, 105, 97], 48311), length / 4, -thickness / 2);

    const map = add(new T.PlaneGeometry(length - .08, depth - .10), new T.MeshBasicMaterial({
      map: intensityMap(), transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false
    }), 0, .012);
    map.rotation.x = -Math.PI / 2;
    map.renderOrder = 1;

    const ivory = new T.MeshBasicMaterial({ color: '#fff2d7', toneMapped: false });
    const contour = new T.MeshBasicMaterial({ color: '#344949', side: T.BackSide, toneMapped: false });
    const links = new T.MeshBasicMaterial({ color: '#a6aaa0', transparent: true, opacity: .59, depthWrite: false, toneMapped: false });
    const last = PROFILE.x.length - 1;
    for (let row = 0; row < 6; row++) {
      const z = profileWidth * (1 - 2 * row / 5);
      const curve = new T.CatmullRomCurve3(PROFILE.x.map((_, index) => pointOnProfile(index, z)));
      const radius = row === 0 ? .020 : .013;
      add(new T.TubeGeometry(curve, 112, radius, 6, false), ivory);
      add(new T.TubeGeometry(curve, 112, radius * 1.38, 6, false), contour);
    }
    for (const fraction of [.14, .38, .63, .89]) {
      const index = Math.round(last * fraction);
      const line = new T.LineCurve3(pointOnProfile(index, -profileWidth), pointOnProfile(index, profileWidth));
      add(new T.TubeGeometry(line, 1, .009, 5, false), links);
    }

    const profileLabel = plotLabel('u(x)');
    profileLabel.position.copy(pointOnProfile(Math.round(last * .31), -.6));
    profileLabel.position.y += .25;
    group.add(profileLabel);
    const fluxLabel = plotLabel('J(x)');
    fluxLabel.position.set(1.04, .16, .92);
    group.add(fluxLabel);

    const streak = new T.PlaneGeometry(.77, .177);
    const streakMap = streakTexture();
    for (let lane = 0; lane < 3; lane++) {
      for (let i = 0; i < 4; i++) {
        const material = new T.MeshBasicMaterial({
          map: streakMap, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false
        });
        const mesh = add(streak, material, 0, .032, -.53 + lane * .53);
        mesh.rotation.x = -Math.PI / 2;
        mesh.renderOrder = 2;
        streaks.push({ mesh, phase: (i + lane * .28) / 4 });
      }
    }
    function drawStreaks() {
      for (const { mesh, phase } of streaks) {
        const x = (elapsed / 7 + phase) % 1;
        mesh.position.x = (length - .62) * (x - .5);
        mesh.material.opacity = Math.sin(Math.PI * x) ** .65 * (.34 + .66 * fluxAt(x));
      }
    }

    function advance(deltaSeconds) {
      elapsed += Math.min(deltaSeconds, .1);
      drawStreaks();
    }

    function dispose() {
      const resources = new Set();
      group.traverse(({ geometry, material }) => {
        if (geometry) resources.add(geometry);
        if (material) {
          resources.add(material);
          if (material.map) resources.add(material.map);
          if (material.bumpMap) resources.add(material.bumpMap);
        }
      });
      for (const resource of resources) resource.dispose();
    }

    drawStreaks();
    return { group, advance, dispose };
  }

  function connectPauseButton(button) {
    let paused = false;
    const toggle = () => {
      paused = !paused;
      button.textContent = paused ? 'Resume animation' : 'Pause animation';
    };
    button?.addEventListener('click', toggle);
    return {
      isPaused: () => paused,
      dispose: () => button?.removeEventListener('click', toggle)
    };
  }

  window.FlowScene = { createModel, connectPauseButton, placement };

  window.AFRAME?.registerComponent('flux-model', {
    init() {
      this.model = createModel();
      this.el.setObject3D('mesh', this.model.group);
      this.pause = connectPauseButton(document.getElementById('pause'));
    },

    tick(time, delta) {
      if (this.pause.isPaused() || !this.el.parentEl.object3D.visible || !delta) return;
      this.model.advance(delta / 1000);
    },

    remove() {
      this.pause.dispose();
      this.model.dispose();
      this.el.removeObject3D('mesh');
    }
  });
})();
