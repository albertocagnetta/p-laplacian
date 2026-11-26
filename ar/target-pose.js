AFRAME.registerComponent('stable-target-pose',{
  init(){
    const T=AFRAME.THREE;
    this.el.object3D.matrixAutoUpdate=false;
    this.target=this.el.parentEl;
    this.anchor=this.target.object3D;
    this.samplePosition=new T.Vector3();
    this.sampleRotation=new T.Quaternion();
    this.sampleScale=new T.Vector3();
    this.position=new T.Vector3();
    this.rotation=new T.Quaternion();
    this.scale=new T.Vector3();
    this.pose=new T.Matrix4();
    this.hasPose=false;
    this.resetPose=()=>{this.hasPose=false};
    this.target.addEventListener('targetLost',this.resetPose);
  },
  remove(){
    this.target.removeEventListener('targetLost',this.resetPose);
    this.el.object3D.matrixAutoUpdate=true;
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
    // Cancel the parent pose so the model inherits the stabilized rigid pose.
    this.pose.compose(this.position,this.rotation,this.scale);
    const root=this.el.object3D;
    root.matrix.copy(raw).invert().multiply(this.pose);
    root.matrixWorldNeedsUpdate=true;
  },
  tick(t,dt){
    if(!this.anchor.visible)return;
    this.stabilizePose(dt);
  }
});
