/* Model coordinates: x and y span the phase plane, z is the time-ratio level. */
window.PhaseTowers = (() => {
  const T = window.AFRAME?.THREE || window.THREE;
  const A = 0x00525b, B = 0xc4553a, ink = 0x14272d;
  const halfSpan = .19, scaleXY = 2*halfSpan, H = .60, floor = .012;
  const columns = [-.255,.255];
  const zAt = level => floor + H*level/2;
  const toWorld = (i,x,y,z) => [columns[i] + scaleXY*(x-.5), .165 + scaleXY*y, z];

  function betaFor(tower,level) {
    const lookup=tower.lookup;
    let lo=0, hi=lookup.length-1;
    while (hi-lo>1) {
      const m=(lo+hi)>>1;
      if (lookup[m][0]<=level) lo=m;
      else hi=m;
    }
    const [l,a]=lookup[lo], [h,b]=lookup[hi];
    return a+(b-a)*(level-l)/(h-l);
  }
  function sample(gamma,beta,plus,points) {
    const q=gamma+1, bq=beta**q, vP=Math.sqrt(4*(1-bq)/(3*q));
    for(let i=0;i<points.length;i++) {
      const k=plus ? i : points.length-1-i;
      const v=vP*(1-Math.cos(Math.PI*k/(points.length-1)))/2;
      points[i][0]=plus ? Math.pow(1-q*v*v/2,1/q) : Math.pow(bq+q*v*v/4,1/q);
      points[i][1]=-v;
    }
  }
  function geometry(positions, indices, dynamic=false) {
    const g=new T.BufferGeometry();
    const attr=new T.Float32BufferAttribute(positions,3);
    if(dynamic) attr.setUsage(T.DynamicDrawUsage);
    g.setAttribute('position',attr); g.setIndex(indices); return g;
  }
  function material(color,opacity=1) {
    return new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:opacity<1,opacity,depthWrite:opacity===1,toneMapped:false});
  }
  // A flat ribbon has width even on phones with a one-pixel WebGL line limit.
  function ribbon(points,col,z,width,array,start=0) {
    for(let k=0;k<points.length;k++){
      const p=points[k], before=points[Math.max(0,k-1)], after=points[Math.min(points.length-1,k+1)];
      const dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy)||1;
      const nx=-width*dy/length, ny=width*dx/length;
      const x=columns[col]+scaleXY*(p[0]-.5), y=.165+scaleXY*p[1];
      const offset=start+6*k;
      array[offset]=x+nx;array[offset+1]=y+ny;array[offset+2]=z;
      array[offset+3]=x-nx;array[offset+4]=y-ny;array[offset+5]=z;
    }
  }
  function stripIndices(n, indices, offset) {
    for(let k=0;k<n-1;k++) {
      const a=offset+2*k;
      indices.push(a,a+1,a+2,a+1,a+3,a+2);
    }
  }
  function make(data, labelBase='assets/labels/') {
    const group=new T.Group();
    const moving=[];
    function mesh(g,m,order=0) {
      const object=new T.Mesh(g,m);
      object.renderOrder=order;group.add(object);return object;
    }
    function line(points,color,opacity=1) {
      const g=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));
      const obj=new T.Line(g,new T.LineBasicMaterial({color,opacity,transparent:opacity<1,depthWrite:false}));
      group.add(obj); return obj;
    }
    function dot(x,y,z,r,color) {
      const obj=mesh(new T.SphereGeometry(r,10,7),material(color),4);
      obj.position.set(x,y,z);return obj;
    }
    function label(name,width,x,y,z) {
      const img=new Image();
      const tex=new T.Texture(img);tex.colorSpace=T.SRGBColorSpace;
      const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,depthWrite:false,depthTest:false,toneMapped:false}));
      sprite.renderOrder=8;sprite.visible=false;
      img.onload=()=>{tex.needsUpdate=true;sprite.scale.set(width,width*img.height/img.width,1);sprite.visible=true};
      img.src=window.PHASE_LABELS?.[name] || labelBase+name+'.png';
      sprite.position.set(x,y,z);group.add(sprite);
    }
    function plane(x1,x2,y1,y2,z,opacity,borderAlpha) {
      const g=geometry([x1,y1,0,x2,y1,0,x2,y2,0,x1,y2,0],[0,1,2,0,2,3]);
      const face=mesh(g,material(B,opacity),1);face.position.z=z;
      const outline=line([[x1,y1,0],[x2,y1,0],[x2,y2,0],[x1,y2,0],[x1,y1,0]],B,borderAlpha);
      outline.position.z=z;
      return [face,outline];
    }
    const L=data.towers[0].openWindow[0];
    plane(-.49,.49,-.235,.205,zAt(2),.022,.24);
    plane(-.49,-.022,-.235,.205,zAt(L),.07,.55);
    const cutting=plane(-.50,.50,-.245,.21,zAt(1),.085,.85);
    line([[-.508,.21,floor],[-.508,.21,zAt(2)+.025]],ink,.8);
    label('axis',.162,-.325,.225,zAt(2)+.05);
    label('top',.099,-.458,.22,zAt(2));
    label('threshold',.143,-.54,.22,zAt(L));
    label('zero',.045,-.524,.22,floor);
    data.towers.forEach((tower,col)=>{
      const x0=columns[col]-halfSpan;
      const x1=x0+scaleXY*1.07, front=.165-scaleXY;
      mesh(geometry([x0,front,floor,x1,front,floor,x1,.165,floor,x0,.165,floor],[0,1,2,0,2,3]),material(A,.11));
      line([[x0,front,floor],[x0,.165,floor],[x1,.165,floor]],ink,.65);
      line([[x0,front,floor],[x1,front,floor],[x1,.165,floor]],ink,.30);
      label('u',.03,x0+scaleXY*1.10,.165,floor);label('up',.035,x0,-.24,floor);
      label(col?'three':'half',.16,columns[col],-.291,floor);
      dot(...toWorld(col,1,0,zAt(2)),.0065,ink);
      dot(...toWorld(col,0,0,zAt(tower.openWindow[0])),.005,ink);
      const paths=[];
      ['plus','minus'].forEach((side,sideIndex)=>{
        const color=sideIndex?B:A;
        const staticPositions=[],staticIndices=[],surfacePositions=[],surfaceIndices=[];
        const n=tower.layers[0][side].length;
        tower.layers.forEach((layer,j)=>{
          const points=layer[side],z=zAt(layer.lam),base=staticPositions.length/3;
          if(j<tower.layers.length-1){
            const p=new Float32Array(n*6);ribbon(points,col,z,.00086,p);
            staticPositions.push(...p);stripIndices(n,staticIndices,base);
          }
          points.forEach(p=>surfacePositions.push(...toWorld(col,p[0],p[1],z)));
          if(j>0)for(let k=0;k<n-1;k++){
            const b=(j-1)*n+k;
            surfaceIndices.push(b,b+1,b+n,b+1,b+n+1,b+n);
          }
        });
        mesh(geometry(surfacePositions,surfaceIndices),material(color,.11),1);
        mesh(geometry(staticPositions,staticIndices),material(color,.61),2);
        const indices=[];stripIndices(n,indices,0);
        const dynamicMesh=mesh(geometry(new Float32Array(6*n),indices,true),material(color),4);
        dynamicMesh.material.transparent=true;
        dynamicMesh.renderOrder=5;
        dynamicMesh.frustumCulled=false;
        paths.push({dynamicMesh,points:Array.from({length:n},()=>[0,0])});
      });
      moving.push({tower,paths,junction:dot(0,0,0,.006,ink)});
    });
    function setLevel(level){
      cutting.forEach(o=>o.position.z=zAt(level));
      const active=[];
      moving.forEach(({tower,paths,junction},col)=>{
        const enabled=tower.openWindow[0]<level && level<tower.openWindow[1];
        active.push(enabled);junction.visible=enabled;
        const beta=enabled ? betaFor(tower,level) : 0;
        paths.forEach(({dynamicMesh,points},i)=>{
          dynamicMesh.visible=enabled;if(!enabled)return;
          sample(tower.gamma,beta,i===0,points);
          const pos=dynamicMesh.geometry.attributes.position;
          ribbon(points,col,zAt(level)+.0003,.0048,pos.array);pos.needsUpdate=true;
          if(i===0)junction.position.set(...toWorld(col,...points.at(-1),zAt(level)+.0005));
        });
      });
      return active;
    }
    setLevel(1);return {group,setLevel,threshold:L};
  }

  function mountOnVerticalPoster(group) {
    // In target coordinates +y is up the poster and +z comes out of the paper.
    const mount=new T.Group();
    mount.rotation.x=-Math.PI/2;
    mount.position.set(0,-.22,.19);
    mount.scale.setScalar(.72);
    mount.add(group);
    return mount;
  }

  return {make,mountOnVerticalPoster};
})();
