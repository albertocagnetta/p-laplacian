(async()=>{
  const status=document.querySelector('#status'),start=document.querySelector('#start'),frame=document.querySelector('#stage');
  const controls=document.querySelector('#controls'),fluxPause=document.querySelector('#pause');
  const message=text=>{status.textContent=text};
  try {
    if(!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)throw Error('Open this page over HTTPS or on localhost to use a camera.');
    const response=await fetch('model/torri.json');
    if(!response.ok)throw Error('The tower data could not be loaded.');
    const data=await response.json();
    let ui,tracking=false,acquired=0,first=true,started=false;
    AFRAME.registerComponent('phase-towers',{
      init(){
        const T=AFRAME.THREE;
        const model=PhaseTowers.make(data);
        this.el.setObject3D('mesh',PhaseTowers.mountOnVerticalPoster(model.group));
        this.el.object3D.matrixAutoUpdate=false;
        ui=PhaseUI(model,2);
        this.anchor=this.el.parentEl.object3D;
        this.samplePosition=new T.Vector3();
        this.sampleRotation=new T.Quaternion();
        this.sampleScale=new T.Vector3();
        this.position=new T.Vector3();
        this.rotation=new T.Quaternion();
        this.scale=new T.Vector3();
        this.pose=new T.Matrix4();
        this.hasPose=false;
      },
      stabilizePose(dt){
        const raw=this.anchor.matrix;
        raw.decompose(this.samplePosition,this.sampleRotation,this.sampleScale);
        this.sampleRotation.normalize();
        if(!this.hasPose){
          this.position.copy(this.samplePosition);
          this.rotation.copy(this.sampleRotation);
          this.scale.setScalar(this.sampleScale.x);
          this.hasPose=true;
        }else{
          const seconds=Math.min(dt,50)/1000;
          const distance=this.position.distanceTo(this.samplePosition);
          const positionDeadband=.0008*this.scale.x;
          if(distance>positionDeadband){
            this.position.lerp(this.samplePosition,
              -Math.expm1(-seconds/.09)*(1-positionDeadband/distance));
          }
          const angle=this.rotation.angleTo(this.sampleRotation);
          const angleDeadband=.5*Math.PI/180;
          if(angle>angleDeadband){
            // Limit the rendered response to isolated spikes in the estimated tilt.
            const step=Math.min((angle-angleDeadband)*-Math.expm1(-seconds/.18),
              seconds*55*Math.PI/180);
            this.rotation.rotateTowards(this.sampleRotation,step);
          }
        }
        // Cancel the parent pose so only the two towers use the stabilized rigid pose.
        this.pose.compose(this.position,this.rotation,this.scale);
        const root=this.el.object3D;
        root.matrix.copy(raw).invert().multiply(this.pose);
        root.matrixWorldNeedsUpdate=true;
      },
      tick(t,dt){
        if(!tracking||!this.anchor.visible){this.hasPose=false;return}
        this.stabilizePose(dt);
        if(!ui||performance.now()-acquired<350)return;
        if(first){ui.reset();first=false;controls.hidden=false}ui.advance(dt/1000);
      }
    });
    const scene=document.createElement('a-scene');
    scene.setAttribute('embedded','');
    scene.setAttribute('vr-mode-ui','enabled: false');
    scene.setAttribute('xr-mode-ui','enabled: false');
    scene.setAttribute('device-orientation-permission-ui','enabled: false');
    scene.setAttribute('renderer','colorManagement: true; antialias: true; alpha: true');
    scene.setAttribute('mindar-image','imageTargetSrc: assets/targets.mind?v=phase-block3-v1; autoStart: false; maxTrack: 1; warmupTolerance: 5; missTolerance: 5; filterMinCF: 0.0007; filterBeta: 300; uiScanning: no; uiLoading: no; uiError: no');
    scene.innerHTML='<a-camera position="0 0 0" look-controls="enabled:false" wasd-controls="enabled:false"></a-camera><a-entity id="flux" mindar-image-target="targetIndex: 0"><a-entity flux-model scale=".133333 .136364 .15" position=".02 -.062455 .1725"></a-entity></a-entity><a-entity id="towers" mindar-image-target="targetIndex: 1"><a-entity phase-towers></a-entity></a-entity><a-entity light="type: ambient; intensity: 1.3"></a-entity><a-entity light="type: directional; intensity: 1" position="1 4 3"></a-entity>';
    let current='';
    for(const id of ['flux','towers']){
      const anchor=scene.querySelector('#'+id);
      anchor.addEventListener('targetFound',()=>{
        current=id;tracking=id==='towers';acquired=performance.now();
        if(tracking)anchor.querySelector('[phase-towers]').components['phase-towers'].hasPose=false;
        controls.hidden=!tracking||first;fluxPause.hidden=tracking;
        message(tracking?'Phase plane found. Look from slightly above and to one side.':'Flow target found.');
      });
      anchor.addEventListener('targetLost',()=>{
        if(current!==id)return;
        current='';tracking=false;controls.hidden=true;fluxPause.hidden=true;
        message('Point at the whole printed figure.');
      });
    }
    scene.addEventListener('loaded',()=>{start.disabled=false;message('Place the target on a second screen or print it.')},{once:true});
    function failure(){message('Camera unavailable. Check browser permissions, then reload to retry.');start.hidden=true;document.querySelector('#retry').hidden=false}
    scene.addEventListener('arError',failure);
    scene.addEventListener('arReady',()=>{
      start.hidden=true;
      message('Point at the whole printed figure.');
      const sys=scene.systems['mindar-image-system'];
      const fit=()=>{scene.resize(); sys._resize()};
      if(sys.video)sys.video.addEventListener('resize',fit);
      new ResizeObserver(fit).observe(frame);
    });
    start.onclick=async()=>{start.disabled=true;started=true;message('Starting camera…');try{await scene.systems['mindar-image-system'].start()}catch(e){failure()}};
    document.querySelector('#retry').onclick=()=>location.reload();
    window.addEventListener('pagehide',()=>{
      if(started)scene.systems['mindar-image-system'].video?.srcObject?.getTracks().forEach(t=>t.stop());
    });
    window.addEventListener('pageshow',e=>{if(e.persisted&&started)location.reload()});
    frame.append(scene);
  }catch(e){start.disabled=true;message(e.message)}
})();
