(function(root){
'use strict';
const T=root.PuzzleTypes,TM=root.PracticeTest,$=id=>document.getElementById(id),kind=p=>p.kind||'standard';
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock=ms=>{const s=Math.ceil(Math.max(0,ms)/1000);return Math.floor(s/60).toString().padStart(2,'0')+':'+(s%60).toString().padStart(2,'0');};
function create({pool,getDB,save,toast,confirmDo,openQuestion,beforeNavigate,beforeFinish,closeWorkspace,review,prepareTest=async()=>({}),getPlayed=null,markUsed=()=>{}}){
 let activeId=null,resultId=null,ticking=false;
 const db=()=>getDB(),runs=()=>Object.values(db().tests||{}),run=()=>db().tests?.[activeId],question=()=>run()?.questions[run().currentIndex],puzzle=q=>pool.find(p=>p.id===q.puzzleId),running=()=>runs().find(r=>r.status==='running');
 function leave(){activeId=null;$('test-bar').hidden=true;$('test-navigation').hidden=true;}
 function showResult(id){const r=db().tests?.[id];if(!r||r.status==='running')return;leave();resultId=id;closeWorkspace();$('test-result').hidden=false;const z=r.result;
  $('test-score').textContent=`${z.correct} / ${z.total} 問 正解`;
  $('test-result-summary').textContent=`${r.level==='normal'?'通常':'最上難易度'} / ${r.mode==='analog'?'アナログ':'デジタル'} / ${r.status==='expired'?'時間切れで終了':'提出して終了'} / 所要時間 ${clock(z.durationSeconds*1000)} / ${new Date(r.startedAt).toLocaleString('ja-JP')}`;
  $('test-result-counts').textContent=`不正解 ${z.wrong}問・未回答または入力途中 ${z.incomplete}問。各問1点です。ABCDは4マスすべて、次の一手は場所と数字の両方が合うと正解になります。`;
  $('test-result-items').innerHTML=z.items.map((x,i)=>{const p=puzzle(r.questions[i]);const detail=x.kind==='next'?`回答：${x.answer||'未回答'} / 正解：${x.expected}`:x.mode==='analog'?`ABCD：${x.answer} / 正解：${x.expected}`:`空欄 ${x.missing}マス・不一致 ${x.wrongCells.length}マス`;
   return `<article class="test-result-row"><div><strong>${i+1}. ${esc(T.TYPES[kind(p)].name)}</strong><span>${x.correct?'正解':x.state==='wrong'?'不正解':'未回答・入力途中'}</span><small>${esc(detail)}</small><small>${esc(p.id)}</small></div><button data-test-review="${i}">通常練習で復習</button></article>`;}).join('');
  window.scrollTo({top:0,behavior:'instant'});
 }
 function finish(r,reason){if(r.status!=='running')return;const wasActive=activeId===r.id;if(wasActive)beforeFinish();TM.finish(r,pool,{reason});if(db().activeTestId===r.id)db().activeTestId=null;save(true);
  if(wasActive){for(const d of document.querySelectorAll('dialog[open]'))d.close();showResult(r.id);}else toast('ナンプレテストは制限時間に達しました。ホームから結果を確認できます。');
 }
 function canEdit(){const r=run();if(!r)return true;if(r.status!=='running')return false;if(TM.remainingMs(r)<=0){finish(r,'time');return false;}return true;}
 function open(id,index=null){const r=db().tests?.[id];if(!r)return;if(r.status!=='running'){showResult(id);return;}if(TM.remainingMs(r)<=0){finish(r,'time');showResult(id);return;}beforeNavigate();activeId=id;db().activeTestId=id;if(index!==null)r.currentIndex=Math.max(0,Math.min(r.questions.length-1,index));$('test-result').hidden=true;openQuestion();update();save(true);}
 function update(){const r=run();$('test-bar').hidden=!r;$('test-navigation').hidden=!r;if(!r)return;const n=r.questions.length,i=r.currentIndex,answered=r.questions.filter(q=>TM.isAnswered(q,puzzle(q))).length;
  $('test-remaining').textContent=clock(TM.remainingMs(r));$('test-position').textContent=`${i+1} / ${n}問 · 入力済み ${answered}問`;$('test-prev').disabled=i===0;$('test-next').disabled=i===n-1;
  $('test-question-position').textContent=`第${i+1}問 / 全${n}問`;
  $('test-answer-status').textContent=TM.isAnswered(question(),puzzle(question()))?'回答を保存しました（正誤は終了後に表示）':'回答は自動保存します。問題は自由に行き来できます。';
 }
 function renderHome(){const level=document.querySelector('input[name=difficulty]:checked').value;try{const p=TM.plan(pool,{level,random:()=>.5}),quotas=Object.entries(p.kindCounts).filter(([,n])=>n>1).map(([k,n])=>`${T.TYPES[k].name}${n}問`);if(Object.values(p.kindCounts).some(n=>n===1))quotas.push('ほか各1問');$('test-plan-summary').textContent=`${p.selectedKinds.length}種類・${p.total}問 / 制限時間120分。${quotas.join('・')}。${level==='normal'?'通常':'最上難易度'}で出題します。`;$('test-start-digital').disabled=false;$('test-start-analog').disabled=false;}catch(e){$('test-plan-summary').textContent=e.message;$('test-start-digital').disabled=true;$('test-start-analog').disabled=true;}
  const r=running();$('test-resume-card').hidden=!r;if(r)$('test-resume-summary').textContent=`${r.mode==='analog'?'アナログ':'デジタル'} / ${r.questions.length}問 / 残り ${clock(TM.remainingMs(r))}（時間は進み続けます）`;
  const past=runs().filter(r=>r.status!=='running').sort((a,b)=>b.startedAt-a.startedAt);$('test-history').hidden=!past.length;$('test-history-items').innerHTML=past.slice(0,30).map(r=>`<div class="history-row"><span>${new Date(r.startedAt).toLocaleString('ja-JP')}<br><small>${r.level==='normal'?'通常':'最上難易度'} / ${r.result.correct} / ${r.result.total}問 正解 / ${r.status==='expired'?'時間切れ':'提出済み'}</small></span><button data-test-result="${esc(r.id)}">結果</button></div>`).join('');
 }
 function tick(){if(ticking)return;ticking=true;try{let changed=false;for(const r of runs())if(r.status==='running'&&TM.remainingMs(r)<=0){finish(r,'time');changed=true;}if(run())update();if(!$('welcome').hidden){if(changed)renderHome();else{const r=running();if(r)$('test-resume-summary').textContent=`${r.mode==='analog'?'アナログ':'デジタル'} / ${r.questions.length}問 / 残り ${clock(TM.remainingMs(r))}（時間は進み続けます）`;}}}finally{ticking=false;}}
 async function start(mode){if(root.LogicApp?.runningTest()){root.LogicApp.resumeRunningTest();return;}tick();const current=running();if(current){open(current.id);toast('途中のテストを再開しました。');return;}try{const level=document.querySelector('input[name=difficulty]:checked').value,prepared=await prepareTest(level),played=getPlayed?getPlayed():[...Object.values(db().sessions).map(q=>q.puzzleId),...runs().flatMap(r=>r.questions.map(q=>q.puzzleId))],r=TM.createRun(pool,{mode,level,playedIds:played,...prepared});db().tests??={};db().tests[r.id]=r;db().activeTestId=r.id;markUsed(r.questions.map(q=>q.puzzleId));save(true);open(r.id);}catch(e){toast(e.message);}}
 function recordAnswer(selected){if(!canEdit())return;const q=question(),p=puzzle(q);if(kind(p)==='next'&&q.mode==='digital'){const E=T.model(p);if(!E.activeSet.has(selected)||+p.givens[selected]||!q.values[selected]){toast('回答する空欄を選び、数字を入力してください。');return;}q.nextCell=selected;}
  save(true);update();toast(TM.isAnswered(q,p)?'回答を保存しました。正誤はテスト終了後に表示します。':'入力途中の回答を保存しました。');
 }
 $('test-start-digital').onclick=()=>start('digital');$('test-start-analog').onclick=()=>start('analog');$('test-resume').onclick=()=>{const r=running();if(r)open(r.id);};
 for(const e of document.querySelectorAll('input[name=difficulty]'))e.addEventListener('change',renderHome);
 $('test-list-open').onclick=()=>{if(!canEdit())return;const r=run();$('test-list-items').innerHTML=r.questions.map((q,i)=>`<button data-test-question="${i}" ${i===r.currentIndex?'aria-current="true"':''}><strong>${i+1}. ${esc(T.TYPES[kind(puzzle(q))].name)}</strong><small>${TM.isAnswered(q,puzzle(q))?'入力済み':'未回答・入力途中'}${i===r.currentIndex?' / 表示中':''}</small></button>`).join('');$('test-list-dialog').showModal();};
 $('test-list-items').onclick=e=>{const b=e.target.closest('[data-test-question]');if(b){$('test-list-dialog').close();const r=run();if(r)open(r.id,+b.dataset.testQuestion);}};
 $('test-prev').onclick=()=>{const r=run();if(r)open(r.id,r.currentIndex-1);};$('test-next').onclick=()=>{const r=run();if(r)open(r.id,r.currentIndex+1);};
 $('test-submit').onclick=()=>{if(!canEdit())return;const r=run(),answered=r.questions.filter(q=>TM.isAnswered(q,puzzle(q))).length;confirmDo('テストを終了して採点',`${r.questions.length}問中${answered}問に回答が入力されています。終了すると回答を変更できなくなります。`,()=>{if(canEdit())finish(r,'submit');});};
 $('test-history-items').onclick=e=>{const b=e.target.closest('[data-test-result]');if(b)showResult(b.dataset.testResult);};$('test-result-items').onclick=e=>{const b=e.target.closest('[data-test-review]');if(!b)return;const r=db().tests[resultId],q=r?.questions[+b.dataset.testReview];if(q)review(puzzle(q),q);};
 return {isActive:()=>!!run(),run,question,open,leave,canEdit,recordAnswer,update,renderHome,tick,showResult};
}
root.PracticeTestUI={create};
})(typeof globalThis!=='undefined'?globalThis:this);
