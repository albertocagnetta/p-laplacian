const figures = {
  periodic: { section: '2 · An open question', title: 'From periodic to Neumann', caption: 'A half-period between two turning points gives a Neumann solution.' },
  flow: { section: '1 · A weight that changes sign once', title: 'Weight and solution', caption: 'Follow the flow along the printed concentration profile in augmented reality.' },
  phase: { section: '3 · Two arcs, one ratio, one crossing', title: 'The phase plane', caption: 'Explore how the two autonomous arcs meet at Z. Scan the printed phase plane to see the towers rise above it.' },
  quotient: { section: '3 · Two arcs, one ratio, one crossing', title: 'The time-map quotient', caption: 'Watch how a horizontal level meets a monotone curve to determine whether a positive solution exists.' }
};
const el = id => document.getElementById(id);
const overview = el('overview'), detail = el('detail'), plot = el('plot');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let current = '', changes = [];
function stopMotion() {
  changes.forEach(animation => animation.cancel());
  changes = [];

}
function animate(node, frames, options) {
  changes.push(node.animate(frames, options));
}
function zoom(from, to, image) {
  if (!from.width || !to.width || motion.matches) return;
  const clone = image.cloneNode(false);
  clone.removeAttribute('id');
  clone.alt = '';
  Object.assign(clone.style, {position:'fixed',pointerEvents:'none',zIndex:10,top:to.top+'px',left:to.left+'px',width:to.width+'px',height:to.height+'px',transformOrigin:'0 0',background:'#fbfdfe'});
  document.body.append(clone);
  const animation = clone.animate([
    {transform:'translate('+(from.left-to.left)+'px,'+(from.top-to.top)+'px) scale('+from.width/to.width+','+from.height/to.height+')'},
    {transform:'none'}
  ], {duration:520,easing:'cubic-bezier(.23,.77,.23,1)'});
  changes.push(animation);
  animation.onfinish = animation.oncancel = () => clone.remove();
}
function condense(button, dots) {
  for (let i=0; i<32; i++) {
    const dot=document.createElement('i');
    const t=i/32*2*Math.PI;
    dot.style.left=(button.offsetWidth*(.5+.46*Math.cos(t)))+'px';
    dot.style.top=(button.offsetHeight*(.5+.42*Math.sin(t)))+'px';
    dots.append(dot);
    const drift='translate('+Math.cos(t)*(32+i%5*6)+'px,'+Math.sin(t)*(22+i%3*5)+'px)';
    animate(dot,[{opacity:0,transform:drift},{opacity:1,offset:.35},{opacity:0,transform:'none'}],{duration:440,delay:100+i%5*12,fill:'both',easing:'ease-out'});
  }
  animate(button,[{opacity:0,filter:'blur(3px)'},{opacity:1,filter:'none'}],{duration:260,delay:390,fill:'backwards'});
}
function actionsFor(key) {
  return posterResources.actions.filter(action => action.figure === key && action.href);
}
function showCommands(key) {
  const commands = el('commands');
  commands.replaceChildren();
  for (const action of actionsFor(key)) {
    const row = document.createElement('div');
    row.className = 'command';
    const link = document.createElement('a');
    link.href = new URL(action.href, new URL('../', location.href));
    link.textContent = action.label;
    if (action.type === 'video') {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    const dots = document.createElement('div');
    dots.className = 'particles';
    dots.setAttribute('aria-hidden', 'true');
    row.append(link, dots);
    commands.append(row);
    if (!motion.matches) condense(link, dots);
  }
}
function render() {
  const key=location.hash.slice(1);
  const item=Object.hasOwn(figures,key) && actionsFor(key).length ? figures[key] : null;
  if ((item ? key : '') === current) return;
  stopMotion();
  const old=current;
  const target=document.querySelector('[data-key="'+(item?key:old)+'"]');
  const thumbnail=target.querySelector('img');
  const from=(item ? thumbnail : plot).getBoundingClientRect();
  current=item ? key : '';
  overview.hidden=!!item;
  detail.hidden=!item;
  el('hint').hidden=!!item;
  if(item) {
    plot.src=thumbnail.src;plot.alt=thumbnail.parentElement.innerText;
    const ratio=thumbnail.naturalWidth/thumbnail.naturalHeight;
    if(Number.isFinite(ratio)) plot.style.aspectRatio=String(ratio);
    el('sectionName').textContent=item.section;
    el('detailTitle').textContent=item.title;
    el('description').textContent=item.caption;
    showCommands(key);
    window.scrollTo(0,0);
    el('detailTitle').focus({preventScroll:true});
    if(!motion.matches) {
      zoom(from,plot.getBoundingClientRect(),plot);
      animate(plot,[{opacity:0},{opacity:1}],{duration:100,delay:400,fill:'backwards'});

    }
  } else {
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'nearest'});
    zoom(from,thumbnail.getBoundingClientRect(),thumbnail);
  }
}
for (const button of document.querySelectorAll('[data-key]')) {
  const key = button.dataset.key;
  const active = actionsFor(key).length > 0;
  if (key === 'periodic') {
    button.hidden = !active;
    for (const note of button.parentNode.querySelectorAll('.question, .timeline')) note.hidden = active;
  }
  if (!active) {
    button.disabled = true;
    continue;
  }
  button.addEventListener('click', () => {
    history.pushState({posterFigure:true}, '', '#' + key);
    render();
  });
}
function backToMap() {
  if(history.state?.posterFigure) history.back();
  else {history.replaceState(null,'',location.pathname+location.search);render()}
}
el('back').addEventListener('click',backToMap);
addEventListener('keydown', e=>{if(e.key==='Escape' && current)backToMap()});
addEventListener('popstate',render);
addEventListener('hashchange',render);
render();
