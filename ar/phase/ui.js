window.PhaseUI = function(model, initial=1) {
  const slider=document.querySelector('#height');
  const readout=document.querySelector('#readout');
  const toggle=document.querySelector('#play');
  const states=[...document.querySelectorAll('[data-result]')];
  const points=[[0,2],[2.0,1],[3.6,1],[5.15,.25],[6.75,.25],[7.4,0],[7.7,0],[11,2]];
  let elapsed=0, playing=true, level=NaN;
  function show(value){
    if(value===level)return;
    level=value;
    const result=model.setLevel(value);
    states.forEach((el,i)=>{
      el.textContent=result[i]?'One positive orbit':'No positive solution';
      el.classList.toggle('absent',!result[i]);
    });
    const rounded=Number(value.toFixed(3));
    let display=String(rounded);
    if(value===model.threshold)display='L ≈ 0.512';
    else if(rounded===0 && value>0)display='< 0.001';
    else if(rounded===2 && value<2)display='< 2';
    else if(rounded===0.512)display=value>model.threshold?'just above L':'just below L';
    readout.textContent=display;
    slider.value=value;
    document.querySelectorAll('[data-level]').forEach(b=>{
      const x=b.dataset.level==='L'?model.threshold:Number(b.dataset.level);
      b.setAttribute('aria-pressed',String(x===value));
    });
  }
  function pause(isPaused){
    playing=!isPaused;toggle.textContent=playing?'Pause':'Play';
    toggle.setAttribute('aria-label',playing?'Pause level sweep':'Play level sweep');
  }
  function manual(value){
    pause(true);show(value);
    // Resume upward from the selected height.
    elapsed=7.7+3.3*value/2;
  }
  toggle.addEventListener('click',()=>pause(playing));
  slider.addEventListener('input',()=>manual(Number(slider.value)));
  document.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>{
    manual(b.dataset.level==='L'?model.threshold:Number(b.dataset.level));
  }));
  function advance(dt){
    if(!playing)return;
    elapsed=(elapsed+Math.min(.10,dt))%11;
    const j=points.findIndex(([t])=>t>elapsed);
    const [a,x]=points[j-1],[b,y]=points[j];
    show(x+(y-x)*(elapsed-a)/(b-a));
  }
  show(initial);
  return {advance,reset(){elapsed=0;pause(false);show(2)}};
};
