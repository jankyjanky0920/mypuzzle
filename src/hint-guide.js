(function(root){
'use strict';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rx=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function recordedLock(engine,step,pencil){
 if(step.technique!=='locked'||!step.cells.length)return false;
 const bit=engine.BITS[step.proof.digit-1];
 return !!bit&&step.cells.every(i=>engine.activeSet.has(i)&&!!(pencil[i]&bit));
}
function prepare(engine,input,pencil,level){
 const state=engine.clone(input),skipped=[];
 for(let i=0;i<1600;i++){
  const step=engine.available(state,level,{first:true})[0];
  if(!step)return {state,step:null,skipped};
  if(!engine.verifyStep(state,step))throw Error('ヒントの手順を検証できませんでした。');
  if(!recordedLock(engine,step,pencil))return {state,step,skipped};
  // Notes express familiarity, not logical premises. Only a separately
  // verified deduction changes the internal candidates; notes stay untouched.
  engine.apply(state,step);skipped.push(step);
 }
 throw Error('次のヒントを準備できませんでした。');
}
function presentation(engine,step,displayText=x=>x){
 const candidates=new Map(),active=engine.activeSet,physical=cells=>[...new Set(cells.flatMap(i=>active.has(i)?[i]:engine.houses.filter(h=>h.includes(i)).flat().filter(j=>active.has(j))))];
 const add=(label,cells,id)=>{if(label&&cells.length&&!candidates.has(label))candidates.set(label,{id,label,cells:physical(cells)});};
 engine.houses.forEach((cells,i)=>add(engine.hn(i),cells,'unit-'+i));
 const all=[...new Set(engine.houses.flat())];for(const i of all)add(engine.rc(i),[i],'cell-'+i);
 for(let i=0;i<engine.side;i++)for(const [axis,cells]of[['行',engine.active.filter(j=>Math.floor(j/engine.side)===i)],['列',engine.active.filter(j=>j%engine.side===i)]])for(const label of [`${i+1}${axis}`,`${i+1}${axis}目`,`${i+1}${axis}側`,`第${i+1}${axis}`])add(label,cells,'axis-'+axis+'-'+i);
 const def=engine.def||{};
 (def.arrows||[]).forEach((a,i)=>add(`第${i+1}アロー`,[a.circle,...a.cells],'arrow-'+i));
 (def.pokerLines||[]).forEach((a,i)=>add(`第${i+1}の線`,a.cells,'poker-'+i));
 const location=step.cells.map(engine.rc).join('、')+'付近を確認してみてください。',reason=displayText(step.text),effects=step.effects.map(e=>`${engine.rc(e.cell)}：${e.type==='place'?engine.label(e.digit)+'に確定':'候補'+engine.label(e.digit)+'を削除'}`);
 // Fish explanations also name several rows/columns as a single phrase.
 for(const text of [reason,...effects])for(const m of text.matchAll(/(\d+(?:・\d+)+)(行|列)(?:目|側)?/g)){const ns=m[1].split('・').map(Number),cells=engine.active.filter(i=>ns.includes((m[2]==='行'?Math.floor(i/engine.side):i%engine.side)+1));add(m[0],cells,'axes-'+m[2]+'-'+ns.join('-'));}
 const labels=[...candidates.keys()].sort((a,b)=>b.length-a.length),pattern=new RegExp(labels.map(rx).join('|'),'g'),references=[],byId=new Map(),byLabel=new Map();
 // Reserve colors in the same order at every hint stage.
 for(const text of [reason,location,...effects])for(const m of text.matchAll(pattern)){const original=candidates.get(m[0]);let ref=byId.get(original.id);if(!ref){const hue=[210,38,148,278,8,182,70,325][references.length%8],light=references.length<8?90:85;ref={...original,color:`hsl(${hue} 65% ${light}%)`};references.push(ref);byId.set(ref.id,ref);}byLabel.set(m[0],ref);}
 function ids(text){return [...new Set([...text.matchAll(pattern)].map(m=>byLabel.get(m[0])?.id).filter(Boolean))];}
 function html(text){let out='',at=0;for(const m of text.matchAll(pattern)){out+=esc(text.slice(at,m.index));const ref=byLabel.get(m[0]);out+=ref?`<button type="button" class="hint-location" data-hint-ref="${ref.id}" aria-pressed="false" title="盤面上の範囲を強調：${esc(m[0])}" style="--hint-color:${ref.color}">${esc(m[0])}</button>`:esc(m[0]);at=m.index+m[0].length;}return out+esc(text.slice(at));}
 function visible(stage){return [...new Set([...(stage>=1?ids(location):[]),...(stage>=3?ids(reason):[]),...(stage>=4?effects.flatMap(ids):[])])];}
 function cells(stage,pinned=null){const shown=visible(stage),chosen=pinned&&shown.includes(pinned)?[pinned]:shown,out=new Map();for(const id of chosen){const ref=byId.get(id);for(const i of ref.cells){if(!out.has(i))out.set(i,[]);out.get(i).push(ref);}}return out;}
 return {location,reason,effects,references,html,visible,cells};
}
function wash(refs){const colors=[...new Set(refs.map(r=>r.color))];if(!colors.length)return '';return 'linear-gradient(135deg,'+colors.map((c,i)=>`${c} ${i*100/colors.length}% ${(i+1)*100/colors.length}%`).join(',')+')';}
root.HintGuide={recordedLock,prepare,presentation,wash};if(typeof module!=='undefined')module.exports=root.HintGuide;
})(typeof globalThis!=='undefined'?globalThis:this);
