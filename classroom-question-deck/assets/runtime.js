(()=>{'use strict';
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const topics=LESSON.topics, ids=['overview',...topics.map(t=>t.id)], total=topics.reduce((n,t)=>n+t.questions.length,0), storage='classroom-deck:'+LESSON.id;
let stored={};try{stored=JSON.parse(localStorage.getItem(storage))||{}}catch{}
const defaultSize=()=>matchMedia('(max-width:600px)').matches?18:23;
let size=Number.isFinite(stored.size)?Math.min(36,Math.max(16,stored.size)):defaultSize(),active=ids.includes(stored.id)?stored.id:'overview',shown=true,view='both',timer;
const positions={},revealed=new Set();
const topic=()=>topics.find(t=>t.id===active), question=id=>topic()?.questions.find(q=>q.id===id);
function save(){try{localStorage.setItem(storage,JSON.stringify({size,id:active}))}catch{}}
function notice(message){$('status').textContent=message;$('status').hidden=false;clearTimeout(timer);timer=setTimeout(()=>$('status').hidden=true,5000)}
function font(){document.documentElement.style.setProperty('--font',size+'px');$('font-value').textContent=size+' px';$('smaller').disabled=size<=16;$('larger').disabled=size>=36;save()}
function range(t){const qs=t.questions;return qs[0].number+(qs.length>1?'—'+qs.at(-1).number:'')}
function block(b,blanks=false){
 if(b.type==='image')return `<figure class="figure"><img src="${esc(b.src)}" alt="${esc(b.alt)}">${b.caption?`<figcaption>${esc(b.caption)}</figcaption>`:''}</figure>`;
 if(b.type==='table')return `<div class="table-scroll" tabindex="0" aria-label="数据表格，可横向滚动"><table><thead><tr>${b.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r=>`<tr>${r.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 let text=esc(b.text);if(blanks)text=text.replace(/\[\[([A-Za-z0-9_-]+)\]\]/g,(_,id)=>`<button class="blank" data-blank="${id}" aria-label="查看第 ${esc(question(id)?.number)} 题解析">${esc(question(id)?.number)}</button>`);
 return `<div class="material-text">${text}</div>`;
}
function setView(v){view=v;$('workspace').dataset.view=v;document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)))}
function revealState(){document.querySelectorAll('[data-solution]').forEach(e=>e.hidden=!(shown||revealed.has(e.dataset.solution)));document.querySelectorAll('[data-reveal]').forEach(b=>{const yes=shown||revealed.has(b.dataset.reveal);b.textContent=yes?'收起本题答案':'显示本题答案';b.setAttribute('aria-expanded',String(yes))});$('toggle-answers').textContent=shown?'隐藏答案':'显示全部答案';$('toggle-answers').setAttribute('aria-pressed',String(shown))}
function draw(){
 const overview=active==='overview';
 $('workspace').setAttribute('aria-labelledby','tab-'+active);
 $('topics').innerHTML=[{id:'overview',label:'答案总览'},...topics].map(t=>`<button role="tab" id="tab-${t.id}" data-topic="${t.id}" aria-controls="workspace" aria-selected="${t.id===active}" tabindex="${t.id===active?0:-1}">${esc(t.label)}</button>`).join('');
 document.querySelector('.panes').hidden=overview;document.querySelector('.view-controls').hidden=overview;$('key-overview').hidden=!overview;$('toggle-answers').hidden=overview;
 if(overview){
  $('section-title').textContent='答案总览';$('structure').textContent=`共 ${total} 题 · 按题型核对`;
  $('key-overview').innerHTML='<div class="key-grid">'+topics.map(t=>`<section class="key-group ${t.questions.some(q=>q.answer.length>5)?'long-answers':''}"><h3>${esc(t.label)}<span>${esc(range(t))}</span></h3><div class="key-cells">${t.questions.map(q=>`<div class="key-cell" data-key="${q.id}"><span>${esc(q.number)}</span><strong>${q.answerKind&&q.answerKind!=='答案'?`<small class="key-kind">${esc(q.answerKind)}</small>`:''}${esc(q.status==='confirmed'?q.answer:'待核验')}</strong></div>`).join('')}</div></section>`).join('')+'</div>';
  $('key-overview').scrollTop=positions.overview?.k||0;save();return;
 }
 const t=topic();$('section-title').textContent=t.title;$('structure').textContent=t.summary||'';$('passage-label').textContent='01 / '+(t.materialLabel||'题目与材料');$('question-count').textContent='共 '+t.questions.length+' 题';$('evidence-label').textContent='点击题号定位依据';
 $('passage').innerHTML=t.blocks.map((b,i)=>`<section class="paragraph" data-block="${b.id}"><span class="pnum">${esc(b.label||'材料 '+(i+1))}</span>${block(b,true)}</section>`).join('');
 $('question-nav').innerHTML=t.questions.map(q=>`<button data-question="${q.id}" aria-label="讲解第 ${esc(q.number)} 题" aria-pressed="false">${esc(q.number)}</button>`).join('');
 $('answers').innerHTML=t.questions.map(q=>`<article class="question" id="q-${q.id}" data-card="${q.id}"><div class="qhead"><button class="qnumber" data-question="${q.id}" aria-label="讲解第 ${esc(q.number)} 题">${esc(q.number)}</button><h4>${esc(q.prompt)}</h4></div>${q.options?.length?`<div class="options">${q.options.map(o=>`<div class="option">${esc(o)}</div>`).join('')}</div>`:''}${q.approach?`<div class="reason"><span class="label">解题切入</span>${esc(q.approach)}</div>`:''}<div data-solution="${q.id}"><div class="answer-line"><span class="label">${q.status==='confirmed'?esc(q.answerKind||'答案'):'原提供答案（待核验）'}</span><strong>${esc(q.answer||'未提供')}</strong></div>${(q.steps||[]).map(b=>`<div class="reason">${block(b)}</div>`).join('')}${q.pitfall?`<div class="reason caution"><span class="label">易错点</span>${esc(q.pitfall)}</div>`:''}</div><div class="qactions">${q.evidence?.length?`<button data-evidence="${q.id}">定位依据</button>`:''}<button data-reveal="${q.id}"></button></div></article>`).join('');
 revealState();$('passage').scrollTop=positions[active]?.p||0;$('answers').scrollTop=positions[active]?.a||0;save();
}
function switchTopic(id){if(id===active)return;positions[active]={p:$('passage').scrollTop,a:$('answers').scrollTop,k:$('key-overview').scrollTop};active=id;draw()}
function scrollIn(box,el){if(el)box.scrollTo({top:box.scrollTop+el.getBoundingClientRect().top-box.getBoundingClientRect().top-12,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'})}
function focusQuestion(id,from){const q=question(id);if(!q)return;const ev=q.evidence||[];
 document.querySelectorAll('[data-block]').forEach(e=>e.classList.toggle('evidence',ev.includes(e.dataset.block)));
 document.querySelectorAll('[data-blank]').forEach(e=>e.classList.toggle('active',e.dataset.blank===id));
 document.querySelectorAll('[data-card]').forEach(e=>e.classList.toggle('active',e.dataset.card===id));
 document.querySelectorAll('[data-question]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.question===id)));
 $('evidence-label').textContent='第 '+q.number+' 题'+(ev.length?' · 已定位依据':'');
 if(from==='blank'&&view==='passage')setView('answers');else if(ev.length&&view==='answers'&&from!=='blank')setView('both');
 requestAnimationFrame(()=>{if(ev.length)scrollIn($('passage'),document.querySelector(`[data-blank="${id}"]`)||document.querySelector(`[data-block="${ev[0]}"]`));if(from!=='evidence')scrollIn($('answers'),$('q-'+id))});
}
document.querySelector('.brand h1').textContent=LESSON.title;document.querySelector('.unit').textContent=LESSON.badge||'课堂讲评';document.querySelector('.footer span:last-child').textContent='共 '+total+' 题';
$('topics').onclick=e=>{const b=e.target.closest('[data-topic]');if(b){switchTopic(b.dataset.topic);$('tab-'+active).focus()}};
$('topics').onkeydown=e=>{const i=ids.indexOf(active);let n;if(e.key==='ArrowRight')n=(i+1)%ids.length;if(e.key==='ArrowLeft')n=(i+ids.length-1)%ids.length;if(e.key==='Home')n=0;if(e.key==='End')n=ids.length-1;if(n!==undefined){e.preventDefault();switchTopic(ids[n]);$('tab-'+active).focus()}};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.question)focusQuestion(b.dataset.question,'nav');if(b.dataset.blank)focusQuestion(b.dataset.blank,'blank');if(b.dataset.evidence)focusQuestion(b.dataset.evidence,'evidence');if(b.dataset.view)setView(b.dataset.view);if(b.dataset.reveal){const id=b.dataset.reveal;if(shown){shown=false;topic().questions.forEach(q=>revealed.add(q.id));revealed.delete(id)}else if(revealed.has(id))revealed.delete(id);else revealed.add(id);revealState()}});
$('clear-evidence').onclick=()=>{document.querySelectorAll('.evidence,.blank.active,.question.active').forEach(e=>e.classList.remove('evidence','active'));document.querySelectorAll('[data-question]').forEach(e=>e.setAttribute('aria-pressed','false'));$('evidence-label').textContent='点击题号定位依据'};
$('smaller').onclick=()=>{size=Math.max(16,size-2);font()};$('larger').onclick=()=>{size=Math.min(36,size+2);font()};$('reset-size').onclick=()=>{size=defaultSize();font()};$('toggle-answers').onclick=()=>{shown=!shown;revealed.clear();revealState()};
function fullLabel(){$('fullscreen').textContent=document.fullscreenElement||document.webkitFullscreenElement?'退出全屏':document.body.classList.contains('immersive')?'退出沉浸':'全屏讲解'}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.webkitFullscreenElement)document.webkitExitFullscreen();else if(document.body.classList.contains('immersive'))document.body.classList.remove('immersive');else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else if(document.documentElement.webkitRequestFullscreen)document.documentElement.webkitRequestFullscreen();else{document.body.classList.add('immersive');notice('此浏览器不支持系统全屏，已进入沉浸布局；手机横屏可扩大阅读区域。')}}catch{document.body.classList.add('immersive');notice('浏览器未允许系统全屏，已进入沉浸布局；电脑也可按 F11。')}fullLabel()}
$('fullscreen').onclick=fullscreen;document.addEventListener('fullscreenchange',fullLabel);document.addEventListener('webkitfullscreenchange',fullLabel);document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select'))return;if(e.key.toLowerCase()==='f'){e.preventDefault();fullscreen()}if(e.key==='Escape'){document.body.classList.remove('immersive');fullLabel()}});
font();draw();
})();
