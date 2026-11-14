const T = AFRAME.THREE;
function fluxAt(x) {
  const position = Math.max(0, Math.min(1, x)) * (PROFILE.j.length - 1);
  const i = Math.min(Math.floor(position), PROFILE.j.length - 2);
  return (PROFILE.j[i] + (PROFILE.j[i + 1] - PROFILE.j[i]) * (position - i)) / PROFILE.max;
}
function fluxColor(value) {
  const colors = ['#315b9c', '#42d4cd', '#f9e57d'].map(c => new T.Color(c));
  return value < .5 ? colors[0].lerp(colors[1], value * 2) : colors[1].lerp(colors[2], value * 2 - 1);
}
function porousTexture(base, floor = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  for (let x = 0; x < canvas.width; x++) {
    ctx.fillStyle = floor ? '#' + fluxColor(fluxAt(x / 1023)).getHexString() : base;
    ctx.fillRect(x, 0, 1, 256);
  }
  let seed = 123456;
  function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
  for (let i = 0; i < 2600; i++) {
    const x = random() * 1024, y = random() * 256, r = .5 + random() * 3;
    ctx.fillStyle = 'rgba(15,20,30,0.30)';
    ctx.beginPath(); ctx.ellipse(x,y,r,r*.7,0,0,Math.PI*2); ctx.fill();
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}
AFRAME.registerComponent('flux-model', {
  init() {
    this.group = new T.Group(); this.el.setObject3D('mesh', this.group);
    this.clock = 0; this.paused = false; this.glows = [];
    const add = (geometry, material, position) => {
      const mesh = new T.Mesh(geometry, material);
      mesh.position.set(...position); this.group.add(mesh); return mesh;
    };
    ['#ce9388','#9b92d0'].forEach((color, i) => {
      add(new T.BoxGeometry(3,.35,2.3), new T.MeshStandardMaterial({map:porousTexture(color),roughness:1}), [i ? 1.5 : -1.5,-.175,0]);
    });
    const floor = add(new T.PlaneGeometry(6,2.3), new T.MeshBasicMaterial({map:porousTexture('',true),side:T.DoubleSide}), [0,.008,0]);
    floor.rotation.x = -Math.PI / 2;
    for (let row=0; row<7; row++) {
      const depth = -1.03 + row * 2.06 / 6;
      const points = PROFILE.x.map((x,i) => new T.Vector3(6*x-3,.15+1.65*PROFILE.u[i],depth));
      add(new T.TubeGeometry(new T.CatmullRomCurve3(points),240,row===0?.015:.009,6,false),new T.MeshBasicMaterial({color:'#fff4db'}),[0,0,0]);
    }
    const line = new T.BufferGeometry().setFromPoints([new T.Vector3(0,.024,-1.15),new T.Vector3(0,.024,1.15)]);
    this.group.add(new T.Line(line,new T.LineBasicMaterial({color:'#ffffff'})));
    const canvas = document.createElement('canvas'); canvas.width=128;canvas.height=32;
    const ctx=canvas.getContext('2d');const gradient=ctx.createRadialGradient(64,16,0,64,16,64);
    gradient.addColorStop(0,'rgba(255,255,225,1)');gradient.addColorStop(1,'rgba(255,255,225,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,128,32);
    const texture=new T.CanvasTexture(canvas);
    for(let row=0;row<5;row++) for(let k=0;k<4;k++) {
      const glow=add(new T.PlaneGeometry(.48,.10),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}),[0,.035,-.9+row*.45]);
      glow.rotation.x=-Math.PI/2;this.glows.push({mesh:glow,phase:k/4});
    }
    document.getElementById('pause').onclick=()=>{this.paused=!this.paused;document.getElementById('pause').textContent=this.paused?'Resume animation':'Pause animation';};
  },
  tick(time, dt) {
    if(!this.paused) this.clock += Math.min(dt,100)/1000;
    for(const glow of this.glows) {
      const x=(this.clock/7+glow.phase)%1;
      glow.mesh.position.x=6*x-3;
      glow.mesh.material.opacity=.95*fluxAt(x);
    }
  }
});
