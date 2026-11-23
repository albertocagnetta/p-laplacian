(async()=>{
  const stage=document.querySelector('#stage');
  const message=document.querySelector('#status');
  try {
    const data=window.PHASE_DATA || await fetch('model/torri.json').then(r=>{if(!r.ok)throw Error();return r.json()});
    const model=PhaseTowers.make(data), ui=PhaseUI(model,1);
    const T=window.THREE, scene=new T.Scene();
    scene.add(PhaseTowers.mountOnVerticalPoster(model.group));
    const texture=new T.TextureLoader().load(window.PHASE_TARGET || 'assets/phase-target.png');
    texture.colorSpace=T.SRGBColorSpace;
    const poster=new T.Mesh(new T.PlaneGeometry(1,538/900),
      new T.MeshBasicMaterial({map:texture,transparent:true,opacity:.60,side:T.DoubleSide,toneMapped:false}));
    scene.add(poster);
    const renderer=new T.WebGLRenderer({alpha:true,antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);
    renderer.domElement.setAttribute('aria-label','Rotatable model of the two phase towers');
    stage.prepend(renderer.domElement);
    const camera=new T.OrthographicCamera(-1,1,1,-1,.01,10);
    const initialAzimuth=.42, initialElevation=.37;
    let azimuth=initialAzimuth,elevation=initialElevation,zoom=1;
    const center=new T.Vector3(-.015,0,.12);
    function frame(){
      const aspect=stage.clientWidth/stage.clientHeight;
      const tall=Math.max(.43,.58/aspect)/zoom;
      camera.left=-tall*aspect;camera.right=tall*aspect;camera.top=tall;camera.bottom=-tall;
      camera.position.set(2*Math.sin(azimuth)*Math.cos(elevation),2*Math.sin(elevation),2*Math.cos(azimuth)*Math.cos(elevation)).add(center);
      camera.lookAt(center);camera.updateProjectionMatrix();
    }
    function resize(){renderer.setSize(stage.clientWidth,stage.clientHeight);frame()}
    new ResizeObserver(resize).observe(stage);resize();
    const canvas=renderer.domElement;
    let dragging=null,x=0,y=0;
    canvas.addEventListener('pointerdown',e=>{if(dragging!==null)return;dragging=e.pointerId;x=e.clientX;y=e.clientY;canvas.setPointerCapture(e.pointerId)});
    canvas.addEventListener('pointermove',e=>{
      if(e.pointerId!==dragging)return;
      azimuth-=(e.clientX-x)*.009;elevation=Math.max(-.65,Math.min(1.45,elevation+(e.clientY-y)*.008));
      x=e.clientX;y=e.clientY;frame();
    });
    canvas.addEventListener('lostpointercapture',()=>{dragging=null});
    canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.7,Math.min(1.8,zoom*Math.exp(-.001*e.deltaY)));frame()},{passive:false});
    document.querySelector('#reset-view').onclick=()=>{azimuth=initialAzimuth;elevation=initialElevation;zoom=1;frame()};
    const clock=new T.Clock();
    ui.reset();
    function draw(){
      const dt=clock.getDelta();ui.advance(dt);renderer.render(scene,camera);
    }
    message.textContent='Drag to rotate';
    renderer.setAnimationLoop(draw);
  } catch(error){
    message.textContent='The 3D view could not start. Open the local launcher and use a browser with WebGL enabled.';
    console.error(error);
  }
})();
